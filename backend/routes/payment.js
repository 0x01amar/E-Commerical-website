const express = require("express");
const {
  createRazorpayOrder,
  verifyRazorpayPayment,
} = require("../controllers/paymentController");

const router = express.Router();

router.post("/orders", createRazorpayOrder);
router.post("/verify", verifyRazorpayPayment);

module.exports = router;
