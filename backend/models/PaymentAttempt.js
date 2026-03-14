const mongoose = require("mongoose");

const paymentAddressSchema = new mongoose.Schema(
  {
    line1: { type: String, required: true, trim: true },
    landmark: { type: String, default: "", trim: true },
    villageTown: { type: String, required: true, trim: true },
    wardNo: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    fullAddress: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const paymentAttemptSchema = new mongoose.Schema(
  {
    gateway: {
      type: String,
      required: true,
      default: "razorpay",
      trim: true,
    },
    gatewayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["initiated", "verified", "failed", "cancelled"],
      default: "initiated",
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    userPhone: {
      type: String,
      required: true,
      trim: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productImage: {
      type: String,
      default: "",
      trim: true,
    },
    productCategory: {
      type: String,
      default: "",
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingCharge: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    exactHalf: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPayable: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentOption: {
      type: String,
      enum: ["half", "upi"],
      required: true,
    },
    address: {
      type: paymentAddressSchema,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
      trim: true,
    },
    paymentId: {
      type: String,
      default: "",
      trim: true,
    },
    paymentSignature: {
      type: String,
      default: "",
      trim: true,
    },
    paymentMethod: {
      type: String,
      default: "",
      trim: true,
    },
    paymentApp: {
      type: String,
      default: "",
      trim: true,
    },
    paymentPaidAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: "",
      trim: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PaymentAttempt", paymentAttemptSchema);
