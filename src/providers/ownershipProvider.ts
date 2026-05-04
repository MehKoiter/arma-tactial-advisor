import type { Owner } from '@/state/ownershipReducer'

export interface OwnershipSnapshot {
  ownership: Record<string, Owner>
  timestamp: number
}

export interface OwnershipInputProvider {
  readonly name: string
  readonly isLive: boolean
  /** Subscribe to ownership updates. Returns unsubscribe function. */
  subscribe(callback: (snapshot: OwnershipSnapshot) => void): () => void
}
