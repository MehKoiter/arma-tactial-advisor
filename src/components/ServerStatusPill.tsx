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

const FACTION_FLAG: Record<ServerFaction, string> = { US: '🇺🇸', RUS: '🇷🇺' }
const FACTION_LABEL: Record<ServerFaction, string> = { US: 'US', RUS: 'RUS' }

interface PillProps { faction: ServerFaction }

export function ServerStatusPill({ faction }: PillProps) {
  const room = useRoom()
  const id = faction === 'US' ? room.battlemetricsUsId : room.battlemetricsRusId
  const { status, error } = useServerStatus(id)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function startEdit() {
    setDraft(id ?? '')
    setEditing(true)
  }

  async function save() {
    const parsed = parseBattlemetricsInput(draft)
    await room.setBattlemetricsId(faction, parsed)
    setEditing(false)
  }

  function cancel() {
    setEditing(false)
  }

  if (editing || !id) {
    return (
      <div className={styles.pillEdit}>
        <span className={styles.flag}>{FACTION_FLAG[faction]}</span>
        <input
          type="text"
          className={styles.input}
          placeholder={`${FACTION_LABEL[faction]} BM ID or URL`}
          value={editing ? draft : ''}
          onChange={(e) => { setEditing(true); setDraft(e.target.value) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save()
            if (e.key === 'Escape') cancel()
          }}
        />
        {editing ? (
          <>
            <button type="button" className={styles.btn} onClick={save}>Save</button>
            <button type="button" className={styles.btnGhost} onClick={cancel}>Cancel</button>
          </>
        ) : (
          <button type="button" className={styles.btnGhost} onClick={startEdit} title={`Link ${FACTION_LABEL[faction]} server`}>Link</button>
        )}
      </div>
    )
  }

  const dotClass = status?.status === 'online'
    ? styles.dotOnline
    : status?.status === 'offline' || status?.status === 'dead'
      ? styles.dotOffline
      : styles.dotUnknown

  return (
    <div className={styles.pill} title={status?.name ?? 'Loading…'}>
      <span className={styles.flag}>{FACTION_FLAG[faction]}</span>
      <span className={`${styles.dot} ${dotClass}`} />
      <span className={styles.text}>
        {status ? (
          <>
            <strong>{status.players}/{status.maxPlayers}</strong>
            {status.mapName ? <> · {status.mapName}</> : null}
          </>
        ) : error ? (
          <>error</>
        ) : (
          <>loading…</>
        )}
      </span>
      <button type="button" className={styles.editBtn} onClick={startEdit} title={`Edit ${FACTION_LABEL[faction]} server`}>⚙</button>
    </div>
  )
}

export function ServerRestartBanner() {
  const room = useRoom()
  const { dispatch } = useOwnership()
  const us = useServerStatus(room.battlemetricsUsId)
  const rus = useServerStatus(room.battlemetricsRusId)

  const restartedFactions: ServerFaction[] = []
  if (us.restarted) restartedFactions.push('US')
  if (rus.restarted) restartedFactions.push('RUS')
  if (restartedFactions.length === 0) return null

  function dismissAll() {
    if (us.restarted) us.acknowledgeRestart()
    if (rus.restarted) rus.acknowledgeRestart()
  }

  function resetAll() {
    dispatch({ type: 'RESET_ALL' })
    dismissAll()
  }

  const label = restartedFactions.map((f) => FACTION_FLAG[f] + ' ' + FACTION_LABEL[f]).join(' + ')

  return (
    <div className={styles.restartBanner} role="alertdialog" aria-label="Server restarted">
      <span>🔄 Server restart detected ({label}). Reset all CAP ownership?</span>
      <button type="button" className={styles.btn} onClick={resetAll}>Reset all</button>
      <button type="button" className={styles.btnGhost} onClick={dismissAll}>Dismiss</button>
    </div>
  )
}
