import { describe, it, expect } from 'vitest'
import {
  calcEnemyPressure,
  calcContestedCentrality,
  calcOverextension,
  calcMovementFeasibility,
  bfsHopDistance,
  scoreCandidates,
} from '@/scoring/scoringEngine'
import type { CAP } from '@/data/capSchema'
import { DEFAULT_SCORING_CONFIG } from '@/scoring/scoringConfig'
import type { OwnershipState } from '@/state/ownershipReducer'

// Minimal 4-node graph: A - B - C - D
const CAPS: CAP[] = [
  { id: 'A', name: 'Alpha', coords: { lat: 16, lng: -18 }, neighbors: ['B'], type: 'minor' },
  { id: 'B', name: 'Bravo', coords: { lat: 16.01, lng: -18 }, neighbors: ['A', 'C'], type: 'minor' },
  { id: 'C', name: 'Charlie', coords: { lat: 16.02, lng: -18 }, neighbors: ['B', 'D'], type: 'minor' },
  { id: 'D', name: 'Delta', coords: { lat: 16.03, lng: -18 }, neighbors: ['C'], type: 'minor' },
]

function makeOwnership(map: Record<string, string>): OwnershipState {
  return {
    ownership: map as OwnershipState['ownership'],
    lavPosition: null,
    playerTeam: 'US',
    vehicleType: 'LAV',
    underAttack: new Set(),
    attacking: new Set(),
    radio: new Set(),
    hq: new Set(),
  }
}

describe('calcEnemyPressure', () => {
  it('returns 1 when one neighbor is enemy', () => {
    const own = { A: 'US', B: 'RUS' }
    expect(calcEnemyPressure(CAPS[0], own as never, 'RUS')).toBe(1)
  })

  it('returns 0 for enemy-held caps', () => {
    const own = { A: 'RUS', B: 'RUS' }
    expect(calcEnemyPressure(CAPS[0], own as never, 'RUS')).toBe(0)
  })
})

describe('calcContestedCentrality', () => {
  it('returns 1.0 when both neighbors are enemy or neutral', () => {
    // CAPS[1] is B, whose neighbors are A and C
    const own = { A: 'RUS', B: 'neutral', C: 'RUS', D: 'neutral' }
    expect(calcContestedCentrality(CAPS[1], own as never, 'RUS')).toBe(1)
  })

  it('returns 0.5 when half the neighbors are friendly', () => {
    const own = { A: 'US', B: 'neutral', C: 'RUS', D: 'neutral' }
    expect(calcContestedCentrality(CAPS[1], own as never, 'RUS')).toBe(0.5)
  })
})

describe('calcOverextension', () => {
  it('returns 1 when all neighbors are enemy', () => {
    // CAPS[1] is B, whose neighbors are A and C
    const own = { A: 'RUS', B: 'neutral', C: 'RUS' }
    expect(calcOverextension(CAPS[1], own as never, 'RUS')).toBe(1)
  })

  it('returns 0 when fewer than half the neighbors are enemy', () => {
    const own = { A: 'US', B: 'neutral', C: 'RUS' }
    expect(calcOverextension(CAPS[1], own as never, 'RUS')).toBe(0)
  })
})

describe('bfsHopDistance', () => {
  it('returns 0 for same node', () => {
    expect(bfsHopDistance('A', 'A', CAPS)).toBe(0)
  })

  it('returns correct distances', () => {
    expect(bfsHopDistance('A', 'B', CAPS)).toBe(1)
    expect(bfsHopDistance('A', 'C', CAPS)).toBe(2)
    expect(bfsHopDistance('A', 'D', CAPS)).toBe(3)
  })

  it('returns Infinity for disconnected nodes', () => {
    const isolated: CAP[] = [
      ...CAPS,
      { id: 'X', name: 'X', coords: { lat: 0, lng: 0 }, neighbors: [], type: 'minor' },
    ]
    expect(bfsHopDistance('A', 'X', isolated)).toBe(Infinity)
  })
})

describe('calcMovementFeasibility', () => {
  it('returns 0 with no lav position', () => {
    expect(calcMovementFeasibility(CAPS[0], null, CAPS, 3)).toBe(0)
  })

  it('returns maximum bonus when at the same node', () => {
    const bonus = calcMovementFeasibility(CAPS[0], 'A', CAPS, 3)
    expect(bonus).toBeGreaterThan(0)
    expect(bonus).toBeLessThanOrEqual(1)
  })

  it('returns 0 beyond max hops', () => {
    expect(calcMovementFeasibility(CAPS[3], 'A', CAPS, 2)).toBe(0)
  })
})

describe('scoreCandidates', () => {
  it('excludes enemy-held CAPs from results', () => {
    const state = makeOwnership({ A: 'neutral', B: 'enemy', C: 'neutral', D: 'neutral' })
    const results = scoreCandidates(CAPS, state, DEFAULT_SCORING_CONFIG)
    expect(results.find((r) => r.cap.id === 'B')).toBeUndefined()
  })

  it('returns at most topN results', () => {
    const state = makeOwnership({ A: 'friendly', B: 'neutral', C: 'neutral', D: 'friendly' })
    const results = scoreCandidates(CAPS, state, { ...DEFAULT_SCORING_CONFIG, topN: 2 })
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('is deterministic for identical inputs', () => {
    const state = makeOwnership({ A: 'friendly', B: 'enemy', C: 'neutral', D: 'neutral' })
    const r1 = scoreCandidates(CAPS, state, DEFAULT_SCORING_CONFIG)
    const r2 = scoreCandidates(CAPS, state, DEFAULT_SCORING_CONFIG)
    expect(r1.map((r) => r.cap.id)).toEqual(r2.map((r) => r.cap.id))
    expect(r1.map((r) => r.totalScore)).toEqual(r2.map((r) => r.totalScore))
  })

  it('ranks higher-pressure CAPs above low-pressure ones', () => {
    // A has 1 enemy neighbor (B); D has 0 enemy neighbors
    const state = makeOwnership({ A: 'US', B: 'RUS', C: 'neutral', D: 'US' })
    const results = scoreCandidates(CAPS, state, DEFAULT_SCORING_CONFIG)
    const rankA = results.findIndex((r) => r.cap.id === 'A')
    const rankD = results.findIndex((r) => r.cap.id === 'D')
    expect(rankA).toBeLessThan(rankD)
  })
})
