import CanvasKitInit from 'canvaskit-wasm'
import wasmUrl from 'canvaskit-wasm/bin/canvaskit.wasm?url'

let promise = null

/** Load Skia's CanvasKit WASM once and reuse across the app. */
export function loadCanvasKit() {
  if (!promise) {
    promise = CanvasKitInit({ locateFile: () => wasmUrl })
  }
  return promise
}
