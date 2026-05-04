import { createContext, useContext, useReducer, useMemo, type ReactNode } from 'react'
import { ownershipReducer, buildInitialOwnership } from './ownershipReducer'
import type { OwnershipState, OwnershipAction } from './ownershipReducer'
import everonCAPs from '@/data/everonCAPs'

interface OwnershipContextValue {
  state: OwnershipState
  dispatch: React.Dispatch<OwnershipAction>
}

const OwnershipContext = createContext<OwnershipContextValue | null>(null)

export function OwnershipProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => buildInitialOwnership(everonCAPs.map((c) => c.id)), [])
  const [state, dispatch] = useReducer(ownershipReducer, initial)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <OwnershipContext value={value}>{children}</OwnershipContext>
}

export function useOwnership(): OwnershipContextValue {
  const ctx = useContext(OwnershipContext)
  if (!ctx) throw new Error('useOwnership must be used inside OwnershipProvider')
  return ctx
}
