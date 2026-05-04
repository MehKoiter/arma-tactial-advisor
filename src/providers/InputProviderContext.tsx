import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react'
import type { OwnershipInputProvider } from './ownershipProvider'
import { MockTelemetryProvider } from './mockTelemetryProvider'
import { useOwnership } from '@/state/OwnershipContext'

export type InputProviderKey = 'manual' | 'mock-telemetry'

const mockProvider = new MockTelemetryProvider()

const PROVIDERS: Record<InputProviderKey, OwnershipInputProvider | null> = {
  manual: null,
  'mock-telemetry': mockProvider,
}

interface InputProviderContextValue {
  activeKey: InputProviderKey
  setActiveKey: (key: InputProviderKey) => void
  isLive: boolean
}

const InputProviderContext = createContext<InputProviderContextValue | null>(null)

export function InputProviderProvider({ children }: { children: ReactNode }) {
  const [activeKey, setActiveKey] = useState<InputProviderKey>('manual')
  const { dispatch } = useOwnership()

  useEffect(() => {
    const provider = PROVIDERS[activeKey]
    if (!provider) return
    const unsub = provider.subscribe((snapshot) => {
      dispatch({ type: 'BULK_SET', ownership: snapshot.ownership })
    })
    return unsub
  }, [activeKey, dispatch])

  const value = useMemo(
    () => ({ activeKey, setActiveKey, isLive: PROVIDERS[activeKey]?.isLive ?? false }),
    [activeKey],
  )

  return <InputProviderContext value={value}>{children}</InputProviderContext>
}

export function useInputProvider(): InputProviderContextValue {
  const ctx = useContext(InputProviderContext)
  if (!ctx) throw new Error('useInputProvider must be used inside InputProviderProvider')
  return ctx
}
