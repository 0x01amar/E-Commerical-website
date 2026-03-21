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

  if (!keyId || !keySecret) return null;

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

const addressToObject = (address = {}) => {
  if (typeof address === "string") {
    const trimmed = trimString(address);
    return { line1: trimmed, landmark: "", villageTown: "", wardNo: "", district: "", state: "", pincode: "", fullAddress: trimmed };
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
    normalized.line1, normalized.landmark, normalized.villageTown,
    normalized.wardNo ? `Ward No ${normalized.wardNo}` : "",
    normalized.district, normalized.state, normalized.pincode
  ].filter(Boolean).join(", ");
  normalized.fullAddress = normalized.fullAddress || composedFullAddress;
  return normalized;
};

const validateAddress = (address = {}) => {
  const requiredFields = ["line1", "villageTown", "district", "state", "pincode"];
  const missingField = requiredFields.find((field) => !trimString(address[field]));
  if (missingField) return `Address field '${missingField}' is required`;
  if (!/^\d{6}$/.test(address.pincode)) return "Pincode must be exactly 6 digits";
  return "";
};

const createRazorpayOrder = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const isCartOrder = Boolean(req.body?.isCartOrder);
    const paymentOption = trimString(req.body?.paymentOption || "upi").toLowerCase();
    
    const user = await User.findOne({ email, isVerified: true });
    if (!user) return res.status(404).json({ message: "User not found" });

    const pricingSettings = await getCheckoutPricingSettings();
    let totalSubtotal = 0;
    let totalShippingCharge = 0;
    let itemsToProcess = [];

    if (isCartOrder) {
      const cartItems = req.body.items || [];
      if (!Array.isArray(cartItems) || cartItems.length === 0) return res.status(400).json({ message: "Cart is empty" });
      
      for (const item of cartItems) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        const qty = Math.max(1, Number(item.quantity || 1));
        totalSubtotal += (product.price * qty);
        
        // Sum individual shipping charges
        const itemShipping = Number.isFinite(product.shippingCharge) ? product.shippingCharge : pricingSettings.shippingCharge;
        totalShippingCharge += itemShipping;
        
        itemsToProcess.push({ product, quantity: qty, shippingCharge: itemShipping });
      }
    } else {
      const productId = trimString(req.body?.productId);
      const quantity = Math.max(1, Number(req.body?.quantity || 1));
      const product = await Product.findById(productId);
      if (!product) return res.status(404).json({ message: "Product not found" });
      totalSubtotal = product.price * quantity;
      
      totalShippingCharge = Number.isFinite(product.shippingCharge) ? product.shippingCharge : pricingSettings.shippingCharge;
      
      itemsToProcess.push({ product, quantity, shippingCharge: totalShippingCharge });
    }

    if (itemsToProcess.length === 0) return res.status(400).json({ message: "No valid products to order" });

    const taxAmount = asTwoDecimals(totalSubtotal * pricingSettings.taxRate);
    const totalAmount = asTwoDecimals(totalSubtotal + taxAmount + totalShippingCharge);
    const payableAmountPaise = Math.round(totalAmount * 100);

    const razorpay = getRazorpayClient();
    if (!razorpay) return res.status(503).json({ message: PAYMENT_CONFIG_ERROR_MESSAGE });

    const gatewayOrder = await razorpay.orders.create({
      amount: payableAmountPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { userEmail: email, isCartOrder: String(isCartOrder) }
    });

    const normalizedAddress = addressToObject(req.body?.address || user.address || {});
    const userPhone = trimString(req.body?.phone) || trimString(user.phone);

    // Create Order records
    const orders = [];
    for (const item of itemsToProcess) {
      const order = await Order.create({
        orderCode: generateOrderCode(),
        userEmail: email,
        userName: user.name || "Customer",
        userPhone,
        productId: item.product._id,
        productName: item.product.name,
        productImage: item.product.image || (item.product.images?.[0]),
        productCategory: item.product.section || item.product.category,
        quantity: item.quantity,
        unitPrice: item.product.price,
        subtotal: item.product.price * item.quantity,
        taxAmount: (item.product.price * item.quantity) * pricingSettings.taxRate,
        appliedTaxRate: pricingSettings.taxRate,
        shippingCharge: item.shippingCharge,
        totalAmount: (item.product.price * item.quantity) * (1 + pricingSettings.taxRate) + item.shippingCharge,
        paymentOption,
        paidNowAmount: totalAmount, // The full payment for the session
        paymentStatus: "upi_pending_verification",
        paymentGateway: "razorpay",
        gatewayOrderId: gatewayOrder.id,
        address: normalizedAddress,
        status: "Order Placed",
      });
      orders.push(order);
    }

    return res.json({
      key: process.env.RAZORPAY_KEY_ID,
      order: { id: gatewayOrder.id, amount: gatewayOrder.amount, currency: gatewayOrder.currency },
      internalOrderId: orders[0]._id, // Use the first one as reference for verification
      internalOrderIds: orders.map(o => o._id),
      name: "Maa Sheela Iron Arts",
      description: isCartOrder ? `Payment for ${itemsToProcess.length} items` : `Payment for ${itemsToProcess[0].product.name}`,
      prefill: { name: user.name, email, contact: userPhone },
    });

  } catch (error) {
    console.error("RAZORPAY ORDER ERROR:", error);
    return res.status(500).json({ message: error.message || "Failed to create Razorpay order" });
  }
};

