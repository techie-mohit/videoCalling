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

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

app.use(cors({
    origin: CLIENT_URL,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Auth routes
app.use("/api/auth", authRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: CLIENT_URL,
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

io.on("connection", (socket) => {

    socket.on("joinRoom", (data) => {
        const {email, roomId} = data;

        users.set(socket.id, { email, roomId });
        socket.join(roomId);

        // Tell the joining user about anyone already in the room
        const roomMembers = io.sockets.adapter.rooms.get(roomId);
        if (roomMembers) {
            for (const memberId of roomMembers) {
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

    socket.on("negotiationneed", (data) => {
        const {to, offer} = data;
        io.to(to).emit("negotiationneed", {from: socket.id, offer});
    });

    socket.on("negotiationDone", (data) => {
        const {to, answer} = data;
        io.to(to).emit("negotiationFinal", {from: socket.id, answer});
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

    socket.on("muteToggle", (data) => {
        const {to, isMuted} = data;
        io.to(to).emit("remoteMuted", {isMuted});
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

