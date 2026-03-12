const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const Product = require("../models/Product");
const Section = require("../models/Section");
const Order = require("../models/Order");


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
    const extension = path.extname(file.originalname || "");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

const upload = multer({ storage: storage });

const toNumber = (value, fallback = 0) => {
  const converted = Number(value);
  return Number.isFinite(converted) ? converted : fallback;
};

const trimString = (value = "") => String(value || "").trim();

const normalizeEmail = (email = "") => trimString(email).toLowerCase();

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const isTruthy = (value) => ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());

const asArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return trimmed.includes(",") ? trimmed.split(",") : [trimmed];
    }
  }

  return [value];
};

const uniqueImageList = (values = []) => {
  const normalized = values
    .map((value) => trimString(value))
    .filter(Boolean);

  return Array.from(new Set(normalized));
};

const uploadedFilesToImagePaths = (filesByField = {}) => {
  const files = [
    ...(filesByField?.images || []),
    ...(filesByField?.image || []),
  ];

  return uniqueImageList(files.map((file) => (file?.filename ? `/uploads/${file.filename}` : "")));
};

const normalizeProductResponse = (productDocument) => {
  const product = productDocument?.toObject ? productDocument.toObject() : { ...productDocument };
  const mergedImages = uniqueImageList([...(product.images || []), product.image]);

  const mainImage = trimString(product.image) || mergedImages[0] || "";

  product.images = mergedImages.length ? mergedImages : (mainImage ? [mainImage] : []);
  product.image = mainImage;
  product.section = trimString(product.section) || trimString(product.category) || "General";
  product.category = trimString(product.category) || product.section;
  product.ratingAverage = Number(product.ratingAverage || 0);
  product.ratingCount = Number(product.ratingCount || 0);
  product.ratings = Array.isArray(product.ratings)
    ? product.ratings
      .map((entry) => ({
        userEmail: normalizeEmail(entry?.userEmail),
        rating: Number(entry?.rating || 0),
        comment: trimString(entry?.comment),
        createdAt: entry?.createdAt,
        updatedAt: entry?.updatedAt,
      }))
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    : [];

  return product;
};

const computeRatingSummary = (ratings = []) => {
  const validRatings = ratings.filter((entry) => Number(entry?.rating) >= 1 && Number(entry?.rating) <= 5);
  const ratingCount = validRatings.length;

  if (!ratingCount) {
    return {
      ratingAverage: 0,
      ratingCount: 0,
    };
  }

  const total = validRatings.reduce((sum, entry) => sum + Number(entry.rating || 0), 0);

  return {
    ratingAverage: Number((total / ratingCount).toFixed(1)),
    ratingCount,
  };
};

const slugify = (value = "") =>
  trimString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getUniqueSectionSlug = async (baseSlug, excludeSectionId = "") => {
  let attempt = baseSlug;
  let suffix = 1;

  while (true) {
    const existingSection = await Section.findOne({
      slug: attempt,
      ...(excludeSectionId ? { _id: { $ne: excludeSectionId } } : {}),
    });

    if (!existingSection) {
      return attempt;
    }

    attempt = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
};

const ensureSectionExists = async (sectionName) => {
  const normalizedName = trimString(sectionName);

  if (!normalizedName) {
    return null;
  }

  const existing = await Section.findOne({ name: new RegExp(`^${escapeRegex(normalizedName)}$`, "i") });

  if (existing) {
    return existing;
  }

  const baseSlug = slugify(normalizedName);
  const slug = await getUniqueSectionSlug(baseSlug);

  return Section.create({
    name: normalizedName,
    slug,
  });
};

const resolveMainImage = ({ images = [], mainImage, mainImageIndex }) => {
  const normalizedImages = uniqueImageList(images);
  const normalizedMain = trimString(mainImage);
  const parsedIndex = Number(mainImageIndex);

  if (normalizedMain && normalizedImages.includes(normalizedMain)) {
    return normalizedMain;
  }

  if (Number.isInteger(parsedIndex) && parsedIndex >= 0 && parsedIndex < normalizedImages.length) {
    return normalizedImages[parsedIndex];
  }

  return normalizedImages[0] || "";
};

const didUserPurchaseProduct = async (email, productId) => {
  if (!email || !productId) {
    return false;
  }

  const purchasedOrder = await Order.findOne({
    userEmail: normalizeEmail(email),
    productId,
    status: { $ne: "Cancelled" },
  }).select("_id");

  return Boolean(purchasedOrder);
};

const isAdminKeyValid = (adminKey = "") => {
  const configuredAdminKey = process.env.ADMIN_KEY || "";
  return Boolean(configuredAdminKey) && adminKey === configuredAdminKey;
};

const requireAdminKey = (req, res, next) => {
  const adminKey = String(req.headers["x-admin-key"] || "");

  if (!isAdminKeyValid(adminKey)) {
    return res.status(403).json({ message: "Admin access denied" });
  }

  next();
};


/* CREATE PRODUCT + IMAGE */

router.get("/sections", async (req, res) => {
  try {
    let sections = await Section.find().sort({ displayOrder: 1, name: 1 });

    if (!sections.length) {
      const defaultSectionNames = [
        "Wooden Chair",
        "Iron Chair",
        "Wooden Bed",
        "Iron Bed",
        "White Bed",
      ];

      const productSectionNames = await Product.distinct("section");
      const sourceNames = productSectionNames.length ? productSectionNames : defaultSectionNames;

      for (const [index, rawName] of sourceNames.entries()) {
        const name = trimString(rawName);

        if (!name) {
          continue;
        }

        const exists = await Section.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, "i") });

        if (exists) {
          continue;
        }

        const slug = await getUniqueSectionSlug(slugify(name));
        await Section.create({
          name,
          slug,
          displayOrder: index,
        });
      }

      sections = await Section.find().sort({ displayOrder: 1, name: 1 });
    }

    return res.json(sections);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load sections" });
  }
});

