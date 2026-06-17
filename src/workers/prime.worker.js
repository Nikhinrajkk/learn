self.onmessage = (event) => {
  const max = event.data.max
  const start = performance.now()
  let count = 0

  for (let i = 2; i <= max; i++) {
    let isPrime = true
    for (let j = 2; j * j <= i; j++) {
      if (i % j === 0) {
        isPrime = false
        break
      }
    }
    if (isPrime) count++
  }

  self.postMessage({
    count,
    ms: Math.round(performance.now() - start),
  })
}
