const express = require("express");
const CheckoutSetting = require("../models/CheckoutSetting");

const router = express.Router();

const DEFAULT_CHECKOUT_SETTINGS = {
  taxRate: 0.08,
  shippingCharge: 79,
};

const trimString = (value = "") => String(value || "").trim();

const isAdminKeyValid = (adminKey = "") => {
  const configuredAdminKey = process.env.ADMIN_KEY || "";
  return Boolean(configuredAdminKey) && adminKey === configuredAdminKey;
};

const normalizeCheckoutSettings = (settings = {}) => {
  return {
    taxRate: Number(settings.taxRate ?? DEFAULT_CHECKOUT_SETTINGS.taxRate),
    shippingCharge: Number(settings.shippingCharge ?? DEFAULT_CHECKOUT_SETTINGS.shippingCharge),
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

module.exports = router;
