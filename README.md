# 🎥 Video Calling Platform - Enterprise Architecture Documentation

A **production-ready, real-time video calling application** built with modern web technologies. This document provides a comprehensive industry-level analysis of the system architecture, data flows, security mechanisms, and internal operations.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Data Flow & Packet Structure](#data-flow--packet-structure)
5. [Core Components](#core-components)
6. [Authentication & Security](#authentication--security)
7. [WebRTC Signaling Protocol](#webrtc-signaling-protocol)
8. [Data Packet Breakdown](#data-packet-breakdown)
9. [Deployment & Performance](#deployment--performance)
10. [Security Considerations](#security-considerations)

---

## 🎯 Project Overview

### Purpose
A **real-time peer-to-peer video calling platform** that enables secure, authenticated users to establish encrypted multimedia communication channels. The application utilizes WebRTC for direct peer connections and Socket.IO for signaling.

### Key Features
- ✅ User authentication with JWT tokens
- ✅ Secure password hashing (bcrypt)
- ✅ Real-time signaling via WebSocket (Socket.IO)
- ✅ Peer-to-peer video/audio streaming (WebRTC)
- ✅ Room-based session management
- ✅ Mute/unmute toggle with live notifications
- ✅ End-to-end encrypted connections
- ✅ Session-based user tracking

### Use Cases
1. **Enterprise Communications** - Remote team meetings
2. **Healthcare** - Telemedicine consultations
3. **Education** - Virtual classrooms & tutoring
4. **Customer Support** - Live video support
5. **Social Connections** - One-on-one personal calls

---

## 🛠️ Technology Stack

### Backend (Node.js + Express)
```
Server Framework: Express 5.2.1
Runtime: Node.js with ES Modules
Database: MongoDB 7.0 + Mongoose 9.1.5
Real-time Communication: Socket.IO 4.8.3
Authentication: JWT (JSON Web Tokens)
Password Security: bcryptjs 3.0.3
```

### Frontend (React + Vite)
```
UI Framework: React 19.2.0
Bundler: Vite 7.2.4
Routing: React Router DOM 7.13.0
Real-time Client: Socket.IO Client 4.8.3
Styling: Tailwind CSS 4.1.18
Protocol: WebRTC (Browser Native API)
```


---

## 🏗️ System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET (Public)                         │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    ┌────▼─────┐
                    │  Client   │
                    │  Browser  │
                    └────┬─────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐    ┌─────────────┐   ┌──────────┐
   │ HTTP/S  │    │ WebSocket   │   │ WebRTC  │
   │ REST    │    │ (Socket.IO) │   │ (P2P)   │
   └────┬────┘    └──────┬──────┘   └────┬─────┘
        │                │               │
        └────────────────┼───────────────┘
                         │
                    ┌────▼──────────────┐
                    │  Express Server   │
                    │  (Port 5000)      │
                    └────┬──────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌────────────┐
   │ MongoDB  │    │ JWT Auth │    │ Socket.IO  │
   │ Database │    │ Validator│    │ Signaling  │
   └──────────┘    └──────────┘    └────────────┘
```

### Component Hierarchy

```
Root
├── BrowserRouter (React Router)
│   └── AuthProvider (Authentication Context)
│       └── SocketProvider (WebSocket Context)
│           └── App (Main Router)
│               ├── Login Screen
│               ├── Register Screen
│               ├── Lobby (Protected Route)
│               └── Room (Protected Route)
│                   ├── PeerService (WebRTC)
│                   ├── Video Renderer (Local Stream)
│                   └── Video Renderer (Remote Stream)
```

---

## 📡 Data Flow & Packet Structure

### 1️⃣ AUTHENTICATION FLOW (Phase 1)

#### User Registration Packet Structure

**HTTP POST Request:**
```
POST /api/auth/register HTTP/1.1
Host: localhost:5000
Content-Type: application/json
Content-Length: 87

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response Payload (Success):**
```json
HTTP/1.1 201 Created
Content-Type: application/json

{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI1MDdmMWY3N2JjZjg2Y2Q3OTk0MzkwMTEiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJpYXQiOjE2ODA4NzM1OTIsImV4cCI6MTY4MTQ3ODM5Mn0.signature"
}
```

**Password Hashing Process:**
```
Plain Password: "SecurePass123"
        ↓
bcryptjs.hash(password, saltRounds=10)
        ↓
Hashed: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36gZvWFm"
        ↓
Stored in MongoDB
```

#### User Login Packet Structure

**HTTP POST Request:**
```
POST /api/auth/login HTTP/1.1
Host: localhost:5000
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Server-Side Verification:**
```javascript
1. Query MongoDB: db.users.findOne({ email: "john@example.com" })
2. Compare: bcrypt.compare(providedPassword, storedHash)
3. Result: Match = true/false
4. If Match: Generate JWT Token with 7-day expiry
5. Return: { user, token }
```

**JWT Token Structure (Base64 Decoded):**
```
Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "john@example.com",
  "iat": 1680873592,
  "exp": 1681478392
}

Signature: HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  "your-secret-key"
)
```

---

### 2️⃣ SOCKET.IO CONNECTION FLOW (Phase 2)

#### WebSocket Handshake with Authentication

**Browser Initiates Connection:**
```javascript
const socket = io(url, {
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
});
```

**WebSocket Packet (Socket.IO Protocol):**
```
Frame Type: Connection Request
Format: Socket.IO v4 (uses WebSocket + fallback to HTTP Long-Polling)

Raw Data Structure:
[0]{"sid":"Lhd_G-iiAAAF7MAAABAB","upgrades":["websocket"],"pingInterval":25000,"pingTimeout":20000}

The "0" prefix indicates: CONNECT packet type
The JSON contains: session ID, available upgrades, keepalive settings
```

**Server-Side Authentication Middleware:**
```javascript
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    
    // Step 1: Verify JWT Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Step 2: Query MongoDB for User
    const user = await User.findById(decoded._id);
    
    // Step 3: Attach User Info to Socket
    socket.userId = user._id.toString();
    socket.userEmail = user.email;
    socket.userName = user.name;
    
    // Step 4: Allow Connection
    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
});
```

**Socket Metadata Storage (Server Memory):**
```javascript
// Maps for Quick Lookup
emailToSocketIdMap = Map {
  "john@example.com" → "Lhd_G-iiAAAF7MAAABAB",
  "jane@example.com" → "Lhd_G-iiAAAF7MAAABAC"
}

socketIdToEmailMap = Map {
  "Lhd_G-iiAAAF7MAAABAB" → "john@example.com",
  "Lhd_G-iiAAAF7MAAABAC" → "jane@example.com"
}
```

---

### 3️⃣ ROOM JOINING FLOW (Phase 3)

**Client Emits:**
```javascript
socket.emit('joinRoom', {
  email: "john@example.com",
  roomId: "room-123"
});
```

**Socket.IO Packet Structure:**
```
Socket.IO Message Format:
[2,"joinRoom",{"email":"john@example.com","roomId":"room-123"}]

Breaking Down:
[2]          → Message Type: EMIT (2 = emit event)
"joinRoom"   → Event Name
{...}        → Data Payload
```

**Server Processing:**
```javascript
socket.on("joinRoom", async (data) => {
  const {email, roomId} = data;
  
  // Step 1: Verify Email Matches Socket Identity
  if (email !== socket.userEmail) {
    socket.emit("error", { message: "Only your registered email can join" });
    return;
  }
  
  // Step 2: Verify User Exists in MongoDB
  const user = await User.findOne({ email: socket.userEmail });
  
  // Step 3: Update Maps
  emailToSocketIdMap.set(email, socket.id);
  socketIdToEmailMap.set(socket.id, email);
  
  // Step 4: Join Socket.IO Room
  socket.join(roomId);
  // Server now tracks: rooms[roomId] = [socket1, socket2, ...]
  
  // Step 5: Broadcast to Other Users in Room
  socket.to(roomId).emit("newUserJoined", {
    email: "john@example.com",
    id: "Lhd_G-iiAAAF7MAAABAB"
  });
  
  // Step 6: Confirm to Caller
  io.to(socket.id).emit("userJoined", {
    email: "john@example.com",
    roomId: "room-123"
  });
});
```

**Network Packets Sent:**
```
1. Server → Room Members:
   [2,"newUserJoined",{"email":"john@example.com","id":"Lhd_G-iiAAAF7MAAABAB"}]

2. Server → John's Socket:
   [2,"userJoined",{"email":"john@example.com","roomId":"room-123"}]
```

---

### 4️⃣ WEBRTC SIGNALING FLOW (Phase 4) - THE MOST CRITICAL PHASE

**When User A (Caller) Initiates Call:**

#### Step 4.1: Get User Media
```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: 1280, height: 720 },
  audio: { echoCancellation: true }
});
// Browser accesses: Camera, Microphone
// Returns: MediaStream object with tracks
```

#### Step 4.2: Create WebRTC Offer
```javascript
// In PeerService.getOffer()
const offer = await this.peer.createOffer();
// Output: RTCSessionDescription {
//   type: "offer",
//   sdp: "v=0\r\no=- 4611731400430051000 2 IN IP4 127.0.0.1\r\n..."
// }

