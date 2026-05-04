import type { Owner } from '@/state/ownershipReducer'
import type { OwnershipInputProvider, OwnershipSnapshot } from './ownershipProvider'
import everonCAPs from '@/data/everonCAPs'

const CAP_IDS = everonCAPs.map((c) => c.id)
const OWNERS: Owner[] = ['neutral', 'US', 'RUS']
const TICK_MS = 8_000

function randomOwner(): Owner {
  return OWNERS[Math.floor(Math.random() * OWNERS.length)]
}

/**
 * MockTelemetryProvider — simulates live ownership changes every TICK_MS ms.
 * Used for demo/testing purposes. Does not connect to any real data source.
 */
export class MockTelemetryProvider implements OwnershipInputProvider {
  readonly name = 'mock-telemetry'
  readonly isLive = true

  subscribe(callback: (snapshot: OwnershipSnapshot) => void): () => void {
    const handle = setInterval(() => {
      const ownership = Object.fromEntries(CAP_IDS.map((id) => [id, randomOwner()])) as Record<
        string,
        Owner
      >
      callback({ ownership, timestamp: Date.now() })
    }, TICK_MS)

    return () => clearInterval(handle)
  }
}
