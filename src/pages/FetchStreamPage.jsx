import { useState } from 'react'

export default function FetchStreamPage() {
  const [input, setInput] = useState('')
  const [userText, setUserText] = useState('')
  const [reply, setReply] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState(null)

  async function sendMessage(event) {
    event.preventDefault()
    const text = input.trim()
    if (!text || streaming) return

    setInput('')
    setUserText(text)
    setReply('')
    setError(null)
    setStreaming(true)

    try {
      const res = await fetch('/api/fetch-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Stream failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        setReply((prev) => prev + chunk)
      }
    } catch {
      setError('Could not read stream. Is the Node server running?')
    } finally {
      setStreaming(false)
    }
  }

  return (
    <section className="page chat-page">
      <h1>Fetch Stream</h1>
      <p>One POST request — response arrives in chunks via ReadableStream.</p>

      {error && <p className="error">{error}</p>}

      {userText && (
        <div className="chat-list">
          <div className="chat-bubble you">
            <strong>you</strong>
            <span>{userText}</span>
          </div>

          {(reply || streaming) && (
            <div className="chat-bubble bot">
              <strong>bot</strong>
              <span>
                {reply}
                {streaming && <span className="typing-cursor">|</span>}
              </span>
            </div>
          )}
        </div>
      )}

      <form className="chat-form" onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          placeholder="Ask something..."
          disabled={streaming}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={streaming}>
          {streaming ? 'Streaming...' : 'Send'}
        </button>
      </form>
    </section>
  )
}
