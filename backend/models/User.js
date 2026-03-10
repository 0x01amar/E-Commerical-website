const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  name:{
    type:String
   },

  email:{
    type:String,
    required:true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password:{
    type:String,
    select: false,
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  phone:{
    type:String
  },

  address:{
    type: mongoose.Schema.Types.Mixed,
    default: () => ({
      line1: "",
      landmark: "",
      villageTown: "",
      wardNo: "",
      district: "",
      state: "",
      pincode: "",
      fullAddress: "",
    }),
  },
  signupOtp:{
    type:String,
    select: false,
  },

  signupOtpExpire:{
    type:Date,
    select: false,
  },

  photo:{
    type:String
  },

  role:{
    type:String,
    enum:["user","admin"],
    default:"user"
  }

},{
  timestamps: true,
});

module.exports = mongoose.model("User",userSchema);