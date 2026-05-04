import { useState, useEffect, useCallback } from 'react'
import type { PositionNote, Rating } from '@/data/positionNotes'
import { supabase } from '@/lib/supabase'
import { useRoom } from '@/providers/RoomContext'

// Row shape in Supabase (snake_case)
interface NoteRow {
  uid: string
  cap_id: string
  lng: number
  lat: number
  rating: number
  room_id: string
}

function rowToNote(r: NoteRow): PositionNote {
  return { uid: r.uid, capId: r.cap_id, lng: r.lng, lat: r.lat, rating: r.rating as Rating }
}

let _uid = Date.now()
function nextUid() { return String(++_uid) }

export function usePositionNotes() {
  const { slug: roomId } = useRoom()
  const [notes, setNotes] = useState<PositionNote[]>([])
  const [loaded, setLoaded] = useState(false)

  // Initial fetch
  useEffect(() => {
    supabase
      .from('position_notes')
      .select('*')
      .eq('room_id', roomId)
      .then(({ data }) => {
        if (data) setNotes((data as NoteRow[]).map(rowToNote))
        setLoaded(true)
      })
  }, [roomId])

  // Realtime subscription — sync inserts/deletes from other clients
  useEffect(() => {
    const channel = supabase
      .channel(`position_notes_changes_${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'position_notes', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const note = rowToNote(payload.new as NoteRow)
          setNotes((prev) => prev.some((n) => n.uid === note.uid) ? prev : [...prev, note])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'position_notes', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const uid = (payload.old as { uid: string }).uid
          setNotes((prev) => prev.filter((n) => n.uid !== uid))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId])

  const addNote = useCallback(async (lng: number, lat: number, rating: Rating, capId: string) => {
    const uid = nextUid()
    // Optimistic update
    setNotes((prev) => [...prev, { uid, capId, lng, lat, rating }])
    await supabase.from('position_notes').insert({ uid, cap_id: capId, lng, lat, rating, room_id: roomId })
  }, [roomId])

  const removeNote = useCallback(async (uid: string) => {
    // Optimistic update
    setNotes((prev) => prev.filter((n) => n.uid !== uid))
    await supabase.from('position_notes').delete().eq('uid', uid).eq('room_id', roomId)
  }, [roomId])

  const clearNotes = useCallback(async () => {
    setNotes([])
    await supabase.from('position_notes').delete().eq('room_id', roomId)
  }, [roomId])

  return { notes, addNote, removeNote, clearNotes, loaded }
}
