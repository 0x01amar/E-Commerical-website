const SiteContent = require("../models/SiteContent");

const DEFAULT_SITE_CONTENT = {
  shopName: "Maa Sheela Iron Art",
  tagline: "We provide high-quality furniture, iron works, wooden products, custom designs, and more at the best prices.",
  contactNumber: "",
  whatsAppNumber: "",
  address: "",
  email: "",
};

const trimString = (value = "") => String(value || "").trim();

const hasOwn = (payload = {}, key = "") => Object.prototype.hasOwnProperty.call(payload || {}, key);

const isValidPhoneNumber = (value = "") => {
  const digits = String(value || "").replace(/\D+/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

const isValidEmail = (value = "") => {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const normalizeSiteContent = (siteContent = {}) => ({
  shopName: trimString(siteContent.shopName) || DEFAULT_SITE_CONTENT.shopName,
  tagline: trimString(siteContent.tagline) || DEFAULT_SITE_CONTENT.tagline,
  contactNumber: trimString(siteContent.contactNumber),
  whatsAppNumber: trimString(siteContent.whatsAppNumber),
  address: trimString(siteContent.address),
  email: trimString(siteContent.email),
});

const getOrCreateSiteContent = async () => {
  let siteContent = await SiteContent.findOne({ key: "default" });

  if (siteContent) {
    return siteContent;
  }

  siteContent = await SiteContent.create({
    key: "default",
    ...DEFAULT_SITE_CONTENT,
  });

  return siteContent;
};

const getSiteContent = async (_req, res) => {
  try {
    const siteContent = await getOrCreateSiteContent();
    return res.json(normalizeSiteContent(siteContent));
  } catch (error) {
    return res.status(500).json({ message: "Failed to load site content" });
  }
};

const updateSiteContent = async (req, res) => {
  try {
    const payload = req.body || {};
    const siteContent = await getOrCreateSiteContent();

    if (hasOwn(payload, "shopName")) {
      const nextShopName = trimString(payload.shopName);

      if (!nextShopName) {
        return res.status(400).json({ message: "Shop name is required" });
      }

      siteContent.shopName = nextShopName;
    }

    if (hasOwn(payload, "tagline")) {
      const nextTagline = trimString(payload.tagline);

      if (!nextTagline) {
        return res.status(400).json({ message: "Tagline is required" });
      }

      siteContent.tagline = nextTagline;
    }

    if (hasOwn(payload, "contactNumber")) {
      const nextContactNumber = trimString(payload.contactNumber);

      if (nextContactNumber && !isValidPhoneNumber(nextContactNumber)) {
        return res.status(400).json({ message: "Contact number must contain 10 to 15 digits" });
      }

      siteContent.contactNumber = nextContactNumber;
    }

    if (hasOwn(payload, "whatsAppNumber")) {
      const nextWhatsAppNumber = trimString(payload.whatsAppNumber);

      if (nextWhatsAppNumber && !isValidPhoneNumber(nextWhatsAppNumber)) {
        return res.status(400).json({ message: "WhatsApp number must contain 10 to 15 digits" });
      }

      siteContent.whatsAppNumber = nextWhatsAppNumber;
    }

    if (hasOwn(payload, "address")) {
      siteContent.address = trimString(payload.address);
    }

    if (hasOwn(payload, "email")) {
      const nextEmail = trimString(payload.email).toLowerCase();

      if (!isValidEmail(nextEmail)) {
        return res.status(400).json({ message: "Please provide a valid email address" });
      }

      siteContent.email = nextEmail;
    }

    siteContent.updatedBy = "admin";
    await siteContent.save();

    return res.json({
      message: "Site content updated",
      siteContent: normalizeSiteContent(siteContent),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update site content" });
  }
};

module.exports = {
  getSiteContent,
  updateSiteContent,
};
