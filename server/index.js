import { Server } from "socket.io";
import http from "http";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import messagesRoutes from "./routes/messages.js";
import User from "./models/User.js";
import Message from "./models/Message.js";

dotenv.config();
const app = express();

const allowedOrigins = [
    process.env.Frontend_URL
].filter(Boolean);    // It ensures that only valid, truthy environment variables are included in the allowed origins array, preventing undefined or empty values from causing CORS misconfiguration.

const corsHandler = function (origin, callback) {
    // allow requests with no origin (e.g. mobile apps, curl)
    if (!origin) return callback(null, true);
    // allow any localhost origin (any port) for development
    if (origin.match(/^http:\/\/localhost:\d+$/)) return callback(null, true);
    // allow production origin
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
};

app.use(cors({
    origin: corsHandler,
    credentials: true
}));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/messages", messagesRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: corsHandler,
        methods: ["GET", "POST"],
        credentials: true
    }
});
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, {
}).then(() => {
    console.log("Connected to MongoDB");
}
).catch(err => {
    console.error("Error connecting to MongoDB:", err);
});


// ============================================================
// VIDEO CALL — existing socket events (UNTOUCHED)
// ============================================================
const users = new Map(); // socketId -> { email, roomId }

const MAX_ROOM_SIZE = 2; // 1-to-1 video calling limit

// ============================================================
// CHAT — online users tracking
// ============================================================
const chatOnlineUsers = new Map(); // userId -> socketId
const userSocketMap = new Map();   // socketId -> userId

// ============================================================
// AUDIO CALL — room tracking
// ============================================================
const audioUsers = new Map(); // socketId -> { email, roomId }
const MAX_AUDIO_ROOM_SIZE = 2;

// ============================================================
// Socket.IO JWT Authentication Middleware
// ============================================================
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.headers.cookie
            ?.split(";")
            .find((c) => c.trim().startsWith("token="))
            ?.split("=")[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
            const user = await User.findById(decoded._id).select("_id name email");
            if (user) {
                socket.userId = user._id.toString();
                socket.userName = user.name;
                socket.userEmail = user.email;
            }
        }
        next();
    } catch (err) {
        // Allow connection even without auth (video uses email-based join)
        next();
    }
});

