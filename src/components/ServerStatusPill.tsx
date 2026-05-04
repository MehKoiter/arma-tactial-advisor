import { useState } from 'react'
import { useRoom } from '@/providers/RoomContext'
import { useServerStatus } from '@/hooks/useServerStatus'
import { useOwnership } from '@/state/OwnershipContext'
import styles from './ServerStatusPill.module.css'

function parseBattlemetricsInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Accept either a bare numeric ID or a battlemetrics URL
  const match = trimmed.match(/(\d{4,})/)
  return match ? match[1] : null
}

export function ServerStatusPill() {
  const { battlemetricsId, setBattlemetricsId } = useRoom()
  const { dispatch } = useOwnership()
  const { status, error, restarted, acknowledgeRestart } = useServerStatus(battlemetricsId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function startEdit() {
    setDraft(battlemetricsId ?? '')
    setEditing(true)
  }

  async function save() {
    const id = parseBattlemetricsInput(draft)
    await setBattlemetricsId(id)
    setEditing(false)
  }

  function cancel() {
    setEditing(false)
  }

  if (editing || !battlemetricsId) {
    return (
      <div className={styles.pillEdit}>
        <input
          type="text"
          className={styles.input}
          placeholder="BattleMetrics ID (e.g. 36444485)"
          value={editing ? draft : ''}
          onChange={(e) => { setEditing(true); setDraft(e.target.value) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void save()
            if (e.key === 'Escape') cancel()
          }}
        />
        {editing && (
          <>
            <button type="button" className={styles.btn} onClick={save}>Save</button>
            <button type="button" className={styles.btnGhost} onClick={cancel}>Cancel</button>
          </>
        )}
        {!editing && (
          <button type="button" className={styles.btnGhost} onClick={startEdit} title="Link a server">Link server</button>
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
    <>
      <div className={styles.pill} title={status?.name ?? 'Loading…'}>
        <span className={`${styles.dot} ${dotClass}`} />
        <span className={styles.text}>
          {status ? (
            <>
              <strong>{status.players}/{status.maxPlayers}</strong>
              {status.mapName ? <> · {status.mapName}</> : null}
            </>
          ) : error ? (
            <>error: {error}</>
          ) : (
            <>loading…</>
          )}
        </span>
        <button type="button" className={styles.editBtn} onClick={startEdit} title="Edit linked server">⚙</button>
      </div>

      {restarted && (
        <div className={styles.restartBanner} role="alertdialog" aria-label="Server restarted">
          <span>🔄 Server appears to have restarted. Reset all CAP ownership?</span>
          <button
            type="button"
            className={styles.btn}
            onClick={() => {
              dispatch({ type: 'RESET_ALL' })
              acknowledgeRestart()
            }}
          >
            Reset all
          </button>
          <button type="button" className={styles.btnGhost} onClick={acknowledgeRestart}>
            Dismiss
          </button>
        </div>
      )}
    </>
  )
}
