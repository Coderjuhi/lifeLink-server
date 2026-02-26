const express = require("express");
const router = express.Router();

const Emergency = require("../models/Emergency");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET;


// Send Emergency Request
router.post("/emergency", async (req, res) => {

    try {

        // Token get karo
        const token =
            req.body.token ||
            req.cookies?.token ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            return res.status(401).json({
                message: "Token required"
            });
        }

        // Decode token
        const decoded = jwt.verify(token, JWT_SECRET);

        // User find karo
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }


        // Emergency entry create karo
        const request = new Emergency({

            sessionId: user._id,   // automatic user id

            donorType: req.body.donorType,

            bloodGrp: user.bloodType, // automatic blood group

            resolved: false

        });

        await request.save();

        res.json({
            message: "Emergency Request Sent Successfully"
        });

    } catch (err) {

        res.status(500).json({
            message: err.message
        })

    }

});



// GET Request Data API
router.get("/requestdata", async (req, res) => {
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

            "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
            "O+": ["O+", "A+", "B+", "AB+"],
            "A-": ["A-", "A+", "AB-", "AB+"],
            "A+": ["A+", "AB+"],
            "B-": ["B-", "B+", "AB-", "AB+"],
            "B+": ["B+", "AB+"],
            "AB-": ["AB-", "AB+"],
            "AB+": ["AB+"]

        };


        const donateTo = compatibility[bloodType] || [];


        // Compatible users find karo
        const users = await User.find({
           _id: { $ne: decoded.id },
            bloodType: { $in: donateTo },
            address: address
        }).select("name bloodType address phone");
        
        if (users.length === 0) {
      return res.status(200).json({
        message: "No users available in your city with compatible blood group"
      });
    }


        res.json({
            sessionId: decoded.id,  // send correct id
            address,
            bloodType,
            compatibleBloodGroups: donateTo,
            totalMatched: users.length,
            donateTo,
            data: users

        });

    } catch (err) {

        res.status(500).json({
            message: err.message
        })

    }

});

module.exports = router;