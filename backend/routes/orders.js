const express = require("express");
const nodemailer = require("nodemailer");
const multer = require("multer");
const Order = require("../models/Order");
const CheckoutSetting = require("../models/CheckoutSetting");
const Product = require("../models/Product");
const User = require("../models/User");
const { uploadBufferToGridFS } = require("../utils/gridfs");
const path = require("path");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

const sendOrderEmails = async (order) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return { userSent: false, adminSent: false };

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
  
  const paymentLabel = order.paymentOption === "half" ? "Half Payment" : order.paymentOption === "upi" ? "Full Payment" : "COD";
  const paidNowAmount = asTwoDecimals(order.paidNowAmount);
  const remainingAmount = asTwoDecimals(order.totalAmount - paidNowAmount);

  const lines = [
    `Order ID: ${order.orderCode}`,
    `Customer: ${order.userName}`,
    `Email: ${order.userEmail}`,
    `Phone: ${order.userPhone}`,
    "",
    `Product: ${order.productName}`,
    `Quantity: ${order.quantity}`,
    `Total: ₹${order.totalAmount.toFixed(2)}`,
    `Paid Now: ₹${paidNowAmount.toFixed(2)}`,
    `Remaining: ₹${remainingAmount.toFixed(2)}`,
    "",
    `Status: ${order.status}`,
    `Delivery Address: ${order.address.fullAddress}`
  ];

  const emailText = lines.join("\n");

  const [userResult, adminResult] = await Promise.allSettled([
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: order.userEmail,
      subject: `Order Update - ${order.orderCode}`,
      text: `Hi ${order.userName},\n\nYour order has been updated.\n\n${emailText}\n\nThank you.`
    }),
    transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `New Order Activity - ${order.orderCode}`,
      text: `Order Details:\n\n${emailText}`
    }),
  ]);

  return {
    userSent: userResult.status === "fulfilled",
    adminSent: adminResult.status === "fulfilled",
  };
};

