import { useEffect, useRef, useState } from 'react'
import { createRtcManager } from '../modules/webrtcManager.js'

function RemoteVideo({ stream, label, state }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream ?? null
  }, [stream])

  return (
    <div className="webrtc-tile">
      <video ref={videoRef} autoPlay playsInline className="webrtc-video">
        <track kind="captions" />
      </video>
      <div className="webrtc-tile-meta">
        <span>{label}</span>
        <span className="webrtc-state">{state}</span>
      </div>
    </div>
  )
}

export default function WebRTCPage() {
  const localVideoRef = useRef(null)
  const managerRef = useRef(null)

  const [room, setRoom] = useState('demo')
  const [name, setName] = useState(() => `user-${Math.floor(Math.random() * 1000)}`)
  const [joined, setJoined] = useState(false)
  const [joining, setJoining] = useState(false)
  const [peerId, setPeerId] = useState(null)
  const [error, setError] = useState(null)
  const [remotePeers, setRemotePeers] = useState({})

  useEffect(() => {
    return () => {
      managerRef.current?.leave()
    }
  }, [])

  async function joinRoom() {
    setJoining(true)
    setError(null)
    setRemotePeers({})

    try {
      const manager = createRtcManager({
        onPeerJoined: (id, peerName) => {
          setRemotePeers((prev) => ({
            ...prev,
            [id]: { ...prev[id], name: peerName, state: prev[id]?.state ?? 'connecting' },
          }))
        },
        onRemoteStream: (id, stream) => {
          setRemotePeers((prev) => {
            const next = { ...prev }
            if (!stream) {
              delete next[id]
              return next
            }
            next[id] = { ...next[id], stream, name: next[id]?.name ?? id }
            return next
          })
        },
        onPeerState: (id, state) => {
          setRemotePeers((prev) => {
            if (!prev[id]) return prev
            return { ...prev, [id]: { ...prev[id], state } }
          })
        },
        onError: (message) => setError(message),
      })

      managerRef.current = manager
      const result = await manager.join({ room: room.trim() || 'demo', name: name.trim() })

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = result.stream
      }

      setPeerId(result.peerId)
      setJoined(true)
    } catch (err) {
      setError(err.message ?? 'Failed to join room')
      managerRef.current?.leave()
      managerRef.current = null
    } finally {
      setJoining(false)
    }
  }

  function leaveRoom() {
    managerRef.current?.leave()
    managerRef.current = null

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }

    setJoined(false)
    setPeerId(null)
    setRemotePeers({})
  }

  return (
    <section className="page webrtc-page">
      <h1>WebRTC Call</h1>
      <p>
        Peer-to-peer camera and mic via <code>RTCPeerConnection</code>. Open a second tab (or
        browser) in the same room to connect. Signaling uses WebSocket — media stays on the peer
        link.
      </p>

      {!joined && (
        <div className="webrtc-controls">
          <label>
            Room
            <input type="text" value={room} onChange={(e) => setRoom(e.target.value)} />
          </label>
          <label>
            Your name
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button type="button" onClick={joinRoom} disabled={joining}>
            {joining ? 'Starting camera…' : 'Join room'}
          </button>
        </div>
      )}

      {joined && (
        <div className="webrtc-controls webrtc-controls-inline">
          <p className="webrtc-room-info">
            Room <strong>{room}</strong> · you are <strong>{name}</strong> ({peerId})
          </p>
          <button type="button" onClick={leaveRoom}>Leave room</button>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="webrtc-grid">
        <div className="webrtc-tile local">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="webrtc-video"
          >
            <track kind="captions" />
          </video>
          <div className="webrtc-tile-meta">
            <span>You {joined ? '' : '(preview after join)'}</span>
          </div>
        </div>

        {Object.entries(remotePeers).map(([id, peer]) => (
          <RemoteVideo
            key={id}
            stream={peer.stream}
            label={peer.name ?? id}
            state={peer.state ?? 'new'}
          />
        ))}

        {joined && Object.keys(remotePeers).length === 0 && (
          <div className="webrtc-tile webrtc-placeholder">
            <p>Waiting for another peer in room &quot;{room}&quot;…</p>
          </div>
        )}
      </div>
    </section>
  )
}
