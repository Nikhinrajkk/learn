import { useEffect, useRef, useState } from 'react'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${window.location.host}/ws`
}

export default function SocketChatPage() {
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(false)
  const [name, setName] = useState(() => `guest-${Math.floor(Math.random() * 1000)}`)
  const [input, setInput] = useState('')
  const [error, setError] = useState(null)
  const socketRef = useRef(null)
  const listRef = useRef(null)
  const nameRef = useRef(name)
  nameRef.current = name

  useEffect(() => {
    const socket = new WebSocket(getSocketUrl())
    socketRef.current = socket

    socket.onopen = () => {
      setConnected(true)
      setError(null)
      socket.send(JSON.stringify({ type: 'join', name: nameRef.current }))
    }

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setMessages((prev) => [...prev, data])
    }

    socket.onclose = () => {
      setConnected(false)
      setError('Socket disconnected. Is the Node server running?')
    }

    socket.onerror = () => {
      setError('WebSocket connection failed')
    }

    return () => socket.close()
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight)
  }, [messages])

  function sendMessage(event) {
    event.preventDefault()
    const text = input.trim()
    if (!text || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return

    socketRef.current.send(JSON.stringify({ type: 'message', text }))
    setInput('')
  }

  return (
    <section className="page chat-page">
      <h1>Socket Chat</h1>
      <p>Real-time two-way chat over WebSocket.</p>

      <label>
        Your name
        <input
          type="text"
          value={name}
          disabled={connected}
          onChange={(e) => setName(e.target.value)}
        />
      </label>

      <p className={`chat-status ${connected ? 'online' : 'offline'}`}>
        {connected ? 'Connected' : 'Disconnected'}
      </p>

      {error && <p className="error">{error}</p>}

      <div ref={listRef} className="chat-list">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-bubble ${message.type === 'system' ? 'system' : message.self ? 'you' : 'other'}`}
          >
            {message.type !== 'system' && <strong>{message.user}</strong>}
            <span>{message.text}</span>
            {message.time && <time>{formatTime(message.time)}</time>}
          </div>
        ))}
      </div>

      <form className="chat-form" onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          placeholder="Type a message..."
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={!connected}>
          Send
        </button>
      </form>
    </section>
  )
}
