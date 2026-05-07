import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import styles from './RoomBrowser.module.css'

const ACTIVE_WINDOW_MS = 5 * 60 * 1000

export interface PublicRoom {
  slug: string
  name: string | null
  has_pin: boolean
  battlemetrics_us_id: string | null
  battlemetrics_rus_id: string | null
  last_active_at: string | null
  created_at: string | null
}

interface RoomBrowserProps {
  onPick: (room: PublicRoom) => void
  onClose: () => void
}

function formatRelative(iso: string | null, now: number): string {
  if (!iso) return 'unknown'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return 'unknown'
  const diff = Math.max(0, now - t)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

export function RoomBrowser({ onPick, onClose }: RoomBrowserProps) {
  const [rooms, setRooms] = useState<PublicRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [now, setNow] = useState(() => Date.now())

  // Tick once a second so "active" status and timestamps stay fresh
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Initial fetch
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void supabase
      .from('public_rooms')
      .select('slug, name, has_pin, battlemetrics_us_id, battlemetrics_rus_id, last_active_at, created_at')
      .order('last_active_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setRooms((data ?? []) as PublicRoom[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Realtime updates: refetch on any change to public rooms.
  // (The view itself can't be subscribed to, so we listen on the base table
  // and refilter on the client.)
  useEffect(() => {
    const channel = supabase
      .channel('public_rooms_browser')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        () => {
          void supabase
            .from('public_rooms')
            .select('slug, name, has_pin, battlemetrics_us_id, battlemetrics_rus_id, last_active_at, created_at')
            .order('last_active_at', { ascending: false })
            .limit(200)
            .then(({ data, error }) => {
              if (error) return
              setRooms((data ?? []) as PublicRoom[])
            })
        },
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return rooms
    return rooms.filter((r) =>
      r.slug.toLowerCase().includes(q) || (r.name ?? '').toLowerCase().includes(q),
    )
  }, [rooms, filter])

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <header className={styles.header}>
          <h2>Browse public rooms</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">×</button>
        </header>

        <input
          className={styles.search}
          placeholder="Filter by name or code…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          autoFocus
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.listWrap}>
          {loading ? (
            <p className={styles.empty}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p className={styles.empty}>
              {rooms.length === 0 ? 'No public rooms yet.' : 'No rooms match your filter.'}
            </p>
          ) : (
            <ul className={styles.list}>
              {filtered.map((room) => {
                const lastTs = room.last_active_at ? new Date(room.last_active_at).getTime() : 0
                const active = lastTs > 0 && now - lastTs < ACTIVE_WINDOW_MS
                return (
                  <li key={room.slug}>
                    <button
                      type="button"
                      className={`${styles.row} ${active ? styles.active : styles.inactive}`}
                      onClick={() => onPick(room)}
                      title={active ? 'Active in the last 5 minutes' : 'Inactive'}
                    >
                      <span
                        className={`${styles.dot} ${active ? styles.dotActive : styles.dotInactive}`}
                        aria-hidden
                      />
                      <span className={styles.nameCol}>
                        <span className={styles.name}>
                          {room.name?.trim() || room.slug}
                        </span>
                        {room.name?.trim() && (
                          <span className={styles.slug}>{room.slug}</span>
                        )}
                      </span>
                      <span className={styles.flags}>
                        {room.battlemetrics_us_id && <span title="US server set">🇺🇸</span>}
                        {room.battlemetrics_rus_id && <span title="RUS server set">🇷🇺</span>}
                      </span>
                      <span className={styles.lock}>{room.has_pin ? '🔒' : ''}</span>
                      <span className={styles.time}>{formatRelative(room.last_active_at, now)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