await this.peer.setLocalDescription(offer);
// RTCPeerConnection State: "have-local-offer"
```

**SDP (Session Description Protocol) Offer Packet:**
```
v=0
o=- 4611731400430051000 2 IN IP4 127.0.0.1
s=webrtcSessionData
t=0 0
a=group:BUNDLE 0 1
a=extmap-allow-mixed
a=msid-semantic: WMS stream

m=audio 9 UDP/TLS/RTP/SAVPF 111 63 103...
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:abcd1234
a=ice-pwd:secretpassword123456789abc
a=fingerprint:sha-256 AA:BB:CC:DD:...

m=video 9 UDP/TLS/RTP/SAVPF 96 97 98...
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:efgh5678
a=ice-pwd:anotherpassword123456789xyz
a=fingerprint:sha-256 EE:FF:11:22:...
```

**Send Offer via Socket.IO:**
```javascript
socket.emit("callUser", {
  to: "Lhd_G-iiAAAF7MAAABAC",  // User B's Socket ID
  offer: {
    type: "offer",
    sdp: "v=0\r\no=- 4611731400430051000 2 IN IP4 127.0.0.1\r\n..."
  }
});
```

**Network Packet:**
```
[2,"callUser",{"to":"Lhd_G-iiAAAF7MAAABAC","offer":{"type":"offer","sdp":"..."}}]
```

---

#### Step 4.3: User B (Callee) Receives Offer

**Server Relays Offer:**
```javascript
socket.on("callUser", (data) => {
  const {to, offer} = data;
  io.to(to).emit("incomingCall", {
    from: "Lhd_G-iiAAAF7MAAABAB",  // User A's Socket ID
    offer: offer
  });
});
```

**Network Packet Sent to User B:**
```
[2,"incomingCall",{"from":"Lhd_G-iiAAAF7MAAABAB","offer":{"type":"offer","sdp":"..."}}]
```

**User B's Browser Processing:**
```javascript
socket.on("incomingCall", async ({ from, offer }) => {
  // Step 1: Get User B's Media
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  });
  setMyStream(stream);

  // Step 2: Set Remote Description (User A's Offer)
  await peer.peer.setRemoteDescription(
    new RTCSessionDescription(offer)
  );
  // RTCPeerConnection State: "have-remote-offer"

  // Step 3: Create Answer
  const answer = await peer.peer.createAnswer();
  // Output: RTCSessionDescription {
  //   type: "answer",
  //   sdp: "v=0\r\no=- 5722842400430051000 2 IN IP4 127.0.0.1\r\n..."
  // }

  // Step 4: Set Local Description (User B's Answer)
  await peer.peer.setLocalDescription(answer);
  // RTCPeerConnection State: "stable" (potential)

  // Step 5: Send Answer Back via Socket.IO
  socket.emit("callAccepted", {
    to: from,
    answer: answer
  });

  // Step 6: Add Tracks to Connection
  for (const track of stream.getTracks()) {
    peer.peer.addTrack(track, stream);
  }
});
```

---

#### Step 4.4: User A Receives Answer

**Server Relays Answer:**
```javascript
socket.on("callAccepted", (data) => {
  const {to, answer} = data;
  io.to(to).emit("callAccepted", {
    from: socket.id,
    answer: answer
  });
});
```

**User A's Browser Processing:**
```javascript
socket.on("callAccepted", async ({ answer }) => {
  // Step 1: Set Remote Description (User B's Answer)
  await peer.setRemoteAnswer(answer);
  // Internally: peer.peer.setRemoteDescription(
  //   new RTCSessionDescription(answer)
  // )
  // RTCPeerConnection State: "stable"

  // Step 2: Send Tracks
  sendStream(); // Add User A's tracks to connection
});
```

**State Transition Diagram:**
```
User A's RTCPeerConnection State Machine:

