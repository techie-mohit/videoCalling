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
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [peerKey, setPeerKey] = useState(0);

  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const myStreamRef = useRef(null);
  const cameraPromiseRef = useRef(null);
  const waitingForCallRef = useRef(false);
  const iceCandidateBuffer = useRef([]);

  // Shared camera helper - prevents duplicate getUserMedia calls
  const getCamera = useCallback(async () => {
    if (myStreamRef.current) return myStreamRef.current;
    if (!cameraPromiseRef.current) {
      cameraPromiseRef.current = navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setMyStream(stream);
          myStreamRef.current = stream;
          return stream;
        })
        .catch((err) => {
          console.error('Failed to get camera:', err);
          cameraPromiseRef.current = null;
          return null;
        });
    }
    return cameraPromiseRef.current;
  }, []);

  // Get camera + join room on mount (handles page refresh)
  useEffect(() => {
    getCamera();
    if (user?.email && roomId) {
      socket.emit('joinRoom', { email: user.email, roomId });
    }
    return () => {};
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (myStreamRef.current) {
        myStreamRef.current.getTracks().forEach((t) => t.stop());
        myStreamRef.current = null;
      }
      cameraPromiseRef.current = null;
    };
  }, []);

  // Someone NEW joined our room — we are the existing user, we should call them
  const handleUserJoined = useCallback(
    ({ id }) => {
      console.log('[Room] newUserJoined: I am the existing user, will call', id);
      waitingForCallRef.current = false;
      if (callActive) {
        peer.resetPeer();
        setPeerKey((p) => p + 1);
        setCallActive(false);
        setRemoteStream(null);
      }
      setRemoteSocketId(id);
    },
    [callActive]
  );

  // We joined a room that ALREADY has a user — wait for their call (prevents glare)
  const handleExistingUser = useCallback(({ id }) => {
    console.log('[Room] existingUser: I am the new user, will wait for call from', id);
    waitingForCallRef.current = true;
    setRemoteSocketId(id);
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

  const handleNegotiationNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit('negotiationneed', { to: remoteSocketId, offer });
  }, [remoteSocketId, socket]);

  useEffect(() => {
    const p = peer.peer;
    p.addEventListener('negotiationneeded', handleNegotiationNeeded);
    return () => p.removeEventListener('negotiationneeded', handleNegotiationNeeded);
  }, [handleNegotiationNeeded, peerKey]);

  const handleNegotiationIncoming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit('negotiationDone', { to: from, answer: ans });
    },
    [socket]
  );

  const handleNegotiationFinal = useCallback(async ({ answer }) => {
    await peer.setRemoteAnswer(answer);
  }, []);

  const stopCall = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach((t) => t.stop());
      setMyStream(null);
      myStreamRef.current = null;
    }
    if (remoteSocketId) socket.emit('endCall', { to: remoteSocketId });

    peer.resetPeer();
    setPeerKey((p) => p + 1);
    setCallActive(false);
    setIsMuted(false);
    setIsRemoteMuted(false);
    setRemoteStream(null);
    setRemoteSocketId(null);
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

  // Socket event listeners
  useEffect(() => {
    socket.on('newUserJoined', handleUserJoined);
    socket.on('existingUser', handleExistingUser);
    socket.on('incomingCall', handleIncomingCall);
    socket.on('callAccepted', handleCallAccepted);
    socket.on('negotiationneed', handleNegotiationIncoming);
    socket.on('negotiationFinal', handleNegotiationFinal);

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

    socket.on('userLeft', () => {
      peer.resetPeer();
      setPeerKey((p) => p + 1);
      setCallActive(false);
      setRemoteStream(null);
      setRemoteSocketId(null);
      setIsRemoteMuted(false);
      waitingForCallRef.current = false;
    });

    return () => {
      socket.off('newUserJoined', handleUserJoined);
      socket.off('existingUser', handleExistingUser);
      socket.off('incomingCall', handleIncomingCall);
      socket.off('callAccepted', handleCallAccepted);
      socket.off('negotiationneed', handleNegotiationIncoming);
      socket.off('negotiationFinal', handleNegotiationFinal);
      socket.off('iceCandidate');
      socket.off('callEnded');
      socket.off('remoteMuted');
      socket.off('userLeft');
    };
  }, [
    socket,
    handleUserJoined,
    handleExistingUser,
    handleIncomingCall,
    handleCallAccepted,
    handleNegotiationIncoming,
    handleNegotiationFinal,
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
                  className={`px-6 py-3 rounded-xl font-semibold shadow-lg hover:scale-105 transition-all duration-300 text-white ${
                    isMuted
                      ? 'bg-linear-to-r from-red-500 to-orange-600 hover:shadow-red-500/40'
                      : 'bg-linear-to-r from-blue-500 to-cyan-600 hover:shadow-blue-500/40'
                  }`}
                >
                  {isMuted ? '🔇 Unmute' : '🔊 Mute'}
                </button>

                <button
                  onClick={stopCall}
                  className="px-6 py-3 rounded-xl bg-linear-to-r from-red-500 to-pink-600 text-white font-semibold shadow-lg hover:scale-105 hover:shadow-red-500/40 transition-all duration-300"
                >
                  ❌ End Call
                </button>
              </>
            )}
          </div>
        </div>

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
                  className="w-full h-65 rounded-lg object-cover bg-black shadow-inner scale-x-[-1]"
                />
                {isMuted && (
                  <div className="absolute top-8 right-4 bg-red-500/90 text-white px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1">
                    🔇 Muted
                  </div>
                )}
              </>
            ) : (
                <div className="w-full h-65 flex items-center justify-center rounded-lg bg-black/60 text-gray-400">
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
                  className="w-full h-65 rounded-lg object-cover bg-black shadow-inner scale-x-[-1]"
                />
                {isRemoteMuted && (
                  <div className="absolute top-8 right-4 bg-red-500/90 text-white px-3 py-1 rounded-lg text-sm font-semibold flex items-center gap-1">
                    🔇 Muted
                  </div>
                )}
              </>
            ) : (
                <div className="w-full h-65 flex items-center justify-center rounded-lg bg-black/60 text-gray-400">
                No remote stream yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
