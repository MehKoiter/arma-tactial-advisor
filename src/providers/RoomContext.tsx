import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export type ServerFaction = 'US' | 'RUS'

interface RoomContextValue {
  slug: string
  battlemetricsUsId: string | null
  battlemetricsRusId: string | null
  setBattlemetricsId: (faction: ServerFaction, id: string | null) => Promise<void>
  leave: () => void
}

const RoomContext = createContext<RoomContextValue | null>(null)

const PIN_STORAGE_PREFIX = 'lav-room-pin-'

export function getStoredPin(slug: string): string | null {
  return localStorage.getItem(PIN_STORAGE_PREFIX + slug)
}

export function setStoredPin(slug: string, pin: string) {
  localStorage.setItem(PIN_STORAGE_PREFIX + slug, pin)
}

export function clearStoredPin(slug: string) {
  localStorage.removeItem(PIN_STORAGE_PREFIX + slug)
}

function readSlugFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const room = params.get('room')
  return room && /^[a-z0-9-]{3,32}$/i.test(room) ? room.toLowerCase() : null
}

export function setSlugInUrl(slug: string | null) {
  const url = new URL(window.location.href)
  if (slug) url.searchParams.set('room', slug)
  else url.searchParams.delete('room')
  window.history.pushState({}, '', url.toString())
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function RoomProvider({ children }: { children: (slug: string | null) => ReactNode }) {
  const [slug, setSlug] = useState<string | null>(() => readSlugFromUrl())
  const [usId, setUsId] = useState<string | null>(null)
  const [rusId, setRusId] = useState<string | null>(null)

  useEffect(() => {
    function onPop() {
      setSlug(readSlugFromUrl())
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Load IDs when slug changes
  useEffect(() => {
    if (!slug) {
      setUsId(null)
      setRusId(null)
      return
    }
    let cancelled = false
    void supabase
      .from('rooms')
      .select('battlemetrics_us_id, battlemetrics_rus_id')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.warn('[RoomContext] load battlemetrics ids failed:', error.message)
          return
        }
        setUsId((data?.battlemetrics_us_id as string | null) ?? null)
        setRusId((data?.battlemetrics_rus_id as string | null) ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  // Realtime: pick up edits from other clients
  useEffect(() => {
    if (!slug) return
    const channel = supabase
      .channel(`rooms_changes_${slug}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `slug=eq.${slug}` },
        (payload) => {
          const row = payload.new as {
            battlemetrics_us_id?: string | null
            battlemetrics_rus_id?: string | null
          }
          setUsId(row.battlemetrics_us_id ?? null)
          setRusId(row.battlemetrics_rus_id ?? null)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [slug])

  // Keep room alive
  useEffect(() => {
    if (!slug) return
    const touch = () => {
      void supabase
        .from('rooms')
        .update({ last_active_at: new Date().toISOString() })
        .eq('slug', slug)
    }
    touch()
    const id = window.setInterval(touch, 60_000)
    return () => window.clearInterval(id)
  }, [slug])

  const value = useMemo<RoomContextValue | null>(() => {
    if (!slug) return null
    return {
      slug,
      battlemetricsUsId: usId,
      battlemetricsRusId: rusId,
      setBattlemetricsId: async (faction: ServerFaction, id: string | null) => {
        const trimmed = id && id.trim() ? id.trim() : null
        const column = faction === 'US' ? 'battlemetrics_us_id' : 'battlemetrics_rus_id'
        if (faction === 'US') setUsId(trimmed)
        else setRusId(trimmed)
        const { error } = await supabase
          .from('rooms')
          .update({ [column]: trimmed })
          .eq('slug', slug)
        if (error) console.warn('[RoomContext] save', column, 'failed:', error.message)
      },
      leave: () => setSlugInUrl(null),
    }
  }, [slug, usId, rusId])

  return <RoomContext value={value}>{children(slug)}</RoomContext>
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoom must be used inside an active room')
  return ctx
}