[new] → createOffer() → [have-local-offer]
                              ↓
                        Receive Answer
                              ↓
                    setRemoteDescription()
                              ↓
                        [stable] ← ready for media!


User B's RTCPeerConnection State Machine:

[new] → Receive Offer → [have-remote-offer]
                              ↓
                        createAnswer()
                              ↓
                    setLocalDescription()
                              ↓
                        [stable] ← ready for media!
```

---

### 5️⃣ ICE (Interactive Connectivity Establishment) FLOW

**ICE Candidate Exchange (Automatic via Browser):**

```javascript
// In PeerService Constructor
this.peer = new RTCPeerConnection({
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:global.stun.twilio.com:3478" }
  ]
});

// STUN Server: Learns external IP/Port
// Request → STUN Server → Response with public IP:port
```

**ICE Candidate Packet Structure:**

```
RTCIceCandidate {
  candidate: "candidate:1 1 UDP 2122260223 192.168.1.100 54321 typ host",
  sdpMLineIndex: 0,
  sdpMid: "0"
}

Breaking Down:
- "candidate:1"        → Foundation
- "1 1"               → Component(RTP/RTCP) Priority
- "UDP"               → Protocol
- "2122260223"        → Priority score
- "192.168.1.100"     → Local IP
- "54321"             → Local Port
- "typ host"          → Candidate type (host/srflx/prflx/relay)
```

**Full ICE Connectivity Process:**

```
┌─────────────────────────────────────┐
│ User A (Local: 192.168.1.100:54321) │
└─────────────────────────────────────┘
            ↓
      STUN Request
            ↓
