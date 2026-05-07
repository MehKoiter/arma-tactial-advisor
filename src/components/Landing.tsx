import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { setSlugInUrl, setStoredPin } from '@/providers/RoomContext'
import { RoomBrowser, type PublicRoom } from './RoomBrowser'
import styles from './Landing.module.css'

function randomSlug(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export function Landing() {
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createPin, setCreatePin] = useState('')
  const [createBm, setCreateBm] = useState('')
  const [createPublic, setCreatePublic] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [joinSlug, setJoinSlug] = useState('')
  const [joinPin, setJoinPin] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const [browserOpen, setBrowserOpen] = useState(false)

  async function handleCreate() {
    setCreating(true)
    setCreateError(null)
    try {
      // Try a few times in the unlikely case of slug collision
      for (let attempt = 0; attempt < 5; attempt++) {
        const slug = randomSlug()
        const pin = createPin.trim() || null
        const name = createName.trim() || null
        const parseBm = (raw: string) => {
          const t = raw.trim()
          if (!t) return null
          const m = t.match(/(\d{4,})/)
          return m ? m[1] : null
        }
        const battlemetrics_us_id = parseBm(createBm)
        const battlemetrics_rus_id = null
        const { error } = await supabase.from('rooms').insert({
          slug,
          pin,
          name,
          is_public: createPublic,
          battlemetrics_us_id,
          battlemetrics_rus_id,
        })
        if (!error) {
          if (pin) setStoredPin(slug, pin)
          setSlugInUrl(slug)
          return
        }
        // If duplicate slug, retry; otherwise surface
        if (!error.message?.toLowerCase().includes('duplicate')) {
          setCreateError(error.message ?? 'Could not create room')
          return
        }
      }
      setCreateError('Could not generate a unique room code, try again')
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin() {
    const slug = joinSlug.trim().toLowerCase()
    if (!/^[a-z0-9-]{3,32}$/.test(slug)) {
      setJoinError('Invalid room code')
      return
    }
    setJoining(true)
    setJoinError(null)
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('slug, pin')
        .eq('slug', slug)
        .maybeSingle()
      if (error) { setJoinError(error.message); return }
      if (!data) { setJoinError('Room not found'); return }
      if (data.pin) {
        if (joinPin.trim() !== data.pin) { setJoinError('Wrong PIN'); return }
        setStoredPin(slug, data.pin)
      }
      setSlugInUrl(slug)
    } finally {
      setJoining(false)
    }
  }

  function joinPublic() {
    setSlugInUrl('public')
  }

  function handlePickFromBrowser(room: PublicRoom) {
    setJoinSlug(room.slug)
    if (!room.has_pin) setJoinPin('')
    setJoinError(null)
    setBrowserOpen(false)
  }

  return (
    <div className={styles.landing}>
      <h1 className={styles.title}>Arma Reforger Tactical Advisor</h1>
      <p className={styles.subtitle}>Create or join a room to share a map with friends in realtime.</p>

      <div className={styles.cards}>
        <div className={styles.card}>
          <h2>Create a new room</h2>
          <p>Generates a random code that you can share. Set an optional 4-digit PIN for light protection.</p>
          <label>
            Room name (optional)
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. Friday Night Ops"
              maxLength={48}
            />
          </label>
          <label>
            PIN (optional)
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={createPin}
              onChange={(e) => setCreatePin(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 1234"
            />
          </label>
          <label>
            BattleMetrics server (optional)
            <input
              type="text"
              value={createBm}
              onChange={(e) => setCreateBm(e.target.value)}
              placeholder="Server ID or URL"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={createPublic}
              onChange={(e) => setCreatePublic(e.target.checked)}
            />
            <span>List this room in the public browser</span>
          </label>
          {createError && <p className={styles.error}>{createError}</p>}
          <button onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'Create room'}
          </button>
        </div>

        <div className={styles.card}>
          <h2>Join an existing room</h2>
          <p>Enter the room code your friend shared. PIN is required only if the room is protected.</p>
          <label>
            Room code
            <input
              type="text"
              value={joinSlug}
              onChange={(e) => setJoinSlug(e.target.value)}
              placeholder="e.g. abc123"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <label>
            PIN (if required)
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={joinPin}
              onChange={(e) => setJoinPin(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          {joinError && <p className={styles.error}>{joinError}</p>}
          <button onClick={handleJoin} disabled={joining}>
            {joining ? 'Joining…' : 'Join room'}
          </button>
          <button type="button" onClick={() => setBrowserOpen(true)} className={styles.secondaryBtn}>
            Browse public rooms
          </button>
        </div>
      </div>

      <p className={styles.publicLink}>
        Or <a onClick={joinPublic} style={{ cursor: 'pointer' }}>jump into the public room</a>.
      </p>

      {browserOpen && (
        <RoomBrowser onPick={handlePickFromBrowser} onClose={() => setBrowserOpen(false)} />
      )}
    </div>
  )
}
