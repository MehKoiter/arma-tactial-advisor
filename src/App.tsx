import { useEffect, useRef, useState } from 'react'
import { TacticalMap } from './components/TacticalMap'
import { OwnershipPanel } from './components/OwnershipPanel'
import { RecommendationPanel } from './components/RecommendationPanel'
import { ServerStatusPill } from './components/ServerStatusPill'
import { useOwnership } from './state/OwnershipContext'
import { useRoom } from './providers/RoomContext'
import type { VehicleType } from './state/ownershipReducer'
import './App.css'

const REC_WIDTH_KEY = 'lav-rec-panel-width'
const REC_COLLAPSED_KEY = 'lav-rec-panel-collapsed'
const MIN_WIDTH = 160
const MAX_WIDTH = 600
const DEFAULT_WIDTH = 240

const VEHICLE_OPTIONS: Record<'US' | 'RUS', { type: VehicleType; label: string }[]> = {
  US: [
    { type: 'LAV',             label: '🚗 LAV-25' },
    { type: 'ATTACK_HELO',    label: '🚁 AH-1Z Viper' },
    { type: 'TRANSPORT_HELO', label: '🚁 UH-1Y Venom' },
  ],
  RUS: [
    { type: 'LAV',             label: '🚗 BTR-82A' },
    { type: 'ATTACK_HELO',    label: '🚁 Mi-24 Hind' },
    { type: 'TRANSPORT_HELO', label: '🚁 Mi-8 Hip' },
  ],
}

function App() {
  const { state, dispatch } = useOwnership()
  const { playerTeam, vehicleType } = state
  const { slug: roomSlug, leave: leaveRoom } = useRoom()

  const [panelWidth, setPanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem(REC_WIDTH_KEY)
    return saved ? Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Number(saved))) : DEFAULT_WIDTH
  })
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    localStorage.getItem(REC_COLLAPSED_KEY) === 'true'
  )
  const panelWidthRef = useRef(panelWidth)
  panelWidthRef.current = panelWidth

  function startResize(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = panelWidthRef.current
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)

    function onMove(ev: PointerEvent) {
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth + startX - ev.clientX))
      setPanelWidth(next)
      localStorage.setItem(REC_WIDTH_KEY, String(next))
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function toggleCollapse() {
    setCollapsed((v) => {
      localStorage.setItem(REC_COLLAPSED_KEY, String(!v))
      return !v
    })
  }

  useEffect(() => {
    document.documentElement.dataset.team = playerTeam
  }, [playerTeam])

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>LAV+ Tactical Advisor � Everon</h1>
        <span className="room-pill" title="Click to copy share link">
          <button
            className="room-pill-slug"
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.set('room', roomSlug)
              void navigator.clipboard.writeText(url.toString())
            }}
            title="Copy share link"
          >
            Room: <strong>{roomSlug}</strong>
          </button>
          <button className="room-pill-leave" onClick={leaveRoom} title="Leave room">×</button>
        </span>
        <ServerStatusPill />
        <button
          className={`team-toggle team-toggle--${playerTeam.toLowerCase()}`}
          onClick={() => dispatch({ type: 'SET_PLAYER_TEAM', team: playerTeam === 'US' ? 'RUS' : 'US' })}
          title="Switch player team"
        >
          Playing as: <strong>{playerTeam}</strong>
        </button>
        <select
          className="vehicle-select"
          value={vehicleType}
          onChange={(e) => dispatch({ type: 'SET_VEHICLE_TYPE', vehicleType: e.target.value as VehicleType })}
          aria-label="Select vehicle"
        >
          {VEHICLE_OPTIONS[playerTeam].map((v) => (
            <option key={v.type} value={v.type}>{v.label}</option>
          ))}
        </select>
      </header>
      <main className="app-main">
        <OwnershipPanel />
        <TacticalMap />
        <div className="rec-resize-handle" onPointerDown={startResize}>
          <button
            className="rec-collapse-btn"
            onClick={toggleCollapse}
            title={collapsed ? 'Expand recommendations' : 'Collapse recommendations'}
            aria-label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '◀' : '▶'}
          </button>
        </div>
        <div
          className="rec-panel-wrapper"
          style={{ width: collapsed ? 0 : panelWidth }}
        >
          <RecommendationPanel />
        </div>
      </main>
    </div>
  )
}

export default App
