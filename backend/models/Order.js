const mongoose = require("mongoose");

const orderAddressSchema = new mongoose.Schema(
  {
    line1: {
      type: String,
      required: true,
      trim: true,
    },
    landmark: {
      type: String,
      trim: true,
      default: "",
    },
    villageTown: {
      type: String,
      required: true,
      trim: true,
    },
    wardNo: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
    fullAddress: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderCode: {
      type: String,
      required: true,
      unique: true,
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
    paymentOption: {
      type: String,
      enum: ["cod", "half", "upi"],
      required: true,
    },
    upiTransactionId: {
      type: String,
      default: "",
      trim: true,
    },
    paidNowAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "upi_pending_verification"],
      default: "pending",
    },
    status: {
      type: String,
      enum: [
        "Order Placed",
        "Confirmed",
        "Processing",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Order Placed",
    },
    expectedDelivery: {
      type: String,
      default: "10-15 days",
    },
    address: {
      type: orderAddressSchema,
      required: true,
    },
    userEmailNotificationSent: {
      type: Boolean,
      default: false,
    },
    adminEmailNotificationSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