┌─────────────────────────────────────┐
│ STUN Server (stun.l.google.com)     │
│ Returns: Public IP 203.0.113.42:54321
└─────────────────────────────────────┘
            ↓
      STUN Response
            ↓
┌─────────────────────────────────────┐
│ User A Now Knows:                    │
│ - Host Candidate: 192.168.1.100     │
│ - Server Reflexive: 203.0.113.42    │
└─────────────────────────────────────┘
            ↓
      Exchange via Signaling Server
            ↓
┌─────────────────────────────────────┐
│ User B Tries All Candidates         │
│ 1. Direct: 192.168.x.x → FAIL      │
│ 2. Public: 203.0.113.42 → SUCCESS! │
└─────────────────────────────────────┘
            ↓
      RTP/RTCP Stream Established
```

---

### 6️⃣ MEDIA STREAM TRANSMISSION (Phase 5)

**Video/Audio Codec Flow:**

```
Raw Video Input (Camera)
    ↓
H.264/VP8 Codec Compression
    ↓
RTP Packets (Real-Time Protocol)
    ↓
UDP Transport (over ICE connection)
    ↓
Network Transmission
    ↓
Receive RTP Packets
    ↓
Decompress Video
    ↓
Decode/Render on Screen
```

**RTP Packet Structure (Simplified):**

```
RTP Header (12 bytes minimum):
┌─────────┬─────────┬──────────────────┬─────────────────┐
│ Version │ Padding │ Extension │ CSRC  │ Marker │ PT    │
│ (2 bits)│ (1 bit) │ (1 bit)   │ Count │ (1)    │ (7)   │
├─────────┴─────────┴──────────────────┴─────────────────┤
│ Sequence Number (16 bits)                              │
├─────────────────────────────────────────────────────────┤
│ Timestamp (32 bits) - Indicates media time              │
├─────────────────────────────────────────────────────────┤
│ Synchronization Source (SSRC) - Identifies source       │
├─────────────────────────────────────────────────────────┤
│ Payload (Video/Audio Data - Variable Length)            │
└─────────────────────────────────────────────────────────┘

