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
    /* BACKGROUND: Consistent Slate Blue */
    <div className="min-h-screen flex items-center justify-center bg-[#1e2a4a] p-4 relative overflow-hidden font-sans">
      
      {/* Background Ambience - Tinted Orange for Audio Context */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.08),transparent_70%)]"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-orange-500/5 rounded-full animate-[spin_60s_linear_infinite] opacity-20"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* HIGHLIGHTED: Back to Dashboard Button (With Orange Hover) */}
        <div className="flex justify-start mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-300 transition-all duration-300 backdrop-blur-md shadow-lg group"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            <span className="text-xs font-bold uppercase tracking-widest">Dashboard</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="rounded-[2.5rem] border border-white/10 bg-[#2d3b5e]/60 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
          
          {/* User Profile Header (Simple Font) */}
          <div className="mb-8 flex items-center justify-center border-b border-white/5 pb-6">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white font-bold shadow-lg shadow-orange-500/20">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white tracking-normal">{user?.name}</p>
                <p className="text-sm text-slate-400 font-normal lowercase">{user?.email}</p>
              </div>
            </div>
          </div>

          <h1 className="mb-2 text-center text-3xl font-bold text-white tracking-tight">
             Join Audio Room
          </h1>
          <p className="mb-8 text-center text-sm text-slate-400">
            Establish a crystal clear voice connection
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center text-sm text-red-300 font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-orange-400 uppercase tracking-widest mb-2 ml-1">
                Voice Channel ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
                placeholder="Enter room ID for audio"
                className="w-full rounded-2xl border border-white/10 bg-[#1e2a4a]/50 px-5 py-4 text-white caret-orange-400 placeholder-slate-600 outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-600 py-4 font-bold text-white shadow-lg shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Audio Call
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AudioLobby;