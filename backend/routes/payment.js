const express = require("express");
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("../controllers/paymentController");

const router = express.Router();

router.get("/health", (_req, res) => {
  const keyIdPresent = Boolean(String(process.env.RAZORPAY_KEY_ID || "").trim());
  const keySecretPresent = Boolean(String(process.env.RAZORPAY_KEY_SECRET || "").trim());

  return res.json({
    provider: "razorpay",
    configured: keyIdPresent && keySecretPresent,
    keyIdPresent,
    keySecretPresent,
    checkedAt: new Date().toISOString(),
  });
});

router.post("/orders", createRazorpayOrder);
router.post("/verify", verifyRazorpayPayment);

module.exports = router;
