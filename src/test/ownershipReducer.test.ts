import { describe, it, expect } from 'vitest'
import { ownershipReducer, buildInitialOwnership } from '@/state/ownershipReducer'
import type { OwnershipState } from '@/state/ownershipReducer'

const CAP_IDS = ['CAP_A', 'CAP_B', 'CAP_C']

function fresh(): OwnershipState {
  return buildInitialOwnership(CAP_IDS)
}

describe('ownershipReducer', () => {
  it('builds initial state with all neutral', () => {
    const state = fresh()
    expect(Object.values(state.ownership).every((o) => o === 'neutral')).toBe(true)
    expect(state.lavPosition).toBeNull()
  })

  it('SET_OWNER updates a single CAP', () => {
    const next = ownershipReducer(fresh(), { type: 'SET_OWNER', capId: 'CAP_A', owner: 'RUS' })
    expect(next.ownership['CAP_A']).toBe('RUS')
    expect(next.ownership['CAP_B']).toBe('neutral')
  })

  it('CYCLE_OWNER: neutral → US, then US ↔ RUS (never back to neutral)', () => {
    let state = fresh()
    const cycle = (s: OwnershipState) =>
      ownershipReducer(s, { type: 'CYCLE_OWNER', capId: 'CAP_A' })
    state = cycle(state)
    expect(state.ownership['CAP_A']).toBe('US')
    state = cycle(state)
    expect(state.ownership['CAP_A']).toBe('RUS')
    state = cycle(state)
    expect(state.ownership['CAP_A']).toBe('US')
    state = cycle(state)
    expect(state.ownership['CAP_A']).toBe('RUS')
  })

  it('RESET_ALL sets everything back to neutral', () => {
    let state = ownershipReducer(fresh(), { type: 'SET_OWNER', capId: 'CAP_A', owner: 'RUS' })
    state = ownershipReducer(state, { type: 'SET_OWNER', capId: 'CAP_B', owner: 'US' })
    state = ownershipReducer(state, { type: 'RESET_ALL' })
    expect(Object.values(state.ownership).every((o) => o === 'neutral')).toBe(true)
  })

  it('SET_LAV_POSITION sets and clears lavPosition', () => {
    let state = ownershipReducer(fresh(), { type: 'SET_LAV_POSITION', capId: 'CAP_B' })
    expect(state.lavPosition).toBe('CAP_B')
    state = ownershipReducer(state, { type: 'SET_LAV_POSITION', capId: null })
    expect(state.lavPosition).toBeNull()
  })

  it('BULK_SET replaces all ownership', () => {
    const bulk = { CAP_A: 'US' as const, CAP_B: 'RUS' as const, CAP_C: 'neutral' as const }
    const state = ownershipReducer(fresh(), { type: 'BULK_SET', ownership: bulk })
    expect(state.ownership).toEqual(bulk)
  })
})
