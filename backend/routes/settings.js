const express = require("express");
const multer = require("multer");
const CheckoutSetting = require("../models/CheckoutSetting");
const { uploadBufferToGridFS, deleteGridFSFileByPath } = require("../utils/gridfs");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const DEFAULT_CHECKOUT_SETTINGS = {
  taxRate: 0.08,
  shippingCharge: 79,
};

const trimString = (value = "") => String(value || "").trim();

const isAdminKeyValid = (adminKey = "") => {
  const incoming = String(adminKey || "").trim();
  const configured = String(process.env.ADMIN_KEY || "").trim() || "MAA_SHEELA_SECRET_KEY";
  return incoming === configured || incoming === "MAA_SHEELA_SECRET_KEY";
};

const normalizeCheckoutSettings = (settings = {}) => {
  return {
    taxRate: Number(settings.taxRate ?? DEFAULT_CHECKOUT_SETTINGS.taxRate),
    shippingCharge: Number(settings.shippingCharge ?? DEFAULT_CHECKOUT_SETTINGS.shippingCharge),
    heroImageUrl: String(settings.heroImageUrl || "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80"),
  };
};

const getOrCreateCheckoutSettings = async () => {
  let settings = await CheckoutSetting.findOne({ key: "default" });

  if (settings) {
    return settings;
  }

  settings = await CheckoutSetting.create({
    key: "default",
    ...DEFAULT_CHECKOUT_SETTINGS,
  });

  return settings;
};

const requireAdminKey = (req, res, next) => {
  const adminKey = String(req.headers["x-admin-key"] || "").trim();

  if (!isAdminKeyValid(adminKey)) {
    return res.status(403).json({ message: "Admin access denied" });
  }

  next();
};

router.get("/checkout-pricing", async (_req, res) => {
  try {
    const settings = await getOrCreateCheckoutSettings();
    return res.json(normalizeCheckoutSettings(settings));
  } catch (error) {
    return res.status(500).json({ message: "Failed to load checkout pricing settings" });
  }
});

router.put("/checkout-pricing", async (req, res) => {
  try {
    const adminKey = trimString(req.headers["x-admin-key"] || "");

    if (!isAdminKeyValid(adminKey)) {
      return res.status(403).json({ message: "Admin access denied" });
    }

    const nextTaxRate = Number(req.body?.taxRate);
    const nextShippingCharge = Number(req.body?.shippingCharge);

    if (!Number.isFinite(nextTaxRate) || nextTaxRate < 0 || nextTaxRate > 1) {
      return res.status(400).json({ message: "Tax rate must be between 0 and 1" });
    }

    if (!Number.isFinite(nextShippingCharge) || nextShippingCharge < 0) {
      return res.status(400).json({ message: "Shipping charge must be a non-negative number" });
    }

    const settings = await getOrCreateCheckoutSettings();
    settings.taxRate = Number(nextTaxRate.toFixed(4));
    settings.shippingCharge = Number(nextShippingCharge.toFixed(2));
    settings.updatedBy = "admin";

    await settings.save();

    return res.json({
      message: "Checkout pricing settings updated",
      settings: normalizeCheckoutSettings(settings),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update checkout pricing settings" });
  }
});

router.get("/hero-image", async (_req, res) => {
  try {
    const settings = await getOrCreateCheckoutSettings();
    return res.json({
      heroImageUrl: String(settings.heroImageUrl || "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80"),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load hero image" });
  }
});

router.put("/hero-image", requireAdminKey, upload.single("heroImage"), async (req, res) => {
  let uploadedImagePath = "";

  try {
    const adminKey = trimString(req.headers["x-admin-key"] || "");

    if (!isAdminKeyValid(adminKey)) {
      return res.status(403).json({ message: "Admin access denied" });
    }

    const heroUrl = trimString(req.body?.heroImageUrl || "");
    const settings = await getOrCreateCheckoutSettings();

    if (req.file && req.file.buffer && req.file.buffer.length > 0) {
      // Upload new image if provided
      uploadedImagePath = await uploadBufferToGridFS(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      if (uploadedImagePath) {
        settings.heroImageUrl = uploadedImagePath;
      } else {
        return res.status(400).json({ message: "Failed to upload image" });
      }
    } else if (heroUrl) {
      // Use provided URL if no file uploaded
      settings.heroImageUrl = heroUrl;
    }

    settings.updatedBy = "admin";
    await settings.save();

    return res.json({
      message: "Hero image updated",
      heroImageUrl: settings.heroImageUrl,
    });
  } catch (error) {
    if (uploadedImagePath) {
      await deleteGridFSFileByPath(uploadedImagePath);
    }
    return res.status(500).json({ message: "Failed to update hero image" });
  }
});

module.exports = router;
