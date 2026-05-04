import { useEffect } from 'react'
import { TacticalMap } from './components/TacticalMap'
import { OwnershipPanel } from './components/OwnershipPanel'
import { RecommendationPanel } from './components/RecommendationPanel'
import { useOwnership } from './state/OwnershipContext'
import type { VehicleType } from './state/ownershipReducer'
import './App.css'

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

  useEffect(() => {
    document.documentElement.dataset.team = playerTeam
  }, [playerTeam])

  return (
    <div className="app-layout">
      <header className="app-header">
        <h1>LAV+ Tactical Advisor � Everon</h1>
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
        <RecommendationPanel />
      </main>
    </div>
  )
}

export default App
