import { useEffect, useRef, useState } from 'react'
import ApiWorker from '../workers/api.worker.js?worker'
import { fetchHeavyApi } from '../modules/heavyApiCall.js'

export default function HeavyApiPage() {
  const workerRef = useRef(null)
  const [running, setRunning] = useState(false)
  const [runningMain, setRunningMain] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [source, setSource] = useState(null)
  const [clicks, setClicks] = useState(0)
  const [size, setSize] = useState(20000)
  const [delay, setDelay] = useState(2000)
  const [requestTimeout, setRequestTimeout] = useState(30000)
  const [frameTick, setFrameTick] = useState(0)
  const [jsSpin, setJsSpin] = useState(0)

  useEffect(() => {
    let id
    const tick = () => {
      setFrameTick((t) => t + 1)
      setJsSpin((deg) => (deg + 3) % 360)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const worker = new ApiWorker()
    workerRef.current = worker

    worker.onmessage = (event) => {
      if (event.data.ok) {
        setResult(event.data)
        setSource('worker')
        setError(null)
      } else {
        setError(event.data.error)
        setResult(null)
        setSource(null)
      }
      setRunning(false)
    }

    worker.onerror = () => {
      setError('Worker crashed')
      setRunning(false)
    }

    return () => worker.terminate()
  }, [])

  function callHeavyApi() {
    setRunning(true)
    setResult(null)
    setError(null)
    setSource(null)
    workerRef.current.postMessage({ size, delay, timeout: requestTimeout })
  }

  async function callHeavyApiMain() {
    setRunningMain(true)
    setResult(null)
    setError(null)
    setSource(null)

    try {
      const data = await fetchHeavyApi({ size, delay, timeout: requestTimeout })
      setResult(data)
      setSource('main')
    } catch (err) {
      setError(err.message)
    } finally {
      setRunningMain(false)
    }
  }

  const busy = running || runningMain

  return (
    <section className="page">
      <h1>Heavy API Worker</h1>
      <p>
        Same heavy CPU work — worker keeps the UI alive, main thread freezes it.
        Watch the animation counter and try clicking while each runs.
      </p>

      <div className="anim-panel">
        <p className="anim-panel-title">Live UI animations (freeze when main thread is blocked)</p>
        <div className="anim-grid">
          <div className="anim-card">
            <div className="anim-spinner" />
            <span>CSS spin</span>
          </div>
          <div className="anim-card">
            <div className="anim-dots">
              <span />
              <span />
              <span />
            </div>
            <span>Bouncing dots</span>
          </div>
          <div className="anim-card">
            <div className="anim-shimmer" />
            <span>Shimmer bar</span>
          </div>
          <div className="anim-card">
            <div className="anim-slide" />
            <span>Slide gradient</span>
          </div>
          <div className="anim-card">
            <div className="anim-js-spin" style={{ transform: `rotate(${jsSpin}deg)` }} />
            <span>JS spin · tick {frameTick}</span>
          </div>
          <div className="anim-card">
            <div className="anim-ring">
              <span>{frameTick % 100}</span>
            </div>
            <span>Live counter</span>
          </div>
        </div>
      </div>

      <button type="button" onClick={() => setClicks((c) => c + 1)}>
        UI clicks: {clicks}
      </button>

      <label>
        Server delay: {delay} ms
        <input
          type="range"
          min="0"
          max="10000"
          step="500"
          value={delay}
          disabled={busy}
          onChange={(e) => setDelay(Number(e.target.value))}
        />
      </label>

      <label>
        Server timeout: {requestTimeout} ms
        <input
          type="range"
          min="3000"
          max="30000"
          step="1000"
          value={requestTimeout}
          disabled={busy}
          onChange={(e) => setRequestTimeout(Number(e.target.value))}
        />
      </label>

      <label>
        Items from API: {size.toLocaleString()}
        <input
          type="range"
          min="5000"
          max="80000"
          step="5000"
          value={size}
          disabled={busy}
          onChange={(e) => setSize(Number(e.target.value))}
        />
      </label>

      <button type="button" onClick={callHeavyApi} disabled={busy}>
        {running ? 'Worker calling API...' : 'Call heavy API in worker'}
      </button>

      <button type="button" onClick={callHeavyApiMain} disabled={busy}>
        {runningMain ? 'Main thread calling API...' : 'Call heavy API on main thread'}
      </button>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="grpc-result">
          <p>
            <strong>{source === 'worker' ? 'Worker' : 'Main thread'}</strong> — processed{' '}
            <strong>{result.count.toLocaleString()}</strong> items — sum of squares:{' '}
            {result.total.toLocaleString()}, max: {result.max}
          </p>
          <small>
            Server {result.serverMs} ms · fetch {result.fetchMs} ms · process {result.processMs}{' '}
            ms · total {result.totalMs} ms
          </small>
        </div>
      )}
    </section>
  )
}
