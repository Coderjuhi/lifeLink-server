const mongoose = require("mongoose");

const emergencySchema = new mongoose.Schema({

  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  donorType: String,

  bloodGrp: String,

  organType: String,

  resolved: {
    type: Boolean,
    default: false
  }

},{
    timestamps:true
});

module.exports = mongoose.model("Emergency", emergencySchema);