import { useEffect, useState } from 'react'
import {
  listExports,
  loadLearnWasm,
  sumRangeJs,
  writeInt32Array,
} from '../wasm/loadLearnWasm.js'

function DemoCard({ title, children }) {
  return (
    <div className="wasm-card">
      <h2>{title}</h2>
      {children}
    </div>
  )
}

function formatMs(ms) {
  return `${ms.toFixed(2)} ms`
}

export default function WasmPage() {
  const [instance, setInstance] = useState(null)
  const [exports, setExports] = useState([])
  const [error, setError] = useState(null)
  const [watSource, setWatSource] = useState('')

  const [addA, setAddA] = useState(12)
  const [addB, setAddB] = useState(30)
  const [addResult, setAddResult] = useState(null)

  const [arrayInput, setArrayInput] = useState('10, 20, 30, 40, 50')
  const [arrayResult, setArrayResult] = useState(null)

  const [benchN, setBenchN] = useState(5_000_000)
  const [benchJs, setBenchJs] = useState(null)
  const [benchWasm, setBenchWasm] = useState(null)
  const [benching, setBenching] = useState(false)

  useEffect(() => {
    loadLearnWasm()
      .then((inst) => {
        setInstance(inst)
        setExports(listExports(inst))
      })
      .catch((err) => setError(err.message ?? 'WASM load failed'))

    fetch('/wasm/learn.wat')
      .then((r) => r.text())
      .then(setWatSource)
      .catch(() => setWatSource('(open wasm/learn.wat in the repo)'))
  }, [])

  function runAdd() {
    if (!instance) return
    setAddResult(instance.exports.add(addA, addB))
  }

  function runSumArray() {
    if (!instance) return
    const values = arrayInput
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n))

    if (!values.length) {
      setArrayResult('Enter comma-separated integers')
      return
    }

    writeInt32Array(instance, values, 0)
    setArrayResult(instance.exports.sum_array(0, values.length))
  }

  function runBenchmark() {
    if (!instance) return
    setBenching(true)
    setBenchJs(null)
    setBenchWasm(null)

    requestAnimationFrame(() => {
      const expected = sumRangeJs(benchN)

      const jsStart = performance.now()
      const jsResult = sumRangeJs(benchN)
      const jsEnd = performance.now()

      const wasmStart = performance.now()
      const wasmResult = instance.exports.sum_range(benchN)
      const wasmEnd = performance.now()

      setBenchJs({ ms: jsEnd - jsStart, result: jsResult, ok: jsResult === expected })
      setBenchWasm({ ms: wasmEnd - wasmStart, result: wasmResult, ok: wasmResult === expected })
      setBenching(false)
    })
  }

  const memoryPages = instance ? instance.exports.memory.buffer.byteLength / 65536 : 0

  return (
    <section className="page wasm-page">
      <h1>Learn WebAssembly</h1>
      <p>
        WASM is a portable binary instruction format — browsers run it near-native speed via{' '}
        <code>WebAssembly.instantiate</code>. This page loads a tiny hand-written module from{' '}
        <code>wasm/learn.wat</code>.
      </p>

      {error && <p className="error">{error}</p>}

      <div className="wasm-grid">
        <DemoCard title="1. Load &amp; instantiate">
          <p className="wasm-status">
            {instance ? (
              <>
                Module loaded · {exports.length} exports · memory {memoryPages} page
                {memoryPages === 1 ? '' : 's'} (64 KiB each)
              </>
            ) : (
              'Loading learn.wasm…'
            )}
          </p>
          <pre className="wasm-code">{`const bytes = await fetch('/wasm/learn.wasm')
  .then(r => r.arrayBuffer())
const { instance } = await WebAssembly.instantiate(bytes)
instance.exports.add(2, 40)  // → 42`}</pre>
          {exports.length > 0 && (
            <p className="wasm-exports">
              Exports: <code>{exports.join(', ')}</code>
            </p>
          )}
        </DemoCard>

        <DemoCard title="2. Call an export — add(a, b)">
          <p>Simplest case: WASM function with i32 params and return value.</p>
          <div className="wasm-row">
            <label>
              a
              <input type="number" value={addA} onChange={(e) => setAddA(Number(e.target.value))} />
            </label>
            <label>
              b
              <input type="number" value={addB} onChange={(e) => setAddB(Number(e.target.value))} />
            </label>
            <button type="button" onClick={runAdd} disabled={!instance}>
              add({addA}, {addB})
            </button>
          </div>
          {addResult !== null && (
            <p className="wasm-result">
              Result: <strong>{addResult}</strong>
            </p>
          )}
        </DemoCard>

        <DemoCard title="3. Linear memory — sum_array">
          <p>
            WASM shares one <code>ArrayBuffer</code> with JS. Write ints into memory, pass byte
            offset + length to WASM.
          </p>
          <label className="wasm-full">
            Values (comma-separated)
            <input type="text" value={arrayInput} onChange={(e) => setArrayInput(e.target.value)} />
          </label>
          <button type="button" onClick={runSumArray} disabled={!instance}>
            sum_array(ptr=0, len)
          </button>
          {arrayResult !== null && (
            <p className="wasm-result">
              Sum: <strong>{arrayResult}</strong>
            </p>
          )}
          <pre className="wasm-code">{`const view = new Int32Array(memory.buffer)
view[0] = 10; view[1] = 20; ...
instance.exports.sum_array(0, count)`}</pre>
        </DemoCard>

        <DemoCard title="4. JS vs WASM benchmark — sum_range(n)">
          <p>Same algorithm: sum 0 + 1 + … + (n − 1). Compare wall-clock time.</p>
          <label>
            n = {benchN.toLocaleString()}
            <input
              type="range"
              min="100000"
              max="20000000"
              step="100000"
              value={benchN}
              onChange={(e) => setBenchN(Number(e.target.value))}
            />
          </label>
          <button type="button" onClick={runBenchmark} disabled={!instance || benching}>
            {benching ? 'Running…' : 'Run benchmark'}
          </button>
          {(benchJs || benchWasm) && (
            <table className="wasm-table">
              <thead>
                <tr>
                  <th>Runtime</th>
                  <th>Time</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {benchJs && (
                  <tr>
                    <td>JavaScript</td>
                    <td>{formatMs(benchJs.ms)}</td>
                    <td>{benchJs.ok ? '✓' : '✗'} {benchJs.result}</td>
                  </tr>
                )}
                {benchWasm && (
                  <tr>
                    <td>WebAssembly</td>
                    <td>{formatMs(benchWasm.ms)}</td>
                    <td>{benchWasm.ok ? '✓' : '✗'} {benchWasm.result}</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          {benchJs && benchWasm && (
            <p className="wasm-hint">
              {benchWasm.ms < benchJs.ms
                ? `WASM was ${(benchJs.ms / benchWasm.ms).toFixed(1)}× faster this run.`
                : 'JS won this run — WASM has call overhead; it shines on heavier work or when already in a hot loop.'}
            </p>
          )}
        </DemoCard>

        <DemoCard title="5. Source — learn.wat">
          <p>
            Human-readable WebAssembly text format. Compiled to <code>learn.wasm</code> with{' '}
            <code>wat2wasm</code> (see <code>npm run build:wasm</code>).
          </p>
          <pre className="wasm-wat">{watSource}</pre>
        </DemoCard>

        <DemoCard title="6. In this repo">
          <ul className="wasm-links">
            <li>
              <strong>Skia Editor</strong> — CanvasKit is a large Skia build compiled to WASM (~7MB)
            </li>
            <li>
              <strong>Primes Worker</strong> — same CPU work off the main thread (plain JS, not WASM)
            </li>
            <li>
              <strong>Next steps</strong> — Rust + wasm-pack, C + Emscripten, or AssemblyScript
            </li>
          </ul>
        </DemoCard>
      </div>
    </section>
  )
}
