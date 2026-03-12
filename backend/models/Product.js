const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  price: {
    type: Number,
    required: true,
  },

  category: {
    type: String,
    default: "",
    trim: true,
  },

  section: {
    type: String,
    required: true,
    default: "General",
    trim: true,
  },

  description: {
    type: String,
    default: "",
    trim: true,
  },

  image: {
    type: String,
    default: "",
    trim: true,
  },

  images: {
    type: [String],
    default: [],
  },

  stock: {
    type: Number,
    default: 0,
  },

  warranty:{
    type:String,
    default: "",
    trim: true,
  },

  ratingAverage: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },

  ratingCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  ratings: {
    type: [
      {
        userEmail: {
          type: String,
          required: true,
          trim: true,
          lowercase: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          default: "",
          trim: true,
        },
        reviewImages: {
          type: [String],
          default: [],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: [],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Product", productSchema);