router.post("/sections", requireAdminKey, async (req, res) => {
  try {
    const name = trimString(req.body?.name);
    const displayOrder = toNumber(req.body?.displayOrder, 0);

    if (!name) {
      return res.status(400).json({ message: "Section name is required" });
    }

    const existingSection = await Section.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, "i") });

    if (existingSection) {
      return res.status(409).json({ message: "Section already exists" });
    }

    const baseSlug = slugify(name);
    const slug = await getUniqueSectionSlug(baseSlug);

    const section = await Section.create({
      name,
      slug,
      displayOrder,
    });

    return res.status(201).json(section);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create section" });
  }
});

router.put("/sections/:sectionId", requireAdminKey, async (req, res) => {
  try {
    const section = await Section.findById(req.params.sectionId);

    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }

    const nextName = req.body?.name !== undefined ? trimString(req.body.name) : section.name;
    const nextDisplayOrder = req.body?.displayOrder !== undefined
      ? toNumber(req.body.displayOrder, section.displayOrder)
      : section.displayOrder;

    if (!nextName) {
      return res.status(400).json({ message: "Section name is required" });
    }

    const duplicateSection = await Section.findOne({
      _id: { $ne: section._id },
      name: new RegExp(`^${escapeRegex(nextName)}$`, "i"),
    });

    if (duplicateSection) {
      return res.status(409).json({ message: "Section with this name already exists" });
    }

    const oldName = section.name;

    section.name = nextName;
    section.displayOrder = nextDisplayOrder;

    if (nextName !== oldName) {
      section.slug = await getUniqueSectionSlug(slugify(nextName), String(section._id));
      await Product.updateMany(
        { section: oldName },
        {
          $set: {
            section: nextName,
          },
        }
      );
    }

    await section.save();

    return res.json(section);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update section" });
  }
});

router.post("/", requireAdminKey, upload.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 25 },
]), async (req, res) => {
  try {

    const name = trimString(req.body?.name);
    const section = trimString(req.body?.section || req.body?.category || "General");

    if (!name) {
      return res.status(400).json({ message: "Product name is required" });
    }

    const requestedImages = uniqueImageList(asArray(req.body?.images));
    const uploadedImages = uploadedFilesToImagePaths(req.files);
    const images = uniqueImageList([...requestedImages, ...uploadedImages]);
    const image = resolveMainImage({
      images,
      mainImage: req.body?.mainImage,
      mainImageIndex: req.body?.mainImageIndex,
    });

    const ratingAverage = clamp(toNumber(req.body?.ratingAverage, 0), 0, 5);
    const ratingCount = Math.max(0, Math.round(toNumber(req.body?.ratingCount, 0)));

    await ensureSectionExists(section);

    const newProduct = new Product({
      name,
      price: toNumber(req.body.price),
      category: trimString(req.body.category || section),
      section,
      description: trimString(req.body.description),
      warranty: trimString(req.body.warranty),
      stock: toNumber(req.body.stock),
      image,
      images,
      ratingAverage,
      ratingCount,
    });

    const savedProduct = await newProduct.save();

    res.status(201).json(normalizeProductResponse(savedProduct));

  } catch (error) {
    res.status(500).json({ message: "Failed to create product" });
  }
});


