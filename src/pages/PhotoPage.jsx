import { useEffect, useRef, useState } from 'react'
import CompressWorker from '../workers/compress.worker.js?worker'

export default function PhotoPage() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const workerRef = useRef(null)
  const streamRef = useRef(null)

  const [cameraOn, setCameraOn] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [quality, setQuality] = useState(0.6)
  const [originalUrl, setOriginalUrl] = useState(null)
  const [compressedUrl, setCompressedUrl] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const worker = new CompressWorker()
    workerRef.current = worker

    worker.onmessage = (event) => {
      const { buffer, type, originalBytes, compressedBytes, ms, width, height } = event.data
      const blob = new Blob([buffer], { type })

      setCompressedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(blob)
      })
      setStats({ originalBytes, compressedBytes, ms, width, height })
      setCompressing(false)
    }

    worker.onerror = () => {
      setError('Compression worker failed')
      setCompressing(false)
    }

    return () => {
      worker.terminate()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setCameraOn(true)
      setError(null)
    } catch {
      setError('Camera access denied or not available')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }

  async function captureAndCompress() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !workerRef.current) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    setCompressing(true)
    setStats(null)
    setError(null)

    const originalBlob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    )

    setOriginalUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(originalBlob)
    })

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    workerRef.current.postMessage(
      {
        imageData,
        quality,
        maxWidth: 1280,
        originalBytes: originalBlob.size,
      },
      [imageData.data.buffer],
    )
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return (
    <section className="page">
      <h1>Photo Compressor</h1>
      <p>Capture a photo, then resize and compress it in a web worker.</p>

      {error && <p className="error">{error}</p>}

      <div className="camera-box">
        <video ref={videoRef} playsInline muted className="camera" />
        {!cameraOn && <p className="camera-placeholder">Camera preview</p>}
      </div>

      <canvas ref={canvasRef} hidden />

      <label>
        JPEG quality: {quality.toFixed(2)}
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={quality}
          onChange={(e) => setQuality(Number(e.target.value))}
        />
      </label>

      <div className="button-row">
        {!cameraOn ? (
          <button type="button" onClick={startCamera}>
            Start camera
          </button>
        ) : (
          <>
            <button type="button" onClick={captureAndCompress} disabled={compressing}>
              {compressing ? 'Compressing...' : 'Capture & compress'}
            </button>
            <button type="button" onClick={stopCamera}>
              Stop camera
            </button>
          </>
        )}
      </div>

      {stats && (
        <p>
          {stats.width} x {stats.height} — {formatBytes(stats.originalBytes)} to{' '}
          {formatBytes(stats.compressedBytes)} in {stats.ms} ms (
          {Math.round((1 - stats.compressedBytes / stats.originalBytes) * 100)}% smaller)
        </p>
      )}

      {(originalUrl || compressedUrl) && (
        <div className="preview-row">
          {originalUrl && (
            <figure>
              <img src={originalUrl} alt="Original capture" />
              <figcaption>Original</figcaption>
            </figure>
          )}
          {compressedUrl && (
            <figure>
              <img src={compressedUrl} alt="Compressed capture" />
              <figcaption>Compressed (worker)</figcaption>
            </figure>
          )}
        </div>
      )}
    </section>
  )
}
