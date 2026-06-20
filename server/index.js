import http from 'http'
import { WebSocketServer } from 'ws'

const PORT = 3001

const dummyMessages = [
  'Hey, this is a streamed chat message.',
  'Node is pushing text one character at a time.',
  'SSE keeps the connection open.',
  'Watch the string append live...',
  'Streaming feels like a live chat.',
  'No page refresh needed.',
  'Each chunk adds more text.',
  'You can send a message too.',
]

const randomReplies = [
  'That sounds interesting!',
  'Tell me more about that.',
  'Good point.',
  'I was just thinking the same thing.',
  'Haha, nice one!',
  'Noted. Thanks for sharing.',
  'Let me get back to you on that.',
  'Absolutely!',
  'Hmm, I see what you mean.',
  'Could not agree more.',
  'Random reply from the server.',
  'Hope you are having a great day!',
]

function randomReply() {
  return randomReplies[Math.floor(Math.random() * randomReplies.length)]
}

const sseClients = new Set()
const socketClients = new Map()
let messageId = 1

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function sendEvent(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function broadcastSse(payload) {
  for (const client of sseClients) {
    sendEvent(client, payload)
  }
}

function streamText(text, user) {
  const id = messageId++
  const time = new Date().toISOString()

  broadcastSse({ type: 'start', id, user, time })

  let index = 0
  const timer = setInterval(() => {
    if (index >= text.length) {
      clearInterval(timer)
      broadcastSse({ type: 'done', id })
      return
    }

    const chunk = text.slice(index, index + 2)
    index += chunk.length
    broadcastSse({ type: 'chunk', id, chunk })
  }, 45)
}

function broadcastSocket(payload, excludeSocket = null) {
  const data = JSON.stringify(payload)
  for (const [socket, client] of socketClients) {
    if (socket !== excludeSocket && socket.readyState === socket.OPEN) {
      socket.send(data)
    }
  }
}

function sendSocket(socket, payload) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload))
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function streamFetchResponse(res, text) {
  res.writeHead(200, {
    ...corsHeaders(),
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Transfer-Encoding': 'chunked',
  })

  for (let i = 0; i < text.length; i += 2) {
    res.write(text.slice(i, i + 2))
    await sleep(45)
  }

  res.end()
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders())
    res.end()
    return
  }

  if (req.url === '/api/chat/stream' && req.method === 'GET') {
    res.writeHead(200, {
      ...corsHeaders(),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    })

    sseClients.add(res)

    streamText('Connected to chat stream.', 'system')

    const interval = setInterval(() => {
      const text = dummyMessages[Math.floor(Math.random() * dummyMessages.length)]
      streamText(text, 'bot')
    }, 6000)

    req.on('close', () => {
      clearInterval(interval)
      sseClients.delete(res)
    })
    return
  }

  if (req.url === '/api/fetch-stream' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const { text } = JSON.parse(body)
      const reply = text?.trim()
        ? `${randomReply()} (you said: "${text.trim()}")`
        : randomReply()

      await streamFetchResponse(res, reply)
    } catch {
      res.writeHead(400, { ...corsHeaders(), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid request' }))
    }
    return
  }

  if (req.url?.startsWith('/api/heavy') && req.method === 'GET') {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    const size = Math.min(Number(url.searchParams.get('size')) || 20000, 100000)
    const delay = Math.min(Number(url.searchParams.get('delay')) || 2000, 30000)
    const timeout = Math.min(Number(url.searchParams.get('timeout')) || 15000, 60000)
    const start = performance.now()

    const timedOut = () => performance.now() - start > timeout

    const failTimeout = () => {
      res.writeHead(504, { ...corsHeaders(), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: `Request timed out after ${timeout}ms` }))
    }

    if (delay > 0) {
      await sleep(delay)
    }

    if (timedOut()) {
      failTimeout()
      return
    }

    let checksum = 0
    for (let i = 0; i < 3000000; i++) {
      checksum += i % 97
      if (i % 500000 === 0 && timedOut()) {
        failTimeout()
        return
      }
    }

    const items = Array.from({ length: size }, (_, index) => ({
      id: index,
      value: (index * 17) % 1000,
    }))

    if (timedOut()) {
      failTimeout()
      return
    }

    res.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        items,
        count: items.length,
        checksum,
        delayMs: delay,
        timeoutMs: timeout,
        serverMs: Math.round(performance.now() - start),
      }),
    )
    return
  }

  if (req.url === '/api/chat/send' && req.method === 'POST') {
    try {
      const body = await readBody(req)
      const { text } = JSON.parse(body)

      if (!text?.trim()) {
        res.writeHead(400, { ...corsHeaders(), 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Message is required' }))
        return
      }

      broadcastSse({
        type: 'full',
        id: messageId++,
        user: 'you',
        text: text.trim(),
        time: new Date().toISOString(),
      })

      setTimeout(() => {
        streamText(randomReply(), 'bot')
      }, 400)

      res.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    } catch {
      res.writeHead(400, { ...corsHeaders(), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Invalid JSON' }))
    }
    return
  }

  res.writeHead(404, corsHeaders())
  res.end('Not found')
})

const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (socket) => {
  socketClients.set(socket, { name: 'guest' })

  socket.on('message', (raw) => {
    let data
    try {
      data = JSON.parse(raw.toString())
    } catch {
      return
    }

    const client = socketClients.get(socket)
    if (!client) return

    if (data.type === 'join') {
      client.name = data.name?.trim() || 'guest'
      broadcastSocket({
        id: messageId++,
        type: 'system',
        text: `${client.name} joined the chat`,
        time: new Date().toISOString(),
      })
      return
    }

    if (data.type === 'message' && data.text?.trim()) {
      const payload = {
        id: messageId++,
        type: 'message',
        user: client.name,
        text: data.text.trim(),
        time: new Date().toISOString(),
      }

      sendSocket(socket, { ...payload, self: true })
      broadcastSocket(payload, socket)

      setTimeout(() => {
        sendSocket(socket, {
          id: messageId++,
          type: 'message',
          user: 'bot',
          text: randomReply(),
          time: new Date().toISOString(),
        })
      }, 500)
    }
  })

  socket.on('close', () => {
    const client = socketClients.get(socket)
    if (client) {
      broadcastSocket({
        id: messageId++,
        type: 'system',
        text: `${client.name} left the chat`,
        time: new Date().toISOString(),
      })
    }
    socketClients.delete(socket)
  })
})

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`SSE:   /api/chat/stream`)
  console.log(`Fetch: POST /api/fetch-stream`)
  console.log(`Heavy: GET /api/heavy`)
  console.log(`WS:    ws://localhost:${PORT}/ws`)
})
