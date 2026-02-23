import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

const Lobby = () => {
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (location.state?.error) {
      Promise.resolve().then(() => setError(location.state.error));
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleSubmit = useCallback((e) => {
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

    navigate(`/room/${roomId.trim()}`);
  }, [roomId, navigate, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1e2a4a] p-4 relative overflow-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_70%)]"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* HIGHLIGHTED: Back to Dashboard Button */}
        <div className="flex justify-start mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-300 transition-all duration-300 backdrop-blur-md shadow-lg group"
          >
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            <span className="text-xs font-bold uppercase tracking-widest">Dashboard</span>
          </button>
        </div>

        {/* Main Card */}
        <div className="rounded-[2.5rem] border border-white/10 bg-[#2d3b5e]/60 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
          
          {/* User Profile Header */}
          <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white font-bold shadow-lg shadow-blue-500/20">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-semibold text-white tracking-normal">{user?.name}</p>
                <p className="text-sm text-slate-400 font-normal lowercase">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-widest"
            >
              Logout
            </button>
          </div>

          <h1 className="mb-2 text-center text-3xl font-bold text-white tracking-tight">
            Join Video Room
          </h1>
          <p className="mb-8 text-center text-sm text-slate-400">
            Enter a Room ID to start calling
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center text-sm text-red-300 font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-sky-400 uppercase tracking-widest mb-2 ml-1">
                Room Access Key
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
                placeholder="Ex: room-123"
                className="w-full rounded-2xl border border-white/10 bg-[#1e2a4a]/50 px-5 py-4 text-white placeholder-slate-500 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-400/10"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-sky-400 to-blue-500 py-4 font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Join Room Now
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Lobby;