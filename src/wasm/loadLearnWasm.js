let instancePromise = null

/** Fetch and instantiate the learning WASM module once. */
export function loadLearnWasm() {
  if (!instancePromise) {
    instancePromise = fetch('/wasm/learn.wasm')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch learn.wasm — run npm run build:wasm')
        return response.arrayBuffer()
      })
      .then((bytes) => WebAssembly.instantiate(bytes))
      .then(({ instance }) => instance)
  }
  return instancePromise
}

export function listExports(instance) {
  return Object.keys(instance.exports).filter((key) => key !== '__indirect_function_table')
}

export function sumRangeJs(n) {
  let total = 0
  for (let i = 0; i < n; i++) total += i
  return total
}

export function writeInt32Array(instance, values, byteOffset = 0) {
  const view = new Int32Array(instance.exports.memory.buffer)
  const start = byteOffset / 4
  for (let i = 0; i < values.length; i++) {
    view[start + i] = values[i]
  }
}
