const express = require("express");
const router = express.Router();
const multer = require("multer");
const Product = require("../models/Product");


/*
   IMAGE UPLOAD SETUP
  */

// multer storage configuration
// images backend/uploads folder mein save hogi
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + file.originalname);
  }
});

const upload = multer({ storage: storage });

const toNumber = (value, fallback = 0) => {
  const converted = Number(value);
  return Number.isFinite(converted) ? converted : fallback;
};


/* CREATE PRODUCT + IMAGE */

router.post("/", upload.single("image"), async (req, res) => {
  try {

    if (!req.body.name || !req.body.category) {
      return res.status(400).json({ message: "Name and category are required" });
    }

    const newProduct = new Product({
      name: req.body.name,
      price: toNumber(req.body.price),
      category: req.body.category,
      description: req.body.description || "",
      warranty: req.body.warranty || "",
      stock: toNumber(req.body.stock),

      // image path MongoDB mein save hoga
      image: req.file ? `/uploads/${req.file.filename}` : ""
    });

    const savedProduct = await newProduct.save();

    res.json(savedProduct);

  } catch (error) {
    res.status(500).json(error);
  }
});


/* GET ALL PRODUCTS */

router.get("/", async (req, res) => {
  try {

    const products = await Product.find();

    res.json(products);

  } catch (error) {
    res.status(500).json(error);
  }
});


/* GET SINGLE PRODUCT */

router.get("/:id", async (req, res) => {
  try {

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);

  } catch (error) {
    res.status(500).json(error);
  }
});


/* UPDATE PRODUCT */

router.put("/:id", upload.single("image"), async (req, res) => {
  try {

    const updateData = {};

    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.price !== undefined) updateData.price = toNumber(req.body.price);
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.warranty !== undefined) updateData.warranty = req.body.warranty;
    if (req.body.stock !== undefined) updateData.stock = toNumber(req.body.stock);

    // Agar new image upload hu hai toh path update karega 
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(updatedProduct);

  } catch (error) {
    res.status(500).json(error);
  }
});


/* DELETE PRODUCT */

router.delete("/:id", async (req, res) => {
  try {

    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      message: "Product deleted successfully",
      deletedProduct
    });

  } catch (error) {
    res.status(500).json(error);
  }
});


module.exports = router;