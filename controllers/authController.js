const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change_this_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function formatMemberSince(date) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// SIGNUP
exports.signup = async (req, res) => {
  try {
    const { name, email, password, accountType, bloodType, phone, address } =
      req.body;

    if (!name || !email || !password || !accountType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashed,
      accountType,
      bloodType,
      phone,
      address,
      isActive: true, // FIXED
    });

    const savedUser = await user.save();

    const token = createToken({ id: savedUser._id, email: savedUser.email });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        accountType: savedUser.accountType,
        bloodType: savedUser.bloodType || null,
        phone: savedUser.phone || null,
        address: savedUser.address || null,
        isActive: savedUser.isActive, // FIXED
        availability: savedUser.availability, //  ADD THIS

        memberSince: formatMemberSince(savedUser.createdAt),
      },
      token,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------------------
// LOGIN
// ---------------------------------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = createToken({ id: user._id, email: user.email });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        bloodType: user.bloodType || null,
        phone: user.phone || null,
        address: user.address || null,
        isActive: user.isActive, // FIXED
            availability: user.availability, // ADD THIS

        memberSince: formatMemberSince(user.createdAt),
      },
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// GET CURRENT USER
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        bloodType: user.bloodType || null,
        phone: user.phone || null,
        address: user.address || null,
        isActive: user.isActive, // FIXED
         availability: user.availability, // ADD THIS

        memberSince: formatMemberSince(user.createdAt),
      },
    });
  } catch (err) {
    console.error("Me error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.checkUser = async (req, res) => {
  try {
    const token =
      req.body.token ||
      req.cookies?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountType: user.accountType,
        bloodType: user.bloodType || null,
        phone: user.phone || null,
        address: user.address || null,
        isActive: user.isActive,
        availability: user.availability,
        memberSince: formatMemberSince(user.createdAt),
      },
    });
  } catch (err) {
    console.error("CheckUser error:", err.message);
    return res.status(401).json({
      message:
       "Invalid token",
    });
  }
};


// UPDATE DONOR AVAILABILITY
exports.updateAvailability = async (req, res) => {
  try {
    // read correct field name
    const { availability } = req.body;

    //proper boolean validation
    if (typeof availability !== "boolean") {
      return res.status(400).json({
        message: "Availability must be boolean",
      });
    }

    //  update ONLY availability
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { availability },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      message: "Availability updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update availability error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};




// LOGOUT
exports.logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ message: "Logged out successfully" });
};