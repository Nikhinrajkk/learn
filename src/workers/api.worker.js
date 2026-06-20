import { fetchHeavyApi } from '../modules/heavyApiCall.js'

self.onmessage = async (event) => {
  try {
    const result = await fetchHeavyApi(event.data)
    self.postMessage(result)
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error.message || 'Worker API call failed',
    })
  }
}
