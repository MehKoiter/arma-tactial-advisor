import { createContext, useContext, type ReactNode } from 'react'
import { usePositionNotes } from '@/hooks/usePositionNotes'
import type { PositionNote, Rating } from '@/data/positionNotes'

interface PositionNotesContextValue {
  notes: PositionNote[]
  addNote: (lng: number, lat: number, rating: Rating, capId: string) => void
  removeNote: (uid: string) => void
  clearNotes: () => void
}

const PositionNotesContext = createContext<PositionNotesContextValue | null>(null)

export function PositionNotesProvider({ children }: { children: ReactNode }) {
  const value = usePositionNotes()
  return <PositionNotesContext value={value}>{children}</PositionNotesContext>
}

export function usePositionNotesContext(): PositionNotesContextValue {
  const ctx = useContext(PositionNotesContext)
  if (!ctx) throw new Error('usePositionNotesContext must be used inside PositionNotesProvider')
  return ctx
}
