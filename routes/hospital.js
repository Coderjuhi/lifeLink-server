
const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Emergency = require("../models/Emergency");
 const Hospital = require("../models/Hospital");
const Response = require("../models/Respond");

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";


router.post("/add-hospital", async (req, res) => {
  try {
    const h = new Hospital(req.body);
    await h.save();
    res.json({ success: true, hospital: h });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/hospitals", async (req, res) => {
  try {
    const { city } = req.query;
    const q = city ? { city: { $regex: city, $options: "i" } } : {};
    const hospitals = await Hospital.find({ ...q, isActive: true });
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/hospitals/:id", async (req, res) => {
  try {
    const h = await Hospital.findById(req.params.id);
    if (!h) return res.status(404).json({ message: "Not found" });
    res.json(h);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /hospital-respond - hospital responds to a request
router.post("/hospital-respond", async (req, res) => {
  try {
    const token = req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET);
    const hospital = await User.findById(decoded.id);

    if (!hospital || hospital.accountType !== "hospital")
      return res.status(403).json({ message: "Only hospitals can respond here" });

    const { requestId, action } = req.body;
    if (!requestId) return res.status(400).json({ message: "requestId required" });

    const emergency = await Emergency.findById(requestId);
    if (!emergency) return res.status(404).json({ message: "Emergency not found" });

    // Check if hospital already responded
    const existing = await Response.findOne({
      requestId,
      hospitalId: hospital._id
    });
    if (existing) return res.json({ alreadyResponded: true });

    const response = new Response({
      requestId,
      hospitalId: hospital._id,
      hospitalName: hospital.name,
      action: action || "assigned",
      isRead: false
    });

    await response.save();
    res.json({ success: true, requestId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});
// POST /create-request - user creates emergency request
router.post("/create-request", async (req, res) => {
    try {
        const token =
            req.cookies?.token ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({ message: "No token found" });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const {
            donorType,
            donorBlood,
            organType,
            location,
            hospitalName,
            urgency,
        } = req.body;

        if (!donorType || !location) {
            return res.status(400).json({
                message: "donorType and location required",
            });
        }

        const emergency = new Emergency({
            userId: user._id,
            donorType,
            donorBlood:
                donorType === "Blood/Platelets" ? donorBlood : "",
            organType:
                donorType === "Organ Transplant" ? organType : "",
            location,
            hospitalName,
            urgency: urgency || "medium",
            responses: 0,
            status: "active",
        });

        await emergency.save();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;