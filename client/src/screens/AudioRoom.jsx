import React, { useEffect, useCallback, useState, useRef } from "react";
import { useSocket } from "../context/SocketProvider";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";
import audioPeer from "../services/audioPeer";

const AudioRoom = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket) navigate("/login");
  }, [socket, navigate]);

  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [peerKey, setPeerKey] = useState(0);
  const [remoteUserEmail, setRemoteUserEmail] = useState(null);
  const [callDuration, setCallDuration] = useState(0);

  const myStreamRef = useRef(null);
  const micPromiseRef = useRef(null);
  const waitingForCallRef = useRef(false);
  const iceCandidateBuffer = useRef([]);
  const joinedRoomRef = useRef(false);
  const remoteAudioRef = useRef(null);
  const timerRef = useRef(null);

  // Get microphone only (no video)
  const getMic = useCallback(async () => {
    if (myStreamRef.current) return myStreamRef.current;

    if (!micPromiseRef.current) {
      micPromiseRef.current = navigator.mediaDevices
        .getUserMedia({ video: false, audio: true })
        .then((stream) => {
          setMyStream(stream);
          myStreamRef.current = stream;
          return stream;
        })
        .catch((err) => {
          console.error("Failed to get microphone:", err);
          micPromiseRef.current = null;
          return null;
        });
    }
    return micPromiseRef.current;
  }, []);

  // Get mic on mount
  useEffect(() => {
    getMic();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (myStreamRef.current) {
        myStreamRef.current.getTracks().forEach((t) => t.stop());
        myStreamRef.current = null;
      }
      if (socket) socket.emit("audio:leaveRoom");
      if (timerRef.current) clearInterval(timerRef.current);
      micPromiseRef.current = null;
    };
  }, [socket]);

  // Call duration timer
  useEffect(() => {
    if (callActive) {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callActive]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // New user joined — we call them
  const handleUserJoined = useCallback(
    ({ id, email }) => {
      waitingForCallRef.current = false;
      if (callActive) {
        audioPeer.resetPeer();
        setPeerKey((p) => p + 1);
        setCallActive(false);
        setRemoteStream(null);
      }
      setRemoteSocketId(id);
      setRemoteUserEmail(email);
    },
    [callActive]
  );

  // Existing user in room — we wait
  const handleExistingUser = useCallback(({ id, email }) => {
    waitingForCallRef.current = true;
    setRemoteSocketId(id);
    setRemoteUserEmail(email);
  }, []);

  const handleCallUser = useCallback(async () => {
    let stream = myStreamRef.current;
    if (!stream) stream = await getMic();
    if (!stream) return;

    setCallActive(true);

    audioPeer.peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("audio:iceCandidate", { to: remoteSocketId, candidate: event.candidate });
      }
    };

    stream.getTracks().forEach((track) => {
      audioPeer.peer.addTrack(track, stream);
    });

    const offer = await audioPeer.getOffer();
    socket.emit("audio:callUser", { to: remoteSocketId, offer });
  }, [remoteSocketId, socket, getMic]);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      waitingForCallRef.current = false;

      let stream = myStreamRef.current;
      if (!stream) stream = await getMic();
      if (!stream) return;

      setCallActive(true);

      audioPeer.peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("audio:iceCandidate", { to: from, candidate: event.candidate });
        }
      };

      await audioPeer.peer.setRemoteDescription(offer);

      for (const c of iceCandidateBuffer.current) {
        try {
          await audioPeer.peer.addIceCandidate(new RTCIceCandidate(c));
        } catch (e) {
          console.error("Error adding buffered ICE:", e);
        }
      }
      iceCandidateBuffer.current = [];

      for (const track of stream.getTracks()) {
        audioPeer.peer.addTrack(track, stream);
      }
      const answer = await audioPeer.peer.createAnswer();
      await audioPeer.peer.setLocalDescription(answer);
      socket.emit("audio:callAccepted", { to: from, answer });
    },
    [socket, getMic]
  );

  const handleCallAccepted = useCallback(async ({ answer }) => {
    await audioPeer.setRemoteAnswer(answer);
    for (const c of iceCandidateBuffer.current) {
      try {
        await audioPeer.peer.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.error("Error adding buffered ICE:", e);
      }
    }
    iceCandidateBuffer.current = [];
  }, []);

  const stopCall = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach((t) => t.stop());
      setMyStream(null);
      myStreamRef.current = null;
    }
    if (socket && remoteSocketId) socket.emit("audio:endCall", { to: remoteSocketId });
    if (socket) socket.emit("audio:leaveRoom");
    joinedRoomRef.current = false;

    audioPeer.resetPeer();
    setPeerKey((p) => p + 1);
    setCallActive(false);
    setIsMuted(false);
    setIsRemoteMuted(false);
    setRemoteStream(null);
    setRemoteSocketId(null);
    setRemoteUserEmail(null);
    waitingForCallRef.current = false;
    micPromiseRef.current = null;
    navigate("/audio");
  }, [myStream, remoteSocketId, socket, navigate]);

  const toggleMute = useCallback(() => {
    if (!myStream) return;
    const audioTracks = myStream.getAudioTracks();
    if (audioTracks.length === 0) return;
    const newMute = !isMuted;
    audioTracks.forEach((t) => (t.enabled = !newMute));
    setIsMuted(newMute);
    if (remoteSocketId) socket.emit("audio:muteToggle", { to: remoteSocketId, isMuted: newMute });
  }, [myStream, isMuted, remoteSocketId, socket]);

  // Remote audio track
  useEffect(() => {
    const p = audioPeer.peer;
    const handleTrack = (ev) => {
      const [stream] = ev.streams;
      setRemoteStream(stream);
    };
    p.addEventListener("track", handleTrack);
    return () => p.removeEventListener("track", handleTrack);
  }, [peerKey]);

  // Play remote audio
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-call
  useEffect(() => {
    if (remoteSocketId && myStream && !callActive && !waitingForCallRef.current) {
      const timer = setTimeout(() => {
        if (remoteSocketId && myStreamRef.current && !callActive && !waitingForCallRef.current) {
          handleCallUser();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [remoteSocketId, myStream, callActive, handleCallUser]);

  // Socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("audio:roomFull", ({ message }) => {
      if (myStreamRef.current) {
        myStreamRef.current.getTracks().forEach((t) => t.stop());
        myStreamRef.current = null;
        setMyStream(null);
      }
      micPromiseRef.current = null;
      navigate("/audio", { state: { error: message } });
    });

    socket.on("audio:newUserJoined", handleUserJoined);
    socket.on("audio:existingUser", handleExistingUser);
    socket.on("audio:incomingCall", handleIncomingCall);
    socket.on("audio:callAccepted", handleCallAccepted);

    socket.on("audio:iceCandidate", async ({ candidate }) => {
      try {
        if (audioPeer.peer && candidate) {
          if (audioPeer.peer.remoteDescription && audioPeer.peer.remoteDescription.type) {
            await audioPeer.peer.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            iceCandidateBuffer.current.push(candidate);
          }
        }
      } catch (err) {
        console.error("Error adding audio ICE candidate:", err);
      }
    });

    socket.on("audio:callEnded", () => stopCall());
    socket.on("audio:remoteMuted", ({ isMuted }) => setIsRemoteMuted(isMuted));

    socket.on("audio:userLeft", () => {
      audioPeer.resetPeer();
      setPeerKey((p) => p + 1);
      setCallActive(false);
      setRemoteStream(null);
      setRemoteSocketId(null);
      setRemoteUserEmail(null);
      setIsRemoteMuted(false);
      waitingForCallRef.current = false;
    });

    if (user?.email && roomId && !joinedRoomRef.current) {
      joinedRoomRef.current = true;
      socket.emit("audio:joinRoom", { email: user.email, roomId });
    }

    return () => {
      if (!socket) return;
      socket.off("audio:newUserJoined", handleUserJoined);
      socket.off("audio:existingUser", handleExistingUser);
      socket.off("audio:incomingCall", handleIncomingCall);
      socket.off("audio:callAccepted", handleCallAccepted);
      socket.off("audio:iceCandidate");
      socket.off("audio:callEnded");
      socket.off("audio:remoteMuted");
      socket.off("audio:roomFull");
      socket.off("audio:userLeft");
    };
  }, [socket, navigate, user, roomId, handleUserJoined, handleExistingUser, handleIncomingCall, handleCallAccepted, stopCall]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-orange-950 flex items-center justify-center p-4">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="w-full max-w-lg bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">🎙️ Audio Room</h2>
          <p className="text-sm text-white/50 font-mono">Room: {roomId}</p>
        </div>

        {/* Status */}
        <div className="text-center mb-8">
          <p className={`text-sm font-medium ${remoteSocketId ? "text-green-400" : "text-orange-400"}`}>
            {remoteSocketId ? "🟢 User Connected" : "🟡 Waiting for someone to join..."}
          </p>
          {callActive && (
            <p className="text-2xl font-mono text-white mt-4">{formatDuration(callDuration)}</p>
          )}
        </div>

        {/* Avatars */}
        <div className="flex items-center justify-center gap-8 mb-8">
          {/* My avatar */}
          <div className="text-center">
            <div className={`relative mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl ${callActive && !isMuted ? "ring-4 ring-amber-400/50 animate-pulse" : ""}`}>
              {user?.name?.charAt(0).toUpperCase()}
              {isMuted && (
                <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1.5">
                  <span className="text-xs">🔇</span>
                </div>
              )}
            </div>
            <p className="text-sm text-white/70 mt-2">You</p>
          </div>

          {/* Connection indicator */}
          {callActive && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <div className="w-8 h-0.5 bg-white/20"></div>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            </div>
          )}

          {/* Remote avatar */}
          {remoteSocketId && (
            <div className="text-center">
              <div className={`relative mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl ${callActive && !isRemoteMuted ? "ring-4 ring-cyan-400/50 animate-pulse" : ""}`}>
                {remoteUserEmail ? remoteUserEmail.charAt(0).toUpperCase() : "?"}
                {isRemoteMuted && (
                  <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1.5">
                    <span className="text-xs">🔇</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-white/70 mt-2 truncate max-w-[120px]">
                {remoteUserEmail ? remoteUserEmail.split("@")[0] : "User"}
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {callActive && (
            <button
              onClick={toggleMute}
              className={`px-6 py-3 rounded-xl font-semibold shadow-lg hover:scale-105 transition-all duration-300 text-white ${
                isMuted
                  ? "bg-gradient-to-r from-red-500 to-orange-600 hover:shadow-red-500/40"
                  : "bg-gradient-to-r from-blue-500 to-cyan-600 hover:shadow-blue-500/40"
              }`}
            >
              {isMuted ? "🔇 Unmute" : "🔊 Mute"}
            </button>
          )}

          <button
            onClick={callActive ? stopCall : () => navigate("/audio")}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold shadow-lg hover:scale-105 hover:shadow-red-500/40 transition-all duration-300"
          >
            {callActive ? "❌ End Call" : "← Leave Room"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioRoom;
