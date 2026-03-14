const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const nodemailer = require("nodemailer");
const Order = require("../models/Order");
const PaymentAttempt = require("../models/PaymentAttempt");
const CheckoutSetting = require("../models/CheckoutSetting");
const Product = require("../models/Product");
const User = require("../models/User");

const router = express.Router();

const DEFAULT_TAX_RATE = 0.08;
const DEFAULT_SHIPPING_CHARGE = 79;

const ORDER_STATUSES = [
  "Order Placed",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();
const trimString = (value = "") => String(value || "").trim();
const asTwoDecimals = (value = 0) => Number(Number(value || 0).toFixed(2));

const isAdminKeyValid = (adminKey = "") => {
  const configuredAdminKey = process.env.ADMIN_KEY || "";
  return Boolean(configuredAdminKey) && adminKey === configuredAdminKey;
};

const getCheckoutPricingSettings = async () => {
  let settings = await CheckoutSetting.findOne({ key: "default" });

  if (!settings) {
    settings = await CheckoutSetting.create({
      key: "default",
      taxRate: DEFAULT_TAX_RATE,
      shippingCharge: DEFAULT_SHIPPING_CHARGE,
    });
  }

  return {
    taxRate: Number(settings.taxRate ?? DEFAULT_TAX_RATE),
    shippingCharge: Number(settings.shippingCharge ?? DEFAULT_SHIPPING_CHARGE),
  };
};

const calculatePricing = (unitPrice, quantity, pricingSettings = {}) => {
  const taxRate = Number.isFinite(Number(pricingSettings.taxRate))
    ? Number(pricingSettings.taxRate)
    : DEFAULT_TAX_RATE;

  const configuredShippingCharge = Number.isFinite(Number(pricingSettings.shippingCharge))
    ? Number(pricingSettings.shippingCharge)
    : DEFAULT_SHIPPING_CHARGE;

  const subtotal = asTwoDecimals(Number(unitPrice || 0) * Number(quantity || 0));
  const taxAmount = asTwoDecimals(subtotal * taxRate);
  const shippingCharge = subtotal > 0 ? asTwoDecimals(configuredShippingCharge) : 0;
  const totalAmount = asTwoDecimals(subtotal + taxAmount + shippingCharge);
  const exactHalf = asTwoDecimals(totalAmount / 2);

  return {
    taxRate,
    subtotal,
    taxAmount,
    shippingCharge,
    totalAmount,
    exactHalf,
  };
};

const addressToObject = (address = {}) => {
  if (typeof address === "string") {
    const trimmed = trimString(address);

    return {
      line1: trimmed,
      landmark: "",
      villageTown: "",
      wardNo: "",
      district: "",
      state: "",
      pincode: "",
      fullAddress: trimmed,
    };
  }

  const normalized = {
    line1: trimString(address?.line1),
    landmark: trimString(address?.landmark),
    villageTown: trimString(address?.villageTown),
    wardNo: trimString(address?.wardNo),
    district: trimString(address?.district),
    state: trimString(address?.state),
    pincode: trimString(address?.pincode),
    fullAddress: trimString(address?.fullAddress),
  };

  const composedFullAddress = [
    normalized.line1,
    normalized.landmark,
    normalized.villageTown,
    normalized.wardNo ? `Ward No ${normalized.wardNo}` : "",
    normalized.district,
    normalized.state,
    normalized.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  normalized.fullAddress = normalized.fullAddress || composedFullAddress;

  return normalized;
};

const validateAddress = (address = {}) => {
  const requiredFields = ["line1", "villageTown", "wardNo", "district", "state", "pincode"];

  const missingField = requiredFields.find((field) => !trimString(address[field]));

  if (missingField) {
    return `Address field '${missingField}' is required`;
  }

  if (!/^\d{6}$/.test(address.pincode)) {
    return "Pincode must be exactly 6 digits";
  }

  return "";
};

const getRazorpayClient = () => {
  const keyId = trimString(process.env.RAZORPAY_KEY_ID || "");
  const keySecret = trimString(process.env.RAZORPAY_KEY_SECRET || "");

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

const buildPaymentAppLabel = (payment = {}) => {
  const method = trimString(payment?.method).toLowerCase();

  if (method === "upi") {
    const vpa = trimString(payment?.vpa || payment?.acquirer_data?.vpa);
    return vpa ? `UPI (${vpa})` : "UPI";
  }

  if (method === "card") {
    return "Card";
  }

  if (method === "netbanking") {
    return "Netbanking";
  }

  if (method === "wallet") {
    return "Wallet";
  }

  return method ? method.toUpperCase() : "Online";
};

const formatEmailText = ({ order, paymentLabel, paidNowAmount, remainingAmount }) => {
  const isOnlinePayment = order.paymentGateway === "razorpay" || ["upi", "half"].includes(order.paymentOption);
  const paidAtDate = order.paymentPaidAt ? new Date(order.paymentPaidAt) : null;

  const lines = [
    `Order ID: ${order.orderCode}`,
    `Customer: ${order.userName}`,
    `Email: ${order.userEmail}`,
    `Phone: ${order.userPhone}`,
    "",
    `Product: ${order.productName}`,
    `Category: ${order.productCategory || "-"}`,
    `Quantity: ${order.quantity}`,
    `Unit Price: ₹${order.unitPrice.toFixed(2)}`,
    `Subtotal: ₹${order.subtotal.toFixed(2)}`,
    `Tax: ₹${order.taxAmount.toFixed(2)}`,
    `Shipping: ₹${order.shippingCharge.toFixed(2)}`,
    `Total: ₹${order.totalAmount.toFixed(2)}`,
    "",
    `Payment Option: ${paymentLabel}`,
    `Paid Now: ₹${paidNowAmount.toFixed(2)}`,
    `Remaining: ₹${remainingAmount.toFixed(2)}`,
  ];

  if (isOnlinePayment) {
    if (order.upiTransactionId) {
      lines.push(`Transaction ID: ${order.upiTransactionId}`);
    }

    if (order.paymentGateway) {
      lines.push(`Gateway: ${order.paymentGateway}`);
    }

    if (order.paymentApp) {
      lines.push(`Payment Method/App: ${order.paymentApp}`);
    }

    if (paidAtDate && !Number.isNaN(paidAtDate.getTime())) {
      lines.push(`Payment Date: ${paidAtDate.toISOString().slice(0, 10)}`);
      lines.push(`Payment Time: ${paidAtDate.toISOString().slice(11, 19)} UTC`);
    }
  }

  lines.push("");
  lines.push(`Delivery Address: ${order.address.fullAddress}`);
  lines.push(`Expected Delivery: ${order.expectedDelivery}`);
  lines.push(`Current Status: ${order.status}`);

  return lines.join("\n");
};

const sendOrderEmails = async (order) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !adminEmail) {
    return {
      userSent: false,
      adminSent: false,
    };
  }

  const isHalfPayment = order.paymentOption === "half";
  const isOnlineFullPayment = order.paymentOption === "upi";
  const paymentLabel = isHalfPayment
    ? "Half Payment (Verified Online)"
    : isOnlineFullPayment
      ? "Full Payment (Verified Online)"
      : "Cash on Delivery";

  const paidNowAmount = asTwoDecimals(order.paidNowAmount);
  const remainingAmount = asTwoDecimals(order.totalAmount - paidNowAmount);
  const emailText = formatEmailText({
    order,
    paymentLabel,
    paidNowAmount,
    remainingAmount,
  });

  const [userResult, adminResult] = await Promise.allSettled([
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: order.userEmail,
      subject: `Order Confirmed - ${order.orderCode}`,
      text: `Hi ${order.userName},\n\nYour order has been placed successfully.\n\n${emailText}\n\nThank you for shopping with us.`,
    }),
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `New Order Received - ${order.orderCode}`,
      text: `A new order has been placed.\n\n${emailText}`,
    }),
  ]);

  return {
    userSent: userResult.status === "fulfilled",
    adminSent: adminResult.status === "fulfilled",
  };
};

