import { useOwnership } from '@/state/OwnershipContext'
import { useRecommendation } from '@/providers/RecommendationContext'
import { INDICATOR_CATEGORIES, INDICATOR_TYPES } from '@/data/indicators'
import styles from './RecommendationPanel.module.css'

const VEHICLE_HINTS: Record<string, string> = {
  LAV: 'Set LAV position (▲) to enable route scoring.',
  ATTACK_HELO: 'Set spawn position (▲) to enable range scoring.',
  TRANSPORT_HELO: 'Set spawn position (▲) to enable range scoring.',
  INFANTRY: 'Set squad position (▲) to enable on-foot range scoring.',
}

const EMPTY_MESSAGES: Record<string, { primary: string; secondary: string }> = {
  LAV: {
    primary: 'No friendly CAPs. Mark some CAPs as friendly.',
    secondary: 'No frontline targets. Ensure friendly CAPs border enemy territory.',
  },
  ATTACK_HELO: { primary: 'No enemy targets. Mark some CAPs as enemy.', secondary: '' },
  TRANSPORT_HELO: {
    primary: 'No friendly CAPs to resupply. Mark some CAPs as friendly.',
    secondary:
      'No active assaults. Mark enemy CAPs as being attacked (⚔) to see reinforce targets.',
  },
  INFANTRY: {
    primary: 'No friendly CAPs to garrison. Mark some CAPs as friendly.',
    secondary: 'No targets in foot range. Move closer to a contested or neutral CAP.',
  },
}

export function RecommendationPanel() {
  const { state } = useOwnership()
  const {
    tab,
    setTab,
    primaryList,
    secondaryList,
    primaryLabel,
    secondaryLabel,
    showSupplies,
    setShowSupplies,
  } = useRecommendation()
  const { vehicleType } = state

  const isSecondaryTab = tab === 'secondary'
  const activeList = isSecondaryTab ? secondaryList : primaryList
  const itemStyle = isSecondaryTab ? `${styles.item} ${styles.itemAttack}` : styles.item
  const rankStyle = isSecondaryTab ? `${styles.rank} ${styles.rankAttack}` : styles.rank
  const scoreStyle = isSecondaryTab ? `${styles.score} ${styles.scoreAttack}` : styles.score
  const emptyMsg = isSecondaryTab
    ? EMPTY_MESSAGES[vehicleType]?.secondary
    : EMPTY_MESSAGES[vehicleType]?.primary

  return (
    <aside className={styles.panel} aria-label="Tactical recommendations">
      <h2 className={styles.title}>Recommendations</h2>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${!isSecondaryTab ? styles.tabActive : ''}`}
          onClick={() => setTab('primary')}
        >
          {primaryLabel}
        </button>
        {secondaryLabel && (
          <button
            type="button"
            className={`${styles.tab} ${isSecondaryTab ? styles.tabActive : ''}`}
            onClick={() => setTab('secondary')}
          >
            {secondaryLabel}
          </button>
        )}
      </div>

      {!state.lavPosition && <p className={styles.hint}>{VEHICLE_HINTS[vehicleType]}</p>}
      {activeList.length === 0 && emptyMsg && <p className={styles.empty}>{emptyMsg}</p>}

      <ol className={styles.list}>
        {activeList.map((s, i) => (
          <li key={s.cap.id} className={itemStyle}>
            <div className={rankStyle}>#{i + 1}</div>
            <div className={styles.content}>
              <div className={styles.capName}>{s.cap.name}</div>
              <div className={scoreStyle}>{s.totalScore.toFixed(2)}</div>
              <ul className={styles.rationale}>
                {s.rationale.map((r, j) => (
                  <li key={j}>{r}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>

      <div className={styles.indicatorKey}>
        <div className={styles.indicatorKeyHeader}>
          <h3 className={styles.indicatorKeyTitle}>Indicator Key</h3>
          <button
            type="button"
            className={`${styles.supplyToggle} ${showSupplies ? styles.supplyToggleActive : ''}`}
            onClick={() => setShowSupplies(!showSupplies)}
            title={showSupplies ? 'Hide supply depots on map' : 'Show supply depots on map'}
          >
            📦 {showSupplies ? 'Supplies ON' : 'Supplies OFF'}
          </button>
        </div>
        {INDICATOR_CATEGORIES.map((cat) => (
          <div key={cat.id} className={styles.indicatorKeyCat}>
            <div className={styles.indicatorKeyCatLabel}>{cat.label}</div>
            {INDICATOR_TYPES.filter((t) => t.category === cat.id).map((t) => (
              <div
                key={t.id}
                className={styles.indicatorKeyRow}
                style={{ '--ind-color': t.color } as React.CSSProperties}
              >
                <span className={styles.indicatorKeyIcon}>{t.icon}</span>
                <span className={styles.indicatorKeyLabel}>{t.label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}
