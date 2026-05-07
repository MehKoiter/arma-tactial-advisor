import { useMemo } from 'react'
import { useOwnership } from '@/state/OwnershipContext'
import { useInputProvider } from '@/providers/InputProviderContext'
import everonCAPs from '@/data/everonCAPs'
import type { Owner } from '@/state/ownershipReducer'
import { CAPBadge } from './CAPBadge'
import styles from './OwnershipPanel.module.css'

export function OwnershipPanel() {
  const { state, dispatch } = useOwnership()
  const { activeKey, setActiveKey, isLive } = useInputProvider()

  const enemyTeam: Owner = state.playerTeam === 'US' ? 'RUS' : 'US'

  const groups = useMemo(() => {
    const sorted = [...everonCAPs].sort((a, b) => b.coords.lat - a.coords.lat)
    const friendly = sorted.filter((c) => (state.ownership[c.id] ?? 'neutral') === state.playerTeam)
    const enemy = sorted.filter((c) => (state.ownership[c.id] ?? 'neutral') === enemyTeam)
    const neutral = sorted.filter((c) => (state.ownership[c.id] ?? 'neutral') === 'neutral')
    return [
      {
        key: 'friendly',
        label: `${state.playerTeam} (Friendly)`,
        caps: friendly,
        modifier: styles.groupFriendly,
      },
      { key: 'enemy', label: `${enemyTeam} (Enemy)`, caps: enemy, modifier: styles.groupEnemy },
      { key: 'neutral', label: 'Neutral', caps: neutral, modifier: styles.groupNeutral },
    ]
  }, [state.ownership, state.playerTeam, enemyTeam])

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
        {isLive && (
          <span className={styles.liveIndicator} aria-label="Live feed active">
            ● LIVE
          </span>
        )}
      </div>

      <div className={styles.groups}>
        {groups.map((g) => (
          <section key={g.key} className={`${styles.group} ${g.modifier}`}>
            <h3 className={styles.groupHeader}>
              {g.label} <span className={styles.groupCount}>{g.caps.length}</span>
            </h3>
            <div className={styles.grid}>
              {g.caps.map((cap) => {
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
                    isEnemy={owner === enemyTeam}
                    isAttacking={state.attacking.has(cap.id)}
                    hasRadio={state.radio.has(cap.id)}
                    isHQ={state.hq.has(cap.id)}
                    dispatch={dispatch}
                  />
                )
              })}
              {g.caps.length === 0 && <p className={styles.empty}>None</p>}
            </div>
          </section>
        ))}
      </div>
    </aside>
  )
}
