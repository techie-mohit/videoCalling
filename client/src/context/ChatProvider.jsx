import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSocket } from "./SocketProvider";
import { useAuth } from "./AuthProvider";

const ChatContext = createContext(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const socket = useSocket();
  const { user } = useAuth();
  const url = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [allUsers, setAllUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const activeChatRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [lastMessages, setLastMessages] = useState({});

  // Keep ref in sync with activeChat so socket closures see latest value
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${url}/api/users`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, [url]);

  // Fetch unread counts
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const res = await fetch(`${url}/api/messages/unread/count`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUnreadCounts(data.unreadCounts);
      }
    } catch (err) {
      console.error("Failed to fetch unread counts:", err);
    }
  }, [url]);

  // Fetch messages for active chat
  const fetchMessages = useCallback(async (userId) => {
    try {
      const res = await fetch(`${url}/api/messages/${userId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [url]);

  // Search users
  const searchUsers = useCallback(async (query) => {
    try {
      const res = await fetch(`${url}/api/users/search?q=${encodeURIComponent(query)}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        return data.users;
      }
      return [];
    } catch (err) {
      console.error("Failed to search users:", err);
      return [];
    }
  }, [url]);

  // Mark messages as read
  const markAsRead = useCallback((senderId) => {
    if (socket) {
      socket.emit("chat:markRead", { senderId });
      setUnreadCounts((prev) => {
        const updated = { ...prev };
        delete updated[senderId];
        return updated;
      });
    }
  }, [socket]);

  // Send a message
  const sendMessage = useCallback((receiverId, content, image) => {
    if (socket) {
      socket.emit("chat:sendMessage", { receiverId, content, image });
    }
  }, [socket]);

  // Send typing indicator
  const sendTyping = useCallback((receiverId) => {
    if (socket) socket.emit("chat:typing", { receiverId });
  }, [socket]);

  const sendStopTyping = useCallback((receiverId) => {
    if (socket) socket.emit("chat:stopTyping", { receiverId });
  }, [socket]);

  // Initialize chat when socket and user are ready
  useEffect(() => {
    if (!socket || !user) return;

    // Join chat
    socket.emit("chat:join", user._id);

    // Fetch initial data
    fetchUsers();
    fetchUnreadCounts();

    // Listen for online/offline events
    socket.on("chat:onlineUsers", (userIds) => {
      setOnlineUsers(new Set(userIds));
    });

    socket.on("chat:userOnline", ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    socket.on("chat:userOffline", ({ userId }) => {
      setOnlineUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
    });

    // Listen for new messages
    socket.on("chat:newMessage", (msg) => {
      const currentActive = activeChatRef.current;
      const isFromActiveChat = currentActive && currentActive._id === msg.sender;

      // If the message is from the active chat, add to messages
      if (isFromActiveChat) {
        setMessages((prev) => [...prev, msg]);
        // Auto-mark as read since user is viewing this chat
        socket.emit("chat:markRead", { senderId: msg.sender });
      } else {
        // Add to messages if it belongs to the current conversation
        setMessages((prev) => {
          if (prev.length > 0) {
            const currentChatUser = prev[0]?.sender === user._id ? prev[0]?.receiver : prev[0]?.sender;
            if (msg.sender === currentChatUser) {
              return [...prev, msg];
            }
          }
          return prev;
        });

        // Only increment unread if NOT viewing that chat
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.sender]: (prev[msg.sender] || 0) + 1,
        }));
      }

      // Update last message always
      setLastMessages((prev) => ({
        ...prev,
        [msg.sender]: msg,
      }));
    });

    socket.on("chat:messageSent", (msg) => {
      setMessages((prev) => [...prev, msg]);
      setLastMessages((prev) => ({
        ...prev,
        [msg.receiver]: msg,
      }));
    });

    // Typing indicators
    socket.on("chat:typing", ({ senderId }) => {
      setTypingUsers((prev) => new Set([...prev, senderId]));
    });

    socket.on("chat:stopTyping", ({ senderId }) => {
      setTypingUsers((prev) => {
        const updated = new Set(prev);
        updated.delete(senderId);
        return updated;
      });
    });

    // Read receipts
    socket.on("chat:messagesRead", ({ readBy }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === user._id && msg.receiver === readBy ? { ...msg, read: true } : msg
        )
      );
    });

    return () => {
      socket.off("chat:onlineUsers");
      socket.off("chat:userOnline");
      socket.off("chat:userOffline");
      socket.off("chat:newMessage");
      socket.off("chat:messageSent");
      socket.off("chat:typing");
      socket.off("chat:stopTyping");
      socket.off("chat:messagesRead");
    };
  }, [socket, user, fetchUsers, fetchUnreadCounts]);

  const value = {
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
    fetchUsers,
    fetchMessages,
    fetchUnreadCounts,
    searchUsers,
    markAsRead,
    sendMessage,
    sendTyping,
    sendStopTyping,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
