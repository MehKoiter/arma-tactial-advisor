import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface RoomContextValue {
  slug: string
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

  // React to back/forward + our own pushState dispatch
  useEffect(() => {
    function onPop() { setSlug(readSlugFromUrl()) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Touch last_active_at so this room is kept alive
  useEffect(() => {
    if (!slug) return
    const touch = () => {
      void supabase.from('rooms').update({ last_active_at: new Date().toISOString() }).eq('slug', slug)
    }
    touch()
    const id = window.setInterval(touch, 60_000)
    return () => window.clearInterval(id)
  }, [slug])

  const value = useMemo<RoomContextValue | null>(() => {
    if (!slug) return null
    return {
      slug,
      leave: () => setSlugInUrl(null),
    }
  }, [slug])

  return (
    <RoomContext value={value}>
      {children(slug)}
    </RoomContext>
  )
}

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext)
  if (!ctx) throw new Error('useRoom must be used inside an active room')
  return ctx
}
