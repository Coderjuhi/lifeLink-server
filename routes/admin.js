const express = require("express");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;


// Admin signin route
router.post("/", (req, res) => {
    const { email, password } = req.body;

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const token = jwt.sign(
            { email, accountType: "admin" },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.json({
            message: "Admin logged in successfully",
            email,
            accountType: "admin"
        });
    }

    return res.status(401).json({ message: "Invalid email or password" });
});

// Admin info route
router.get("/me", (req, res) => {
    const token = req.cookies?.token;
    if (!token)
        return res.status(401).json({ message: "Not logged in" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.accountType !== "admin")
            return res.status(403).json({ message: "Forbidden" });

        res.json({ user: { email: decoded.email, accountType: "admin" } });
    } catch (err) {
        res.status(401).json({ message: "Invalid token" });
    }
});


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
