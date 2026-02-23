import express from "express";
import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// GET /api/users — List all users except current user
router.get("/", authenticate, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("name email avatar roomId lastSeen")
      .sort({ name: 1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/users/search?q=query — Search users by name or email
router.get("/search", authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ users: [] });
    }

    const regex = new RegExp(q.trim(), "i");
    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [{ name: regex }, { email: regex }],
    })
      .select("name email avatar roomId lastSeen")
      .sort({ name: 1 })
      .limit(20);

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
