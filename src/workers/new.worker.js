self.onmessage = (event) => {
  console.log(event);

  self.postMessage({
    message: 'Hello from the worker',
  })
}