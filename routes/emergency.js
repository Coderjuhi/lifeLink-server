const express = require("express");
const router = express.Router();

const Emergency = require("../models/Emergency");
const Response = require("../models/Respond");

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
      req.cookies?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

   let existingRequest;

//Only restrict RECIPIENT (not hospital)
if (user.accountType !== "hospital") {

  if (req.body.donorType === "Blood/Platelets") {

    existingRequest = await Emergency.findOne({
      sessionId: user._id,
      donorType: "Blood/Platelets",
      ownerType: user.accountType,
      resolved: false
    });

  } else if (req.body.donorType === "Organ Transplant") {

    existingRequest = await Emergency.findOne({
      sessionId: user._id,
      donorType: "Organ Transplant",
      organType: req.body.organType,
      ownerType: user.accountType,
      resolved: false
    });

  }

  if (existingRequest) {
    return res.json({ alreadySent: true });
  }
}
  const request = new Emergency({
  sessionId: user._id,
  donorType: req.body.donorType,

 bloodGrp:
  user.accountType === "recipient"
      ? user.bloodType
      :req.body.bloodGrp || null,

  organType:
    req.body.donorType === "Organ Transplant"
      ? req.body.organType || null
      : null,

  ownerType: user.accountType,
  resolved: false
});

    await request.save();

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/my-emergency", async (req, res) => {
  try {

    const token =
      req.cookies?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    const decoded = jwt.verify(token, JWT_SECRET);

    const requests = await Emergency.find({
      sessionId: decoded.id,
      resolved: false
    });

    res.json({
      active: requests.length > 0,
      requests
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/accept-response/:id", async (req, res) => {
  try {
    const responseId = req.params.id;

    const accepted = await Response.findByIdAndUpdate(
      responseId,
      { status: "accepted", isRead: false }, 
      { new: true }
    ).populate("requestId");

    if (!accepted) return res.status(404).json({ message: "Response not found" });
    await Response.updateMany(
      { requestId: accepted.requestId._id, _id: { $ne: responseId } },
      { $set: { status: "rejected" } }
    );

    res.json({ success: true, accepted });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/assign-hospital", async (req, res) => {
  try {
    const { responseId, hospitalId } = req.body;

    const updated = await Response.findByIdAndUpdate(
      responseId,
      { hospitalId },
      { new: true }
    ).populate("hospitalId");

    if (!updated) return res.status(404).json({ message: "Response not found" });


    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/accepted-response", async (req, res) => {
  try {
    const token =
      req.cookies?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) return res.status(401).json({ message: "Token required" });

    const decoded = jwt.verify(token, JWT_SECRET);

    // find accepted response for this donor
    const accepted = await Response.findOne({
      donorId: decoded.id.toString(),
      status: "accepted"
    })
    if (!accepted) return res.json({ accepted: false });

    res.json({ accepted: true, data: accepted });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
      return res.status(401).json({ message: "Token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const donor = await User.findById(decoded.id);

    if (!donor) {
      return res.status(404).json({ message: "User not found" });
    }

    const donorBlood = donor.bloodType;

    const address = donor.address.trim();
    const city = address.split(",").pop().trim();

    
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

 let query = { resolved: false };

// 🧠 If user is DONOR → apply compatibility
if (donor.accountType === "donor") {
  query.$or = [
    {
      donorType: "Blood/Platelets",
      bloodGrp: { $in: donateTo }
    },
    {
      donorType: "Organ Transplant",
      bloodGrp: { $in: donateTo }
    }
  ];
}

// 🏥 If user is HOSPITAL → show ALL requests
else if (donor.accountType === "hospital") {
    query.ownerType = "hospital";

  query.$or = [
    { donorType: "Blood/Platelets" },
    { donorType: "Organ Transplant" }
  ];
}
const requests = await Emergency.find(query)
  .populate("sessionId", "name address phone accountType");
    
    const filtered = requests
      .filter(req =>
        req.sessionId?.address?.toLowerCase().includes(city.toLowerCase())
      )
      .map(req => ({
        ...req.toObject(),
        ownerType: req.sessionId?.accountType 
      }));

    res.json({
      donorCity: city,
      donorBloodType: donorBlood,
      totalRequests: filtered.length,
      data: filtered
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/respond", async (req, res) => {
  try {
    const token =
      req.cookies?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    const decoded = jwt.verify(token, JWT_SECRET);

    const donor = await User.findById(decoded.id);

    if (!req.body.requestId) {
      return res.status(400).json({ message: "requestId required" });
    }

    const emergency = await Emergency.findById(req.body.requestId);

    if (!emergency) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    // prevent duplicate response
    const existing = await Response.findOne({
      requestId: emergency._id,
      donorId: donor._id
    });

    if (existing) {
      return res.json({ alreadyResponded: true });
    }

    // create response
    const response = new Response({
      requestId: emergency._id,
      donorId: donor._id,
      donorName: donor.name,
      donorType: emergency.donorType,
      donorBlood: donor.bloodType,
      organType: emergency.organType,
      donorPhone: donor.phone,
      donorLocation: donor.address,
  ownerType: emergency.ownerType, 
  requestedBy: emergency.sessionId  
    });

    await response.save();

;

    res.json({
      success: true,
      requestId: emergency._id
    });

  } catch (err) {
    console.error(err);

    if (err.code === 11000) {
      return res.json({ alreadyResponded: true });
    }

    res.status(500).json({ message: err.message });
  }
});


router.get("/my-responses", async (req, res) => {

  const token =
    req.cookies?.token ||
    req.header("Authorization")?.replace("Bearer ", "");

  const decoded = jwt.verify(token, JWT_SECRET);

  const responses = await Response.find({
    donorId: decoded.id
  }).select("requestId");

  res.json({
    data: responses
  });

});

router.get("/responses", async (req, res) => {
  try {

    const token =
      req.cookies?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    const decoded = jwt.verify(token, JWT_SECRET);

    const donorId = decoded.id;

    const responses = await Response.find({ donorId });

    res.json({
      total: responses.length,
      data: responses
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/responses/:requestId", async (req, res) => {

  try {

    const responses = await Response.find({
      requestId: req.params.requestId
    });

    res.json({
      total: responses.length,
      data: responses
    });

  } catch (err) {

    res.status(500).json({
      message: err.message
    });

  }

});

router.get("/notifications", async (req, res) => {

  try {

    const token =
      req.cookies?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    const decoded = jwt.verify(token, JWT_SECRET);

    const emergencies = await Emergency.find({
      sessionId: decoded.id
    });

    const requestIds = emergencies.map(e => e._id);

    const responses = await Response.find({
      requestId: { $in: requestIds }
    }).sort({ createdAt: -1 });

    res.json(responses);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

});

router.put("/notifications/read", async (req, res) => {

  try {

    const token =
      req.cookies?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    const decoded = jwt.verify(token, JWT_SECRET);

    const emergencies = await Emergency.find({
      sessionId: decoded.id
    });

    const requestIds = emergencies.map(e => e._id);

    await Response.updateMany(
      { requestId: { $in: requestIds } },
      { $set: { isRead: true } }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

});

router.get("/request-notifications", async (req, res) => {

  try {

    const token =
      req.cookies?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    const decoded = jwt.verify(token, JWT_SECRET);

    const donor = await User.findById(decoded.id);

    if (!donor) {
      return res.status(404).json({ message: "User not found" });
    }

    const donorBlood = donor.bloodType;

    const address = donor.address.trim();
    const city = address.split(",").pop().trim();

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

    const requests = await Emergency.find({
      resolved: false,
      bloodGrp: { $in: donateTo }
    }).populate("sessionId", "name address accountType");

  
    const filtered = requests.filter(req =>
      req.sessionId?.address?.toLowerCase().includes(city.toLowerCase())
    );
      const final = filtered.map(req => ({
      ...req.toObject(),
      ownerType: req.sessionId?.accountType
    }));

res.json({
  data: final,
  unreadCount: final.filter(r => !r.isRead).length
});
  } catch (err) {

    res.status(500).json({ message: err.message });

  }

});

router.put("/request-notifications/read", async (req, res) => {
  try {
    const token =
      req.cookies?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    const decoded = jwt.verify(token, JWT_SECRET);

    const donor = await User.findById(decoded.id);

    const city = donor.address.split(",").pop().trim();

    // mark ALL visible requests as read
    const requests = await Emergency.find({ resolved: false })
      .populate("sessionId", "address");

    const filtered = requests.filter(req =>
      req.sessionId?.address?.toLowerCase().includes(city.toLowerCase())
    );

    const ids = filtered.map(r => r._id);

    await Emergency.updateMany(
      { _id: { $in: ids } },
      { $set: { isRead: true } }
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;