/* GET ALL PRODUCTS */

router.get("/", async (req, res) => {
  try {

    const section = trimString(req.query?.section);
    const category = trimString(req.query?.category);
    const query = {};

    if (section) {
      query.section = section;
    }

    if (category) {
      query.category = category;
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    res.json(products.map(normalizeProductResponse));

  } catch (error) {
    res.status(500).json({ message: "Failed to load products" });
  }
});

router.get("/:id/can-rate", async (req, res) => {
  try {
    const email = normalizeEmail(req.query?.email);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const product = await Product.findById(req.params.id).select("ratingAverage ratingCount ratings");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const canRate = await didUserPurchaseProduct(email, req.params.id);
    const existingRating = (product.ratings || []).find((entry) => normalizeEmail(entry.userEmail) === email);

    return res.json({
      canRate,
      hasRated: Boolean(existingRating),
      currentRating: existingRating
        ? {
          rating: Number(existingRating.rating || 0),
          comment: trimString(existingRating.comment),
        }
        : null,
      ratingAverage: Number(product.ratingAverage || 0),
      ratingCount: Number(product.ratingCount || 0),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to verify rating eligibility" });
  }
});

router.post("/:id/rate", async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const rating = Number(req.body?.rating);
    const comment = trimString(req.body?.comment);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const canRate = await didUserPurchaseProduct(email, req.params.id);

    if (!canRate) {
      return res.status(403).json({ message: "You can rate this product only after purchase" });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const ratings = Array.isArray(product.ratings) ? product.ratings : [];
    const existingRatingIndex = ratings.findIndex((entry) => normalizeEmail(entry.userEmail) === email);

    if (existingRatingIndex >= 0) {
      ratings[existingRatingIndex].rating = Number(rating.toFixed(1));
      ratings[existingRatingIndex].comment = comment;
      ratings[existingRatingIndex].updatedAt = new Date();
    } else {
      ratings.push({
        userEmail: email,
        rating: Number(rating.toFixed(1)),
        comment,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    product.ratings = ratings;
    const summary = computeRatingSummary(ratings);
    product.ratingAverage = summary.ratingAverage;
    product.ratingCount = summary.ratingCount;

    await product.save();

    return res.json({
      message: existingRatingIndex >= 0 ? "Rating updated" : "Rating submitted",
      ratingSummary: summary,
      product: normalizeProductResponse(product),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit rating" });
  }
});

router.put("/:id/admin-rating", requireAdminKey, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (req.body?.ratingAverage !== undefined) {
      product.ratingAverage = clamp(toNumber(req.body.ratingAverage, Number(product.ratingAverage || 0)), 0, 5);
    }

    if (req.body?.ratingCount !== undefined) {
      product.ratingCount = Math.max(0, Math.round(toNumber(req.body.ratingCount, Number(product.ratingCount || 0))));
    }

    if (isTruthy(req.body?.clearUserRatings)) {
      product.ratings = [];

      if (req.body?.ratingAverage === undefined) {
        product.ratingAverage = 0;
      }

      if (req.body?.ratingCount === undefined) {
        product.ratingCount = 0;
      }
    }

    await product.save();

    return res.json({
      message: "Admin rating updated",
      product: normalizeProductResponse(product),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update admin rating" });
  }
});


/* REVIEW IMAGE UPLOAD */

router.post("/:id/review", upload.array("reviewImages", 5), async (req, res) => {
  try {
    const email = normalizeEmail(req.headers["x-user-email"] || "");
    const rating = Number(req.body?.rating);
    const comment = trimString(req.body?.comment);

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    if (!comment) {
      return res.status(400).json({ message: "Comment is required" });
    }

    const canRate = await didUserPurchaseProduct(email, req.params.id);

    if (!canRate) {
      return res.status(403).json({ message: "You can review this product only after purchase" });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Upload review images
    const reviewImagePaths = (req.files || []).map((file) => `/uploads/${file.filename}`);

    const ratings = Array.isArray(product.ratings) ? product.ratings : [];
    const existingRatingIndex = ratings.findIndex((entry) => normalizeEmail(entry.userEmail) === email);

    if (existingRatingIndex >= 0) {
      ratings[existingRatingIndex].rating = Number(rating.toFixed(1));
      ratings[existingRatingIndex].comment = comment;
      ratings[existingRatingIndex].reviewImages = reviewImagePaths;
      ratings[existingRatingIndex].updatedAt = new Date();
    } else {
      ratings.push({
        userEmail: email,
        rating: Number(rating.toFixed(1)),
        comment,
        reviewImages: reviewImagePaths,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    product.ratings = ratings;
    const summary = computeRatingSummary(ratings);
    product.ratingAverage = summary.ratingAverage;
    product.ratingCount = summary.ratingCount;

    await product.save();

    return res.json({
      message: existingRatingIndex >= 0 ? "Review updated" : "Review submitted",
      ratingSummary: summary,
      product: normalizeProductResponse(product),
    });
  } catch (error) {
    console.error("Review upload error:", error);
    return res.status(500).json({ message: "Failed to submit review" });
  }
});


/* GET SINGLE PRODUCT */

router.get("/:id", async (req, res) => {
  try {

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(normalizeProductResponse(product));

  } catch (error) {
    res.status(500).json({ message: "Failed to load product" });
  }
});


/* UPDATE PRODUCT */

router.put("/:id", requireAdminKey, upload.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 25 },
]), async (req, res) => {
  try {

    const existingProduct = await Product.findById(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updateData = {};

    if (req.body.name !== undefined) updateData.name = trimString(req.body.name);
    if (req.body.price !== undefined) updateData.price = toNumber(req.body.price);
    if (req.body.description !== undefined) updateData.description = trimString(req.body.description);
    if (req.body.warranty !== undefined) updateData.warranty = trimString(req.body.warranty);
    if (req.body.stock !== undefined) updateData.stock = toNumber(req.body.stock);

    const nextSection = req.body.section !== undefined || req.body.category !== undefined
      ? trimString(req.body.section || req.body.category || existingProduct.section || "General")
      : trimString(existingProduct.section || existingProduct.category || "General");

    updateData.section = nextSection;
    updateData.category = req.body.category !== undefined
      ? trimString(req.body.category || nextSection)
      : trimString(existingProduct.category || nextSection);

    await ensureSectionExists(nextSection);

    const baseImages = uniqueImageList((existingProduct.images || []).length
      ? existingProduct.images
      : [existingProduct.image]);

    const hasImageListUpdate = req.body.existingImages !== undefined
      || req.body.images !== undefined
      || req.body.clearImages !== undefined
      || req.body.removeImage !== undefined;

    let nextImages = hasImageListUpdate
      ? uniqueImageList(
        isTruthy(req.body.clearImages)
          ? []
          : asArray(req.body.existingImages !== undefined ? req.body.existingImages : req.body.images)
      )
      : baseImages;

    if (req.body.removeImage !== undefined) {
      const imagesToRemove = uniqueImageList(asArray(req.body.removeImage));
      nextImages = nextImages.filter((imagePath) => !imagesToRemove.includes(imagePath));
    }

    const uploadedImages = uploadedFilesToImagePaths(req.files);
    if (uploadedImages.length) {
      nextImages = uniqueImageList([...nextImages, ...uploadedImages]);
    }

    const mainImage = resolveMainImage({
      images: nextImages,
      mainImage: req.body.mainImage !== undefined ? req.body.mainImage : existingProduct.image,
      mainImageIndex: req.body.mainImageIndex,
    });

    updateData.images = nextImages;
    updateData.image = mainImage;

    if (req.body.ratingAverage !== undefined) {
      updateData.ratingAverage = clamp(toNumber(req.body.ratingAverage, Number(existingProduct.ratingAverage || 0)), 0, 5);
    }

    if (req.body.ratingCount !== undefined) {
      updateData.ratingCount = Math.max(0, Math.round(toNumber(req.body.ratingCount, Number(existingProduct.ratingCount || 0))));
    }

    if (isTruthy(req.body.clearUserRatings)) {
      updateData.ratings = [];

      if (req.body.ratingAverage === undefined) {
        updateData.ratingAverage = 0;
      }

      if (req.body.ratingCount === undefined) {
        updateData.ratingCount = 0;
      }
    }


    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(normalizeProductResponse(updatedProduct));

  } catch (error) {
    res.status(500).json({ message: "Failed to update product" });
  }
});


/* DELETE PRODUCT */

router.delete("/:id", requireAdminKey, async (req, res) => {
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
    res.status(500).json({ message: "Failed to delete product" });
  }
});


module.exports = router;