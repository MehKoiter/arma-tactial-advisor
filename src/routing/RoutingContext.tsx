import { createContext, useContext, useState, useMemo, type ReactNode } from 'react'
import type { RoutingProvider } from './routingProvider'
import { InterimRoutingProvider } from './interimProvider'
import { RoadGraphRoutingProvider } from './roadGraphProvider'

export type ProviderKey = 'interim' | 'road-graph'

const PROVIDERS: Record<ProviderKey, RoutingProvider> = {
  interim: new InterimRoutingProvider(),
  'road-graph': new RoadGraphRoutingProvider(),
}

interface RoutingContextValue {
  provider: RoutingProvider
  activeKey: ProviderKey
  setProvider: (key: ProviderKey) => void
}

const RoutingContext = createContext<RoutingContextValue | null>(null)

export function RoutingProvider({ children }: { children: ReactNode }) {
  const [activeKey, setActiveKey] = useState<ProviderKey>('interim')
  const value = useMemo(
    () => ({ provider: PROVIDERS[activeKey], activeKey, setProvider: setActiveKey }),
    [activeKey],
  )
  return <RoutingContext value={value}>{children}</RoutingContext>
}

export function useRouting(): RoutingContextValue {
  const ctx = useContext(RoutingContext)
  if (!ctx) throw new Error('useRouting must be used inside RoutingProvider')
  return ctx
}
