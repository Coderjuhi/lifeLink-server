const express = require("express");
const router = express.Router();

const Emergency = require("../models/Emergency");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;


router.put("/update-profile", async (req, res) => {

    try {

        const token = req.cookies.token;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findByIdAndUpdate(
            decoded.id,
            {
                name: req.body.name,
                address: req.body.address
            },
            { new: true }
        );

        res.json({
            user
        });

    } catch (err) {

        res.status(500).json({
            message: "Error updating profile"
        });

    }

});
// Send Emergency Request
router.post("/emergency", async (req, res) => {

    try {

        const token =
            req.body.token ||
            req.cookies?.token ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                message: "Token required"
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const request = new Emergency({
            sessionId: user._id,
            donorType: req.body.donorType,
            bloodGrp: user.bloodType,   
            organType: req.body.donorType === "Organ Transplant"
                ? req.body.organType
                : null,
            resolved: false
        });

        await request.save();

        res.json({
            message: "Emergency Request Sent Successfully"
        });

    } catch (err) {

        res.status(500).json({
            message: err.message
        });

    }

});

// GET Request Data API
router.get("/donordata", async (req, res) => {
    try {
        const token =
            req.cookies?.token ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                message: "Token required"
            });
        }
        // 2 Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id);
        // User find karo
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const bloodType = user.bloodType;
        const address = user.address;
        // Blood compatibility table
        const compatibility = {

            "O-": ["O-"],
            "O+": ["O-", "O+"],
            "A-": ["O-", "A-"],
            "A+": ["O-", "O+", "A-", "A+"],
            "B-": ["O-", "B-"],
            "B+": ["O-", "O+", "B-", "B+"],
            "AB-": ["O-", "A-", "B-", "AB-"],
            "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]

        };

        const receiveFrom = compatibility[bloodType] || [];
        // Compatible users find karo
        const users = await User.find({
            _id: { $ne: decoded.id },
            accountType: "donor",   // 
            availability: true,
            isActive: true,
            bloodType: { $in: receiveFrom },
            address: { $regex: new RegExp(address, "i") }
        }).select("name bloodType address phone");

        if (users.length === 0) {
            return res.status(200).json({
                message: "No users available in your city with compatible blood group",
                data: []
            });
        }

        res.json({
            sessionId: decoded.id,  // send correct id
            address,
            bloodType,
            compatibleBloodGroups: receiveFrom,
            totalMatched: users.length,
            receiveFrom,
            data: users

        });

    } catch (err) {

        res.status(500).json({
            message: err.message
        })

    }

});


// GET Request Data API
router.get("/recipientdata", async (req, res) => {

    try {
        const token =
            req.cookies?.token ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                message: "Token required"
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const bloodType = user.bloodType;

        // Extract city from address
        const address = user.address.trim();
        const city = address.split(",").pop().trim();

        // Blood compatibility table
        const donateCompatibility = {
            "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
            "O+": ["O+", "A+", "B+", "AB+"],
            "A-": ["A-", "A+", "AB-", "AB+"],
            "A+": ["A+", "AB+"],
            "B-": ["B-", "B+", "AB-", "AB+"],
            "B+": ["B+", "AB+"],
            "AB-": ["AB-", "AB+"],
            "AB+": ["AB+"]
        };

        const donateTo = donateCompatibility[bloodType] || [];

        // Find compatible recipients
        const users = await User.find({
            _id: { $ne: decoded.id },
            accountType: "recipient",
            availability: true,
            isActive: true,
            bloodType: { $in: donateTo },
            address: { $regex: city, $options: "i" } // match city anywhere
        }).select("name bloodType address phone");

        if (users.length === 0) {
            return res.status(200).json({
                message: "No users available in your city with compatible blood group",
                data: []
            });
        }

        res.json({
            sessionId: decoded.id,
            city,
            bloodType,
            compatibleBloodGroups: donateTo,
            totalMatched: users.length,
            data: users
        });

    } catch (err) {

        res.status(500).json({
            message: err.message
        });

    }

});

router.get("/nearby-requests", async (req, res) => {

  try {

    const token =
      req.cookies?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        message: "Token required"
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    const donor = await User.findById(decoded.id);

    if (!donor) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const donorBlood = donor.bloodType;

    // SAME ADDRESS LOGIC AS recipientdata
    const address = donor.address.trim();
    const city = address.split(",").pop().trim();

    // Blood donation compatibility
    const donateCompatibility = {
      "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
      "O+": ["O+", "A+", "B+", "AB+"],
      "A-": ["A-", "A+", "AB-", "AB+"],
      "A+": ["A+", "AB+"],
      "B-": ["B-", "B+", "AB-", "AB+"],
      "B+": ["B+", "AB+"],
      "AB-": ["AB-", "AB+"],
      "AB+": ["AB+"]
    };

    const donateTo = donateCompatibility[donorBlood] || [];

    // Find emergency requests
    const requests = await Emergency.find({
      resolved: false,
      bloodGrp: { $in: donateTo }
    }).populate("sessionId", "name address phone");

    // SAME CITY FILTER AS recipientdata
    const filtered = requests.filter(req =>
      req.sessionId?.address?.toLowerCase().includes(city.toLowerCase())
    );

    res.json({
      donorCity: city,
      donorBloodType: donorBlood,
      totalRequests: filtered.length,
      data: filtered
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

module.exports = router;