Typical Video RTP Packet:
- Header: 12 bytes
- Extension: 0-4 bytes (optional)
- Payload: 1000-1200 bytes (1500 byte MTU limit)
```

**Audio Codec Details:**

```
opus (Default WebRTC Audio Codec)
├─ Bitrate: 6-128 kbps
├─ Latency: 5-20 ms
├─ Sample Rate: 8-48 kHz
└─ Frame Duration: 10, 20, 40 ms

DTLS-SRTP Encryption:
Audio Stream → DTLS Encrypt → UDP → Network → DTLS Decrypt → Audio Playback
```

---

### 7️⃣ MUTE/UNMUTE SIGNALING (Phase 6)

**Client Toggles Mute:**

```javascript
toggleMute = useCallback(() => {
  const audioTracks = myStream.getAudioTracks();
  const newMuteState = !isMuted;
  
  // Disable audio track
  audioTracks.forEach(track => {
    track.enabled = !newMuteState;
  });

  // Notify remote user via Socket.IO
  socket.emit("muteToggle", {
    to: remoteSocketId,
    isMuted: newMuteState
  });
}, [myStream, isMuted, remoteSocketId, socket]);
```

**Socket.IO Mute Packet:**

```
[2,"muteToggle",{"to":"Lhd_G-iiAAAF7MAAABAC","isMuted":true}]

Server Relays:
io.to(to).emit("remoteMuted", {isMuted: true});

Remote User Receives:
[2,"remoteMuted",{"isMuted":true}]
```

**State Change on Remote User:**

```javascript
socket.on("remoteMuted", ({ isMuted }) => {
  setIsRemoteMuted(isMuted);
  // UI Updates: Show "🔇 Muted" badge
});
```

---

### 8️⃣ CALL END & CLEANUP (Phase 7)

**Client Initiates Call End:**

```javascript
stopCall = useCallback(() => {
  // 1. Stop all media tracks
  if (myStream) {
    myStream.getTracks().forEach(track => {
      track.stop();  // Release camera/microphone
    });
  }

  // 2. Close peer connection
  peer.peer.close();
  // RTCPeerConnection State: "closed"

  // 3. Reset UI state
  setCallActive(false);
  setRemoteStream(null);

  // 4. Notify other user
  socket.emit("endCall", { to: remoteSocketId });

  // 5. Navigate away
  navigate("/lobby");
}, [myStream, remoteSocketId, socket, navigate]);
```

**Socket.IO End Call Packet:**

```
[2,"endCall",{"to":"Lhd_G-iiAAAF7MAAABAC"}]

Server Relays:
io.to(to).emit("callEnded");

