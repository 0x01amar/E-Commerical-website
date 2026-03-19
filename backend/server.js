const express = require("express");
const path = require("path");
const fs = require("fs");
const envPath = path.join(__dirname, ".env");
require("dotenv").config({ path: envPath });
const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const paymentRoutes = require("./routes/payment");
const settingsRoutes = require("./routes/settings");
const siteContentRoutes = require("./routes/siteContent");
const { getGridFSBucket, setGridFSBucket } = require("./utils/gridfs");

const app = express();
const uploadsDirectory = path.join(__dirname, "uploads");

fs.mkdirSync(uploadsDirectory, { recursive: true });

if (!fs.existsSync(envPath)) {
  console.warn("Missing backend/.env file.");
}

app.use(cors());
app.use(express.json());
const serveGridFSImage = async (req, res) => {
  const bucket = getGridFSBucket();

  if (!bucket) {
    return res.status(503).send("Image storage unavailable");
  }

  if (!ObjectId.isValid(req.params.id)) {
    return res.status(404).send("Image not found");
  }

  const fileId = new ObjectId(req.params.id);
  const files = await bucket.find({ _id: fileId }).toArray();
  const file = files[0];

  if (!file) {
    return res.status(404).send("Image not found");
  }

  if (file.contentType) {
    res.set("Content-Type", file.contentType);
  }

  res.set("Cache-Control", "public, max-age=31536000, immutable");

  const downloadStream = bucket.openDownloadStream(fileId);

  downloadStream.on("error", () => {
    if (!res.headersSent) {
      res.status(404).send("Image not found");
    } else {
      res.end();
    }
  });

  downloadStream.pipe(res);
};

app.get("/uploads/gridfs/:id", serveGridFSImage);
app.get("/uploads/gridfs/:id/:filename", serveGridFSImage);
app.use("/uploads", express.static(uploadsDirectory));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/site-content", siteContentRoutes);
app.use("/api", (_req, res) => {
  res.status(404).json({ message: "API route not found" });
});

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn("Razorpay keys are missing. Online payment endpoints will return configuration errors.");
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    setGridFSBucket(mongoose.connection.db);
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.log(err);
  });

app.get("/", (req, res) => {
  res.send("Maa Sheela Iron Art Backend Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});