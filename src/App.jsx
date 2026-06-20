import { Link, Route, Routes } from 'react-router-dom'
import PrimePage from './pages/PrimePage.jsx'
import PhotoPage from './pages/PhotoPage.jsx'
import UploadPage from './pages/UploadPage.jsx'
import ChatPage from './pages/ChatPage.jsx'
import SocketChatPage from './pages/SocketChatPage.jsx'
import FetchStreamPage from './pages/FetchStreamPage.jsx'
import HLSPage from './pages/HLSPage.jsx'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <nav>
        <Link to="/">Primes</Link>
        <Link to="/photo">Photo</Link>
        <Link to="/upload">Upload</Link>
        <Link to="/chat">Chat</Link>
        <Link to="/socket">Socket</Link>
        <Link to="/fetch">Fetch</Link>
        <Link to="/hls">HLS</Link>
      </nav>

      <Routes>
        <Route path="/" element={<PrimePage />} />
        <Route path="/photo" element={<PhotoPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/socket" element={<SocketChatPage />} />
        <Route path="/fetch" element={<FetchStreamPage />} />
        <Route path="/hls" element={<HLSPage />} />
      </Routes>
    </div>
  )
}
