
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

const Lobby = () => {
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleSubmit = useCallback((e)=>{
    e.preventDefault();
    setError("");

    if (!user?.email) {
      setError("User email not found. Please login again.");
      return;
    }

    if (!roomId.trim()) {
      setError("Please enter a valid room ID");
      return;
    }

    // Navigate directly to Room — Room will emit joinRoom on mount
    navigate(`/room/${roomId.trim()}`);
  },[roomId, navigate, user]);

  return (
   <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">

        {/* User Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user?.name}</p>
              <p className="text-xs text-white/60">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-500/80 hover:bg-red-600 px-4 py-2 text-sm font-medium text-white transition active:scale-95"
          >
            Logout
          </button>
        </div>

        {/* Heading */}
        <h1 className="mb-6 text-center text-3xl font-bold text-white">
          Join Video Room
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/50 p-3 text-center text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-lg bg-blue-500/20 border border-blue-500/50 p-3 text-center text-sm text-blue-100">
          📧 Joining as: <span className="font-semibold">{user?.email}</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Room ID */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Room ID</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
              placeholder="Enter room ID"
              className="w-full rounded-lg border border-white/40 bg-transparent px-4 py-3 text-white caret-pink-400 placeholder-white/60 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30"
            />
          </div>

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
