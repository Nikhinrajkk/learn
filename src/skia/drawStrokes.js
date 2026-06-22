function hexToColor(ck, hex) {
  const h = hex.replace('#', '')
  return ck.Color(
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
    1,
  )
}

function makeStrokePaint(ck, stroke) {
  const paint = new ck.Paint()
  paint.setAntiAlias(true)
  paint.setStyle(ck.PaintStyle.Stroke)
  paint.setStrokeWidth(stroke.width ?? 4)
  paint.setColor(hexToColor(ck, stroke.color ?? '#1a1a2e'))
  paint.setStrokeCap(ck.StrokeCap.Round)
  paint.setStrokeJoin(ck.StrokeJoin.Round)
  return paint
}

/** Draw one command from the scene list onto a Skia canvas. */
export function drawStroke(ck, canvas, stroke) {
  const paint = makeStrokePaint(ck, stroke)

  if (stroke.type === 'path') {
    const { points } = stroke
    if (points?.length >= 2) {
      const builder = new ck.PathBuilder()
      builder.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        builder.lineTo(points[i].x, points[i].y)
      }
      const path = builder.snapshot()
      canvas.drawPath(path, paint)
      path.delete()
      builder.delete()
    }
  } else if (stroke.type === 'line') {
    canvas.drawLine(stroke.x1, stroke.y1, stroke.x2, stroke.y2, paint)
  } else if (stroke.type === 'rect') {
    canvas.drawRect(ck.XYWHRect(stroke.x, stroke.y, stroke.w, stroke.h), paint)
  } else if (stroke.type === 'ellipse') {
    canvas.drawOval(ck.XYWHRect(stroke.x, stroke.y, stroke.w, stroke.h), paint)
  }

  paint.delete()
}

/** Re-render the full scene: white background + committed strokes + optional preview. */
export function renderScene(ck, surface, strokes, preview = null) {
  const canvas = surface.getCanvas()
  canvas.clear(ck.WHITE)

  for (const stroke of strokes) {
    drawStroke(ck, canvas, stroke)
  }
  if (preview) {
    drawStroke(ck, canvas, preview)
  }

  surface.flush()
}

export function rectFromPoints(x1, y1, x2, y2) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    w: Math.abs(x2 - x1),
    h: Math.abs(y2 - y1),
  }
}
