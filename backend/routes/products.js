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


/* CREATE PRODUCT + IMAGE */

router.post("/", upload.single("image"), async (req, res) => {
  try {

    const newProduct = new Product({
      name: req.body.name,
      price: req.body.price,
      category: req.body.category,

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

    res.json(product);

  } catch (error) {
    res.status(500).json(error);
  }
});


/* UPDATE PRODUCT */

router.put("/:id", upload.single("image"), async (req, res) => {
  try {

    const updateData = {
      name: req.body.name,
      price: req.body.price,
      category: req.body.category
    };

    // Agar new image upload hu hai toh path update karega 
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(updatedProduct);

  } catch (error) {
    res.status(500).json(error);
  }
});


/* DELETE PRODUCT */

router.delete("/:id", async (req, res) => {
  try {

    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    res.json({
      message: "Product deleted successfully",
      deletedProduct
    });

  } catch (error) {
    res.status(500).json(error);
  }
});


module.exports = router;