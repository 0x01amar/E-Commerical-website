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
