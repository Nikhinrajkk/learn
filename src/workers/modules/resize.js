export function resizeImage(sourceCanvas, maxWidth) {
  let width = sourceCanvas.width
  let height = sourceCanvas.height

  if (maxWidth && width > maxWidth) {
    const scale = maxWidth / width
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(sourceCanvas, 0, 0, width, height)

  return { canvas, width, height }
}