const createCustomAdvanceRazorpayOrder = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const orderId = trimString(req.body?.orderId);

    if (!email || !orderId) {
      return res.status(400).json({ message: "Email and order ID are required" });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.userEmail !== email) return res.status(403).json({ message: "Unauthorized" });
    if (!order.isCustom || order.status !== "Advance Payment Requested") return res.status(400).json({ message: "Invalid order state for advance payment" });

    const advanceAmount = asTwoDecimals(order.advanceAmount);
    if (!(advanceAmount > 0)) {
      return res.status(400).json({ message: "Advance amount is not set" });
    }

    const payableAmountPaise = Math.round(advanceAmount * 100);
    const razorpay = getRazorpayClient();
    if (!razorpay) return res.status(503).json({ message: PAYMENT_CONFIG_ERROR_MESSAGE });

    const gatewayOrder = await razorpay.orders.create({
      amount: payableAmountPaise,
      currency: "INR",
      receipt: `rcpt_adv_${order._id}`,
      notes: { orderId: order._id.toString(), type: "advance" }
    });

    order.gatewayOrderId = gatewayOrder.id;
    await order.save();

    return res.json({
      key: process.env.RAZORPAY_KEY_ID,
      order: { id: gatewayOrder.id, amount: gatewayOrder.amount, currency: gatewayOrder.currency },
      internalOrderId: order._id,
      name: "Maa Sheela Iron Arts",
      description: `Advance Payment for Custom Order ${order.orderCode}`,
      prefill: { name: order.userName, email: order.userEmail, contact: order.userPhone },
    });
  } catch (error) {
    console.error("CUSTOM ADVANCE ERROR:", error);
    return res.status(500).json({ message: "Failed to initiate advance payment" });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { internalOrderId, internalOrderIds, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!email || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ message: "Missing payment verification details" });
    }

    if (!razorpaySecret) {
      return res.status(503).json({ message: PAYMENT_CONFIG_ERROR_MESSAGE });
    }

    const generatedSignature = crypto.createHmac("sha256", razorpaySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");

    if (generatedSignature !== razorpaySignature) return res.status(400).json({ message: "Invalid signature" });

    // Update related orders
    const idsToUpdate = Array.isArray(internalOrderIds) ? internalOrderIds : [internalOrderId];
    if (!idsToUpdate[0]) {
      return res.status(400).json({ message: "Internal order ID is required" });
    }
    
    const sampleOrder = await Order.findById(idsToUpdate[0]);
    if (!sampleOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isAdvance = sampleOrder.isCustom
      && sampleOrder.status === "Advance Payment Requested"
      && !sampleOrder.isAdvancePaid;

    const updateData = { 
      gatewayPaymentId: razorpayPaymentId, 
      gatewaySignature: razorpaySignature,
      paymentPaidAt: new Date()
    };

    if (isAdvance) {
      const effectiveAdvanceAmount = asTwoDecimals(sampleOrder.advanceAmount);
      const effectiveTotalAmount = asTwoDecimals(sampleOrder.totalAmount);

      updateData.isAdvancePaid = true;
      updateData.paymentStatus = effectiveAdvanceAmount >= effectiveTotalAmount ? "paid" : "partial";
      updateData.status = "Confirmed";
      updateData.paidNowAmount = Math.min(effectiveAdvanceAmount, effectiveTotalAmount);
    } else {
      updateData.paymentStatus = "paid";
    }

    await Order.updateMany(
      { _id: { $in: idsToUpdate }, userEmail: email },
      updateData
    );

    const firstOrder = await Order.findById(idsToUpdate[0]);
    return res.json({ message: "Payment verified", verified: true, order: firstOrder });
  } catch (error) {
    console.error("VERIFY ERROR:", error);
    return res.status(500).json({ message: error.message });
  }
};

const buildPaymentAppLabel = (payment = {}) => {
  const method = trimString(payment?.method).toLowerCase();
  if (method === "upi") return `UPI (${trimString(payment?.vpa)})`;
  return method.toUpperCase() || "Online";
};

module.exports = { createRazorpayOrder, verifyRazorpayPayment, createCustomAdvanceRazorpayOrder };
