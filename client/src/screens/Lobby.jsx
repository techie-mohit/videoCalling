
import React, { useState, useCallback, useEffect } from "react";
import { useSocket } from "../context/SocketProvider";
import { useNavigate } from "react-router-dom";

const Lobby = () => {
  const [email, setEmail] = useState("");
  const [roomId, setRoomId] = useState("");

  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmit = useCallback((e)=>{
    e.preventDefault();
    console.log("Joining room:", roomId, "with email:", email);
    
    socket.emit('joinRoom', {email, roomId});
    
    
    setEmail("");
    setRoomId("");
  },[email, roomId, socket]);


  const handleJoinRoom = useCallback((data)=>{
    const {email, roomId} = data;
    navigate(`/room/${roomId}`);
  },[navigate]);

  useEffect(()=>{
    socket.on("userJoined", handleJoinRoom);

    return () => {
      socket.off("userJoined", handleJoinRoom);
    };

  },[socket, handleJoinRoom]);

  return (
   <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        
        {/* Heading */}
        <h1 className="mb-6 text-center text-3xl font-bold text-white">
          Join Video Room
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Email */}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            className="w-full rounded-lg border border-white/40 bg-transparent px-4 py-3 text-white caret-pink-400 placeholder-white/60 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30"
          />

          {/* Room ID */}
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            required
            placeholder="Enter room ID"
            className="w-full rounded-lg border border-white/40 bg-transparent px-4 py-3 text-white caret-pink-400 placeholder-white/60 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30"
          />

          {/* Button */}
          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 py-3 font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-pink-500/50 active:scale-95"
          >
            Join Room
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-white/60">
          Secure 1-to-1 video calling 🔒
        </p>
      </div>
    </div>
  );
};

export default Lobby;
