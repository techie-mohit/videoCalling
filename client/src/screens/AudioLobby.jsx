import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

const AudioLobby = () => {
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!user?.email) {
      setError("User not found. Please login again.");
      return;
    }
    if (!roomId.trim()) {
      setError("Please enter a valid room ID");
      return;
    }
    navigate(`/audio/${roomId.trim()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-amber-950 to-orange-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        {/* Back button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 flex items-center gap-2 text-white/60 hover:text-white transition text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Dashboard
        </button>

        {/* Heading */}
        <h1 className="mb-6 text-center text-3xl font-bold text-white">🎙️ Join Audio Room</h1>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/50 p-3 text-center text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-lg bg-amber-500/20 border border-amber-500/50 p-3 text-center text-sm text-amber-100">
          🎧 Joining as: <span className="font-semibold">{user?.email}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Room ID</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
              placeholder="Enter room ID for audio call"
              className="w-full rounded-lg border border-white/40 bg-transparent px-4 py-3 text-white caret-amber-400 placeholder-white/60 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 py-3 font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-amber-500/50 active:scale-95"
          >
            Join Audio Room
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/60">
          Crystal clear 1-to-1 audio calling 🔒
        </p>
      </div>
    </div>
  );
};

export default AudioLobby;
