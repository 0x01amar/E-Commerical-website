const mongoose = require("mongoose");

const checkoutSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default",
      trim: true,
    },
    taxRate: {
      type: Number,
      required: true,
      default: 0.08,
      min: 0,
      max: 1,
    },
    shippingCharge: {
      type: Number,
      required: true,
      default: 79,
      min: 0,
    },
    heroImageUrl: {
      type: String,
      default: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80",
      trim: true,
    },
    updatedBy: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CheckoutSetting", checkoutSettingSchema);
