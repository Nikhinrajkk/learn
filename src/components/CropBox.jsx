import { useEffect, useRef, useState } from 'react'

const MIN_SIZE = 0.15

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export default function CropBox({ src, crop, onCropChange }) {
  const containerRef = useRef(null)
  const dragRef = useRef(null)
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, height: 0 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const updateBox = () => {
      const rect = container.getBoundingClientRect()
      setBox({
        left: crop.x * rect.width,
        top: crop.y * rect.height,
        width: crop.w * rect.width,
        height: crop.h * rect.height,
      })
    }

    updateBox()
    window.addEventListener('resize', updateBox)
    return () => window.removeEventListener('resize', updateBox)
  }, [crop])

  function toNormalized(clientX, clientY) {
    const rect = containerRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    }
  }

  function onPointerDown(event, mode) {
    event.preventDefault()
    const start = toNormalized(event.clientX, event.clientY)
    dragRef.current = { mode, start, crop: { ...crop } }

    function onMove(moveEvent) {
      const current = toNormalized(moveEvent.clientX, moveEvent.clientY)
      const dx = current.x - dragRef.current.start.x
      const dy = current.y - dragRef.current.start.y
      const base = dragRef.current.crop

      if (dragRef.current.mode === 'move') {
        onCropChange({
          x: clamp(base.x + dx, 0, 1 - base.w),
          y: clamp(base.y + dy, 0, 1 - base.h),
          w: base.w,
          h: base.h,
        })
        return
      }

      onCropChange({
        x: base.x,
        y: base.y,
        w: clamp(base.w + dx, MIN_SIZE, 1 - base.x),
        h: clamp(base.h + dy, MIN_SIZE, 1 - base.y),
      })
    }

    function onUp() {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div ref={containerRef} className="crop-box">
      <img src={src} alt="Upload preview" className="crop-image" />
      <div
        className="crop-frame"
        style={{
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
        }}
        onPointerDown={(event) => onPointerDown(event, 'move')}
      >
        <span
          className="crop-handle"
          onPointerDown={(event) => {
            event.stopPropagation()
            onPointerDown(event, 'resize')
          }}
        />
      </div>
    </div>
  )
}
