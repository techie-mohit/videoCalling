import {Server} from "socket.io";
import http from "http";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import authRoutes from "./routes/auth.js";
import User from "./models/User.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Auth routes
app.use("/api/auth", authRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: "*",
        methods: ["GET", "POST"]
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


const emailToSocketIdMap = new Map();
const socketIdToEmailMap = new Map();

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error("Authentication failed"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
        const user = await User.findById(decoded._id);

        if (!user) {
            return next(new Error("Authentication failed"));
        }

        socket.userId = user._id.toString();
        socket.userEmail = user.email;
        socket.userName = user.name;
        next();
    } catch (error) {
        next(new Error("Authentication failed"));
    }
});

io.on("connection", (socket) => {
    console.log("New authenticated client connected:", socket.id, "Email:", socket.userEmail);

    socket.on("joinRoom", async (data) => {
        const {email, roomId} = data;

        if (email !== socket.userEmail) {
            socket.emit("error", { message: "Only your registered email can join the room" });
            return;
        }

        const user = await User.findOne({ email: socket.userEmail });
        if (!user) {
            socket.emit("error", { message: "User not found in database" });
            return;
        }

        emailToSocketIdMap.set(email, socket.id);
        socketIdToEmailMap.set(socket.id, email);

        socket.join(roomId);
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

    socket.on("endCall", (data) => {
        const {to} = data;
        io.to(to).emit("callEnded");
    });

    socket.on("muteToggle", (data) => {
        const {to, isMuted} = data;
        io.to(to).emit("remoteMuted", {isMuted});
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        const email = socketIdToEmailMap.get(socket.id);
        if (email) {
            emailToSocketIdMap.delete(email);
        }
        socketIdToEmailMap.delete(socket.id);
    });
});     

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});  

