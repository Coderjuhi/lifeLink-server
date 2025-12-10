const express = require("express");
const User = require("../models/User");

const router = express.Router();

// ADMIN DASHBOARD STATS

router.get("/stats", async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeDonors = await User.countDocuments({
            accountType: "donor",
            isActive: true
        });

        const partnerHospitals = await User.countDocuments({
            accountType: "hospital"
        });

        const livesConnected = activeDonors + partnerHospitals; 

        return res.json({
            totalUsers,
            activeDonors,
            partnerHospitals,
            livesConnected
        });

    } catch (err) {
        console.error("Stats error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});


// GET ALL USERS (ADMIN)

router.get("/users", async (req, res) => {
    try {
        const users = await User.find().select("-password");
        return res.json(users);
    } catch (err) {
        console.error("Users fetch error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});


// GET ALL DONORS
router.get("/donors", async (req, res) => {
    try {
        const donors = await User.find({ accountType: "donor" }).select("-password");

        return res.json(donors);
    } catch (err) {
        console.error("Donors fetch error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});


///GET ALL HOSPITALS
router.get("/hospitals", async (req, res) => {
    try {
        const hospitals = await User.find({ accountType: "hospital" })
            .select("-password");

        return res.json(hospitals);
    } catch (err) {
        console.error("Hospital fetch error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});







module.exports = router;
