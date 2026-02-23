import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const menuItems = [
    { id: "audio", title: "Audio", icon: "🎙️", route: "/audio", color: "from-cyan-400 to-blue-500" },
    { id: "video", title: "Video", icon: "🎥", route: "/lobby", color: "from-blue-500 to-indigo-600" },
    { id: "chat", title: "Chat", icon: "💬", route: "/chat", color: "from-indigo-600 to-violet-600" },
  ];

  return (
    /* BACKGROUND: Rich Slate Blue with Mesh Gradient */
    <div className="min-h-screen bg-[#1e2a4a] text-slate-100 flex flex-col items-center justify-center p-6 overflow-hidden relative">
      
      {/* Top Right Logout Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={handleLogout}
          className="group flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/40 transition-all duration-300 backdrop-blur-md"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 group-hover:text-red-300">
            Logout Session
          </span>
          <div className="h-2 w-2 rounded-full bg-red-500/40 group-hover:bg-red-500 animate-pulse"></div>
        </button>
      </div>

      {/* Luminous Overlays */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15),transparent_70%)]"></div>
      
      {/* Background Spinning Rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white/10 rounded-full animate-[spin_60s_linear_infinite]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/20 rounded-full animate-[spin_30s_linear_infinite_reverse]"></div>
      </div>

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        
        {/* CENTRAL USER ORB */}
        <div className="mb-12 relative group text-center">
          <div className="absolute inset-0 bg-blue-400/30 blur-3xl rounded-full scale-150 group-hover:bg-blue-400/50 transition-colors duration-700"></div>
          <div className="relative h-32 w-32 rounded-full p-1 bg-gradient-to-tr from-white/40 to-transparent backdrop-blur-md mx-auto">
            <div className="h-full w-full rounded-full bg-[#2a3a5f] flex items-center justify-center border border-white/20 overflow-hidden shadow-2xl">
               <span className="text-5xl font-black text-white drop-shadow-md">{user?.name?.charAt(0)}</span>
            </div>
            <div className="absolute bottom-2 right-2 h-5 w-5 bg-emerald-400 border-4 border-[#1e2a4a] rounded-full"></div>
          </div>
          <div className="mt-6">
            {/* CHANGED: Simplified Name Font */}
            <h1 className="text-3xl font-semibold text-white tracking-normal">{user?.name}</h1>
            {/* CHANGED: Simplified Email Style */}
            <p className="text-sm text-slate-400 mt-1 font-normal lowercase">
              {user?.email}
            </p>
          </div>
        </div>

        {/* NAVIGATION MENU */}
        <div className="w-full space-y-4">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.route)}
              className="w-full relative group overflow-hidden rounded-[2.2rem] bg-[#2d3b5e]/60 border border-white/10 p-5 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-[#364775] hover:translate-y-[-4px] hover:shadow-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-3xl shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
                    {item.icon}
                  </div>
                  <div className="text-left">
                    <h3 className="text-white font-extrabold text-lg tracking-wide">{item.title}</h3>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-[#1e2a4a] transition-all duration-300">
                  <span className="text-xl">→</span>
                </div>
              </div>
              
              <div className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-transparent via-sky-400 to-transparent w-full translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            </button>
          ))}
        </div>

        {/* Decorative Space Filler */}
        <div className="mt-12 opacity-20 flex gap-2">
           <span className="h-1 w-1 bg-white rounded-full"></span>
           <span className="h-1 w-12 bg-white rounded-full"></span>
           <span className="h-1 w-1 bg-white rounded-full"></span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;