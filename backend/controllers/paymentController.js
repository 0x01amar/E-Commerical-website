const crypto = require("crypto");
const Razorpay = require("razorpay");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const CheckoutSetting = require("../models/CheckoutSetting");

const DEFAULT_TAX_RATE = 0.08;
const DEFAULT_SHIPPING_CHARGE = 79;
const PAYMENT_CONFIG_ERROR_MESSAGE = "Payment gateway is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env or deployment environment variables.";

const trimString = (value = "") => String(value || "").trim();
const normalizeEmail = (email = "") => trimString(email).toLowerCase();
const asTwoDecimals = (value = 0) => Number(Number(value || 0).toFixed(2));

const generateOrderCode = () => `ORD-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

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

const validateOrderPayload = async ({ email, productId, quantity, address, phone, paymentOption, amount }) => {
  if (!email) {
    return { status: 400, message: "Email is required" };
  }

  if (!productId) {
    return { status: 400, message: "Product is required" };
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    return { status: 400, message: "Quantity must be at least 1" };
  }

  if (!["upi", "half"].includes(paymentOption)) {
    return { status: 400, message: "Payment option must be upi or half" };
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

  const pricingSettings = await getCheckoutPricingSettings();
  const effectivePricingSettings = resolvePricingForProduct(product, pricingSettings);
  const pricing = calculatePricing(product.price, quantity, effectivePricingSettings);
  const payableAmount = paymentOption === "half" ? pricing.exactHalf : pricing.totalAmount;

  if (amount !== undefined) {
    const requestedAmount = Number(amount);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return { status: 400, message: "Amount must be a valid positive number" };
    }

    if (Math.abs(requestedAmount - payableAmount) > 0.01) {
      return { status: 400, message: "Amount mismatch. Please refresh checkout and try again." };
    }
  }

  return {
    status: 200,
    user,
    product,
    normalizedAddress,
    userPhone,
    requestPhone,
    pricing,
    payableAmount,
  };
};

const createRazorpayOrder = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const productId = trimString(req.body?.productId);
    const quantity = Number(req.body?.quantity || 1);
    const paymentOption = trimString(req.body?.paymentOption || "").toLowerCase();
    const amount = req.body?.amount;

    const validation = await validateOrderPayload({
      email,
      productId,
      quantity,
      address: req.body?.address,
      phone: req.body?.phone,
      paymentOption,
      amount,
    });

    if (validation.status !== 200) {
      return res.status(validation.status).json({ message: validation.message });
    }

    const {
      user,
      product,
      normalizedAddress,
      userPhone,
      requestPhone,
      pricing,
      payableAmount,
    } = validation;

    const razorpay = getRazorpayClient();

    if (!razorpay) {
      return res.status(503).json({
        message: PAYMENT_CONFIG_ERROR_MESSAGE,
      });
    }

    const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`;

    const gatewayOrder = await razorpay.orders.create({
      amount: Math.round(payableAmount * 100),
      currency: "INR",
      receipt,
      notes: {
        userEmail: email,
        productId: String(product._id),
        quantity: String(quantity),
        paymentOption,
      },
    });

    const order = await Order.create({
      orderCode: generateOrderCode(),
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
      appliedTaxRate: Number(pricing.taxRate || 0),
      shippingCharge: pricing.shippingCharge,
      pricingSource: pricing.pricingSource || "global",
      totalAmount: pricing.totalAmount,
      paymentOption,
      paidNowAmount: asTwoDecimals(payableAmount),
      paymentStatus: "upi_pending_verification",
      paymentGateway: "razorpay",
      paymentApp: "",
      paymentPaidAt: null,
      upiTransactionId: "",
      gatewayOrderId: trimString(gatewayOrder.id),
      gatewayPaymentId: "",
      gatewaySignature: "",
      address: normalizedAddress,
      status: "Order Placed",
    });

    if (requestPhone && /^\d{10}$/.test(requestPhone)) {
      user.phone = requestPhone;
      user.address = normalizedAddress;
      await user.save();
    }

    return res.json({
      message: "Razorpay order created",
      key: process.env.RAZORPAY_KEY_ID,
      order: {
        id: trimString(gatewayOrder.id),
        amount: Number(gatewayOrder.amount || Math.round(payableAmount * 100)),
        currency: trimString(gatewayOrder.currency || "INR"),
        receipt: trimString(gatewayOrder.receipt || receipt),
      },
      internalOrderId: order._id,
      name: "Maa Sheela Iron Art",
      description: paymentOption === "half"
        ? `Half payment for ${trimString(product.name)}`
        : `Secure payment for ${trimString(product.name)}`,
      prefill: {
        name: trimString(user?.name) || "Customer",
        email,
        contact: userPhone,
      },
      payableAmount: asTwoDecimals(payableAmount),
      pricing: {
        taxRate: pricing.taxRate,
        subtotal: pricing.subtotal,
        taxAmount: pricing.taxAmount,
        shippingCharge: pricing.shippingCharge,
        totalAmount: pricing.totalAmount,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Failed to create Razorpay order" });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const internalOrderId = trimString(req.body?.internalOrderId);
    const razorpayOrderId = trimString(req.body?.razorpayOrderId);
    const razorpayPaymentId = trimString(req.body?.razorpayPaymentId);
    const razorpaySignature = trimString(req.body?.razorpaySignature);

    if (!email || !internalOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: "Payment verification payload is incomplete" });
    }

    const order = await Order.findById(internalOrderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (normalizeEmail(order.userEmail) !== email) {
      return res.status(403).json({ message: "Payment does not belong to this user" });
    }

    if (trimString(order.gatewayOrderId) !== razorpayOrderId) {
      return res.status(400).json({ message: "Order id mismatch" });
    }

    const razorpaySecret = trimString(process.env.RAZORPAY_KEY_SECRET || "");

    if (!razorpaySecret) {
      return res.status(503).json({
        message: PAYMENT_CONFIG_ERROR_MESSAGE,
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", razorpaySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const razorpay = getRazorpayClient();

    if (!razorpay) {
      return res.status(503).json({
        message: PAYMENT_CONFIG_ERROR_MESSAGE,
      });
    }

    const payment = await razorpay.payments.fetch(razorpayPaymentId);

    if (!payment || trimString(payment.order_id) !== razorpayOrderId) {
      return res.status(400).json({ message: "Payment/order mismatch" });
    }

    const paymentStatus = trimString(payment.status).toLowerCase();

    if (!["captured", "authorized"].includes(paymentStatus)) {
      return res.status(400).json({ message: "Payment was not successful" });
    }

    const expectedAmountPaise = Math.round(Number(order.paidNowAmount || 0) * 100);

    if (Number(payment.amount || 0) !== expectedAmountPaise) {
      return res.status(400).json({ message: "Paid amount mismatch" });
    }

    order.gatewayPaymentId = razorpayPaymentId;
    order.gatewaySignature = razorpaySignature;
    order.upiTransactionId = razorpayPaymentId;
    order.paymentPaidAt = payment?.created_at ? new Date(Number(payment.created_at) * 1000) : new Date();
    order.paymentApp = buildPaymentAppLabel(payment);
    order.paymentGateway = "razorpay";
    order.paymentStatus = order.paymentOption === "half" ? "partial" : "paid";

    await order.save();

    return res.json({
      message: "Payment verified successfully",
      verified: true,
      order,
    });
  } catch (error) {
    return res.status(500).json({ message: error?.message || "Failed to verify payment" });
  }
};

module.exports = {
  createRazorpayOrder,
  verifyRazorpayPayment,
};
