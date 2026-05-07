import { useState, useEffect, useCallback } from 'react'
import type { PlacedIndicator } from '@/data/indicators'
import { supabase } from '@/lib/supabase'
import { useRoom } from '@/providers/RoomContext'

// Row shape in Supabase (snake_case)
interface IndicatorRow {
  uid: string
  type_id: string
  lng: number
  lat: number
  room_id: string
}

function rowToIndicator(r: IndicatorRow): PlacedIndicator {
  return { uid: r.uid, typeId: r.type_id, lng: r.lng, lat: r.lat }
}

export function useIndicators() {
  const { slug: roomId } = useRoom()
  const [indicators, setIndicators] = useState<PlacedIndicator[]>([])
  const [loaded, setLoaded] = useState(false)

  // Initial fetch
  useEffect(() => {
    supabase
      .from('indicators')
      .select('*')
      .eq('room_id', roomId)
      .then(({ data }) => {
        if (data) setIndicators((data as IndicatorRow[]).map(rowToIndicator))
        setLoaded(true)
      })
  }, [roomId])

  // Realtime subscription — sync inserts/deletes from other clients
  useEffect(() => {
    const channel = supabase
      .channel(`indicators_changes_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'indicators', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const ind = rowToIndicator(payload.new as IndicatorRow)
          setIndicators((prev) => (prev.some((i) => i.uid === ind.uid) ? prev : [...prev, ind]))
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'indicators', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const uid = (payload.old as { uid: string }).uid
          setIndicators((prev) => prev.filter((i) => i.uid !== uid))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  const addIndicator = useCallback(
    async (typeId: string, lng: number, lat: number) => {
      const uid = crypto.randomUUID()
      // Optimistic update
      setIndicators((prev) => [...prev, { uid, typeId, lng, lat }])
      await supabase.from('indicators').insert({ uid, type_id: typeId, lng, lat, room_id: roomId })
    },
    [roomId],
  )

  const removeIndicator = useCallback(
    async (uid: string) => {
      // Optimistic update
      setIndicators((prev) => prev.filter((i) => i.uid !== uid))
      await supabase.from('indicators').delete().eq('uid', uid).eq('room_id', roomId)
    },
    [roomId],
  )

  const clearIndicators = useCallback(async () => {
    setIndicators([])
    await supabase.from('indicators').delete().eq('room_id', roomId)
  }, [roomId])

  return { indicators, addIndicator, removeIndicator, clearIndicators, loaded }
}
