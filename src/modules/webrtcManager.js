const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

export function getRtcSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/ws/webrtc`
}

export function createRtcManager({ onRemoteStream, onPeerState, onPeerJoined, onError }) {
  const peerConnections = new Map()
  const pendingCandidates = new Map()
  let localStream = null
  let socket = null
  let selfPeerId = null

  function send(payload) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload))
    }
  }

  async function flushCandidates(peerId) {
    const pc = peerConnections.get(peerId)
    const queue = pendingCandidates.get(peerId) ?? []
    pendingCandidates.delete(peerId)
    if (!pc) return
    for (const candidate of queue) {
      await pc.addIceCandidate(candidate)
    }
  }

  async function addIceCandidate(peerId, candidate) {
    const pc = peerConnections.get(peerId)
    if (!pc?.remoteDescription) {
      if (!pendingCandidates.has(peerId)) pendingCandidates.set(peerId, [])
      pendingCandidates.get(peerId).push(candidate)
      return
    }
    await pc.addIceCandidate(candidate)
  }

  async function createPeerConnection(remotePeerId, initiator) {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    peerConnections.set(remotePeerId, pc)

    if (localStream) {
      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream)
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          type: 'signal',
          to: remotePeerId,
          signal: { type: 'ice', candidate: event.candidate },
        })
      }
    }

    pc.ontrack = (event) => {
      onRemoteStream(remotePeerId, event.streams[0] ?? null)
    }

    pc.onconnectionstatechange = () => {
      onPeerState(remotePeerId, pc.connectionState)
    }

    if (initiator) {
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      send({
        type: 'signal',
        to: remotePeerId,
        signal: { type: 'offer', sdp: pc.localDescription },
      })
    }

    return pc
  }

  async function handleSignal(from, signal) {
    if (signal.type === 'offer') {
      let pc = peerConnections.get(from)
      if (!pc) {
        pc = await createPeerConnection(from, false)
      }
      await pc.setRemoteDescription(signal.sdp)
      await flushCandidates(from)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      send({
        type: 'signal',
        to: from,
        signal: { type: 'answer', sdp: pc.localDescription },
      })
      return
    }

    if (signal.type === 'answer') {
      const pc = peerConnections.get(from)
      if (!pc) return
      await pc.setRemoteDescription(signal.sdp)
      await flushCandidates(from)
      return
    }

    if (signal.type === 'ice' && signal.candidate) {
      await addIceCandidate(from, signal.candidate)
    }
  }

  function closePeer(remotePeerId) {
    const pc = peerConnections.get(remotePeerId)
    if (pc) {
      pc.close()
      peerConnections.delete(remotePeerId)
    }
    pendingCandidates.delete(remotePeerId)
    onRemoteStream(remotePeerId, null)
    onPeerState(remotePeerId, 'closed')
  }

  function closeAllPeers() {
    for (const peerId of peerConnections.keys()) {
      closePeer(peerId)
    }
  }

  async function join({ room, name }) {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

    socket = new WebSocket(getRtcSocketUrl())

    await new Promise((resolve, reject) => {
      socket.onopen = () => resolve()
      socket.onerror = () => reject(new Error('WebRTC signaling connection failed'))
    })

    let welcomeResolve
    const welcomePromise = new Promise((resolve) => {
      welcomeResolve = resolve
    })

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data)

      if (data.type === 'welcome') {
        selfPeerId = data.peerId
        for (const peer of data.peers ?? []) {
          onPeerJoined?.(peer.peerId, peer.name)
        }
        welcomeResolve(data)
        return
      }

      if (data.type === 'peer-joined') {
        onPeerJoined?.(data.peerId, data.name)
        await createPeerConnection(data.peerId, true)
        return
      }

      if (data.type === 'peer-left') {
        closePeer(data.peerId)
        return
      }

      if (data.type === 'signal') {
        try {
          await handleSignal(data.from, data.signal)
        } catch (err) {
          onError(err.message ?? 'WebRTC negotiation failed')
        }
      }
    }

    socket.onclose = () => {
      onError('Signaling disconnected')
    }

    send({ type: 'join', room, name })
    await welcomePromise

    return { peerId: selfPeerId, stream: localStream }
  }

  function leave() {
    send({ type: 'leave' })
    closeAllPeers()
    if (localStream) {
      for (const track of localStream.getTracks()) track.stop()
      localStream = null
    }
    if (socket) {
      socket.close()
      socket = null
    }
    selfPeerId = null
  }

  return { join, leave }
}
