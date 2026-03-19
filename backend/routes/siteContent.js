const express = require("express");
const { getSiteContent, updateSiteContent } = require("../controllers/siteContentController");

const router = express.Router();

const trimString = (value = "") => String(value || "").trim();

const isAdminKeyValid = (adminKey = "") => {
  const configuredAdminKey = process.env.ADMIN_KEY || "";
  return Boolean(configuredAdminKey) && adminKey === configuredAdminKey;
};

const requireAdminKey = (req, res, next) => {
  const adminKey = trimString(req.headers["x-admin-key"] || "");

  if (!isAdminKeyValid(adminKey)) {
    return res.status(403).json({ message: "Admin access denied" });
  }

  next();
};

router.get("/", getSiteContent);
router.put("/", requireAdminKey, updateSiteContent);

module.exports = router;
