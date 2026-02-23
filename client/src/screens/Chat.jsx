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
    setMessages,
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

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat._id);
      markAsRead(activeChat._id);
      // Clear unread for this user
      setUnreadCounts((prev) => {
        const updated = { ...prev };
        delete updated[activeChat._id];
        return updated;
      });
    }
  }, [activeChat]);

  // Search users
  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      const timer = setTimeout(async () => {
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery, searchUsers]);

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
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be less than 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatLastSeen = (date) => {
    if (!date) return "Never";
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const displayUsers = searchQuery.trim() ? searchResults : allUsers;

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950">
      {/* Sidebar */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-96 bg-white/5 backdrop-blur-xl border-r border-white/10`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-white/60 hover:text-white transition p-1"
                title="Back to Dashboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <h2 className="text-xl font-bold text-white">Chats</h2>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded-xl bg-white/10 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 transition"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {isSearching && (
            <div className="p-4 text-center text-white/40 text-sm">Searching...</div>
          )}
          {!isSearching && displayUsers.length === 0 && (
            <div className="p-8 text-center text-white/30 text-sm">
              {searchQuery ? "No users found" : "No users yet"}
            </div>
          )}
          {displayUsers.map((u) => (
            <button
              key={u._id}
              onClick={() => {
                setActiveChat(u);
                setShowSidebar(false);
                setSearchQuery("");
              }}
              className={`w-full flex items-center gap-3 p-4 border-b border-white/5 transition-all duration-200 hover:bg-white/10 ${
                activeChat?._id === u._id ? "bg-white/10 border-l-2 border-l-indigo-400" : ""
              }`}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold text-lg">
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                {/* Online dot */}
                {onlineUsers.has(u._id) && (
                  <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-slate-900"></div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                  {lastMessages[u._id] && (
                    <span className="text-xs text-white/30">
                      {formatTime(lastMessages[u._id].createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-white/40 truncate">
                    {typingUsers.has(u._id) ? (
                      <span className="text-emerald-400 italic">typing...</span>
                    ) : lastMessages[u._id] ? (
                      lastMessages[u._id].image ? "📷 Photo" : lastMessages[u._id].content
                    ) : onlineUsers.has(u._id) ? (
                      "Online"
                    ) : (
                      `Last seen ${formatLastSeen(u.lastSeen)}`
                    )}
                  </p>
                  {/* Unread badge */}
                  {unreadCounts[u._id] > 0 && (
                    <span className="shrink-0 ml-2 bg-emerald-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5">
                      {unreadCounts[u._id]}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!showSidebar ? "flex" : "hidden"} md:flex flex-col flex-1`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-xl border-b border-white/10">
              {/* Back button (mobile) */}
              <button
                onClick={() => setShowSidebar(true)}
                className="md:hidden text-white/60 hover:text-white transition p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>

              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-bold">
                  {activeChat.name?.charAt(0).toUpperCase()}
                </div>
                {onlineUsers.has(activeChat._id) && (
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 border-2 border-slate-900"></div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{activeChat.name}</p>
                <p className="text-xs text-white/40">
                  {typingUsers.has(activeChat._id) ? (
                    <span className="text-emerald-400">typing...</span>
                  ) : onlineUsers.has(activeChat._id) ? (
                    <span className="text-green-400">Online</span>
                  ) : (
                    `Last seen ${formatLastSeen(activeChat.lastSeen)}`
                  )}
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-white/20 text-sm">
                  No messages yet. Say hello! 👋
                </div>
              )}
              {messages.map((msg, idx) => {
                const isMine = msg.sender === user?._id;
                return (
                  <div key={msg._id || idx} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] sm:max-w-[60%] rounded-2xl px-4 py-2.5 ${
                        isMine
                          ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-md"
                          : "bg-white/10 text-white rounded-bl-md"
                      }`}
                    >
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="Shared"
                          className="rounded-xl mb-2 max-h-60 w-full object-cover cursor-pointer"
                          onClick={() => window.open(msg.image, "_blank")}
                        />
                      )}
                      {msg.content && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                      )}
                      <div className={`flex items-center gap-1 mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
                        <span className="text-[10px] opacity-50">{formatTime(msg.createdAt)}</span>
                        {isMine && (
                          <span className={`text-[10px] ${msg.read ? "text-blue-300" : "text-white/40"}`}>
                            {msg.read ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="px-4 py-2 bg-white/5 border-t border-white/10">
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="h-20 rounded-lg object-cover" />
                  <button
                    onClick={() => setImagePreview(null)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 bg-white/5 backdrop-blur-xl border-t border-white/10">
              <div className="flex items-center gap-3">
                {/* Image upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 text-white/40 hover:text-white transition p-2 rounded-xl hover:bg-white/10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 transition"
                />

                <button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim() && !imagePreview}
                  className="shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-3 hover:scale-105 transition-all duration-300 active:scale-95 disabled:opacity-30 disabled:hover:scale-100 shadow-lg shadow-indigo-500/30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* No chat selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-white/70 mb-2">Select a conversation</h3>
              <p className="text-sm text-white/30">Choose a user from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
