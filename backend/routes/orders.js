const express = require("express");
const nodemailer = require("nodemailer");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

const router = express.Router();

const TAX_RATE = 0.08;
const SHIPPING_CHARGE = 79;
const HALF_PAYMENT_TOLERANCE = 0.01;

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

const calculatePricing = (unitPrice, quantity) => {
  const subtotal = asTwoDecimals(Number(unitPrice || 0) * Number(quantity || 0));
  const taxAmount = asTwoDecimals(subtotal * TAX_RATE);
  const shippingCharge = subtotal > 0 ? SHIPPING_CHARGE : 0;
  const totalAmount = asTwoDecimals(subtotal + taxAmount + shippingCharge);
  const exactHalf = asTwoDecimals(totalAmount / 2);

  return {
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

const formatEmailText = ({ order, paymentLabel, paidNowAmount, remainingAmount }) => {
  return [
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
    "",
    `Delivery Address: ${order.address.fullAddress}`,
    `Expected Delivery: ${order.expectedDelivery}`,
    `Current Status: ${order.status}`,
  ].join("\n");
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
  const paymentLabel = isHalfPayment ? "Half Payment" : "Cash on Delivery";
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

router.post("/", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const productId = trimString(req.body?.productId);
    const quantity = Number(req.body?.quantity || 1);
    const paymentOption = trimString(req.body?.paymentOption || "cod").toLowerCase();
    const paidNowAmountRaw = Number(req.body?.paidNowAmount || 0);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!productId) {
      return res.status(400).json({ message: "Product is required" });
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    if (!["cod", "half"].includes(paymentOption)) {
      return res.status(400).json({ message: "Payment option must be cod or half" });
    }

    const user = await User.findOne({ email, isVerified: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const normalizedAddress = addressToObject(req.body?.address || user.address || {});
    const addressValidationError = validateAddress(normalizedAddress);

    if (addressValidationError) {
      return res.status(400).json({ message: addressValidationError });
    }

    const requestPhone = trimString(req.body?.phone);
    const userPhone = requestPhone || trimString(user.phone);

    if (!/^\d{10}$/.test(userPhone)) {
      return res.status(400).json({ message: "Please provide a valid 10-digit phone number" });
    }

    const pricing = calculatePricing(product.price, quantity);

    let paidNowAmount = 0;
    let paymentStatus = "pending";

    if (paymentOption === "half") {
      paidNowAmount = asTwoDecimals(paidNowAmountRaw);

      if (Math.abs(paidNowAmount - pricing.exactHalf) > HALF_PAYMENT_TOLERANCE) {
        return res.status(400).json({
          message: `For half payment, amount must be exactly ₹${pricing.exactHalf.toFixed(2)}`,
          expectedHalfAmount: pricing.exactHalf,
        });
      }

      paymentStatus = "partial";
    }

    const order = await Order.create({
      orderCode: `ORD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
      userEmail: email,
      userName: trimString(user.name) || "Customer",
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
      paymentOption,
      paidNowAmount,
      paymentStatus,
      address: normalizedAddress,
    });

    user.address = normalizedAddress;

    if (requestPhone && /^\d{10}$/.test(requestPhone)) {
      user.phone = requestPhone;
      order.userPhone = requestPhone;
    }

    await user.save();

    const emailResult = await sendOrderEmails(order);

    order.userEmailNotificationSent = emailResult.userSent;
    order.adminEmailNotificationSent = emailResult.adminSent;
    await order.save();

    return res.status(201).json({
      message: "Order placed successfully",
      expectedHalfAmount: pricing.exactHalf,
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
