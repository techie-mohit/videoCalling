import {Server} from "socket.io";
import http from "http";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";

dotenv.config();
const app = express();

const allowedOrigins = [
    process.env.Frontend_URL
].filter(Boolean);    // It ensures that only valid, truthy environment variables are included in the allowed origins array, preventing undefined or empty values from causing CORS misconfiguration.

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (e.g. mobile apps, curl)
        if (!origin) return callback(null, true);
        // allow any localhost origin (any port) for development
        if (origin.match(/^http:\/\/localhost:\d+$/)) return callback(null, true);
        // allow production origin
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Auth routes
app.use("/api/auth", authRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (origin.match(/^http:\/\/localhost:\d+$/)) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            callback(new Error("Not allowed by CORS"));
        },
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


const users = new Map(); // socketId -> { email, roomId }

const MAX_ROOM_SIZE = 2; // 1-to-1 video calling limit

io.on("connection", (socket) => {

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

    // socket.on("negotiationneed", (data) => {
    //     const {to, offer} = data;
    //     io.to(to).emit("negotiationneed", {from: socket.id, offer});
    // });

    // socket.on("negotiationDone", (data) => {
    //     const {to, answer} = data;
    //     io.to(to).emit("negotiationFinal", {from: socket.id, answer});
    // });

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

    socket.on("disconnect", () => {
        const userData = users.get(socket.id);
        if (userData) {
            socket.to(userData.roomId).emit("userLeft", { email: userData.email, id: socket.id });
        }
        users.delete(socket.id);
    });
});     

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});  

