import { useEffect, useRef, useState } from 'react'

export interface ServerStatus {
  /** Display name as reported by the game server. */
  name: string
  /** 'online' | 'offline' | 'dead' | 'invalid' */
  status: string
  players: number
  maxPlayers: number
  /** Map / mission name when present. */
  mapName: string | null
  /** Last update timestamp (ISO). */
  updatedAt: string
}

export interface ServerStatusState {
  status: ServerStatus | null
  loading: boolean
  error: string | null
  /** Set to true once on a transition from offline → online (server restart heuristic). */
  restarted: boolean
  /** Acknowledge / dismiss the restart event. */
  acknowledgeRestart: () => void
}

interface BMResponse {
  data?: {
    attributes?: {
      name?: string
      status?: string
      players?: number
      maxPlayers?: number
      details?: {
        map?: string
        scenarioId?: string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [key: string]: any
      }
    }
  }
}

const POLL_INTERVAL_MS = 60_000

/**
 * Polls the public BattleMetrics REST API for a server's status. No auth
 * required for read-only queries; the game server is never contacted directly.
 */
export function useServerStatus(battlemetricsId: string | null): ServerStatusState {
  const [status, setStatus] = useState<ServerStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [restarted, setRestarted] = useState(false)
  const prevStatusRef = useRef<string | null>(null)

  useEffect(() => {
    if (!battlemetricsId) {
      setStatus(null)
      setError(null)
      setLoading(false)
      prevStatusRef.current = null
      return
    }

    let cancelled = false
    let timer: number | null = null

    async function fetchOnce() {
      setLoading(true)
      try {
        const url = `https://api.battlemetrics.com/servers/${encodeURIComponent(battlemetricsId!)}`
        const res = await fetch(url, { headers: { accept: 'application/json' } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json: BMResponse = await res.json()
        if (cancelled) return
        const a = json.data?.attributes ?? {}
        const next: ServerStatus = {
          name: a.name ?? 'Unknown server',
          status: a.status ?? 'unknown',
          players: a.players ?? 0,
          maxPlayers: a.maxPlayers ?? 0,
          mapName: a.details?.map ?? a.details?.scenarioId ?? null,
          updatedAt: new Date().toISOString(),
        }
        const prev = prevStatusRef.current
        // Restart heuristic: previous was offline (or dead) and we're now online.
        if (prev && prev !== 'online' && next.status === 'online') {
          setRestarted(true)
        }
        prevStatusRef.current = next.status
        setStatus(next)
        setError(null)
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'fetch failed'
        setError(msg)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchOnce()
    timer = window.setInterval(fetchOnce, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timer != null) window.clearInterval(timer)
    }
  }, [battlemetricsId])

  return {
    status,
    loading,
    error,
    restarted,
    acknowledgeRestart: () => setRestarted(false),
  }
}
