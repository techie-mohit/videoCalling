import {Server} from "socket.io";
import http from "http";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/videos";

mongoose.connect(MONGO_URI, {
}).then(() => {
    console.log("Connected to MongoDB");
}
).catch(err => {
    console.error("Error connecting to MongoDB:", err);
});


const emailToSocketIdMap = new Map();
const socketIdToEmailMap = new Map();

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    socket.on("joinRoom", (data) => {
        const {email, roomId} = data;
        emailToSocketIdMap.set(email, socket.id);
        socketIdToEmailMap.set(socket.id, email);

        io.to(roomId).emit("newUserJoined", {email, id: socket.id});
        socket.join(roomId);

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




    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});     

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});  

