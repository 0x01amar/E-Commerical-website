require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");

const app = express();
const uploadsDirectory = path.join(__dirname, "uploads");

fs.mkdirSync(uploadsDirectory, { recursive: true });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDirectory));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.log(err);
  });

app.get("/", (req, res) => {
  res.send("Apna Furniture House Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});