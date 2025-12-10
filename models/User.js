const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },

  email: { type: String, required: true, unique: true, lowercase: true, trim: true },

  password: { type: String, required: true },

  accountType: { 
    type: String, 
    enum: ['donor', 'recipient', 'hospital', 'admin'], 
    required: true 
  },

  bloodType: { 
    type: String, 
    enum: ['A+','A-','B+','B-','O+','O-','AB+','AB-','Not Applicable'], 
    default: null 
  },

  phone: { type: String, trim: true },

  address: { type: String, trim: true },

  // ✅ NEW FIELD (for availability toggle)
  availability: { 
    type: Boolean, 
    default: true 
  },

  isActive: { type: Boolean, default: true }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
