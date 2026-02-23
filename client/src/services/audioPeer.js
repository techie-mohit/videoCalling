class AudioPeerService {
  constructor() {
    this.createPeer();
  }

  createPeer() {
    this.peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
        {
          urls: "turn:a.relay.metered.ca:80",
          username: "d022334cb35848365ed0931c",
          credential: "jDda7Yys7ikbF+1c",
        },
        {
          urls: "turn:a.relay.metered.ca:80?transport=tcp",
          username: "d022334cb35848365ed0931c",
          credential: "jDda7Yys7ikbF+1c",
        },
        {
          urls: "turn:a.relay.metered.ca:443",
          username: "d022334cb35848365ed0931c",
          credential: "jDda7Yys7ikbF+1c",
        },
        {
          urls: "turn:a.relay.metered.ca:443?transport=tcp",
          username: "d022334cb35848365ed0931c",
          credential: "jDda7Yys7ikbF+1c",
        },
      ],
      iceCandidatePoolSize: 10,
    });
    return this.peer;
  }

  resetPeer() {
    if (this.peer) {
      this.peer.close();
    }
    this.createPeer();
  }

  async getOffer() {
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(offer);
    return offer;
  }

  async getAnswer(offer) {
    await this.peer.setRemoteDescription(offer);
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    return answer;
  }

  async setRemoteAnswer(answer) {
    if (this.peer.signalingState !== "have-local-offer") return;
    await this.peer.setRemoteDescription(answer);
  }
}

export default new AudioPeerService();
