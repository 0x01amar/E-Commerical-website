require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
require("dotenv").config();
const authRoutes = require("./routes/auth");

const productRoutes = require("./routes/products");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth",authRoutes);
// image upload storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.use("/uploads", express.static("uploads"));

  mongoose.connect(process.env.MONGO_URI)
  .then(() => {
      console.log("MongoDB Connected");
  })
  .catch((err) => {
      console.log(err);
  });

app.use("/api/products", productRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
    res.send("Apna Furniture House Backend Running");
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});