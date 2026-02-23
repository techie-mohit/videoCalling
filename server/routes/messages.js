import express from "express";
import Message from "../models/Message.js";
import { authenticate } from "../middleware/auth.js";

const router = express.Router();

// GET /api/messages/unread/count — Get unread message counts grouped by sender
// ⚠️ MUST be above /:userId or Express treats "unread" as a userId param
router.get("/unread/count", authenticate, async (req, res) => {
  try {
    const counts = await Message.aggregate([
      { $match: { receiver: req.user._id, read: false } },
      { $group: { _id: "$sender", count: { $sum: 1 } } },
    ]);

    // Convert to a map: { senderId: count }
    const unreadMap = {};
    counts.forEach((c) => {
      unreadMap[c._id.toString()] = c.count;
    });

    res.json({ unreadCounts: unreadMap });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/messages/read/:senderId — Mark all messages from sender as read
router.put("/read/:senderId", authenticate, async (req, res) => {
  try {
    const { senderId } = req.params;

    await Message.updateMany(
      { sender: senderId, receiver: req.user._id, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/messages — Send a message
router.post("/", authenticate, async (req, res) => {
  try {
    const { receiverId, content, image } = req.body;

    if (!receiverId) {
      return res.status(400).json({ error: "Receiver is required" });
    }
    if (!content && !image) {
      return res.status(400).json({ error: "Message content or image is required" });
    }

    const message = new Message({
      sender: req.user._id,
      receiver: receiverId,
      content: content || "",
      image: image || "",
    });

    await message.save();

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/messages/:userId — Get conversation with a user
// ⚠️ MUST be last — /:userId is a catch-all param route
router.get("/:userId", authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(200);

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