const validateCheckoutRequest = async ({ email, productId, quantity, address, phone }) => {
  if (!email) {
    return { status: 400, message: "Email is required" };
  }

  if (!productId) {
    return { status: 400, message: "Product is required" };
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return { status: 400, message: "Quantity must be at least 1" };
  }

  const user = await User.findOne({ email, isVerified: true });

  if (!user) {
    return { status: 404, message: "User not found" };
  }

  const product = await Product.findById(productId);

  if (!product) {
    return { status: 404, message: "Product not found" };
  }

  const normalizedAddress = addressToObject(address || user.address || {});
  const addressValidationError = validateAddress(normalizedAddress);

  if (addressValidationError) {
    return { status: 400, message: addressValidationError };
  }

  const requestPhone = trimString(phone);
  const userPhone = requestPhone || trimString(user.phone);

  if (!/^\d{10}$/.test(userPhone)) {
    return { status: 400, message: "Please provide a valid 10-digit phone number" };
  }

  return {
    status: 200,
    user,
    product,
    normalizedAddress,
    userPhone,
    requestPhone,
  };
};

const createOrderFromData = async ({
  user,
  requestPhone,
  userPhone,
  email,
  productData,
  quantity,
  pricing,
  paymentOption,
  paidNowAmount,
  paymentStatus,
  normalizedAddress,
  paymentGateway,
  paymentApp,
  paymentPaidAt,
  transactionId,
}) => {
  const order = await Order.create({
    orderCode: `ORD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    userEmail: email,
    userName: trimString(user?.name) || trimString(productData?.userName) || "Customer",
    userPhone,
    productId: productData.productId,
    productName: trimString(productData.productName),
    productImage: trimString(productData.productImage),
    productCategory: trimString(productData.productCategory),
    quantity,
    unitPrice: asTwoDecimals(productData.unitPrice),
    subtotal: pricing.subtotal,
    taxAmount: pricing.taxAmount,
    shippingCharge: pricing.shippingCharge,
    totalAmount: pricing.totalAmount,
    paymentOption,
    upiTransactionId: trimString(transactionId),
    paymentGateway: trimString(paymentGateway),
    paymentApp: trimString(paymentApp),
    paymentPaidAt: paymentPaidAt || null,
    paidNowAmount,
    paymentStatus,
    address: normalizedAddress,
  });

  if (user) {
    user.address = normalizedAddress;

    if (requestPhone && /^\d{10}$/.test(requestPhone)) {
      user.phone = requestPhone;
      order.userPhone = requestPhone;
    }

    await user.save();
  }

  const emailResult = await sendOrderEmails(order);
  order.userEmailNotificationSent = emailResult.userSent;
  order.adminEmailNotificationSent = emailResult.adminSent;
  await order.save();

  return order;
};

const markPaymentAttemptFailed = async (attempt, reason) => {
  if (!attempt) {
    return;
  }

  attempt.status = "failed";
  attempt.failureReason = trimString(reason || "Payment verification failed");
  await attempt.save();
};

router.post("/payment/create", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const productId = trimString(req.body?.productId);
    const quantity = Number(req.body?.quantity || 1);
    const paymentOption = trimString(req.body?.paymentOption || "").toLowerCase();

    if (!["upi", "half"].includes(paymentOption)) {
      return res.status(400).json({ message: "Payment option must be upi or half" });
    }

    const validation = await validateCheckoutRequest({
      email,
      productId,
      quantity,
      address: req.body?.address,
      phone: req.body?.phone,
    });

    if (validation.status !== 200) {
      return res.status(validation.status).json({ message: validation.message });
    }

    const { user, product, normalizedAddress, userPhone, requestPhone } = validation;
    const checkoutPricingSettings = await getCheckoutPricingSettings();
    const pricing = calculatePricing(product.price, quantity, checkoutPricingSettings);

    const amountPayable = paymentOption === "half" ? pricing.exactHalf : pricing.totalAmount;
    const razorpay = getRazorpayClient();

    if (!razorpay) {
      return res.status(503).json({
        message: "Online payment gateway is not configured. Please contact support.",
      });
    }

    const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;

    const gatewayOrder = await razorpay.orders.create({
      amount: Math.round(amountPayable * 100),
      currency: "INR",
      receipt,
      notes: {
        userEmail: email,
        productId: String(product._id),
        quantity: String(quantity),
        paymentOption,
      },
    });

    await PaymentAttempt.create({
      gateway: "razorpay",
      gatewayOrderId: gatewayOrder.id,
      status: "initiated",
      userEmail: email,
      userName: trimString(user?.name) || "Customer",
      userPhone,
      productId: product._id,
      productName: trimString(product.name),
      productImage: trimString(product.image || (Array.isArray(product.images) ? product.images[0] : "")),
      productCategory: trimString(product.section || product.category),
      quantity,
      unitPrice: asTwoDecimals(product.price),
      subtotal: pricing.subtotal,
      taxAmount: pricing.taxAmount,
      shippingCharge: pricing.shippingCharge,
      totalAmount: pricing.totalAmount,
      exactHalf: pricing.exactHalf,
      amountPayable,
      paymentOption,
      address: normalizedAddress,
      currency: gatewayOrder.currency || "INR",
    });

    if (requestPhone && /^\d{10}$/.test(requestPhone)) {
      user.phone = requestPhone;
      user.address = normalizedAddress;
      await user.save();
    }

    return res.json({
      message: "Payment initiated",
      checkout: {
        key: process.env.RAZORPAY_KEY_ID,
        orderId: gatewayOrder.id,
        amount: Number(gatewayOrder.amount || Math.round(amountPayable * 100)),
        currency: gatewayOrder.currency || "INR",
        name: "Apna Furniture House",
        description: paymentOption === "half"
          ? `Half payment for ${trimString(product.name)}`
          : `Full payment for ${trimString(product.name)}`,
      },
      payable: {
        paidNowAmount: amountPayable,
        remainingAmount: asTwoDecimals(pricing.totalAmount - amountPayable),
      },
      pricing: {
        taxRate: pricing.taxRate,
        subtotal: pricing.subtotal,
        taxAmount: pricing.taxAmount,
        shippingCharge: pricing.shippingCharge,
        totalAmount: pricing.totalAmount,
      },
      prefill: {
        name: trimString(user?.name) || "Customer",
        email,
        contact: userPhone,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to initiate payment" });
  }
});

router.post("/payment/verify-and-place", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const razorpayOrderId = trimString(req.body?.razorpayOrderId);
    const razorpayPaymentId = trimString(req.body?.razorpayPaymentId);
    const razorpaySignature = trimString(req.body?.razorpaySignature);

    if (!email || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: "Payment verification payload is incomplete" });
    }

    const attempt = await PaymentAttempt.findOne({ gatewayOrderId: razorpayOrderId });

    if (!attempt) {
      return res.status(404).json({ message: "Payment attempt not found" });
    }

    if (attempt.status === "verified" && attempt.orderId) {
      const existingOrder = await Order.findById(attempt.orderId);

      if (existingOrder) {
        return res.json({
          message: "Order already placed",
          order: existingOrder,
        });
      }
    }

    if (attempt.userEmail !== email) {
      return res.status(403).json({ message: "Payment does not belong to this user" });
    }

    const razorpaySecret = trimString(process.env.RAZORPAY_KEY_SECRET || "");

    if (!razorpaySecret) {
      return res.status(503).json({ message: "Payment gateway is not configured" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", razorpaySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      await markPaymentAttemptFailed(attempt, "Invalid payment signature");
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const razorpay = getRazorpayClient();

    if (!razorpay) {
      return res.status(503).json({ message: "Payment gateway is not configured" });
    }

    const payment = await razorpay.payments.fetch(razorpayPaymentId);

    if (!payment || trimString(payment.order_id) !== razorpayOrderId) {
      await markPaymentAttemptFailed(attempt, "Payment/order mismatch");
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const paymentStatus = trimString(payment.status).toLowerCase();

    if (!["captured", "authorized"].includes(paymentStatus)) {
      await markPaymentAttemptFailed(attempt, `Payment status is ${paymentStatus || "unknown"}`);
      return res.status(400).json({ message: "Payment was not successful" });
    }

    const expectedAmountPaise = Math.round(Number(attempt.amountPayable || 0) * 100);

    if (Number(payment.amount || 0) !== expectedAmountPaise) {
      await markPaymentAttemptFailed(attempt, "Paid amount mismatch");
      return res.status(400).json({ message: "Payment amount mismatch" });
    }

    const user = await User.findOne({ email: attempt.userEmail, isVerified: true });

    if (!user) {
      await markPaymentAttemptFailed(attempt, "Verified user not found");
      return res.status(404).json({ message: "User not found" });
    }

    const order = await createOrderFromData({
      user,
      requestPhone: attempt.userPhone,
      userPhone: attempt.userPhone,
      email: attempt.userEmail,
      productData: {
        productId: attempt.productId,
        productName: attempt.productName,
        productImage: attempt.productImage,
        productCategory: attempt.productCategory,
        unitPrice: attempt.unitPrice,
      },
      quantity: Number(attempt.quantity || 1),
      pricing: {
        subtotal: asTwoDecimals(attempt.subtotal),
        taxAmount: asTwoDecimals(attempt.taxAmount),
        shippingCharge: asTwoDecimals(attempt.shippingCharge),
        totalAmount: asTwoDecimals(attempt.totalAmount),
      },
      paymentOption: attempt.paymentOption,
      paidNowAmount: asTwoDecimals(attempt.amountPayable),
      paymentStatus: attempt.paymentOption === "half" ? "partial" : "paid",
      normalizedAddress: addressToObject(attempt.address || {}),
      paymentGateway: "razorpay",
      paymentApp: buildPaymentAppLabel(payment),
      paymentPaidAt: payment?.created_at ? new Date(Number(payment.created_at) * 1000) : new Date(),
      transactionId: razorpayPaymentId,
    });

    attempt.status = "verified";
    attempt.paymentId = razorpayPaymentId;
    attempt.paymentSignature = razorpaySignature;
    attempt.paymentMethod = trimString(payment?.method);
    attempt.paymentApp = buildPaymentAppLabel(payment);
    attempt.paymentPaidAt = payment?.created_at ? new Date(Number(payment.created_at) * 1000) : new Date();
    attempt.failureReason = "";
    attempt.orderId = order._id;
    await attempt.save();

    return res.json({
      message: "Payment verified and order placed",
      order,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify payment" });
  }
});

router.post("/payment/mark-failed", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const razorpayOrderId = trimString(req.body?.razorpayOrderId);
    const reason = trimString(req.body?.reason || "Payment failed or cancelled");

    if (!email || !razorpayOrderId) {
      return res.status(400).json({ message: "Email and order id are required" });
    }

    const attempt = await PaymentAttempt.findOne({
      gatewayOrderId: razorpayOrderId,
      userEmail: email,
    });

    if (!attempt) {
      return res.status(404).json({ message: "Payment attempt not found" });
    }

    if (attempt.status === "verified") {
      return res.json({ message: "Payment already verified" });
    }

    attempt.status = "failed";
    attempt.failureReason = reason;
    await attempt.save();

    return res.json({ message: "Payment marked as failed" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update payment status" });
  }
});

router.post("/", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const productId = trimString(req.body?.productId);
    const quantity = Number(req.body?.quantity || 1);
    const paymentOption = trimString(req.body?.paymentOption || "cod").toLowerCase();

    if (paymentOption !== "cod") {
      return res.status(400).json({
        message: "Online payments must go through the verified payment gateway flow",
      });
    }

    const validation = await validateCheckoutRequest({
      email,
      productId,
      quantity,
      address: req.body?.address,
      phone: req.body?.phone,
    });

    if (validation.status !== 200) {
      return res.status(validation.status).json({ message: validation.message });
    }

    const { user, product, normalizedAddress, userPhone, requestPhone } = validation;
    const checkoutPricingSettings = await getCheckoutPricingSettings();
    const pricing = calculatePricing(product.price, quantity, checkoutPricingSettings);

    const order = await createOrderFromData({
      user,
      requestPhone,
      userPhone,
      email,
      productData: {
        productId: product._id,
        productName: trimString(product.name),
        productImage: trimString(product.image || (Array.isArray(product.images) ? product.images[0] : "")),
        productCategory: trimString(product.section || product.category),
        unitPrice: product.price,
      },
      quantity,
      pricing,
      paymentOption: "cod",
      paidNowAmount: 0,
      paymentStatus: "pending",
      normalizedAddress,
      paymentGateway: "cod",
      paymentApp: "",
      paymentPaidAt: null,
      transactionId: "",
    });

    return res.status(201).json({
      message: "Order placed successfully",
      order,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to place order" });
  }
});

router.get("/my", async (req, res) => {
  try {
    const email = normalizeEmail(req.query?.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const orders = await Order.find({ userEmail: email }).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load orders" });
  }
});

router.get("/admin/all", async (req, res) => {
  try {
    const adminKey = trimString(req.headers["x-admin-key"] || "");

    if (!isAdminKeyValid(adminKey)) {
      return res.status(403).json({ message: "Admin access denied" });
    }

    const orders = await Order.find().sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load all orders" });
  }
});

router.put("/:orderId/status", async (req, res) => {
  try {
    const adminKey = trimString(req.headers["x-admin-key"] || "");

    if (!isAdminKeyValid(adminKey)) {
      return res.status(403).json({ message: "Admin access denied" });
    }

    const status = trimString(req.body?.status);

    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json({
      message: "Order status updated",
      order,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update order status" });
  }
});

router.put("/:orderId/delivery-date", async (req, res) => {
  try {
    const adminKey = trimString(req.headers["x-admin-key"] || "");

    if (!isAdminKeyValid(adminKey)) {
      return res.status(403).json({ message: "Admin access denied" });
    }

    const expectedDelivery = trimString(req.body?.expectedDelivery);

    if (!expectedDelivery) {
      return res.status(400).json({ message: "Expected delivery date is required" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { expectedDelivery },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.json({
      message: "Delivery date updated",
      order,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update delivery date" });
  }
});

router.put("/:orderId/cancel", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || "");

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.userEmail !== email) {
      return res.status(403).json({ message: "You can only cancel your own orders" });
    }

    if (order.status === "Delivered" || order.status === "Cancelled") {
      return res.status(400).json({ message: `Cannot cancel an order with status: ${order.status}` });
    }

    order.status = "Cancelled";
    await order.save();

    return res.json({
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to cancel order" });
  }
});

module.exports = router;
