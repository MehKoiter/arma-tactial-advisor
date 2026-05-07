import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRoom } from '@/providers/RoomContext'
import type { MobFaction, MobMarker } from '@/data/mobs'

interface MobRow {
  room_id: string
  faction: MobFaction
  lng: number
  lat: number
}

function rowToMob(r: MobRow): MobMarker {
  return { faction: r.faction, lng: r.lng, lat: r.lat }
}

export interface MobsState {
  mobs: Partial<Record<MobFaction, MobMarker>>
  loaded: boolean
  setMob: (faction: MobFaction, lng: number, lat: number) => void
  clearMob: (faction: MobFaction) => void
}

export function useMobs(): MobsState {
  const { slug: roomId } = useRoom()
  const [mobs, setMobs] = useState<Partial<Record<MobFaction, MobMarker>>>({})
  const [loaded, setLoaded] = useState(false)

  // Initial fetch
  useEffect(() => {
    supabase
      .from('mobs')
      .select('*')
      .eq('room_id', roomId)
      .then(({ data, error }) => {
        if (error) {
          console.warn('[useMobs] fetch failed:', error.message)
        } else if (data) {
          const next: Partial<Record<MobFaction, MobMarker>> = {}
          for (const r of data as MobRow[]) next[r.faction] = rowToMob(r)
          setMobs(next)
        }
        setLoaded(true)
      })
  }, [roomId])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`mobs_changes_${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mobs', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const old = payload.old as Partial<MobRow>
            if (old.faction) {
              setMobs((prev) => {
                const next = { ...prev }
                delete next[old.faction!]
                return next
              })
            }
          } else {
            const row = payload.new as MobRow
            setMobs((prev) => ({ ...prev, [row.faction]: rowToMob(row) }))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  const setMob = useCallback(
    async (faction: MobFaction, lng: number, lat: number) => {
      // Optimistic
      setMobs((prev) => ({ ...prev, [faction]: { faction, lng, lat } }))
      await supabase
        .from('mobs')
        .upsert({ room_id: roomId, faction, lng, lat }, { onConflict: 'room_id,faction' })
    },
    [roomId],
  )

  const clearMob = useCallback(
    async (faction: MobFaction) => {
      setMobs((prev) => {
        const next = { ...prev }
        delete next[faction]
        return next
      })
      await supabase.from('mobs').delete().eq('room_id', roomId).eq('faction', faction)
    },
    [roomId],
  )

  return { mobs, loaded, setMob, clearMob }
}
