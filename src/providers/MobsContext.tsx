import { createContext, useContext, type ReactNode } from 'react'
import { useMobs, type MobsState } from '@/hooks/useMobs'

const MobsContext = createContext<MobsState | null>(null)

export function MobsProvider({ children }: { children: ReactNode }) {
  const value = useMobs()
  return <MobsContext value={value}>{children}</MobsContext>
}

export function useMobsContext(): MobsState {
  const ctx = useContext(MobsContext)
  if (!ctx) throw new Error('useMobsContext must be used inside MobsProvider')
  return ctx
}
