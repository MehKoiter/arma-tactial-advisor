import { createContext, useContext, type ReactNode } from 'react'
import { useIndicators } from '@/hooks/useIndicators'
import type { PlacedIndicator } from '@/data/indicators'

interface IndicatorsContextValue {
  indicators: PlacedIndicator[]
  loaded: boolean
  addIndicator: (typeId: string, lng: number, lat: number) => void
  removeIndicator: (uid: string) => void
  clearIndicators: () => void
}

const IndicatorsContext = createContext<IndicatorsContextValue | null>(null)

export function IndicatorsProvider({ children }: { children: ReactNode }) {
  const value = useIndicators()
  return <IndicatorsContext value={value}>{children}</IndicatorsContext>
}

export function useIndicatorsContext(): IndicatorsContextValue {
  const ctx = useContext(IndicatorsContext)
  if (!ctx) throw new Error('useIndicatorsContext must be used inside IndicatorsProvider')
  return ctx
}
