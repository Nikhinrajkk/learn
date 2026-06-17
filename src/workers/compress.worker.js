self.onmessage = async (event) => {
  const { imageData, quality, maxWidth, originalBytes } = event.data
  const start = performance.now()

  let width = imageData.width
  let height = imageData.height

  const source = new OffscreenCanvas(width, height)
  source.getContext('2d').putImageData(imageData, 0, 0)

  if (maxWidth && width > maxWidth) {
    const scale = maxWidth / width
    width = maxWidth
    height = Math.round(height * scale)
  }

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(source, 0, 0, width, height)

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
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
