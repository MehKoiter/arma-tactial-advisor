/**
 * Dev-only CAP calibration tool.
 *
 * Workflow:
 *   1. Click "Calibrate CAPs" button (bottom-left of map, dev mode only).
 *   2. Click a CAP row to make it active.
 *   3. Click its flag location on the map — the position is recorded.
 *   4. Repeat for all CAPs.
 *   5. Click "Copy output" and paste the result into src/data/everonCAPs.ts.
 */

import { useState, useCallback } from 'react'
import everonCAPs from '@/data/everonCAPs'
import styles from './CalibrationPanel.module.css'

export interface CalibrationCoords {
  capId: string
  gameX: number
  gameZ: number
}

interface Props {
  /** Called when the user activates a CAP to place — parent adds the click handler. */
  onActiveCAPChange: (capId: string | null) => void
  activeCAP: string | null
  coords: CalibrationCoords[]
  onReset: () => void
}

function coordsToOutput(coords: CalibrationCoords[]): string {
  const byId = new globalThis.Map(coords.map((c) => [c.capId, c]))
  return everonCAPs
    .map((cap) => {
      const c = byId.get(cap.id)
      const x = c ? Math.round(c.gameX) : '???'
      const z = c ? Math.round(c.gameZ) : '???'
      return `  cap('${cap.id}', '${cap.name}', '${cap.shortName}', ${x}, ${z}, [${cap.neighbors.map((n) => `'${n}'`).join(', ')}], '${cap.zone}'),`
    })
    .join('\n')
}

export function CalibrationPanel({ onActiveCAPChange, activeCAP, coords, onReset }: Props) {
  const [copied, setCopied] = useState(false)
  const placedIds = new globalThis.Set(coords.map((c) => c.capId))

  const handleCopy = useCallback(() => {
    const text = coordsToOutput(coords)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [coords])

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>📍 CAP Calibration</span>
        <button type="button" className={styles.resetBtn} onClick={onReset}>
          Reset
        </button>
      </div>
      <p className={styles.hint}>
        {activeCAP
          ? `Click the map to place: ${everonCAPs.find((c) => c.id === activeCAP)?.name}`
          : 'Select a CAP below, then click its flag on the map.'}
      </p>
      <ul className={styles.capList}>
        {everonCAPs.map((cap) => {
          const placed = placedIds.has(cap.id)
          const active = activeCAP === cap.id
          return (
            <li key={cap.id}>
              <button
                type="button"
                className={`${styles.capRow} ${active ? styles.active : ''} ${placed ? styles.placed : ''}`}
                onClick={() => onActiveCAPChange(active ? null : cap.id)}
              >
                <span className={styles.capName}>{cap.name}</span>
                <span className={styles.capStatus}>{placed ? '✓' : active ? '…' : '○'}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className={styles.footer}>
        <span className={styles.progress}>
          {placedIds.size} / {everonCAPs.length} placed
        </span>
        <button
          type="button"
          className={styles.copyBtn}
          onClick={handleCopy}
          disabled={coords.length === 0}
        >
          {copied ? 'Copied!' : 'Copy output'}
        </button>
      </div>
      {coords.length > 0 && <pre className={styles.output}>{coordsToOutput(coords)}</pre>}
    </div>
  )
}
