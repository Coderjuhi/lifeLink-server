// models/Hospital.js
const mongoose = require("mongoose");

const HospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  city: String,
  phone: String,
  lat: Number,
  lng: Number,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Hospital", HospitalSchema);