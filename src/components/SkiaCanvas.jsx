import { useEffect, useRef } from 'react'
import { renderScene } from '../skia/drawStrokes.js'
import { loadCanvasKit } from '../skia/loadCanvasKit.js'

function syncCanvasSize(canvas) {
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const dpr = window.devicePixelRatio || 1
  const w = Math.round(rect.width * dpr)
  const h = Math.round(rect.height * dpr)
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
}

function createSurface(ck, canvas) {
  syncCanvasSize(canvas)
  return ck.MakeCanvasSurface(canvas)
}

/**
 * React owns the DOM <canvas>; Skia owns the pixels.
 * We keep a list of draw commands in React state and repaint via CanvasKit on each change.
 */
export default function SkiaCanvas({
  strokes,
  preview,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  className,
}) {
  const canvasRef = useRef(null)
  const surfaceRef = useRef(null)
  const ckRef = useRef(null)
  const sceneRef = useRef({ strokes, preview })
  sceneRef.current = { strokes, preview }

  useEffect(() => {
    let cancelled = false

    loadCanvasKit().then((ck) => {
      if (cancelled || !canvasRef.current) return
      ckRef.current = ck
      surfaceRef.current = createSurface(ck, canvasRef.current)
      const { strokes: s, preview: p } = sceneRef.current
      renderScene(ck, surfaceRef.current, s, p)
    })

    return () => {
      cancelled = true
      surfaceRef.current?.delete()
      surfaceRef.current = null
    }
  }, [])

  useEffect(() => {
    const ck = ckRef.current
    const surface = surfaceRef.current
    if (!ck || !surface) return
    renderScene(ck, surface, strokes, preview)
  }, [strokes, preview])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    syncCanvasSize(canvas)

    const observer = new ResizeObserver(() => {
      const ck = ckRef.current
      const canvas = canvasRef.current
      if (!canvas) return

      syncCanvasSize(canvas)
      if (!ck) return

      surfaceRef.current?.delete()
      surfaceRef.current = createSurface(ck, canvas)
      if (!surfaceRef.current) return

      const { strokes: s, preview: p } = sceneRef.current
      renderScene(ck, surfaceRef.current, s, p)
    })

    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    />
  )
}
