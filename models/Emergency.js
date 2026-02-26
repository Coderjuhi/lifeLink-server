const mongoose = require("mongoose");

const emergencySchema = new mongoose.Schema({

 sessionId: String,

 donorType: String,

 bloodGrp: String,

 resolved: {
  type: Boolean,
  default: false
 }

});

module.exports = mongoose.model("Emergency", emergencySchema);