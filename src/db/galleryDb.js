const DB_NAME = 'ww-gallery'
const STORE = 'items'
const VERSION = 1

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function run(storeMode, fn) {
  return openDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, storeMode)
      const store = tx.objectStore(STORE)
      const req = fn(store)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  })
}

export function addItem(item) {
  return run('readwrite', (store) =>
    store.add({
      ...item,
      createdAt: Date.now(),
    }),
  )
}

export function getAllItems() {
  return run('readonly', (store) => store.getAll())
}

export function deleteItem(id) {
  return run('readwrite', (store) => store.delete(id))
}

export function clearAll() {
  return run('readwrite', (store) => store.clear())
}
