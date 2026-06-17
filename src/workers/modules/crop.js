export function cropImageData(imageData, crop) {
  const { x, y, width, height } = crop
  const src = imageData.data
  const srcWidth = imageData.width
  const cropped = new ImageData(width, height)
  const dst = cropped.data

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const srcIndex = ((y + row) * srcWidth + (x + col)) * 4
      const dstIndex = (row * width + col) * 4
      dst[dstIndex] = src[srcIndex]
      dst[dstIndex + 1] = src[srcIndex + 1]
      dst[dstIndex + 2] = src[srcIndex + 2]
      dst[dstIndex + 3] = src[srcIndex + 3]
    }
  }

  return cropped
}
