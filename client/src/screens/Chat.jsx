import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import { useChat } from "../context/ChatProvider";

const Chat = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    onlineUsers,
    unreadCounts,
    setUnreadCounts,
    typingUsers,
    allUsers,
    activeChat,
    setActiveChat,
    messages,
    lastMessages,
    fetchMessages,
    searchUsers,
    markAsRead,
    sendMessage,
    sendTyping,
    sendStopTyping,
  } = useChat();

  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Search users when searchQuery changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Debounce the search to avoid too many API calls
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery.trim());
        setSearchResults(results || []);
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, searchUsers]);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat._id);
      markAsRead(activeChat._id);
      setUnreadCounts((prev) => {
        const updated = { ...prev };
        delete updated[activeChat._id];
        return updated;
      });
    }
  }, [activeChat, fetchMessages, markAsRead, setUnreadCounts]);

  const handleSendMessage = useCallback(() => {
    if (!activeChat) return;
    if (!messageInput.trim() && !imagePreview) return;

    sendMessage(activeChat._id, messageInput.trim(), imagePreview || "");
    setMessageInput("");
    setImagePreview(null);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      sendStopTyping(activeChat._id);
    }
  }, [activeChat, messageInput, imagePreview, sendMessage, sendStopTyping]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = () => {
    if (!activeChat) return;
    sendTyping(activeChat._id);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendStopTyping(activeChat._id);
    }, 2000);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const displayUsers = searchQuery.trim() ? searchResults : allUsers;

  return (
    <div className="h-screen flex bg-[#1e2a4a] text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar */}
      <div className={`${showSidebar ? "flex" : "hidden"} md:flex flex-col w-full md:w-96 bg-[#2d3b5e]/40 backdrop-blur-3xl border-r border-white/5`}>
        <div className="p-5 border-b border-white/5 bg-white/5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate("/dashboard")} className="text-sky-400 hover:text-white p-2 rounded-xl bg-white/5 border border-white/10">←</button>
              <h2 className="text-xl font-bold text-white tracking-tight">Messages</h2>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 text-white font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people..."
            className="w-full rounded-2xl bg-[#1e2a4a]/50 border border-white/10 px-5 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-400 transition-all"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-3">
          {displayUsers.map((u) => (
            <button
              key={u._id}
              onClick={() => { setActiveChat(u); setShowSidebar(false); }}
              className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all mb-1 ${activeChat?._id === u._id ? "bg-sky-500 text-white shadow-lg" : "hover:bg-white/5 text-slate-300"}`}
            >
              <div className="relative">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center font-bold text-lg">
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                {onlineUsers.has(u._id) && <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-emerald-500 border-2 border-[#1e2a4a] rounded-full"></div>}
              </div>
              <div className="flex-1 text-left truncate">
                <p className="text-sm font-semibold">{u.name}</p>
                <p className="text-xs opacity-60 truncate">{typingUsers.has(u._id) ? "typing..." : (lastMessages[u._id]?.content || "No messages")}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!showSidebar ? "flex" : "hidden"} md:flex flex-col flex-1 bg-[#1e2a4a]`}>
        {activeChat ? (
          <>
            <div className="flex items-center justify-between p-5 bg-white/5 backdrop-blur-md border-b border-white/5">
              <div className="flex items-center gap-4">
                <button onClick={() => setShowSidebar(true)} className="md:hidden text-sky-400">←</button>
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center font-bold">
                  {activeChat.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{activeChat.name}</h3>
                  <p className="text-[10px] text-slate-400 font-normal lowercase">{activeChat.email}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => {
                const isMine = msg.sender === user?._id;
                return (
                  <div key={msg._id || idx} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isMine ? "bg-sky-500 text-white rounded-br-none" : "bg-[#2d3b5e] text-slate-100 rounded-bl-none"}`}>
                      {msg.image && <img src={msg.image} alt="Sent" className="rounded-xl mb-2 max-h-72" />}
                      <p className="text-sm">{msg.content}</p>
                      <span className="block text-[9px] opacity-50 text-right mt-1">{formatTime(msg.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-5 bg-white/5 border-t border-white/5">
              {imagePreview && (
                <div className="mb-3 relative inline-block">
                  <img src={imagePreview} className="h-20 rounded-2xl border border-sky-400" alt="Preview" />
                  <button onClick={() => setImagePreview(null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full h-5 w-5 text-xs">×</button>
                </div>
              )}
              <div className="flex items-center gap-3">
                {/* CHANGED: Image Icon */}
                <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-sky-400 transition-colors p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageUpload} />
                <input
                  value={messageInput}
                  onChange={(e) => { setMessageInput(e.target.value); handleTyping(); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 bg-[#1e2a4a] border border-white/10 rounded-2xl px-5 py-3 text-sm outline-none focus:border-sky-400 transition-all"
                />
                {/* CHANGED: Rocket to Arrow Send Button */}
                <button 
                  onClick={handleSendMessage} 
                  disabled={!messageInput.trim() && !imagePreview}
                  className="bg-sky-500 p-3 rounded-2xl shadow-lg shadow-sky-500/20 disabled:opacity-30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
             </svg>
             <p className="font-bold uppercase tracking-[0.3em] text-xs">Start a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;