import { useEffect, useRef } from 'react'
import { INDICATOR_CATEGORIES, INDICATOR_TYPES } from '@/data/indicators'
import { RATING_COLORS, RATING_LABELS } from '@/data/positionNotes'
import type { IndicatorCategory } from '@/data/indicators'
import type { Rating } from '@/data/positionNotes'
import type { MobFaction } from '@/data/mobs'
import { MOB_COLORS } from '@/data/mobs'
import styles from './MapContextMenu.module.css'

interface MapContextMenuProps {
  x: number
  y: number
  targetCapName: string | null
  playerTeam: MobFaction
  hasFriendlyMob: boolean
  hasEnemyMob: boolean
  onPlace: (typeId: string) => void
  onRate: (rating: Rating) => void
  onSetMob: (faction: MobFaction) => void
  onClearMob: (faction: MobFaction) => void
  onClose: () => void
}

const CATEGORY_LABELS: Record<IndicatorCategory, string> = {
  'fire-support': 'Fire Support',
  logistics: 'Logistics',
  recon: 'Recon / Intel',
  movement: 'Movement',
  hazard: 'Hazards',
}

export function MapContextMenu({
  x,
  y,
  targetCapName,
  playerTeam,
  hasFriendlyMob,
  hasEnemyMob,
  onPlace,
  onRate,
  onSetMob,
  onClearMob,
  onClose,
}: MapContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleDown(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('touchstart', handleDown)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('touchstart', handleDown)
    }
  }, [onClose])

  // Prevent the menu from rendering off-screen
  const style: React.CSSProperties = {
    left: x,
    top: y,
  }

  const enemyTeam: MobFaction = playerTeam === 'US' ? 'RUS' : 'US'

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={style}
      role="menu"
      aria-label="Map context menu"
    >
      <div className={styles.header}>Main Operating Base (MOB)</div>
      <button
        type="button"
        role="menuitem"
        className={styles.item}
        style={{ '--accent': MOB_COLORS[playerTeam] } as React.CSSProperties}
        onClick={() => {
          onSetMob(playerTeam)
          onClose()
        }}
      >
        <span className={styles.itemIcon}>★</span>
        <span>
          {hasFriendlyMob ? `Move ${playerTeam} MOB here` : `Set ${playerTeam} (my) MOB here`}
        </span>
      </button>
      <button
        type="button"
        role="menuitem"
        className={styles.item}
        style={{ '--accent': MOB_COLORS[enemyTeam] } as React.CSSProperties}
        onClick={() => {
          onSetMob(enemyTeam)
          onClose()
        }}
      >
        <span className={styles.itemIcon}>★</span>
        <span>
          {hasEnemyMob
            ? `Move ${enemyTeam} (enemy) MOB here`
            : `Mark ${enemyTeam} (enemy) MOB here`}
        </span>
      </button>
      {hasFriendlyMob && (
        <button
          type="button"
          role="menuitem"
          className={styles.item}
          style={{ '--accent': '#888' } as React.CSSProperties}
          onClick={() => {
            onClearMob(playerTeam)
            onClose()
          }}
        >
          <span className={styles.itemIcon}>✕</span>
          <span>Clear {playerTeam} (my) MOB</span>
        </button>
      )}
      {hasEnemyMob && (
        <button
          type="button"
          role="menuitem"
          className={styles.item}
          style={{ '--accent': '#888' } as React.CSSProperties}
          onClick={() => {
            onClearMob(enemyTeam)
            onClose()
          }}
        >
          <span className={styles.itemIcon}>✕</span>
          <span>Clear {enemyTeam} (enemy) MOB</span>
        </button>
      )}
      <div className={styles.divider} />
      <div className={styles.header}>
        {targetCapName ? `Rate Position vs ${targetCapName}` : 'Rate Position'}
      </div>
      {!targetCapName && <div className={styles.ratingHint}>Select a target CAP first</div>}
      <div className={styles.ratingRow}>
        {([1, 2, 3, 4, 5] as Rating[]).map((r) => (
          <button
            key={r}
            type="button"
            role="menuitem"
            className={styles.ratingBtn}
            style={{ '--rating-color': RATING_COLORS[r] } as React.CSSProperties}
            title={RATING_LABELS[r]}
            aria-label={`Rate ${r} — ${RATING_LABELS[r]}`}
            disabled={!targetCapName}
            onClick={() => {
              onRate(r)
              onClose()
            }}
          >
            <span className={styles.ratingNum}>{r}</span>
            <span className={styles.ratingLabel}>{RATING_LABELS[r]}</span>
          </button>
        ))}
      </div>
      <div className={styles.divider} />
      <div className={styles.header}>Add Indicator</div>
      {INDICATOR_CATEGORIES.map((cat) => {
        const items = INDICATOR_TYPES.filter((t) => t.category === cat.id)
        return (
          <div key={cat.id} className={styles.category}>
            <div className={styles.categoryLabel}>{CATEGORY_LABELS[cat.id]}</div>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={styles.item}
                style={{ '--accent': item.color } as React.CSSProperties}
                onClick={() => {
                  onPlace(item.id)
                  onClose()
                }}
              >
                <span className={styles.itemIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
