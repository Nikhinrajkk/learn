import { useRef, useState } from 'react'
import SkiaCanvas from '../components/SkiaCanvas.jsx'
import { pointerToCanvas } from '../skia/canvasPoint.js'
import { rectFromPoints } from '../skia/drawStrokes.js'

const TOOLS = [
  { id: 'pen', label: 'Pen', hint: 'Path — freehand strokes' },
  { id: 'line', label: 'Line', hint: 'drawLine(x1, y1, x2, y2)' },
  { id: 'rect', label: 'Rect', hint: 'drawRect(XYWHRect(...))' },
  { id: 'ellipse', label: 'Ellipse', hint: 'drawOval(XYWHRect(...))' },
]

const COLORS = ['#1a1a2e', '#646cff', '#e74c3c', '#22c55e', '#f59e0b', '#8b5cf6']

export default function SkiaEditorPage() {
  const drawingRef = useRef(null)
  const canvasElRef = useRef(null)

  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState('#1a1a2e')
  const [width, setWidth] = useState(4)
  const [strokes, setStrokes] = useState([])
  const [preview, setPreview] = useState(null)

  function baseStroke() {
    return { color, width, type: tool }
  }

  function onPointerDown(event) {
    const canvas = event.currentTarget
    canvasElRef.current = canvas
    canvas.setPointerCapture(event.pointerId)
    const point = pointerToCanvas(event, canvas)

    if (tool === 'pen') {
      drawingRef.current = { ...baseStroke(), type: 'path', points: [point] }
      setPreview(drawingRef.current)
      return
    }

    drawingRef.current = { ...baseStroke(), start: point, current: point }
    setPreview(shapePreview(drawingRef.current))
  }

  function onPointerMove(event) {
    if (!drawingRef.current) return
    const canvas = canvasElRef.current ?? event.currentTarget
    const point = pointerToCanvas(event, canvas)

    if (tool === 'pen') {
      drawingRef.current = {
        ...drawingRef.current,
        points: [...drawingRef.current.points, point],
      }
      setPreview({ ...drawingRef.current })
      return
    }

    drawingRef.current = { ...drawingRef.current, current: point }
    setPreview(shapePreview(drawingRef.current))
  }

  function onPointerUp() {
    if (!drawingRef.current) return

    let committed = null

    if (tool === 'pen') {
      if (drawingRef.current.points.length > 1) {
        committed = drawingRef.current
      }
    } else {
      committed = shapePreview(drawingRef.current)
      if (committed && tool === 'line') {
        const dx = committed.x2 - committed.x1
        const dy = committed.y2 - committed.y1
        if (Math.hypot(dx, dy) < 2) committed = null
      } else if (committed && (committed.w < 2 && committed.h < 2)) {
        committed = null
      }
    }

    if (committed) {
      setStrokes((prev) => [...prev, committed])
    }

    drawingRef.current = null
    setPreview(null)
  }

  function shapePreview(draft) {
    const { start, current, color: c, width: w, type } = draft
    if (type === 'line') {
      return { type: 'line', x1: start.x, y1: start.y, x2: current.x, y2: current.y, color: c, width: w }
    }
    const box = rectFromPoints(start.x, start.y, current.x, current.y)
    return { type, ...box, color: c, width: w }
  }

  function undo() {
    setStrokes((prev) => prev.slice(0, -1))
    setPreview(null)
  }

  function clear() {
    setStrokes([])
    setPreview(null)
  }

  const activeHint = TOOLS.find((t) => t.id === tool)?.hint

  return (
    <section className="page skia-page">
      <h1>Skia Editor</h1>
      <p>
        A minimal drawing app using <strong>CanvasKit</strong> — Skia compiled to WebAssembly. React
        holds a scene list; each frame Skia repaints the canvas from that list.
      </p>

      <div className="skia-layout">
        <div className="skia-workspace">
          <div className="skia-toolbar">
            <div className="skia-tool-group">
              {TOOLS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={tool === t.id ? 'active' : ''}
                  onClick={() => setTool(t.id)}
                  title={t.hint}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="skia-tool-group skia-colors">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`skia-swatch ${color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>

            <label className="skia-width">
              Width {width}px
              <input
                type="range"
                min="1"
                max="24"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
              />
            </label>

            <div className="skia-tool-group">
              <button type="button" onClick={undo} disabled={!strokes.length}>
                Undo
              </button>
              <button type="button" onClick={clear} disabled={!strokes.length}>
                Clear
              </button>
            </div>
          </div>

          <SkiaCanvas
            className="skia-canvas"
            strokes={strokes}
            preview={preview}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />

          <p className="skia-meta">{strokes.length} stroke{strokes.length === 1 ? '' : 's'}</p>
        </div>

        <aside className="skia-learn">
          <h2>How it works</h2>

          <div className="skia-concept">
            <h3>1. Load Skia (WASM)</h3>
            <pre>{`loadCanvasKit()
  → CanvasKitInit({ locateFile })`}</pre>
            <p>Skia ships as ~6MB WASM. Vite bundles it via <code>?url</code>.</p>
          </div>

          <div className="skia-concept">
            <h3>2. Surface + Canvas</h3>
            <pre>{`surface = CK.MakeCanvasSurface(canvas)
skCanvas = surface.getCanvas()
skCanvas.clear(CK.WHITE)`}</pre>
            <p>The HTML <code>&lt;canvas&gt;</code> is just a host — Skia draws via WebGL.</p>
          </div>

          <div className="skia-concept">
            <h3>3. Paint + draw calls</h3>
            <pre>{`paint = new CK.Paint()
paint.setStyle(CK.PaintStyle.Stroke)
paint.setStrokeWidth(${width})
canvas.drawPath(path, paint)
paint.delete()  // free WASM memory`}</pre>
            <p>Active tool: <strong>{activeHint}</strong></p>
          </div>

          <div className="skia-concept">
            <h3>4. React = scene graph</h3>
            <pre>{`strokes = [
  { type: 'path', points: [...] },
  { type: 'rect', x, y, w, h },
]`}</pre>
            <p>Pointer events mutate the list; Skia re-renders on change. Same pattern as Figma/Excalidraw, but simpler.</p>
          </div>

          <div className="skia-concept">
            <h3>5. flush()</h3>
            <pre>{`surface.flush()`}</pre>
            <p>Presents the GPU buffer to the visible canvas.</p>
          </div>
        </aside>
      </div>
    </section>
  )
}
