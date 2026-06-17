export function compressCanvas(canvas, quality) {
  return canvas.convertToBlob({ type: 'image/jpeg', quality })
}
