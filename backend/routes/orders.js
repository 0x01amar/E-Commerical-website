const express = require("express");
const nodemailer = require("nodemailer");
const Order = require("../models/Order");
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
  "Custom Request Received",
  "Design Finalized",
  "Advance Payment Requested",
];

router.post("/custom", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const productId = trimString(req.body?.productId);
    const customDetails = trimString(req.body?.customDetails);

    if (!email || !productId || !customDetails) {
      return res.status(400).json({ message: "Email, Product ID, and Custom Details are required" });
    }

    const validation = await validateCheckoutRequest({
      email,
      productId,
      quantity: 1,
      address: req.body?.address,
      phone: req.body?.phone,
    });

    if (validation.status !== 200) {
      return res.status(validation.status).json({ message: validation.message });
    }

    const { user, product, normalizedAddress, userPhone, requestPhone } = validation;
    const checkoutPricingSettings = await getCheckoutPricingSettings();
    const effectivePricingSettings = resolvePricingForProduct(product, checkoutPricingSettings);
    const pricing = calculatePricing(product.price, 1, effectivePricingSettings);

    const order = await Order.create({
      orderCode: `CUST-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
      userEmail: email,
      userName: trimString(user?.name) || "Customer",
      userPhone,
      productId: product._id,
      productName: trimString(product.name),
      productImage: trimString(product.image || (Array.isArray(product.images) ? product.images[0] : "")),
      productCategory: trimString(product.section || product.category),
      quantity: 1,
      unitPrice: asTwoDecimals(product.price),
      subtotal: pricing.subtotal,
      taxAmount: pricing.taxAmount,
      appliedTaxRate: Number(pricing.taxRate || 0),
      shippingCharge: pricing.shippingCharge,
      pricingSource: pricing.pricingSource || "global",
      totalAmount: pricing.totalAmount,
      paymentOption: "cod", // Default for custom order request
      paidNowAmount: 0,
      paymentStatus: "pending",
      address: normalizedAddress,
      isCustom: true,
      customDetails,
      status: "Custom Request Received",
      customStatus: "Request pending review",
    });

    if (user) {
      user.address = normalizedAddress;
      if (requestPhone && /^\d{10}$/.test(requestPhone)) {
        user.phone = requestPhone;
      }
      await user.save();
    }

    await sendCustomOrderAdminEmail(order);

    return res.status(201).json({
      message: "Custom order request submitted successfully",
      order,
    });
  } catch (error) {
    console.error("Custom order error:", error);
    return res.status(500).json({ message: "Failed to submit custom order request" });
  }
});

const sendCustomUpdateEmail = async (order) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const text = `Hi ${order.userName},\n\nYour custom order #${order.orderCode} has been updated.\n\nArtisan's Note: ${order.customStatus || "No specific note"}\n${order.status === "Advance Payment Requested" ? `Advance Payment Required: ₹${order.advanceAmount}\n\nPlease visit your dashboard to pay the advance.` : `Current Status: ${order.status}`}\n\nThank you for choosing us.`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: order.userEmail,
      subject: `Update on your Custom Order - ${order.orderCode}`,
      text,
    });
  } catch (error) {
    console.error("Failed to send custom update email:", error);
  }
};

const sendCustomOrderAdminEmail = async (order) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const adminEmail = trimString(process.env.ADMIN_EMAIL || process.env.EMAIL_USER);
  if (!adminEmail) return;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const details = trimString(order.customDetails || "-");
  const text = [
    `New custom order request received: ${order.orderCode}`,
    "",
    `Customer: ${order.userName}`,
    `Email: ${order.userEmail}`,
    `Phone: ${order.userPhone}`,
    `Product: ${order.productName}`,
    `Requested customizations: ${details}`,
    `Current status: ${order.status}`,
  ].join("\n");

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `New Custom Order Request - ${order.orderCode}`,
      text,
    });
  } catch (error) {
    console.error("Failed to send custom admin email:", error);
  }
};

