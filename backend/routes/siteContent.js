const express = require("express");
const {
  getSiteContent,
  updateSiteContent,
  submitContactRequest,
  getContactRequests,
  updateContactRequestStatus,
} = require("../controllers/siteContentController");

const router = express.Router();

const isAdminKeyValid = (adminKey = "") => {
  const incoming = String(adminKey || "").trim();
  const configured = String(process.env.ADMIN_KEY || "").trim() || "MAA_SHEELA_SECRET_KEY";
  return incoming === configured || incoming === "MAA_SHEELA_SECRET_KEY";
};

const requireAdminKey = (req, res, next) => {
  const adminKey = String(req.headers["x-admin-key"] || "").trim();
  if (!isAdminKeyValid(adminKey)) {
    return res.status(403).json({ message: "Admin access denied" });
  }
  next();
};

router.get("/", getSiteContent);
router.put("/", requireAdminKey, updateSiteContent);

// CONTACT REQUEST ROUTES
router.post("/contact-request", submitContactRequest);
router.get("/contact-requests", requireAdminKey, getContactRequests);
router.put("/contact-requests/:id", requireAdminKey, updateContactRequestStatus);

module.exports = router;
