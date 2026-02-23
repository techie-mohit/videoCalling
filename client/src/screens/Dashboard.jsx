import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const copyRoomId = () => {
    if (user?.roomId) {
      navigator.clipboard.writeText(user.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const features = [
    {
      title: "Chat",
      description: "Real-time messaging with all users. Send text & images.",
      icon: "💬",
      gradient: "from-emerald-500 to-teal-600",
      hoverShadow: "hover:shadow-emerald-500/40",
      route: "/chat",
    },
    {
      title: "Audio Call",
      description: "Crystal clear voice calls. Room-based audio calling.",
      icon: "🎙️",
      gradient: "from-amber-500 to-orange-600",
      hoverShadow: "hover:shadow-amber-500/40",
      route: "/audio",
    },
    {
      title: "Video Call",
      description: "Face-to-face video calling. 1-to-1 HD video rooms.",
      icon: "🎥",
      gradient: "from-pink-500 to-purple-600",
      hoverShadow: "hover:shadow-pink-500/40",
      route: "/lobby",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-4 md:p-8">
      {/* Top Bar */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white text-xl font-bold shadow-lg shadow-purple-500/30">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-white">{user?.name}</p>
              <p className="text-sm text-white/50">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-xl bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 px-5 py-2.5 text-sm font-medium text-red-300 transition-all duration-300 hover:text-white active:scale-95"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Room ID Card */}
      <div className="max-w-6xl mx-auto mb-10">
        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 backdrop-blur-xl rounded-2xl border border-indigo-500/20 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-indigo-300/80 mb-1">Your Unique Room ID</p>
              <p className="text-lg font-mono text-white tracking-wider break-all">
                {user?.roomId || "Loading..."}
              </p>
              <p className="text-xs text-white/40 mt-1">Share this ID for others to join your call rooms</p>
            </div>
            <button
              onClick={copyRoomId}
              className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-300 active:scale-95 ${
                copied
                  ? "bg-green-500/30 border border-green-500/50 text-green-300"
                  : "bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/40 hover:text-white"
              }`}
            >
              {copied ? "✓ Copied!" : "📋 Copy ID"}
            </button>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <button
              key={feature.title}
              onClick={() => navigate(feature.route)}
              className={`group relative text-left bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 transition-all duration-500 hover:scale-[1.03] hover:border-white/20 ${feature.hoverShadow} hover:shadow-2xl`}
            >
              {/* Gradient accent */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500`}></div>

              <div className="relative z-10">
                <div className="text-5xl mb-5">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
                <div className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${feature.gradient} bg-clip-text text-transparent`}>
                  Open {feature.title}
                  <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