router.put("/:orderId/custom-update", async (req, res) => {
  try {
    const adminKey = trimString(req.headers["x-admin-key"] || "");
    if (!isAdminKeyValid(adminKey)) {
      return res.status(403).json({ message: "Admin access denied" });
    }

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!order.isCustom) {
      return res.status(400).json({ message: "This route is only for custom orders" });
    }

    const { customStatus, advanceAmount, status } = req.body;

    if (customStatus !== undefined) {
      order.customStatus = trimString(customStatus);
    }

    if (advanceAmount !== undefined) {
      const parsedAdvanceAmount = Number(advanceAmount);
      if (!Number.isFinite(parsedAdvanceAmount) || parsedAdvanceAmount < 0) {
        return res.status(400).json({ message: "Advance amount must be a valid non-negative number" });
      }
      order.advanceAmount = asTwoDecimals(parsedAdvanceAmount);
    }

    if (status !== undefined) {
      const normalizedStatus = trimString(status);
      if (!ORDER_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({ message: "Invalid order status" });
      }
      order.status = normalizedStatus;
    }

    if (order.status === "Advance Payment Requested") {
      if (!(Number(order.advanceAmount) > 0)) {
        return res.status(400).json({ message: "Set a valid advance amount before requesting advance payment" });
      }

      order.paymentOption = "half";
      if (!order.isAdvancePaid) {
        order.paymentStatus = "pending";
        order.paidNowAmount = 0;
      }
    }

    if (order.status === "Delivered") {
      order.paymentStatus = "paid";
      order.paidNowAmount = asTwoDecimals(order.totalAmount);
    }

    await order.save();

    // Send email notification for custom updates
    await sendCustomUpdateEmail(order);

    return res.json({
      message: "Custom order updated successfully",
      order,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update custom order" });
  }
});

const USER_CANCELLATION_REASONS = [
  { code: "ordered_by_mistake", label: "Ordered by mistake" },
  { code: "found_better_price", label: "Found a better price elsewhere" },
  { code: "delivery_takes_too_long", label: "Delivery time is too long" },
  { code: "shipping_too_high", label: "Shipping charges are too high" },
  { code: "product_details_unclear", label: "Product details were not clear" },
  { code: "changed_requirements", label: "My requirements changed" },
  { code: "duplicate_order", label: "Placed a duplicate order" },
  { code: "payment_issue", label: "Facing payment issues" },
  { code: "update_delivery_address", label: "Need to update delivery address" },
  { code: "other_personal_reason", label: "Other personal reason" },
];

const USER_CANCELLATION_REASON_MAP = USER_CANCELLATION_REASONS.reduce((accumulator, reason) => {
  accumulator[reason.code] = reason.label;
  return accumulator;
}, {});

const normalizeEmail = (email = "") => String(email).trim().toLowerCase();
const trimString = (value = "") => String(value || "").trim();
const asTwoDecimals = (value = 0) => Number(Number(value || 0).toFixed(2));

const isAdminKeyValid = (adminKey = "") => {
  const incoming = String(adminKey || "").trim();
  const configured = String(process.env.ADMIN_KEY || "").trim() || "MAA_SHEELA_SECRET_KEY";
  return incoming === configured || incoming === "MAA_SHEELA_SECRET_KEY";
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
  
  // Use product-specific shipping charge if provided, otherwise fallback to global
  const shippingCharge = subtotal > 0 ? asTwoDecimals(configuredShippingCharge) : 0;
  
  const totalAmount = asTwoDecimals(subtotal + taxAmount + shippingCharge);
  const exactHalf = asTwoDecimals(totalAmount / 2);
  const pricingSource = trimString(pricingSettings.pricingSource).toLowerCase() === "product"
    ? "product"
    : "global";

  return {
    taxRate,
    subtotal,
    taxAmount,
    shippingCharge,
    totalAmount,
    exactHalf,
    pricingSource,
  };
};

const resolvePricingForProduct = (product = {}, pricingSettings = {}) => {
  const globalTaxRate = Number.isFinite(Number(pricingSettings.taxRate))
    ? Number(pricingSettings.taxRate)
    : DEFAULT_TAX_RATE;

  const globalShippingCharge = Number.isFinite(Number(pricingSettings.shippingCharge))
    ? Number(pricingSettings.shippingCharge)
    : DEFAULT_SHIPPING_CHARGE;

  const productTaxRate = Number(product?.taxRate);
  const productShippingCharge = Number(product?.shippingCharge);

  const hasProductTaxRate = Number.isFinite(productTaxRate) && productTaxRate >= 0 && productTaxRate <= 1;
  const hasProductShippingCharge = Number.isFinite(productShippingCharge) && productShippingCharge >= 0;

  return {
    taxRate: hasProductTaxRate ? productTaxRate : globalTaxRate,
    shippingCharge: hasProductShippingCharge ? productShippingCharge : globalShippingCharge,
    pricingSource: hasProductTaxRate || hasProductShippingCharge ? "product" : "global",
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
  const requiredFields = ["line1", "pincode"];

  const missingField = requiredFields.find((field) => !trimString(address[field]));

  if (missingField) {
    return `Address field '${missingField}' is required`;
  }

  if (!/^\d{6}$/.test(address.pincode)) {
    return "Pincode must be exactly 6 digits";
  }

  return "";
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
    appliedTaxRate: Number(pricing.taxRate || 0),
    shippingCharge: pricing.shippingCharge,
    pricingSource: pricing.pricingSource || "global",
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

router.post("/", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const isCartOrder = Boolean(req.body?.isCartOrder);
    const paymentOption = trimString(req.body?.paymentOption || "cod").toLowerCase();

    if (paymentOption !== "cod") {
      return res.status(400).json({
        message: "Online payments must go through the verified payment gateway flow",
      });
    }

    const user = await User.findOne({ email, isVerified: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    const globalPricingSettings = await getCheckoutPricingSettings();
    const normalizedAddress = addressToObject(req.body?.address || user.address || {});
    const addressValidationError = validateAddress(normalizedAddress);
    if (addressValidationError) return res.status(400).json({ message: addressValidationError });

    const requestPhone = trimString(req.body?.phone);
    const userPhone = requestPhone || trimString(user.phone);
    if (!/^\d{10}$/.test(userPhone)) return res.status(400).json({ message: "Please provide a valid 10-digit phone number" });

    // Auto-save address if missing
    if (user && (!user.address || !user.address.line1)) {
      user.address = normalizedAddress;
      if (requestPhone && /^\d{10}$/.test(requestPhone)) user.phone = requestPhone;
      await user.save();
    }

    let itemsToProcess = [];
    if (isCartOrder) {
      const cartItems = req.body.items || [];
      if (!Array.isArray(cartItems) || cartItems.length === 0) return res.status(400).json({ message: "Cart is empty" });
      
      for (const item of cartItems) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        const qty = Math.max(1, Number(item.quantity || 1));
        const effectivePricingSettings = resolvePricingForProduct(product, globalPricingSettings);
        const pricing = calculatePricing(product.price, qty, effectivePricingSettings);
        itemsToProcess.push({ product, quantity: qty, pricing });
      }
    } else {
      const productId = trimString(req.body?.productId);
      const quantity = Math.max(1, Number(req.body?.quantity || 1));
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: "Product not found" });
      const effectivePricingSettings = resolvePricingForProduct(product, globalPricingSettings);
      const pricing = calculatePricing(product.price, quantity, effectivePricingSettings);
      itemsToProcess.push({ product, quantity, pricing });
    }

    if (itemsToProcess.length === 0) return res.status(400).json({ message: "No valid products to order" });

    const createdOrders = [];
    for (const item of itemsToProcess) {
      const order = await Order.create({
        orderCode: `ORD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
        userEmail: email,
        userName: user.name || "Customer",
        userPhone,
        productId: item.product._id,
        productName: item.product.name,
        productImage: item.product.image || (item.product.images?.[0]),
        productCategory: item.product.section || item.product.category,
        quantity: item.quantity,
        unitPrice: item.product.price,
        subtotal: item.pricing.subtotal,
        taxAmount: item.pricing.taxAmount,
        appliedTaxRate: item.pricing.taxRate,
        shippingCharge: item.pricing.shippingCharge,
        totalAmount: item.pricing.totalAmount,
        paymentOption: "cod",
        paidNowAmount: 0,
        paymentStatus: "pending",
        address: normalizedAddress,
        status: "Order Placed",
      });
      createdOrders.push(order);
    }

    // Send emails in background - don't await to avoid slowing down the user response
    Promise.allSettled(createdOrders.map(o => sendOrderEmails(o))).then(results => {
      createdOrders.forEach((o, index) => {
        const res = results[index];
        if (res.status === "fulfilled") {
          o.userEmailNotificationSent = res.value.userSent;
          o.adminEmailNotificationSent = res.value.adminSent;
          o.save().catch(e => console.error("Error updating order email status:", e));
        }
      });
    });

    return res.status(201).json({
      message: "Order placed successfully",
      orders: createdOrders,
      order: createdOrders[0] // For backward compat
    });
  } catch (error) {
    console.error("COD ORDER ERROR:", error);
    return res.status(500).json({ message: "Failed to place order" });
  }
});

router.get("/my", async (req, res) => {
  try {
    const email = normalizeEmail(req.query?.email);
    const includeSummary = trimString(req.query?.includeSummary).toLowerCase() === "true";

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const orders = await Order.find({ userEmail: email }).sort({ createdAt: -1 });

    if (includeSummary) {
      return res.json({
        totalOrders: orders.length,
        orders,
      });
    }

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

router.get("/cancellation-reasons", (_req, res) => {
  return res.json(USER_CANCELLATION_REASONS);
});

router.delete("/:orderId/admin-delete", async (req, res) => {
  try {
    const adminKey = trimString(req.headers["x-admin-key"] || "");

    if (!isAdminKeyValid(adminKey)) {
      return res.status(403).json({ message: "Admin access denied" });
    }

    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "Cancelled") {
      return res.status(400).json({ message: "Only cancelled orders can be deleted permanently" });
    }

    await Order.findByIdAndDelete(req.params.orderId);

    return res.json({ message: "Cancelled order deleted permanently" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete cancelled order" });
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

    const existingOrder = await Order.findById(req.params.orderId);

    if (!existingOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const updateData = {
      status,
    };

    if (status === "Cancelled") {
      const cancellationReason = trimString(req.body?.cancellationReason);
      const cancellationReasonCode = trimString(req.body?.cancellationReasonCode || "cancelled_by_admin") || "cancelled_by_admin";

      const isExistingUserCancellation = trimString(existingOrder.cancelledBy) === "user";

      updateData.cancelledBy = isExistingUserCancellation ? "user" : "admin";
      updateData.cancellationReasonCode = isExistingUserCancellation
        ? trimString(existingOrder.cancellationReasonCode || cancellationReasonCode)
        : cancellationReasonCode;
      updateData.cancellationReason = isExistingUserCancellation
        ? trimString(existingOrder.cancellationReason || cancellationReason || "Cancelled by user")
        : cancellationReason || "Cancelled by admin";
      updateData.cancelledAt = existingOrder.cancelledAt || new Date();
    } else {
      updateData.cancelledBy = "";
      updateData.cancellationReasonCode = "";
      updateData.cancellationReason = "";
      updateData.cancelledAt = null;
    }

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      updateData,
      { new: true }
    );

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
    const cancellationReasonCode = trimString(req.body?.reasonCode || req.body?.cancellationReasonCode).toLowerCase();
    const cancellationReason = USER_CANCELLATION_REASON_MAP[cancellationReasonCode] || "";

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!cancellationReasonCode) {
      return res.status(400).json({ message: "Please select a cancellation reason" });
    }

    if (!cancellationReason) {
      return res.status(400).json({ message: "Invalid cancellation reason selected" });
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
    order.cancelledBy = "user";
    order.cancellationReasonCode = cancellationReasonCode;
    order.cancellationReason = cancellationReason;
    order.cancelledAt = new Date();
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
