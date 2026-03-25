const mongoose = require("mongoose");

const ResponseSchema = new mongoose.Schema({

  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Emergency",
    required: true
  },

  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  donorName: String,

  donorType: {
    type: String,
    enum: ["Blood/Platelets", "Organ Transplant"]
  },

  donorBlood: String,

  organType: String,

  donorPhone: String,
   

  donorLocation: String,
  isRead: {
    type: Boolean,
    default: false
  },

  status: {
  type: String,
  enum: ["pending", "accepted", "rejected"],
  default: "pending"
},
 
responsesCount: {
  type: Number,
  default: 0
},
ownerType: {
  type: String, 
},

requestedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User"
},
}, { timestamps: true });

ResponseSchema.index({ requestId: 1, donorId: 1 }, { unique: true });

module.exports = mongoose.model("Response", ResponseSchema);