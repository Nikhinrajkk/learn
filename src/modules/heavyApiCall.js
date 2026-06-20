function processItemsHeavy(items) {
  let total = 0
  let max = 0

  for (let i = 0; i < items.length; i++) {
    let x = items[i].value
    for (let j = 0; j < 12000; j++) {
      x = (x * 31 + j) % 999983
    }
    total += x
    if (items[i].value > max) max = items[i].value
  }

  return { total, max }
}

export async function fetchHeavyApi({ size = 20000, delay = 2000, timeout = 15000 }) {
  const start = performance.now()

  const fetchStart = performance.now()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout + delay + 1000)

  try {
    const response = await fetch(`/api/heavy?size=${size}&delay=${delay}&timeout=${timeout}`, {
      signal: controller.signal,
    })

    if (response.status === 504) {
      throw new Error('Server timed out')
    }

    if (!response.ok) {
      throw new Error('API request failed')
    }

    const data = await response.json()
    const fetchMs = Math.round(performance.now() - fetchStart)

    const processStart = performance.now()
    const { total, max } = processItemsHeavy(data.items)
    const processMs = Math.round(performance.now() - processStart)

    return {
      ok: true,
      count: data.count,
      total,
      max,
      serverMs: data.serverMs,
      fetchMs,
      processMs,
      totalMs: Math.round(performance.now() - start),
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Client timed out waiting for server')
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}