io.on("connection", (socket) => {

    // ========================================================
    // VIDEO CALL EVENTS — existing code, completely unchanged
    // ========================================================

    socket.on("joinRoom", (data) => {
        const {email, roomId} = data;

        // Check if room is already full (2 users max for 1-to-1 calling)
        const roomMembers = io.sockets.adapter.rooms.get(roomId);
        const currentRoomSize = roomMembers ? roomMembers.size : 0;

        if (currentRoomSize >= MAX_ROOM_SIZE) {
            // Room is full, notify the user
            io.to(socket.id).emit("roomFull", { 
                roomId, 
                message: "This room already has 2 users connected. Please try a different room ID." 
            });
            return;
        }

        users.set(socket.id, { email, roomId });
        socket.join(roomId);

        // Tell the joining user about anyone already in the room
        const updatedRoomMembers = io.sockets.adapter.rooms.get(roomId);
        if (updatedRoomMembers) {
            for (const memberId of updatedRoomMembers) {
                if (memberId !== socket.id) {
                    const memberData = users.get(memberId);
                    if (memberData) {
                        io.to(socket.id).emit("existingUser", { email: memberData.email, id: memberId });
                    }
                }
            }
        }

        // Tell existing room members about the new user
        socket.to(roomId).emit("newUserJoined", {email, id: socket.id});
        io.to(socket.id).emit("userJoined", data);
    });
    
    // peer connection signaling
    socket.on("callUser", (data) => {
        const {to, offer} = data;
        io.to(to).emit("incomingCall", {from: socket.id, offer});
    });

    socket.on("callAccepted", (data) => {
        const {to, answer} = data;
        io.to(to).emit("callAccepted", {from: socket.id, answer});
    });

    // ICE candidate relay - critical for cross-device connections
   
    socket.on("iceCandidate", (data) => {
        const {to, candidate} = data;
        io.to(to).emit("iceCandidate", {from: socket.id, candidate});
    });

    socket.on("endCall", (data) => {
        const {to} = data;
        io.to(to).emit("callEnded");
    });

    socket.on("leaveRoom", () => {
        const userData = users.get(socket.id);
        if (userData) {
            socket.leave(userData.roomId);
            socket.to(userData.roomId).emit("userLeft", { email: userData.email, id: socket.id });
            users.delete(socket.id);
        }
    });

    socket.on("muteToggle", (data) => {
        const {to, isMuted} = data;
        io.to(to).emit("remoteMuted", {isMuted});
    });

    socket.on("videoToggle", (data) => {
        const {to, isVideoOff} = data;
        io.to(to).emit("remoteVideoOff", {isVideoOff});
    });

    // ========================================================
    // CHAT EVENTS — new real-time messaging
    // ========================================================

    socket.on("chat:join", (userId) => {
        if (!userId) return;
        chatOnlineUsers.set(userId, socket.id);
        userSocketMap.set(socket.id, userId);

        // Broadcast online status to all connected clients
        io.emit("chat:userOnline", { userId });
        
        // Send current online users list to the joining user
        const onlineList = Array.from(chatOnlineUsers.keys());
        io.to(socket.id).emit("chat:onlineUsers", onlineList);
    });

    socket.on("chat:sendMessage", async (data) => {
        const { receiverId, content, image } = data;
        const senderId = socket.userId || userSocketMap.get(socket.id);
        if (!senderId || !receiverId) return;

        try {
            // Save message to database
            const message = new Message({
                sender: senderId,
                receiver: receiverId,
                content: content || "",
                image: image || "",
            });
            await message.save();

            const messageData = {
                _id: message._id.toString(),
                sender: senderId,
                receiver: receiverId,
                content: message.content,
                image: message.image,
                read: false,
                createdAt: message.createdAt,
            };

            // Send to receiver if online
            const receiverSocketId = chatOnlineUsers.get(receiverId);
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("chat:newMessage", messageData);
            }

            // Confirm to sender
            io.to(socket.id).emit("chat:messageSent", messageData);
        } catch (err) {
            io.to(socket.id).emit("chat:error", { error: "Failed to send message" });
        }
    });

    socket.on("chat:typing", ({ receiverId }) => {
        const senderId = socket.userId || userSocketMap.get(socket.id);
        if (!senderId || !receiverId) return;
        const receiverSocketId = chatOnlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("chat:typing", { senderId });
        }
    });

    socket.on("chat:stopTyping", ({ receiverId }) => {
        const senderId = socket.userId || userSocketMap.get(socket.id);
        if (!senderId || !receiverId) return;
        const receiverSocketId = chatOnlineUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("chat:stopTyping", { senderId });
        }
    });

    socket.on("chat:markRead", async ({ senderId }) => {
        const receiverId = socket.userId || userSocketMap.get(socket.id);
        if (!receiverId || !senderId) return;

        try {
            await Message.updateMany(
                { sender: senderId, receiver: receiverId, read: false },
                { $set: { read: true } }
            );

            // Notify the sender that messages were read
            const senderSocketId = chatOnlineUsers.get(senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit("chat:messagesRead", { readBy: receiverId });
            }
        } catch (err) {
            console.error("Error marking messages as read:", err);
        }
    });

    // ========================================================
    // AUDIO CALL EVENTS — room-based audio calling
    // ========================================================

    socket.on("audio:joinRoom", (data) => {
        const { email, roomId } = data;

        const roomName = `audio_${roomId}`;
        const roomMembers = io.sockets.adapter.rooms.get(roomName);
        const currentRoomSize = roomMembers ? roomMembers.size : 0;

        if (currentRoomSize >= MAX_AUDIO_ROOM_SIZE) {
            io.to(socket.id).emit("audio:roomFull", {
                roomId,
                message: "This audio room already has 2 users connected.",
            });
            return;
        }

        audioUsers.set(socket.id, { email, roomId });
        socket.join(roomName);

        // Tell the joining user about existing members
        const updatedMembers = io.sockets.adapter.rooms.get(roomName);
        if (updatedMembers) {
            for (const memberId of updatedMembers) {
                if (memberId !== socket.id) {
                    const memberData = audioUsers.get(memberId);
                    if (memberData) {
                        io.to(socket.id).emit("audio:existingUser", { email: memberData.email, id: memberId });
                    }
                }
            }
        }

        socket.to(roomName).emit("audio:newUserJoined", { email, id: socket.id });
        io.to(socket.id).emit("audio:userJoined", data);
    });

    socket.on("audio:callUser", (data) => {
        const { to, offer } = data;
        io.to(to).emit("audio:incomingCall", { from: socket.id, offer });
    });

    socket.on("audio:callAccepted", (data) => {
        const { to, answer } = data;
        io.to(to).emit("audio:callAccepted", { from: socket.id, answer });
    });

    socket.on("audio:iceCandidate", (data) => {
        const { to, candidate } = data;
        io.to(to).emit("audio:iceCandidate", { from: socket.id, candidate });
    });

    socket.on("audio:endCall", (data) => {
        const { to } = data;
        io.to(to).emit("audio:callEnded");
    });

    socket.on("audio:leaveRoom", () => {
        const userData = audioUsers.get(socket.id);
        if (userData) {
            const roomName = `audio_${userData.roomId}`;
            socket.leave(roomName);
            socket.to(roomName).emit("audio:userLeft", { email: userData.email, id: socket.id });
            audioUsers.delete(socket.id);
        }
    });

    socket.on("audio:muteToggle", (data) => {
        const { to, isMuted } = data;
        io.to(to).emit("audio:remoteMuted", { isMuted });
    });

    // ========================================================
    // DISCONNECT — handle all cleanup
    // ========================================================

    socket.on("disconnect", () => {
        // Video cleanup
        const userData = users.get(socket.id);
        if (userData) {
            socket.to(userData.roomId).emit("userLeft", { email: userData.email, id: socket.id });
        }
        users.delete(socket.id);

        // Chat cleanup
        const chatUserId = userSocketMap.get(socket.id);
        if (chatUserId) {
            chatOnlineUsers.delete(chatUserId);
            userSocketMap.delete(socket.id);

            // Update lastSeen in database
            User.findByIdAndUpdate(chatUserId, { lastSeen: new Date() }).catch(() => {});

            // Broadcast offline status
            io.emit("chat:userOffline", { userId: chatUserId });
        }

        // Audio cleanup
        const audioData = audioUsers.get(socket.id);
        if (audioData) {
            const roomName = `audio_${audioData.roomId}`;
            socket.to(roomName).emit("audio:userLeft", { email: audioData.email, id: socket.id });
            audioUsers.delete(socket.id);
        }
    });
});     

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});  
