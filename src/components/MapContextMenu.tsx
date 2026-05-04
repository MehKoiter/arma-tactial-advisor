import { useEffect, useRef } from 'react'
import { INDICATOR_CATEGORIES, INDICATOR_TYPES } from '@/data/indicators'
import { RATING_COLORS, RATING_LABELS } from '@/data/positionNotes'
import type { IndicatorCategory } from '@/data/indicators'
import type { Rating } from '@/data/positionNotes'
import styles from './MapContextMenu.module.css'

interface MapContextMenuProps {
  x: number
  y: number
  targetCapName: string | null
  onPlace: (typeId: string) => void
  onRate: (rating: Rating) => void
  onClose: () => void
}

const CATEGORY_LABELS: Record<IndicatorCategory, string> = {
  'fire-support': 'Fire Support',
  'logistics':    'Logistics',
  'recon':        'Recon / Intel',
  'movement':     'Movement',
  'hazard':       'Hazards',
}

export function MapContextMenu({ x, y, targetCapName, onPlace, onRate, onClose }: MapContextMenuProps) {
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

  return (
    <div ref={menuRef} className={styles.menu} style={style} role="menu" aria-label="Map context menu">
      <div className={styles.header}>
        {targetCapName ? `Rate Position vs ${targetCapName}` : 'Rate Position'}
      </div>
      {!targetCapName && (
        <div className={styles.ratingHint}>Select a target CAP first</div>
      )}
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
            onClick={() => { onRate(r); onClose() }}
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
                onClick={() => { onPlace(item.id); onClose() }}
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
