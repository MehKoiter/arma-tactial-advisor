import { useOwnership } from '@/state/OwnershipContext'
import { useInputProvider } from '@/providers/InputProviderContext'
import everonCAPs from '@/data/everonCAPs'
import { CAPBadge } from './CAPBadge'
import styles from './OwnershipPanel.module.css'

export function OwnershipPanel() {
  const { state, dispatch } = useOwnership()
  const { activeKey, setActiveKey, isLive } = useInputProvider()

  return (
    <aside className={styles.panel} aria-label="CAP ownership panel">
      <div className={styles.header}>
        <h2 className={styles.title}>CAP Ownership</h2>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={() => dispatch({ type: 'RESET_ALL' })}
            disabled={isLive}
            title="Reset all CAPs to neutral"
          >
            Reset All
          </button>
        </div>
      </div>

      <div className={styles.providerRow}>
        <span className={styles.providerLabel}>Input mode:</span>
        <select
          className={styles.providerSelect}
          value={activeKey}
          onChange={(e) => setActiveKey(e.target.value as typeof activeKey)}
          aria-label="Input provider selection"
        >
          <option value="manual">Manual</option>
          <option value="mock-telemetry">Mock Telemetry (demo)</option>
        </select>
        {isLive && <span className={styles.liveIndicator} aria-label="Live feed active">● LIVE</span>}
      </div>

      <div className={styles.grid}>
        {[...everonCAPs].sort((a, b) => b.coords.lat - a.coords.lat).map((cap) => {
          const owner = state.ownership[cap.id] ?? 'neutral'
          return (
            <CAPBadge
              key={cap.id}
              capId={cap.id}
              name={cap.name}
              shortName={cap.shortName}
              owner={owner}
              isLavPosition={state.lavPosition === cap.id}
              isUnderAttack={state.underAttack.has(cap.id)}
              isFriendly={owner === state.playerTeam}
              isEnemy={owner === (state.playerTeam === 'US' ? 'RUS' : 'US')}
              isAttacking={state.attacking.has(cap.id)}
              onCycle={() => dispatch({ type: 'CYCLE_OWNER', capId: cap.id })}
              onSetLav={() =>
                dispatch({
                  type: 'SET_LAV_POSITION',
                  capId: state.lavPosition === cap.id ? null : cap.id,
                })
              }
              onToggleAttack={() => dispatch({ type: 'TOGGLE_UNDER_ATTACK', capId: cap.id })}
              onToggleAttacking={() => dispatch({ type: 'TOGGLE_ATTACKING', capId: cap.id })}
            />
          )
        })}
      </div>
    </aside>
  )
}
