import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    const token = user.generateAuthToken();

    // Ensure NODE_ENV has a value (default to 'development' if not set)
    const env = process.env.NODE_ENV || 'development';
    res.cookie("token", token, {
      httpOnly: true,
      secure: env === "production",
      sameSite: env === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = user.generateAuthToken();

    const env = process.env.NODE_ENV || 'development';
    res.cookie("token", token, {
      httpOnly: true,
      secure: env === "production",
      sameSite: env === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/me", authenticate, async (req, res) => {
  res.json({
    user: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    },
  });
});

router.post("/logout", authenticate, async (req, res) => {
  const env = process.env.NODE_ENV || 'development';
  res.clearCookie("token", {
    httpOnly: true,
    secure: env === "production",
    sameSite: env === "production" ? "none" : "lax",
  });
  res.json({ message: "Logged out successfully" });
});

export default router;