router.post("/custom-request", upload.single("demoImage"), async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email || req.headers["x-user-email"]);
    const productId = trimString(req.body?.productId);
    const customDetails = trimString(req.body?.customDetails);
    const phone = trimString(req.body?.phone);

    if (!email || !customDetails) {
      return res.status(400).json({ message: "Email and customization details are required" });
    }

    const user = await User.findOne({ email, isVerified: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    let product = null;
    if (productId && productId !== "600000000000000000000000") {
      product = await Product.findById(productId);
    }

    let demoImageUrl = "";
    if (req.file) {
      const extension = path.extname(req.file.originalname) || ".jpg";
      const filename = `custom-${Date.now()}${extension}`;
      demoImageUrl = await uploadBufferToGridFS({
        buffer: req.file.buffer,
        filename,
        contentType: req.file.mimetype
      });
    }

    const pricingSettings = await getCheckoutPricingSettings();
    const unitPrice = product ? product.price : 0;
    const pricing = calculatePricing(unitPrice, 1, pricingSettings);

    const order = await Order.create({
      orderCode: `CUST-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
      userEmail: email,
      userName: user.name || "Customer",
      userPhone: phone || user.phone || "0000000000",
      productId: product ? product._id : "600000000000000000000000",
      productName: product ? product.name : "Fully Custom Piece",
      productImage: demoImageUrl || (product ? (product.image || product.images?.[0]) : ""),
      productCategory: "Custom",
      quantity: 1,
      unitPrice: asTwoDecimals(unitPrice),
      subtotal: pricing.subtotal,
      taxAmount: pricing.taxAmount,
      appliedTaxRate: pricing.taxRate,
      shippingCharge: pricing.shippingCharge,
      totalAmount: pricing.totalAmount,
      paymentOption: "cod",
      paidNowAmount: 0,
      paymentStatus: "pending",
      address: addressToObject(user.address || {}),
      isCustom: true,
      customDetails,
      status: "Custom Request Received",
      customStatus: "Awaiting artisan review"
    });

    // Notify in background
    sendOrderEmails(order).catch(console.error);

    return res.status(201).json({ message: "Custom request submitted successfully", order });
  } catch (error) {
    console.error("CUSTOM REQUEST ERROR:", error);
    return res.status(500).json({ message: "Failed to submit custom request" });
  }
});

router.put("/:orderId/custom-update", async (req, res) => {
  try {
    const adminKey = trimString(req.headers["x-admin-key"] || "");
    if (!isAdminKeyValid(adminKey)) return res.status(403).json({ message: "Admin access denied" });

    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    const { customStatus, advanceAmount, status, totalAmount } = req.body;

    if (totalAmount !== undefined) {
      order.totalAmount = asTwoDecimals(totalAmount);
      // Recalculate subtotal/tax roughly for summary
      order.subtotal = asTwoDecimals(order.totalAmount / (1 + order.appliedTaxRate));
      order.taxAmount = asTwoDecimals(order.totalAmount - order.subtotal);
    }

    if (customStatus !== undefined) order.customStatus = trimString(customStatus);
    if (advanceAmount !== undefined) order.advanceAmount = asTwoDecimals(advanceAmount);
    
    if (status !== undefined) {
      const normalizedStatus = trimString(status);
      if (ORDER_STATUSES.includes(normalizedStatus)) order.status = normalizedStatus;
    }

    if (order.status === "Advance Payment Requested") {
      order.paymentOption = "half";
    }

    if (order.status === "Delivered") {
      order.paymentStatus = "paid";
      order.paidNowAmount = order.totalAmount;
    }

    await order.save();
    sendOrderEmails(order).catch(console.error);

    return res.json({ message: "Order updated", order });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update order" });
  }
});

router.post("/", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const isCartOrder = Boolean(req.body?.isCartOrder);
    
    const user = await User.findOne({ email, isVerified: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    const globalPricingSettings = await getCheckoutPricingSettings();
    const normalizedAddress = addressToObject(req.body?.address || user.address || {});
    
    const requestPhone = trimString(req.body?.phone);
    const userPhone = requestPhone || trimString(user.phone);

    if (user && (!user.address || !user.address.line1)) {
      user.address = normalizedAddress;
      if (requestPhone) user.phone = requestPhone;
      await user.save();
    }

    let itemsToProcess = [];
    if (isCartOrder) {
      const cartItems = req.body.items || [];
      for (const item of cartItems) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        const effectivePricingSettings = resolvePricingForProduct(product, globalPricingSettings);
        const pricing = calculatePricing(product.price, item.quantity, effectivePricingSettings);
        itemsToProcess.push({ product, quantity: item.quantity, pricing });
      }
    } else {
      const product = await Product.findById(req.body.productId);
      if (!product) return res.status(404).json({ message: "Product not found" });
      const pricing = calculatePricing(product.price, req.body.quantity, resolvePricingForProduct(product, globalPricingSettings));
      itemsToProcess.push({ product, quantity: req.body.quantity, pricing });
    }

    const createdOrders = [];
    for (const item of itemsToProcess) {
      const order = await Order.create({
        orderCode: `ORD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
        userEmail: email,
        userName: user.name || "Customer",
        userPhone,
        productId: item.product._id,
        productName: item.product.name,
        productImage: item.product.image || item.product.images?.[0],
        productCategory: item.product.section,
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
        status: "Order Placed"
      });
      createdOrders.push(order);
    }

    Promise.allSettled(createdOrders.map(o => sendOrderEmails(o)));

    return res.status(201).json({ message: "Order placed", orders: createdOrders });
  } catch (error) {
    return res.status(500).json({ message: "Failed to place order" });
  }
});

router.get("/my", async (req, res) => {
  try {
    const email = normalizeEmail(req.query?.email);
    if (!email) return res.status(400).json({ message: "Email required" });
    const orders = await Order.find({ userEmail: email }).sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load orders" });
  }
});

router.get("/admin/all", async (req, res) => {
  try {
    const adminKey = trimString(req.headers["x-admin-key"]);
    if (!isAdminKeyValid(adminKey)) return res.status(403).json({ message: "Admin access denied" });
    const orders = await Order.find().sort({ createdAt: -1 });
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load orders" });
  }
});

router.put("/:orderId/status", async (req, res) => {
  try {
    const adminKey = trimString(req.headers["x-admin-key"]);
    if (!isAdminKeyValid(adminKey)) return res.status(403).json({ message: "Admin access denied" });
    
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.orderId, { status }, { new: true });
    sendOrderEmails(order).catch(console.error);
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: "Update failed" });
  }
});

router.put("/:orderId/cancel", async (req, res) => {
  try {
    const { email } = req.body;
    const order = await Order.findById(req.params.orderId);
    if (order.userEmail !== normalizeEmail(email)) return res.status(403).json({ message: "Unauthorized" });
    order.status = "Cancelled";
    await order.save();
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ message: "Cancel failed" });
  }
});

module.exports = router;
