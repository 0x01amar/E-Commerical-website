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

  phone:{
    type:String
  },

  address:{
    type:String
  },
  otp:{
    type:String,
    select: false,
  },

  otpExpire:{
    type:Date,
    select: false,
  },

  pendingPassword: {
    type: String,
    select: false,
  },

  pendingPasswordExpire: {
    type: Date,
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