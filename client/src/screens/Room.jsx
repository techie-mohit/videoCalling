import React, { useEffect, useCallback, useState } from "react";
import { useSocket } from "../context/SocketProvider";
import peer from "../services/peer";



const Room = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState();

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
    peer.peer.addEventListener('negotiationneeded', handleNegotiationNeeded);

    return () => {
      peer.peer.removeEventListener('negotiationneeded', handleNegotiationNeeded);
    }
  }, [handleNegotiationNeeded])

  const handleNegotiationIncoming = useCallback(async ({ from, offer }) => {
    const ans = await peer.getAnswer(offer);
    socket.emit("negotiationDone", { to: from, answer: ans });
  }, [socket]);


  const handleNegotiationFinal = useCallback(async ({ answer }) => {
    await peer.setRemoteAnswer(answer);
  }, []);

  useEffect(() => {
  const handleTrack = (ev) => {
    const [stream] = ev.streams;
    setRemoteStream(stream);
  };

  peer.peer.addEventListener("track", handleTrack);
  return () => peer.peer.removeEventListener("track", handleTrack);
}, []);


  useEffect(() => {
    socket.on("newUserJoined", handleUserJoined);

    socket.on("incomingCall", handleIncomingCall);

    socket.on("callAccepted", handleCallAccepted);

    socket.on("negotiationneed", handleNegotiationIncoming);

    socket.on("negotiationFinal", handleNegotiationFinal);

    return () => {
      socket.off("newUserJoined", handleUserJoined);
      socket.off("incomingCall", handleIncomingCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("negotiationneed", handleNegotiationIncoming);
      socket.off("negotiationFinal", handleNegotiationFinal);
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

            {remoteSocketId && (
              <button
                onClick={handleCallUser}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-400 to-emerald-600 text-white font-semibold shadow-lg hover:scale-105 hover:shadow-green-500/40 transition-all duration-300"
              >
                📞 Start Call
              </button>
            )}
          </div>

          {/* Video Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* My Stream */}
            <div className="bg-black/40 rounded-xl border border-white/10 p-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                👤 My Stream
              </h3>

              {myStream ? (
                <video
                  autoPlay
                  muted
                  playsInline
                  ref={(video) => video && (video.srcObject = myStream)}
                  className="w-full h-[260px] rounded-lg object-cover bg-black shadow-inner"
                />
              ) : (
                <div className="w-full h-[260px] flex items-center justify-center rounded-lg bg-black/60 text-gray-400">
                  Waiting for camera...
                </div>
              )}
            </div>

            {/* Remote Stream */}
            <div className="bg-black/40 rounded-xl border border-white/10 p-4">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                🌍 Remote Stream
              </h3>

              {remoteStream ? (
                <video
                  autoPlay
                  playsInline
                  ref={(video) => video && (video.srcObject = remoteStream)}
                  className="w-full h-[260px] rounded-lg object-cover bg-black shadow-inner"
                />
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
