const mongoose = require("mongoose");

const siteContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default",
      trim: true,
    },
    shopName: {
      type: String,
      required: true,
      default: "Maa Sheela Iron Arts",
      trim: true,
    },
    tagline: {
      type: String,
      required: true,
      default: "We provide high-quality furniture, iron works, wooden products, custom designs, and more at the best prices.",
      trim: true,
    },
    contactNumber: {
      type: String,
      default: "",
      trim: true,
    },
    whatsAppNumber: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },
    mapEmbedUrl: {
      type: String,
      default: "",
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

module.exports = mongoose.model("SiteContent", siteContentSchema);
