import React, { useEffect, useCallback, useState, useRef } from "react";
import { useSocket } from "../context/SocketProvider";
import { useNavigate } from "react-router-dom";
import peer from "../services/peer";



const Room = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState();
  const [isMuted, setIsMuted] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [peerKey, setPeerKey] = useState(0); // Used to re-attach peer event listeners
  
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // New user joined handler

  const handleUserJoined = useCallback(({ email, id }) => {
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  setMyStream(stream);
  setCallActive(true);

  // Handle ICE candidates
  peer.peer.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("iceCandidate", { to: remoteSocketId, candidate: event.candidate });
    }
  };

  // ✅ add tracks BEFORE offer
  stream.getTracks().forEach(track => {
    peer.peer.addTrack(track, stream);
  });

  const offer = await peer.getOffer();
  socket.emit("callUser", { to: remoteSocketId, offer });
}, [remoteSocketId, socket]);



  const handleIncomingCall = useCallback(async ({ from, offer }) => {
    setRemoteSocketId(from);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    setMyStream(stream);
    setCallActive(true);

    // Handle ICE candidates
    peer.peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", { to: from, candidate: event.candidate });
      }
    };

    const ans = await peer.getAnswer(offer);
    socket.emit("callAccepted", { to: from, answer: ans });

    // ✅ IMPORTANT
    for (const track of stream.getTracks()) {
      peer.peer.addTrack(track, stream);
    }

  }, [socket]);

  const sendStream = useCallback(() => {
    if (!myStream) return;

    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream]);


  // Call Accepted handler
  const handleCallAccepted = useCallback(async ({ answer }) => {
  await peer.setRemoteAnswer(answer);
  sendStream();
}, [sendStream]);

  const handleNegotiationNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("negotiationneed", { to: remoteSocketId, offer });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    const currentPeer = peer.peer;
    currentPeer.addEventListener('negotiationneeded', handleNegotiationNeeded);

    return () => {
      currentPeer.removeEventListener('negotiationneeded', handleNegotiationNeeded);
    }
  }, [handleNegotiationNeeded, peerKey])

  const handleNegotiationIncoming = useCallback(async ({ from, offer }) => {
    const ans = await peer.getAnswer(offer);
    socket.emit("negotiationDone", { to: from, answer: ans });
  }, [socket]);


  const handleNegotiationFinal = useCallback(async ({ answer }) => {
    await peer.setRemoteAnswer(answer);
  }, []);

  const stopCall = useCallback(() => {
    // Stop all media tracks
    if (myStream) {
      myStream.getTracks().forEach(track => track.stop());
      setMyStream(null);
    }

    // Notify other user BEFORE resetting
    if (remoteSocketId) {
      socket.emit("endCall", { to: remoteSocketId });
    }

    // Reset peer connection (close old one and create new)
    peer.resetPeer();
    
    // Increment peerKey to re-attach event listeners
    setPeerKey(prev => prev + 1);
    
    // Reset states
    setCallActive(false);
    setIsMuted(false);
    setIsRemoteMuted(false);
    setRemoteStream(null);
    setRemoteSocketId(null);

    // Navigate back to lobby
    navigate("/lobby");
  }, [myStream, remoteSocketId, socket, navigate]);

  const toggleMute = useCallback(() => {
    if (!myStream) return;

    const audioTracks = myStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    const newMuteState = !isMuted;
    audioTracks.forEach(track => {
      track.enabled = !newMuteState;
    });

    setIsMuted(newMuteState);

    // Notify other user
    if (remoteSocketId) {
      socket.emit("muteToggle", { to: remoteSocketId, isMuted: newMuteState });
    }
  }, [myStream, isMuted, remoteSocketId, socket]);

  useEffect(() => {
  const currentPeer = peer.peer;
  const handleTrack = (ev) => {
    const [stream] = ev.streams;
    setRemoteStream(stream);
  };

  currentPeer.addEventListener("track", handleTrack);
  return () => currentPeer.removeEventListener("track", handleTrack);
}, [peerKey]);

  // Set myStream to video element only when stream changes
  useEffect(() => {
    if (myVideoRef.current && myStream) {
      myVideoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  // Set remoteStream to video element only when stream changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);


  useEffect(() => {
    socket.on("newUserJoined", handleUserJoined);

    socket.on("incomingCall", handleIncomingCall);

    socket.on("callAccepted", handleCallAccepted);

    socket.on("negotiationneed", handleNegotiationIncoming);

    socket.on("negotiationFinal", handleNegotiationFinal);

    socket.on("iceCandidate", async ({ candidate }) => {
      try {
        if (peer.peer && candidate) {
          await peer.peer.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error("Error adding ICE candidate:", error);
      }
    });

    socket.on("callEnded", () => {
      stopCall();
    });

    socket.on("remoteMuted", ({ isMuted }) => {
      setIsRemoteMuted(isMuted);
    });

    return () => {
      socket.off("newUserJoined", handleUserJoined);
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("negotiationneed", handleNegotiationIncoming);
      socket.off("negotiationFinal", handleNegotiationFinal);
      socket.off("iceCandidate");
      socket.off("callEnded");
      socket.off("remoteMuted");
    };
  }, [socket, handleUserJoined, handleIncomingCall, handleCallAccepted, handleNegotiationIncoming, handleNegotiationFinal]);

  return (
    <>
      {/* Page Wrapper */}
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 flex items-center justify-center p-6">

        {/* Main Card */}
        <div className="w-full max-w-6xl bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-wide">
                🎥 Video Room
              </h2>
              <p
                className={`mt-1 text-sm font-medium ${remoteSocketId ? "text-green-400" : "text-red-400"
                  }`}
              >
                {remoteSocketId ? "🟢 User Connected" : "🔴 No one in room"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {remoteSocketId && !callActive && (
                <button
                  onClick={handleCallUser}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-400 to-emerald-600 text-white font-semibold shadow-lg hover:scale-105 hover:shadow-green-500/40 transition-all duration-300"
                >
                  📞 Start Call
                </button>
              )}

              {callActive && (
                <>
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

                  <button
                    onClick={stopCall}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold shadow-lg hover:scale-105 hover:shadow-red-500/40 transition-all duration-300"
                  >
                    ❌ End Call
                  </button>
                </>
              )}
            </div>
          </div>
l̥
          {/* Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* My Stream */}
            <div className="bg-black/40 rounded-xl border border-white/10 p-4 relative">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                👤 My Stream
              </h3>

              {myStream ? (
                <>
                  <video
                    autoPlay
                    muted
                    playsInline
                    ref={myVideoRef}
                    className="w-full h-[260px] rounded-lg object-cover bg-black shadow-inner scale-x-[-1]"
                  />
                  {isMuted && (
                    <div className="absolute top-8 right-4 bg-red-500/90 text-white px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1">
                      🔇 Muted
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-[260px] flex items-center justify-center rounded-lg bg-black/60 text-gray-400">
                  Waiting for camera...
                </div>
              )}
            </div>

            {/* Remote Stream */}
            <div className="bg-black/40 rounded-xl border border-white/10 p-4 relative">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                🌍 Remote Stream
              </h3>

              {remoteStream ? (
                <>
                  <video
                    autoPlay
                    playsInline
                    ref={remoteVideoRef}
                    className="w-full h-[260px] rounded-lg object-cover bg-black shadow-inner scale-x-[-1]"
                  />
                  {isRemoteMuted && (
                    <div className="absolute top-8 right-4 bg-red-500/90 text-white px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1">
                      🔇 Muted
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-[260px] flex items-center justify-center rounded-lg bg-black/60 text-gray-400">
                  No remote stream yet
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>

  );
};

export default Room;