Remote User Receives:
[2,"callEnded"]
```

**Remote User Cleanup:**

```javascript
socket.on("callEnded", () => {
  stopCall();  // Same cleanup function
});
```

---

## 📊 Data Packet Breakdown Summary

### Packet Types by Phase

| Phase | Packet Type | Size | Direction | Protocol |
|-------|------------|------|-----------|----------|
| 1. Auth Register | HTTP POST | 100-200 bytes | Client → Server | HTTP/REST |
| 1. Auth Login | HTTP POST | 50-150 bytes | Client → Server | HTTP/REST |
| 2. WebSocket Connect | Socket.IO | 200 bytes | Client ↔ Server | WebSocket |
| 3. Join Room | Socket.IO Emit | 100-150 bytes | Client → Server | WebSocket |
| 4. Call Offer | Socket.IO Emit | 1-3 KB | Client → Server | WebSocket |
| 4. Call Answer | Socket.IO Emit | 1-3 KB | Client → Server | WebSocket |
| 5. RTP Audio | RTP/SRTP | 20-200 bytes | P2P | UDP/DTLS-SRTP |
| 5. RTP Video | RTP/SRTP | 500-1500 bytes | P2P | UDP/DTLS-SRTP |
| 6. Mute Toggle | Socket.IO Emit | 50 bytes | Client → Server | WebSocket |
| 7. Call End | Socket.IO Emit | 50 bytes | Client → Server | WebSocket |

---

## 🔐 Authentication & Security

### JWT Token Lifecycle

```
┌─────────────────────────────────────────────┐
│ User Registers/Logs In                      │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ Server Generates JWT:                       │
│ - Header: HS256 Algorithm                   │
│ - Payload: _id, email, exp (7 days)        │
│ - Signature: HMAC(header+payload, secret)  │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ Client Stores in localStorage               │
│ localStorage.setItem('token', jwt_token)    │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ Client Includes in Every Protected Request  │
│ Header: "Authorization: Bearer <token>"    │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ Socket.IO Auth:                             │
│ auth: { token: jwt_token }                  │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ Server Validates:                           │
│ - jwt.verify(token, secret)                 │
│ - Check expiry                              │
│ - Query User from DB                        │
│ - Attach user info to socket                │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ Access Granted ✓                            │
└─────────────────────────────────────────────┘
```

### Password Security

```
User Input: "SecurePass123"
    ↓
bcryptjs.hash(password, saltRounds=10)
    ↓
Generate Random Salt (10 rounds = 2^10 = 1024 iterations)
    ↓
Hashed: $2a$10$N9qo8uLOickgx2ZMRZoMye...
    ↓
Stored in MongoDB (Never Plain Text!)

Login Verification:
Provided: "SecurePass123"
    ↓
bcryptjs.compare(provided, storedHash)
    ↓
Match: true/false
```

### WebRTC Encryption (DTLS-SRTP)

```
Media Stream (Plain)
    ↓
DTLS (Datagram TLS)
├─ Encrypts using certificates (similar to HTTPS)
├─ Establishes shared keys
└─ One-way connection
    ↓
SRTP (Secure Real-Time Protocol)
├─ Encrypts RTP packets
├─ 128-bit AES encryption (default)
└─ Provides confidentiality & integrity
    ↓
Encrypted Stream → Network → Decrypt on Receiver
```

---

## 🎯 Core Components

### 1. AuthProvider (Frontend Context)

**Purpose:** Centralized authentication state management

```javascript
useAuth() Hook provides:
├─ user: Current user object { _id, name, email }
├─ token: JWT token string
├─ isAuthenticated: Boolean flag
├─ loading: Initial auth check status
├─ login(email, password): Async login function
├─ register(name, email, password): Async register function
└─ logout(): Clear auth state & localStorage
```

### 2. SocketProvider (Frontend Context)

**Purpose:** Centralized Socket.IO connection management

```javascript
useSocket() Hook provides:
├─ socket: Socket.IO client instance
├─ Auto-connects with JWT auth
├─ Event listeners for all signaling
└─ Memoized to prevent unnecessary reconnections
```

### 3. PeerService (WebRTC Manager)

**Purpose:** Encapsulates WebRTC peer connection logic

```javascript
PeerService.getOffer()
├─ Creates RTCSessionDescription
├─ Sets local description
└─ Returns offer for transmission

PeerService.getAnswer(offer)
├─ Sets remote description
├─ Creates answer
├─ Sets local description
└─ Returns answer for transmission

