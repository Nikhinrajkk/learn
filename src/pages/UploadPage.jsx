import { useEffect, useRef, useState } from 'react'
import CropBox from '../components/CropBox.jsx'
import { addItem } from '../db/galleryDb.js'
import { formatBytes } from '../modules/image/formatBytes.js'
import ImageWorker from '../workers/image.worker.js?worker'

export default function UploadPage() {
  const imageRef = useRef(null)
  const workerRef = useRef(null)

  const [file, setFile] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [crop, setCrop] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
  const [maxWidth, setMaxWidth] = useState(1280)
  const [quality, setQuality] = useState(0.7)
  const [processing, setProcessing] = useState(false)
  const [resultUrl, setResultUrl] = useState(null)
  const [resultBlob, setResultBlob] = useState(null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [savedToGallery, setSavedToGallery] = useState(false)

  useEffect(() => {
    const worker = new ImageWorker()
    workerRef.current = worker

    worker.onmessage = (event) => {
      const { buffer, type, originalBytes, compressedBytes, width, height, ms } = event.data
      const blob = new Blob([buffer], { type })

      setResultBlob(blob)
      setSavedToGallery(false)
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(blob)
      })
      setStats({ originalBytes, compressedBytes, width, height, ms })
      setProcessing(false)
    }

    worker.onerror = () => {
      setError('Image worker failed')
      setProcessing(false)
    }

    return () => worker.terminate()
  }, [])

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl)
    }
  }, [resultUrl])

  function onFileChange(event) {
    const selected = event.target.files?.[0]
    if (!selected) return

    setFile(selected)
    setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
    setStats(null)
    setSavedToGallery(false)
    setResultBlob(null)
    setError(null)
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(selected)
    })
  }

  function processImage() {
    const img = imageRef.current
    if (!img || !file || !workerRef.current) return

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d').drawImage(img, 0, 0)

    const cropPixels = {
      x: Math.round(crop.x * img.naturalWidth),
      y: Math.round(crop.y * img.naturalHeight),
      width: Math.round(crop.w * img.naturalWidth),
      height: Math.round(crop.h * img.naturalHeight),
    }

    const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)

    setProcessing(true)
    setSavedToGallery(false)
    setError(null)
    workerRef.current.postMessage(
      {
        imageData,
        crop: cropPixels,
        maxWidth,
        quality,
        originalBytes: file.size,
      },
      [imageData.data.buffer],
    )
  }

  async function saveToGallery() {
    if (!resultBlob || !file) return
    try {
      await addItem({
        type: 'image',
        name: `crop-${file.name}`,
        mime: resultBlob.type,
        size: resultBlob.size,
        blob: resultBlob,
      })
      setSavedToGallery(true)
    } catch {
      setError('Failed to save to IndexedDB')
    }
  }

  return (
    <section className="page">
      <h1>Upload & Crop</h1>
      <p>Upload an image, drag the crop box, then resize and compress in a web worker.</p>

      <label className="file-input">
        Choose image
        <input type="file" accept="image/*" onChange={onFileChange} />
      </label>

      {error && <p className="error">{error}</p>}

      {imageUrl && (
        <>
          <img ref={imageRef} src={imageUrl} alt="" hidden onLoad={() => {}} />
          <CropBox src={imageUrl} crop={crop} onCropChange={setCrop} />

          <label>
            Max width: {maxWidth}px
            <input
              type="range"
              min="320"
              max="2400"
              step="80"
              value={maxWidth}
              onChange={(e) => setMaxWidth(Number(e.target.value))}
            />
          </label>

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

          <button type="button" onClick={processImage} disabled={processing}>
            {processing ? 'Processing...' : 'Crop, resize & compress'}
          </button>
        </>
      )}

      {stats && (
        <p>
          {stats.width} x {stats.height} — {formatBytes(stats.originalBytes)} to{' '}
          {formatBytes(stats.compressedBytes)} in {stats.ms} ms (
          {Math.round((1 - stats.compressedBytes / stats.originalBytes) * 100)}% smaller)
        </p>
      )}

      {resultUrl && (
        <figure>
          <img src={resultUrl} alt="Processed result" className="result-image" />
          <figcaption>
            Result from worker
            <button type="button" onClick={saveToGallery} disabled={savedToGallery}>
              {savedToGallery ? 'Saved to IndexedDB' : 'Save to IndexedDB'}
            </button>
          </figcaption>
        </figure>
      )}
    </section>
  )
}
