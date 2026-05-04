import { useState, useEffect, useCallback } from 'react'
import type { PositionNote, Rating } from '@/data/positionNotes'

const STORAGE_KEY = 'lav-position-notes'

function loadNotes(): PositionNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PositionNote[]) : []
  } catch {
    return []
  }
}

let _uid = Date.now()
function nextUid() { return String(++_uid) }

export function usePositionNotes() {
  const [notes, setNotes] = useState<PositionNote[]>(loadNotes)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  const addNote = useCallback((lng: number, lat: number, rating: Rating, capId: string) => {
    setNotes((prev) => [...prev, { uid: nextUid(), capId, lng, lat, rating }])
  }, [])

  const removeNote = useCallback((uid: string) => {
    setNotes((prev) => prev.filter((n) => n.uid !== uid))
  }, [])

  const clearNotes = useCallback(() => setNotes([]), [])

  return { notes, addNote, removeNote, clearNotes }
}
