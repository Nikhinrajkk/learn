import { useEffect, useRef, useState } from 'react'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function handleStreamEvent(messages, data) {
  if (data.type === 'full') {
    return [...messages, { ...data, streaming: false }]
  }

  if (data.type === 'start') {
    return [
      ...messages,
      { id: data.id, user: data.user, text: '', time: data.time, streaming: true },
    ]
  }

  if (data.type === 'chunk') {
    return messages.map((message) =>
      message.id === data.id ? { ...message, text: message.text + data.chunk } : message,
    )
  }

  if (data.type === 'done') {
    return messages.map((message) =>
      message.id === data.id ? { ...message, streaming: false } : message,
    )
  }

  return messages
}

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(false)
  const [input, setInput] = useState('')
  const [error, setError] = useState(null)
  const listRef = useRef(null)

  useEffect(() => {
    const source = new EventSource('/api/chat/stream')

    source.onopen = () => {
      setConnected(true)
      setError(null)
    }

    source.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setMessages((prev) => handleStreamEvent(prev, data))
    }

    source.onerror = () => {
      setConnected(false)
      setError('Stream disconnected. Is the Node server running?')
    }

    return () => source.close()
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo(0, listRef.current.scrollHeight)
  }, [messages])

  async function sendMessage(event) {
    event.preventDefault()
    const text = input.trim()
    if (!text) return

    setInput('')

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) throw new Error('Send failed')
    } catch {
      setError('Could not send message')
    }
  }

  return (
    <section className="page chat-page">
      <h1>Stream Chat</h1>
      <p>Bot replies append character by character over SSE.</p>

      <p className={`chat-status ${connected ? 'online' : 'offline'}`}>
        {connected ? 'Connected' : 'Disconnected'}
      </p>

      {error && <p className="error">{error}</p>}

      <div ref={listRef} className="chat-list">
        {messages.map((message) => (
          <div key={message.id} className={`chat-bubble ${message.user}`}>
            <strong>{message.user}</strong>
            <span>
              {message.text}
              {message.streaming && <span className="typing-cursor">|</span>}
            </span>
            {!message.streaming && <time>{formatTime(message.time)}</time>}
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
