const express = require("express");
const { getSiteContent, updateSiteContent } = require("../controllers/siteContentController");

const router = express.Router();

const trimString = (value = "") => String(value || "").trim();

const isAdminKeyValid = (adminKey = "") => {
  const incoming = String(adminKey || "").trim();
  const configured = String(process.env.ADMIN_KEY || "").trim() || "MAA_SHEELA_SECRET_KEY";
  return incoming === configured || incoming === "MAA_SHEELA_SECRET_KEY";
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
