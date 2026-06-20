import { useCallback, useEffect, useState } from 'react'
import { addItem, clearAll, deleteItem, getAllItems } from '../db/galleryDb.js'
import { formatBytes } from '../modules/image/formatBytes.js'

function formatDate(ms) {
  return new Date(ms).toLocaleString()
}

export default function GalleryPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [thumbUrls, setThumbUrls] = useState({})

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await getAllItems()
      rows.sort((a, b) => b.createdAt - a.createdAt)
      setItems(rows)
    } catch (err) {
      setError(err.message ?? 'Failed to read IndexedDB')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  useEffect(() => {
    const urls = {}
    for (const item of items) {
      if (item.type === 'image' && item.blob) {
        urls[item.id] = URL.createObjectURL(item.blob)
      }
    }
    setThumbUrls((prev) => {
      for (const url of Object.values(prev)) URL.revokeObjectURL(url)
      return urls
    })
    return () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url)
    }
  }, [items])

  async function saveNote() {
    if (!noteTitle.trim() && !noteBody.trim()) return
    setSaving(true)
    setError(null)
    try {
      await addItem({
        type: 'note',
        title: noteTitle.trim() || 'Untitled',
        body: noteBody.trim(),
      })
      setNoteTitle('')
      setNoteBody('')
      await loadItems()
    } catch (err) {
      setError(err.message ?? 'Failed to save note')
    } finally {
      setSaving(false)
    }
  }

  async function saveImage(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setSaving(true)
    setError(null)
    try {
      await addItem({
        type: 'image',
        name: file.name,
        mime: file.type,
        size: file.size,
        blob: file,
      })
      await loadItems()
    } catch (err) {
      setError(err.message ?? 'Failed to save image')
    } finally {
      setSaving(false)
    }
  }

  async function removeItem(id) {
    setError(null)
    try {
      await deleteItem(id)
      await loadItems()
    } catch (err) {
      setError(err.message ?? 'Failed to delete item')
    }
  }

  async function wipeAll() {
    if (!items.length) return
    if (!window.confirm('Delete all items from IndexedDB?')) return
    setError(null)
    try {
      await clearAll()
      await loadItems()
    } catch (err) {
      setError(err.message ?? 'Failed to clear storage')
    }
  }

  return (
    <section className="page">
      <h1>IndexedDB Gallery</h1>
      <p>
        Save notes and images in the browser. Data persists after refresh — open DevTools → Application →
        IndexedDB → <code>ww-gallery</code> to inspect.
      </p>

      {error && <p className="error">{error}</p>}

      <div className="idb-forms">
        <div className="idb-form-card">
          <h2>Save a note</h2>
          <label>
            Title
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder="My note"
            />
          </label>
          <label>
            Body
            <textarea
              rows={3}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Stored as plain text in IndexedDB"
            />
          </label>
          <button type="button" onClick={saveNote} disabled={saving}>
            Save note
          </button>
        </div>

        <div className="idb-form-card">
          <h2>Save an image</h2>
          <p className="idb-hint">Blob stored directly — no server upload.</p>
          <label className="file-input">
            Choose image
            <input type="file" accept="image/*" onChange={saveImage} disabled={saving} />
          </label>
        </div>
      </div>

      <div className="idb-toolbar">
        <p>
          {loading ? 'Loading…' : `${items.length} item${items.length === 1 ? '' : 's'} in IndexedDB`}
        </p>
        <button type="button" className="idb-clear" onClick={wipeAll} disabled={!items.length}>
          Clear all
        </button>
      </div>

      {loading && items.length === 0 ? (
        <p>Loading stored items…</p>
      ) : items.length === 0 ? (
        <p className="idb-empty">Nothing saved yet. Add a note or image above.</p>
      ) : (
        <ul className="idb-grid">
          {items.map((item) => (
            <li key={item.id} className="idb-card">
              {item.type === 'image' ? (
                <>
                  {thumbUrls[item.id] && (
                    <img src={thumbUrls[item.id]} alt={item.name} className="idb-thumb" />
                  )}
                  <div className="idb-card-body">
                    <strong>{item.name}</strong>
                    <span>{formatBytes(item.size)}</span>
                    <time>{formatDate(item.createdAt)}</time>
                  </div>
                </>
              ) : (
                <div className="idb-card-body idb-note">
                  <strong>{item.title}</strong>
                  <p>{item.body || '—'}</p>
                  <time>{formatDate(item.createdAt)}</time>
                </div>
              )}
              <button type="button" className="idb-delete" onClick={() => removeItem(item.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
