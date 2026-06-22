import { lazy, Suspense } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import PrimePage from './pages/PrimePage.jsx'
import PhotoPage from './pages/PhotoPage.jsx'
import UploadPage from './pages/UploadPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import SocketChatPage from './pages/SocketChatPage.jsx'
import FetchStreamPage from './pages/FetchStreamPage.jsx'
import HLSPage from './pages/HLSPage.jsx'
import HeavyApiPage from './pages/HeavyApiPage.jsx'
import GalleryPage from './pages/GalleryPage.jsx'
import WebRTCPage from './pages/WebRTCPage.jsx'
import WasmPage from './pages/WasmPage.jsx'
const SkiaEditorPage = lazy(() => import('./pages/SkiaEditorPage.jsx'))
import './App.css'

const NAV = [
  {
    title: 'Web Worker',
    links: [
      { to: '/', label: 'Primes', end: true },
      { to: '/photo', label: 'Camera' },
      { to: '/upload', label: 'Upload & Crop' },
      { to: '/heavy-api', label: 'Heavy API' },
    ],
  },
  {
    title: 'Storage',
    links: [{ to: '/gallery', label: 'IndexedDB' }],
  },
  {
    title: 'Communication',
    links: [
      { to: '/chat', label: 'SSE Chat' },
      { to: '/socket', label: 'Socket Chat' },
      { to: '/fetch', label: 'Fetch Stream' },
      { to: '/webrtc', label: 'WebRTC' },
    ],
  },
  {
    title: 'WebAssembly',
    links: [{ to: '/wasm', label: 'Learn WASM' }],
  },
  {
    title: 'Skia',
    links: [{ to: '/skia', label: 'Editor' }],
  },
  {
    title: 'HLS',
    links: [{ to: '/hls', label: 'Video Player' }],
  },
]

const PAGE_TITLES = {
  '/': 'Primes Worker',
  '/photo': 'Camera Compress',
  '/upload': 'Upload & Crop',
  '/heavy-api': 'Heavy API Worker',
  '/gallery': 'IndexedDB Gallery',
  '/chat': 'SSE Chat',
  '/socket': 'Socket Chat',
  '/fetch': 'Fetch Stream',
  '/webrtc': 'WebRTC Call',
  '/wasm': 'Learn WASM',
  '/skia': 'Skia Editor',
  '/hls': 'HLS Player',
}

function Sidebar() {
  return (
    <aside className="sidebar">
      {NAV.map((group) => (
        <div key={group.title} className="sidebar-group">
          <p className="sidebar-title">{group.title}</p>
          <ul>
            {group.links.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'active' : '')}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  )
}

function Header() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'Demo App'

  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-logo">WW</span>
        <div>
          <h1>Web Worker Lab</h1>
          <p>Workers · Streaming · HLS</p>
        </div>
      </div>
      <span className="header-page">{title}</span>
    </header>
  )
}

export default function App() {
  return (
    <div className="layout">
      <Header />
      <div className="layout-body">
        <Sidebar />
        <main className="main">
          <Routes>
            <Route path="/" element={<PrimePage />} />
            <Route path="/photo" element={<PhotoPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/heavy-api" element={<HeavyApiPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/socket" element={<SocketChatPage />} />
            <Route path="/fetch" element={<FetchStreamPage />} />
            <Route path="/webrtc" element={<WebRTCPage />} />
            <Route path="/wasm" element={<WasmPage />} />
            <Route
              path="/skia"
              element={
                <Suspense fallback={<p className="page">Loading Skia WASM…</p>}>
                  <SkiaEditorPage />
                </Suspense>
              }
            />
            <Route path="/hls" element={<HLSPage />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
