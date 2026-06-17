import { cropImageData } from './modules/crop.js'
import { resizeImage } from './modules/resize.js'
import { compressCanvas } from './modules/compress.js'

self.onmessage = async (event) => {
  const { imageData, crop, maxWidth, quality, originalBytes } = event.data
  const start = performance.now()

  const cropped = cropImageData(imageData, crop)

  const sourceCanvas = new OffscreenCanvas(cropped.width, cropped.height)
  sourceCanvas.getContext('2d').putImageData(cropped, 0, 0)

  const { canvas, width, height } = resizeImage(sourceCanvas, maxWidth)
  const blob = await compressCanvas(canvas, quality)
  const buffer = await blob.arrayBuffer()

  self.postMessage(
    {
      buffer,
      type: blob.type,
      originalBytes,
      compressedBytes: buffer.byteLength,
      width,
      height,
      ms: Math.round(performance.now() - start),
    },
    [buffer],
  )
}