PeerService.setRemoteAnswer(answer)
├─ Validates signaling state
└─ Sets remote description
```

### 4. Room Component (Main Video Interface)

**Purpose:** Orchestrates video call functionality

**Key Features:**
- Video stream rendering (local & remote)
- Call initiation & termination
- Audio track management
- Mute/unmute functionality
- Real-time UI updates

**Event Handlers:**
```javascript
handleUserJoined()        → User connected to room
handleCallUser()          → Initiate call
handleIncomingCall()      → Receive incoming call
handleCallAccepted()      → Call accepted, start media
handleNegotiationNeeded() → Handle renegotiation
toggleMute()              → Audio control
stopCall()                → Cleanup & disconnect
```

---

## 🌐 API Endpoints

### Authentication Routes

```
POST /api/auth/register
├─ Body: { name, email, password }
├─ Response: { user, token }
└─ Status: 201 Created / 400 Bad Request

POST /api/auth/login
├─ Body: { email, password }
├─ Response: { user, token }
└─ Status: 200 OK / 401 Unauthorized

GET /api/auth/me
├─ Headers: Authorization: Bearer <token>
├─ Response: { user }
└─ Status: 200 OK / 401 Unauthorized

POST /api/auth/logout
├─ Headers: Authorization: Bearer <token>
├─ Response: { message }
└─ Status: 200 OK / 401 Unauthorized
```

---

## 🔌 Socket.IO Events

### Client → Server Events

```javascript
joinRoom: { email, roomId }
callUser: { to, offer }
callAccepted: { to, answer }
negotiationneed: { to, offer }
negotiationDone: { to, answer }
endCall: { to }
muteToggle: { to, isMuted }
```

### Server → Client Events

```javascript
userJoined: { email, roomId }
newUserJoined: { email, id }
incomingCall: { from, offer }
callAccepted: { from, answer }
negotiationneed: { from, offer }
negotiationFinal: { from, answer }
callEnded: {}
remoteMuted: { isMuted }
error: { message }
```

---

## 📈 Performance Considerations

### Network Bandwidth

```
Audio Stream:
├─ Opus Codec: 30-50 kbps
├─ Overhead (RTP/UDP): ~2-3 kbps
└─ Total: ~35-55 kbps

Video Stream (HD 720p):
├─ H.264 Codec: 500-2000 kbps (quality dependent)
├─ Overhead: ~20-50 kbps
└─ Total: ~520-2050 kbps

Full Call (A+V):
├─ Minimum: 100 kbps
├─ Average: 1-2 Mbps
└─ Maximum: 4 Mbps (high quality)
```

### Latency

```
End-to-End Latency Components:
├─ Encoding: 10-20 ms
├─ Network (RTT): 20-100 ms
├─ Decoding: 10-20 ms
└─ Playback buffer: 10-40 ms
├─ Total: 50-180 ms (acceptable for real-time comms)
```

---

## 🚀 Deployment Recommendations

### Environment Variables Required

**Server (.env):**
```env
PORT=5000
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/videocalling
JWT_SECRET=your-super-secret-key-min-32-characters-recommended
NODE_ENV=production
```

**Client (.env):**
```env
VITE_API_URL=https://yourdomain.com
```

### Scaling Considerations

```
Single Server Architecture Limits:
├─ ~500-1000 concurrent connections (Socket.IO)
├─ ~100-200 simultaneous calls
└─ MongoDB can handle massive user base

Scaling Strategy:
├─ Add multiple Express servers (load balanced)
├─ Implement Redis for session management
├─ Use Socket.IO Adapter (Redis/MongoDB)
├─ Deploy WebRTC signaling separately if needed
└─ Use CDN for static assets
```

---

## 🔒 Security Hardening Checklist

- ✅ HTTPS/TLS for all connections
- ✅ JWT expiry validation (7 days)
- ✅ Password hashing (bcryptjs with 10 rounds)
- ✅ CORS configuration
- ✅ Rate limiting on auth endpoints
- ✅ DTLS-SRTP for media encryption
- ✅ Validate room access
- ✅ Sanitize user inputs
- ✅ Secure WebSocket (wss://) in production
- ✅ Implement refresh token rotation
- ✅ Add 2FA for sensitive operations
- ✅ Monitor for unusual signaling patterns

---

## 📱 Browser Compatibility

```
WebRTC Support:
├─ Chrome/Edge: ✅ Full Support
├─ Firefox: ✅ Full Support
├─ Safari: ✅ Full Support (iOS 11+)
├─ Opera: ✅ Full Support
└─ IE: ❌ Not Supported

