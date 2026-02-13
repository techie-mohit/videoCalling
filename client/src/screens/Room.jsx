import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useSocket } from '../context/SocketProvider';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import peer from '../services/peer';

const Room = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const { user } = useAuth();

  // Redirect if socket not available
  useEffect(() => {
    if (!socket) {
      navigate('/login');
    }
  }, [socket, navigate]);

  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isRemoteVideoOff, setIsRemoteVideoOff] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [peerKey, setPeerKey] = useState(0);
  const [isSwapped, setIsSwapped] = useState(false);
  const [remoteUserEmail, setRemoteUserEmail] = useState(null);

  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const myStreamRef = useRef(null);
  const cameraPromiseRef = useRef(null);
  const waitingForCallRef = useRef(false);
  const iceCandidateBuffer = useRef([]);
  const joinedRoomRef = useRef(false);

  // Shared camera helper - prevents duplicate getUserMedia calls
  const getCamera = useCallback(async () => {
    // If stream already exists, return it immediately
    // Why? Prevent re-requesting camera on re-render
    if (myStreamRef.current) return myStreamRef.current;

    // If no camera request is currently running
    // Why? Prevent multiple parallel getUserMedia calls
    if (!cameraPromiseRef.current) {
      // Start camera request
      // navigator.mediaDevices.getUserMedia is browser API
      // It asks permission & returns media stream
      cameraPromiseRef.current = navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        // When camera permission is granted
        .then((stream) => {
          // Store in state (for UI updates)
          setMyStream(stream);
          // Store in ref (persistent value across renders)
          myStreamRef.current = stream;
          // Return stream so caller can use it
          return stream;
        })
        // If user denies permission or error occurs
        .catch((err) => {
          console.error('Failed to get camera:', err);
          // Reset promise ref so future attempts can retry
          cameraPromiseRef.current = null;
          return null;
        });
    }
    // If request already running, return same promise
    // Prevent duplicate permission popup
    return cameraPromiseRef.current;
}, []); // Empty dependency → function created only once


  // Get camera on mount
  useEffect(() => {
    getCamera();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup camera and leave room on unmount
  useEffect(() => {
    return () => {
      if (myStreamRef.current) {
        myStreamRef.current.getTracks().forEach((t) => t.stop());
        myStreamRef.current = null;
      }
      // Leave room when component unmounts
      if (socket) socket.emit('leaveRoom');
      cameraPromiseRef.current = null;
    };
  }, [socket]);

  // Someone NEW joined our room — we are the existing user, we should call them
  const handleUserJoined = useCallback(
    ({ id, email }) => {
      console.log('[Room] newUserJoined: I am the existing user, will call', id);
      waitingForCallRef.current = false;
      if (callActive) {
        peer.resetPeer();
        setPeerKey((p) => p + 1);
        setCallActive(false);
        setRemoteStream(null);
      }
      setRemoteSocketId(id);
      setRemoteUserEmail(email);
    },
    [callActive]
  );

  // We joined a room that ALREADY has a user — wait for their call (prevents glare)
  const handleExistingUser = useCallback(({ id, email }) => {
    console.log('[Room] existingUser: I am the new user, will wait for call from', id);
    waitingForCallRef.current = true;
    setRemoteSocketId(id);
    setRemoteUserEmail(email);
  }, []);

  const handleCallUser = useCallback(async () => {
    let stream = myStreamRef.current;
    if (!stream) stream = await getCamera();
    if (!stream) return;

    setCallActive(true);

    peer.peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('iceCandidate', { to: remoteSocketId, candidate: event.candidate });
      }
    };

    stream.getTracks().forEach((track) => {
      peer.peer.addTrack(track, stream);
    });

    const offer = await peer.getOffer();
    socket.emit('callUser', { to: remoteSocketId, offer });
  }, [remoteSocketId, socket, getCamera]);

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      waitingForCallRef.current = false;

      let stream = myStreamRef.current;
      if (!stream) stream = await getCamera();
      if (!stream) return;

      setCallActive(true);

      peer.peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('iceCandidate', { to: from, candidate: event.candidate });
        }
      };

      // Correct callee order: setRemoteDescription -> addTrack -> createAnswer
      await peer.peer.setRemoteDescription(offer);

      // Flush any ICE candidates that arrived before remote description was set
      for (const c of iceCandidateBuffer.current) {
        try {
          await peer.peer.addIceCandidate(new RTCIceCandidate(c));
        } catch (e) {
          console.error('Error adding buffered ICE candidate:', e);
        }
      }
      iceCandidateBuffer.current = [];

      for (const track of stream.getTracks()) {
        peer.peer.addTrack(track, stream);
      }
      const answer = await peer.peer.createAnswer();
      await peer.peer.setLocalDescription(answer);
      socket.emit('callAccepted', { to: from, answer });
    },
    [socket, getCamera]
  );

  const handleCallAccepted = useCallback(async ({ answer }) => {
    await peer.setRemoteAnswer(answer);

    // Flush any ICE candidates that arrived before remote description was set
    for (const c of iceCandidateBuffer.current) {
      try {
        await peer.peer.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.error('Error adding buffered ICE candidate:', e);
      }
    }
    iceCandidateBuffer.current = [];
  }, []);

  // const handleNegotiationNeeded = useCallback(async () => {
  //   const offer = await peer.getOffer();
  //   socket.emit('negotiationneed', { to: remoteSocketId, offer });
  // }, [remoteSocketId, socket]);

  // useEffect(() => {
  //   const p = peer.peer;
  //   p.addEventListener('negotiationneeded', handleNegotiationNeeded);
  //   return () => p.removeEventListener('negotiationneeded', handleNegotiationNeeded);
  // }, [handleNegotiationNeeded, peerKey]);

  // const handleNegotiationIncoming = useCallback(
  //   async ({ from, offer }) => {
  //     const ans = await peer.getAnswer(offer);
  //     socket.emit('negotiationDone', { to: from, answer: ans });
  //   },
  //   [socket]
  // );

  // const handleNegotiationFinal = useCallback(async ({ answer }) => {
  //   await peer.setRemoteAnswer(answer);
  // }, []);

  const stopCall = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach((t) => t.stop());
      setMyStream(null);
      myStreamRef.current = null;
    }
    if (socket && remoteSocketId) socket.emit('endCall', { to: remoteSocketId });
    
    // Leave the room on server side
    if (socket) socket.emit('leaveRoom');
    joinedRoomRef.current = false;

    peer.resetPeer();
    setPeerKey((p) => p + 1);
    setCallActive(false);
    setIsMuted(false);
    setIsRemoteMuted(false);
    setIsVideoOff(false);
    setIsRemoteVideoOff(false);
    setRemoteStream(null);
    setRemoteSocketId(null);
    setRemoteUserEmail(null);
    waitingForCallRef.current = false;
    cameraPromiseRef.current = null;
    navigate('/lobby');
  }, [myStream, remoteSocketId, socket, navigate]);

  const toggleMute = useCallback(() => {
    if (!myStream) return;
    const audioTracks = myStream.getAudioTracks();
    if (audioTracks.length === 0) return;
    const newMute = !isMuted;
    audioTracks.forEach((t) => (t.enabled = !newMute));
    setIsMuted(newMute);
    if (remoteSocketId) socket.emit('muteToggle', { to: remoteSocketId, isMuted: newMute });
  }, [myStream, isMuted, remoteSocketId, socket]);

  const toggleVideo = useCallback(() => {
    if (!myStream) return;
    const videoTracks = myStream.getVideoTracks();
    if (videoTracks.length === 0) return;
    const newVideoOff = !isVideoOff;
    videoTracks.forEach((t) => (t.enabled = !newVideoOff));
    setIsVideoOff(newVideoOff);
    if (remoteSocketId) socket.emit('videoToggle', { to: remoteSocketId, isVideoOff: newVideoOff });
  }, [myStream, isVideoOff, remoteSocketId, socket]);

  // Track listener — receives remote video/audio
  useEffect(() => {
    const p = peer.peer;
    const handleTrack = (ev) => {
      const [stream] = ev.streams;
      setRemoteStream(stream);
    };
    p.addEventListener('track', handleTrack);
    return () => p.removeEventListener('track', handleTrack);
  }, [peerKey]);

  // Auto-call: only when we are the EXISTING user (not waiting for call)
  useEffect(() => {
    if (remoteSocketId && myStream && !callActive && !waitingForCallRef.current) {
      // Small delay to let signaling settle, then auto-call
      const timer = setTimeout(() => {
        if (remoteSocketId && myStreamRef.current && !callActive && !waitingForCallRef.current) {
          console.log('[Room] Auto-calling remote user', remoteSocketId);
          handleCallUser();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [remoteSocketId, myStream, callActive, handleCallUser]);

  // Attach streams to video elements
  useEffect(() => {
    if (myVideoRef.current && myStream) myVideoRef.current.srcObject = myStream;
  }, [myStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // Socket event listeners - MUST be set up before emitting joinRoom
  useEffect(() => {
    if (!socket) return;
    
    // Set up roomFull listener FIRST to catch immediate responses
    socket.on('roomFull', ({ roomId: fullRoomId, message }) => {
      // Room is full, redirect back to lobby with error message
      navigate('/lobby', { 
        state: { 
          error: message || `Room "${fullRoomId}" is full. Two users are already connected.` 
        } 
      });
    });

    socket.on('newUserJoined', handleUserJoined);
    socket.on('existingUser', handleExistingUser);
    socket.on('incomingCall', handleIncomingCall);
    socket.on('callAccepted', handleCallAccepted);
    // socket.on('negotiationneed', handleNegotiationIncoming);
    // socket.on('negotiationFinal', handleNegotiationFinal);

    socket.on('iceCandidate', async ({ candidate }) => {
      try {
        if (peer.peer && candidate) {
          if (peer.peer.remoteDescription && peer.peer.remoteDescription.type) {
            await peer.peer.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            // Buffer candidates that arrive before remote description is set
            iceCandidateBuffer.current.push(candidate);
          }
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    socket.on('callEnded', () => stopCall());
    socket.on('remoteMuted', ({ isMuted }) => setIsRemoteMuted(isMuted));
    socket.on('remoteVideoOff', ({ isVideoOff }) => setIsRemoteVideoOff(isVideoOff));

    socket.on('userLeft', () => {
      peer.resetPeer();
      setPeerKey((p) => p + 1);
      setCallActive(false);
      setRemoteStream(null);
      setRemoteSocketId(null);
      setRemoteUserEmail(null);
      setIsRemoteMuted(false);
      setIsRemoteVideoOff(false);
      waitingForCallRef.current = false;
    });

    // NOW emit joinRoom after all listeners are set up (only once)
    if (user?.email && roomId && !joinedRoomRef.current) {
      joinedRoomRef.current = true;
      socket.emit('joinRoom', { email: user.email, roomId });
    }

    return () => {
      if (!socket) return;
      socket.off('newUserJoined', handleUserJoined);
      socket.off('existingUser', handleExistingUser);
      socket.off('incomingCall', handleIncomingCall);
      socket.off('callAccepted', handleCallAccepted);
      // socket.off('negotiationneed', handleNegotiationIncoming);
      // socket.off('negotiationFinal', handleNegotiationFinal);
      socket.off('iceCandidate');
      socket.off('callEnded');
      socket.off('remoteMuted');
      socket.off('remoteVideoOff');
      socket.off('roomFull');
      socket.off('userLeft');
    };
  }, [
    socket,
    navigate,
    user,
    roomId,
    handleUserJoined,
    handleExistingUser,
    handleIncomingCall,
    handleCallAccepted,
   // handleNegotiationIncoming,
    // handleNegotiationFinal,
    stopCall,
  ]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-indigo-900 to-purple-900 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-wide">🎥 Video Room</h2>
            <p
              className={`mt-1 text-sm font-medium ${remoteSocketId ? 'text-green-400' : 'text-red-400'}`}
            >
              {remoteSocketId ? '🟢 User Connected' : '🔴 No one in room'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
              {/* Start Call button removed: call will auto-initiate when both users are present */}

            {callActive && (
              <>
                <button
                  onClick={toggleMute}
                  className={`px-4 py-3 sm:px-6 rounded-xl font-semibold shadow-lg hover:scale-105 transition-all duration-300 text-white ${
                    isMuted
                      ? 'bg-linear-to-r from-red-500 to-orange-600 hover:shadow-red-500/40'
                      : 'bg-linear-to-r from-blue-500 to-cyan-600 hover:shadow-blue-500/40'
                  }`}
                >
                  {isMuted ? '🔇 Unmute' : '🔊 Mute'}
                </button>

                <button
                  onClick={toggleVideo}
                  className={`px-4 py-3 sm:px-6 rounded-xl font-semibold shadow-lg hover:scale-105 transition-all duration-300 text-white ${
                    isVideoOff
                      ? 'bg-linear-to-r from-red-500 to-orange-600 hover:shadow-red-500/40'
                      : 'bg-linear-to-r from-green-500 to-teal-600 hover:shadow-green-500/40'
                  }`}
                >
                  {isVideoOff ? (
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        <path strokeLinecap="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" />
                      </svg>
                      <span className="hidden sm:inline">Video On</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      <span className="hidden sm:inline">Video Off</span>
                    </span>
                  )}
                </button>

                <button
                  onClick={stopCall}
                  className="px-4 py-3 sm:px-6 rounded-xl bg-linear-to-r from-red-500 to-pink-600 text-white font-semibold shadow-lg hover:scale-105 hover:shadow-red-500/40 transition-all duration-300"
                >
                  <span className="sm:hidden">❌</span>
                  <span className="hidden sm:inline">❌ End Call</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Video Container - WhatsApp Style */}
        <div className="relative w-full aspect-video md:aspect-[16/9] rounded-xl overflow-hidden bg-black/40 border border-white/10">
          
          {/* When no remote user - show my stream full */}
          {!remoteStream ? (
            <div className="w-full h-full relative">
              {myStream ? (
                <>
                  <video
                    autoPlay
                    muted
                    playsInline
                    ref={myVideoRef}
                    className={`w-full h-full object-cover scale-x-[-1] ${isVideoOff ? 'blur-xl brightness-75' : ''}`}
                  />
                  {isVideoOff && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-md">
                      <div className="relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 sm:h-28 sm:w-28 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-24 sm:w-32 h-1 bg-red-500 rounded-full rotate-45 shadow-lg"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  {isMuted && (
                    <div className="absolute top-4 right-4 bg-red-500/90 text-white px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1">
                      🔇 <span className="hidden sm:inline">Muted</span>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 bg-black/60 text-white px-3 py-1 rounded-lg text-sm font-medium">
                    You
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  Waiting for camera...
                </div>
              )}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-gray-300 px-4 py-2 rounded-lg text-sm">
                Waiting for someone to join...
              </div>
            </div>
          ) : (
            /* When remote user connected - big/small layout with swap functionality */
            <>
              {/* My Stream Video - Position changes based on isSwapped */}
              <div 
                onClick={isSwapped ? undefined : () => setIsSwapped(true)}
                className={`absolute transition-all duration-300 ease-in-out ${
                  isSwapped 
                    ? 'inset-0 z-0' 
                    : 'bottom-4 right-4 w-28 h-20 sm:w-40 sm:h-28 md:w-48 md:h-36 rounded-xl border-2 border-white/30 shadow-2xl cursor-pointer hover:border-white/60 hover:scale-105 z-10'
                } overflow-hidden`}
              >
                {myStream && (
                  <>
                    <video
                      autoPlay
                      muted
                      playsInline
                      ref={myVideoRef}
                      className={`w-full h-full object-cover scale-x-[-1] ${isVideoOff ? 'blur-xl brightness-75' : ''}`}
                    />
                    {isVideoOff && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-md">
                        <div className="relative">
                          <svg xmlns="http://www.w3.org/2000/svg" className={`${isSwapped ? 'h-20 w-20 sm:h-28 sm:w-28' : 'h-8 w-8'} text-white/80`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className={`${isSwapped ? 'w-24 sm:w-32 h-1' : 'w-10 h-0.5'} bg-red-500 rounded-full rotate-45 shadow-lg`}></div>
                          </div>
                        </div>
                      </div>
                    )}
                    {isMuted && (
                      <div className={`absolute ${isSwapped ? 'top-4 right-4 px-3 py-1 text-sm' : 'top-1 right-1 p-1 text-xs'} bg-red-500/90 text-white rounded-lg font-semibold flex items-center gap-1`}>
                        🔇 {isSwapped && <span className="hidden sm:inline">Muted</span>}
                      </div>
                    )}
                    <div className={`absolute ${isSwapped ? 'bottom-4 left-4 px-3 py-1 text-sm' : 'bottom-1 left-1 px-1.5 py-0.5 text-xs'} bg-black/60 text-white rounded-lg font-medium`}>
                      {isSwapped ? 'You' : 'You'}
                    </div>
                  </>
                )}
                {/* Click hint for small video */}
                {!isSwapped && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors">
                    <span className="opacity-0 hover:opacity-100 text-white text-xs font-medium">Click to swap</span>
                  </div>
                )}
              </div>

              {/* Remote Stream Video - Position changes based on isSwapped */}
              <div 
                onClick={!isSwapped ? undefined : () => setIsSwapped(false)}
                className={`absolute transition-all duration-300 ease-in-out ${
                  !isSwapped 
                    ? 'inset-0 z-0' 
                    : 'bottom-4 right-4 w-28 h-20 sm:w-40 sm:h-28 md:w-48 md:h-36 rounded-xl border-2 border-white/30 shadow-2xl cursor-pointer hover:border-white/60 hover:scale-105 z-10'
                } overflow-hidden`}
              >
                <video
                  autoPlay
                  playsInline
                  ref={remoteVideoRef}
                  className={`w-full h-full object-cover scale-x-[-1] ${isRemoteVideoOff ? 'blur-xl brightness-75' : ''}`}
                />
                {isRemoteVideoOff && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-md">
                    <div className="relative">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`${!isSwapped ? 'h-20 w-20 sm:h-28 sm:w-28' : 'h-8 w-8'} text-white/80`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`${!isSwapped ? 'w-24 sm:w-32 h-1' : 'w-10 h-0.5'} bg-red-500 rounded-full rotate-45 shadow-lg`}></div>
                      </div>
                    </div>
                  </div>
                )}
                {isRemoteMuted && (
                  <div className={`absolute ${!isSwapped ? 'top-4 right-4 px-3 py-1 text-sm' : 'top-1 right-1 p-1 text-xs'} bg-red-500/90 text-white rounded-lg font-semibold flex items-center gap-1`}>
                    🔇 {!isSwapped && <span className="hidden sm:inline">Muted</span>}
                  </div>
                )}
                <div className={`absolute ${!isSwapped ? 'bottom-4 left-4 px-3 py-1 text-sm' : 'bottom-1 left-1 px-1.5 py-0.5 text-xs'} bg-black/60 text-white rounded-lg font-medium truncate max-w-[90%]`}>
                  {!isSwapped ? (remoteUserEmail ? remoteUserEmail.split('@')[0] : 'User') : (remoteUserEmail ? remoteUserEmail.split('@')[0].charAt(0).toUpperCase() : 'U')}
                </div>
                {/* Click hint for small video */}
                {isSwapped && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors">
                    <span className="opacity-0 hover:opacity-100 text-white text-xs font-medium">Click to swap</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Room;
