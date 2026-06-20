import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'

const HLS_URL = '/hls/master.m3u8'

function formatSpeed(bps) {
  if (!bps) return { mbps: '—', kbps: null }
  return {
    mbps: (bps / 1000000).toFixed(2),
    kbps: Math.round(bps / 1000),
  }
}

function levelLabel(level) {
  return `${level.height}p`
}

function getBestLevelForBandwidth(hlsLevels, estimateBps) {
  let best = 0
  for (let i = 0; i < hlsLevels.length; i++) {
    const supported = estimateBps >= hlsLevels[i].bitrate * 0.85
    const better = hlsLevels[i].height > hlsLevels[best].height
    if (supported && better) best = i
  }
  return best
}

function bumpAutoQuality(hls) {
  if (hls.currentLevel !== -1) return

  const estimate = hls.bandwidthEstimate
  const target = getBestLevelForBandwidth(hls.levels, estimate)

  if (target > hls.loadLevel) {
    hls.nextLevel = target
  }
}

export default function HLSPage() {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const modeRef = useRef('auto')
  const [mode, setMode] = useState('auto')
  const [playingLevel, setPlayingLevel] = useState(null)
  const [bandwidth, setBandwidth] = useState(null)
  const [error, setError] = useState(null)
  const [levels, setLevels] = useState([])

  const playing = playingLevel !== null ? levels[playingLevel] : null
  const speed = formatSpeed(bandwidth)
  const maxLevelIndex =
    bandwidth && levels.length ? getBestLevelForBandwidth(levels, bandwidth) : null
  const maxForSpeed = maxLevelIndex !== null ? levelLabel(levels[maxLevelIndex]) : '—'

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      const hls = new Hls({
        startLevel: -1,
        capLevelToPlayerSize: false,
        abrEwmaDefaultEstimate: 50000000,
        abrBandWidthFactor: 0.95,
        abrBandWidthUpFactor: 0.3,
        abrMaxWithRealBitrate: true,
      })
      hlsRef.current = hls

      hls.loadSource(HLS_URL)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(hls.levels)
        setPlayingLevel(hls.loadLevel)
        setBandwidth(Math.round(hls.bandwidthEstimate))
      })

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setPlayingLevel(data.level)
        setBandwidth(Math.round(hls.bandwidthEstimate))
      })

      hls.on(Hls.Events.FRAG_LOADED, () => {
        setBandwidth(Math.round(hls.bandwidthEstimate))
        if (modeRef.current === 'auto') {
          bumpAutoQuality(hls)
        }
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError('HLS playback failed. Run: npm run generate:hls')
        }
      })

      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = HLS_URL
      return
    }

    setError('HLS is not supported in this browser')
  }, [])

  function setAutoQuality() {
    const hls = hlsRef.current
    if (!hls) return
    hls.currentLevel = -1
    modeRef.current = 'auto'
    setMode('auto')
    bumpAutoQuality(hls)
  }

  function setManualQuality(levelIndex) {
    const hls = hlsRef.current
    if (!hls) return
    hls.currentLevel = levelIndex
    modeRef.current = 'manual'
    setMode('manual')
    setPlayingLevel(levelIndex)
  }

  const displayLevels = [...levels]
    .map((level, index) => ({ level, index }))
    .sort((a, b) => b.level.height - a.level.height)

  return (
    <section className="page hls-page">
      <h1>HLS Player</h1>
      <p>
        HTTP Live Streaming — master <code>.m3u8</code> playlist + <code>.ts</code> segments.
        Adaptive bitrate switches between qualities based on network speed.
      </p>

      {error && <p className="error">{error}</p>}

      <div className="hls-player-wrap">
        <video ref={videoRef} className="hls-video" controls playsInline />
      </div>

      <div className="hls-stats">
        <div className="hls-stat">
          <span className="hls-stat-label">Network speed</span>
          <strong className="hls-stat-value">{speed.mbps} Mbps</strong>
          <span className="hls-stat-sub">{speed.kbps ? `${speed.kbps} kbps estimated` : 'measuring...'}</span>
        </div>
        <div className="hls-stat">
          <span className="hls-stat-label">Playing quality</span>
          <strong className="hls-stat-value">{playing ? levelLabel(playing) : '—'}</strong>
          <span className="hls-stat-sub">
            {playing
              ? `${playing.width}×${playing.height} · ${Math.round(playing.bitrate / 1000)} kbps stream`
              : 'loading...'}
          </span>
        </div>
        <div className="hls-stat">
          <span className="hls-stat-label">Mode</span>
          <strong className="hls-stat-value">{mode === 'auto' ? 'Auto' : 'Manual'}</strong>
          <span className="hls-stat-sub">
            {mode === 'auto' && bandwidth
              ? `Speed supports up to ${maxForSpeed}`
              : mode === 'manual'
                ? 'You picked the quality'
                : '—'}
          </span>
        </div>
      </div>

      <p className="hls-now-playing">
        Network <strong>{speed.mbps} Mbps</strong> → playing{' '}
        <strong>{playing ? levelLabel(playing) : '—'}</strong>
        {mode === 'auto' && maxForSpeed !== (playing ? levelLabel(playing) : null) && (
          <> (switching up to {maxForSpeed}…)</>
        )}
      </p>

      <div className="hls-quality">
        <span>Select:</span>
        <button type="button" className={mode === 'auto' ? 'active' : ''} onClick={setAutoQuality}>
          Auto
        </button>
        {displayLevels.map(({ level, index }) => (
          <button
            key={index}
            type="button"
            className={mode === 'manual' && playingLevel === index ? 'active' : ''}
            onClick={() => setManualQuality(index)}
          >
            {levelLabel(level)}
          </button>
        ))}
      </div>

      {levels.length > 0 && (
        <ul className="hls-info">
          {displayLevels.map(({ level, index }) => (
            <li key={index} className={playingLevel === index ? 'playing' : ''}>
              <strong>{levelLabel(level)}</strong> — {level.width}×{level.height} (
              {Math.round(level.bitrate / 1000)} kbps)
              {playingLevel === index && ' ← playing now'}
              {bandwidth && bandwidth >= level.bitrate * 0.85 && playingLevel !== index && ' · speed OK'}
            </li>
          ))}
        </ul>
      )}

      <div className="hls-files">
        <h2>File structure</h2>
        <pre>{`public/hls/
├── master.m3u8      ← master playlist
├── 0/playlist.m3u8  ← 1080p variant
├── 0/segment_000.ts
├── 1/playlist.m3u8  ← 720p variant
├── 2/playlist.m3u8  ← 480p variant
└── 3/playlist.m3u8  ← 360p variant`}</pre>
      </div>
    </section>
  )
}
