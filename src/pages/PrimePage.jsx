import { useEffect, useRef, useState } from "react";
import Worker from "../workers/prime.worker.js?worker";
import NewWorker from "../workers/new.worker.js?worker";

export default function PrimePage() {
  const workerRef = useRef(null);
  const newWorkerRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    const worker = new Worker();
    const newWorker = new NewWorker();

    workerRef.current = worker;
    newWorkerRef.current = newWorker;

    worker.onmessage = (event) => {
      setResult(event.data);
      setRunning(false);
    };

    newWorker.onmessage = (event) => {
      console.log(event);
    };

    return () => {
      worker.terminate();
      newWorker.terminate();
    }
  }, []);

  function start() {
    setRunning(true);
    setResult(null);
    workerRef.current.postMessage({ max: 500000 });
  }

  function sayHello() {
    newWorkerRef.current.postMessage({ message: "Hello" });
  }

  return (
    <section className="page">
      <h1>Prime Worker</h1>
      <p>Heavy math runs in a background thread. The UI stays clickable.</p>

      <button type="button" onClick={() => setClicks((c) => c + 1)}>
        Clicks: {clicks}
      </button>

      <button type="button" onClick={start} disabled={running}>
        {running ? "Working..." : "Find primes up to 500,000"}
      </button>

      {result && (
        <p>
          Found {result.count.toLocaleString()} primes in {result.ms} ms
        </p>
      )}

      <button type="button" onClick={sayHello}>
        Say Hello
      </button>
    </section>
  );
}