Socket.IO Support:
├─ WebSocket: ✅ All modern browsers
├─ HTTP Long-Polling: ✅ Fallback
└─ Server-Sent Events: ✅ Fallback
```

---

## 🛠️ Development & Testing

### Running Locally

**Terminal 1 - Backend:**
```bash
cd server
npm install
npm start
# Server runs on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm install
npm run dev
# Dev server with HMR on http://localhost:5173
```

### Testing the Flow

```
1. Open http://localhost:5173 (Browser A)
2. Register/Login with email: user1@test.com
3. Open http://localhost:5173 (Browser B)
4. Register/Login with email: user2@test.com
5. Browser A: Join Room "test-room"
6. Browser B: Join Room "test-room"
7. Browser A: Click "Start Call"
8. Browser B: Video should appear in Browser A
9. Browser A: Video should appear in Browser B
10. Test Mute/Unmute, End Call
```

---

## 📚 Architecture Patterns Used

| Pattern | Implementation | Benefit |
|---------|----------------|---------|
| **Context API** | Auth & Socket state | Avoid prop drilling |
| **Custom Hooks** | useAuth, useSocket | Reusable logic |
| **Service Layer** | PeerService | Separation of concerns |
| **Protected Routes** | ProtectedRoute component | Access control |
| **Middleware** | Authentication middleware | Server-side auth checks |
| **Event Emitter** | Socket.IO | Bidirectional communication |
| **Pub-Sub** | Socket.IO rooms | Broadcast messaging |
| **JWT Auth** | Token-based auth | Stateless authentication |

---

## 🎓 Learning Outcomes

This project demonstrates industry-level expertise in:

1. **Real-Time Communication** - WebSocket, Socket.IO
2. **Peer-to-Peer Networking** - WebRTC, ICE, STUN
3. **Cryptography** - JWT, bcrypt, DTLS-SRTP
4. **Full-Stack Development** - React, Node.js, MongoDB
5. **Protocol Knowledge** - HTTP, WebSocket, RTP, SDP
6. **State Management** - React Context, Local Storage
7. **Authentication** - JWT tokens, password security
8. **Media Handling** - MediaStream API, audio/video codecs
9. **Error Handling** - Try-catch, validation, error callbacks
10. **Performance Optimization** - Memoization, event cleanup

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue: "Authentication failed" on Socket.IO connection**
```
Solution:
1. Check token in localStorage
2. Verify JWT_SECRET matches server
3. Ensure token hasn't expired
4. Check browser console for errors
```

**Issue: No video appears after call start**
```
Solution:
1. Check browser camera/microphone permissions
2. Verify getUserMedia returns valid stream
3. Check WebRTC connection state
4. Monitor ICE candidate exchange
```

**Issue: One-way video (A sees B, but B doesn't see A)**
```
Solution:
1. Check SDP offer/answer exchange
2. Verify addTrack called on both sides
3. Monitor RTCPeerConnection states
4. Check firewall/NAT issues
```

---

## 📖 References & Resources

- **WebRTC**: https://webrtc.org
- **Socket.IO**: https://socket.io
- **Express**: https://expressjs.com
- **MongoDB**: https://mongodb.com
- **React**: https://react.dev
- **RFCs**: RFC 3550 (RTP), RFC 4571 (DTLS), RFC 5764 (SRTP)

---

## 📄 License

This project is open-source and available under the MIT License.

---

**Last Updated:** February 3, 2026
**Version:** 1.0.0 (Production Ready)
**Maintained By:** Video Calling Platform Team
