import { useState } from 'react'
import { useRoom, type ServerFaction } from '@/providers/RoomContext'
import { useServerStatus } from '@/hooks/useServerStatus'
import { useOwnership } from '@/state/OwnershipContext'
import styles from './ServerStatusPill.module.css'

function parseBattlemetricsInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const match = trimmed.match(/(\d{4,})/)
  return match ? match[1] : null
}

export function ServerStatusPill() {
  const room = useRoom()
  const us = useServerStatus(room.battlemetricsUsId)
  const rus = useServerStatus(room.battlemetricsRusId)

  const [editing, setEditing] = useState(false)
  const [draftUs, setDraftUs] = useState('')
  const [draftRus, setDraftRus] = useState('')

  function startEdit() {
    setDraftUs(room.battlemetricsUsId ?? '')
    setDraftRus(room.battlemetricsRusId ?? '')
    setEditing(true)
  }

  async function save() {
    const nextUs = parseBattlemetricsInput(draftUs)
    const nextRus = parseBattlemetricsInput(draftRus)
    if (nextUs !== room.battlemetricsUsId) await room.setBattlemetricsId('US', nextUs)
    if (nextRus !== room.battlemetricsRusId) await room.setBattlemetricsId('RUS', nextRus)
    setEditing(false)
  }

  function cancel() {
    setEditing(false)
  }

  if (editing) {
    return (
      <div className={styles.pillEdit}>
        <span className={styles.flag}>🇺🇸</span>
        <input
          type="text"
          className={styles.input}
          placeholder="US BM ID or URL"
          value={draftUs}
          onChange={(e) => setDraftUs(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save()
            if (e.key === 'Escape') cancel()
          }}
        />
        <span className={styles.flag}>🇷🇺</span>
        <input
          type="text"
          className={styles.input}
          placeholder="RUS BM ID or URL"
          value={draftRus}
          onChange={(e) => setDraftRus(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save()
            if (e.key === 'Escape') cancel()
          }}
        />
        <button type="button" className={styles.btn} onClick={save}>
          Save
        </button>
        <button type="button" className={styles.btnGhost} onClick={cancel}>
          Cancel
        </button>
      </div>
    )
  }

  // Nothing linked yet
  if (!room.battlemetricsUsId && !room.battlemetricsRusId) {
    return (
      <div className={styles.pillEdit}>
        <button
          type="button"
          className={styles.btnGhost}
          onClick={startEdit}
          title="Link BattleMetrics servers"
        >
          Link servers
        </button>
      </div>
    )
  }

  // Combined display
  const linked = [
    { faction: 'US' as ServerFaction, flag: '🇺🇸', id: room.battlemetricsUsId, status: us },
    { faction: 'RUS' as ServerFaction, flag: '🇷🇺', id: room.battlemetricsRusId, status: rus },
  ].filter((s) => s.id)

  let totalPlayers = 0
  let totalMax = 0
  let anyOnline = false
  let anyOffline = false
  let anyLoading = false
  const mapNames = new Set<string>()
  const tooltipParts: string[] = []
  for (const s of linked) {
    if (!s.status.status) {
      anyLoading = true
      continue
    }
    totalPlayers += s.status.status.players
    totalMax += s.status.status.maxPlayers
    if (s.status.status.status === 'online') anyOnline = true
    else if (s.status.status.status === 'offline' || s.status.status.status === 'dead')
      anyOffline = true
    if (s.status.status.mapName) mapNames.add(s.status.status.mapName)
    tooltipParts.push(
      `${s.faction}: ${s.status.status.name} (${s.status.status.players}/${s.status.status.maxPlayers})`,
    )
  }

  const dotClass = anyOnline ? styles.dotOnline : anyOffline ? styles.dotOffline : styles.dotUnknown

  const flags = linked.map((s) => s.flag).join('')
  const mapLabel = mapNames.size > 0 ? Array.from(mapNames).join(' / ') : ''

  return (
    <div className={styles.pill} title={tooltipParts.join('  •  ') || 'Loading…'}>
      <span className={styles.flag}>{flags}</span>
      <span className={`${styles.dot} ${dotClass}`} />
      <span className={styles.text}>
        {anyLoading && totalMax === 0 ? (
          <>loading…</>
        ) : (
          <>
            <strong>
              {totalPlayers}/{totalMax}
            </strong>
            {mapLabel ? <> · {mapLabel}</> : null}
          </>
        )}
      </span>
      <button
        type="button"
        className={styles.editBtn}
        onClick={startEdit}
        title="Edit linked servers"
      >
        ⚙
      </button>
    </div>
  )
}

export function ServerRestartBanner() {
  const room = useRoom()
  const { dispatch } = useOwnership()
  const us = useServerStatus(room.battlemetricsUsId)
  const rus = useServerStatus(room.battlemetricsRusId)

  const restarted: { faction: ServerFaction; flag: string; ack: () => void }[] = []
  if (us.restarted) restarted.push({ faction: 'US', flag: '🇺🇸', ack: us.acknowledgeRestart })
  if (rus.restarted) restarted.push({ faction: 'RUS', flag: '🇷🇺', ack: rus.acknowledgeRestart })
  if (restarted.length === 0) return null

  function dismissAll() {
    restarted.forEach((r) => r.ack())
  }
  function resetAll() {
    dispatch({ type: 'RESET_ALL' })
    dismissAll()
  }

  const label = restarted.map((r) => r.flag + ' ' + r.faction).join(' + ')

  return (
    <div className={styles.restartBanner} role="alertdialog" aria-label="Server restarted">
      <span>🔄 Server restart detected ({label}). Reset all CAP ownership?</span>
      <button type="button" className={styles.btn} onClick={resetAll}>
        Reset all
      </button>
      <button type="button" className={styles.btnGhost} onClick={dismissAll}>
        Dismiss
      </button>
    </div>
  )
}
