import { describe, it, expect } from 'vitest'
import { bfsHopsFiltered, findArticulationPoints } from '@/scoring/graphAnalysis'
import type { CAP } from '@/data/capSchema'

// Linear graph A — B — C — D — E
const LINE: CAP[] = [
  { id: 'A', name: 'A', coords: { lat: 0, lng: 0 }, neighbors: ['B'], type: 'minor' },
  { id: 'B', name: 'B', coords: { lat: 0, lng: 0 }, neighbors: ['A', 'C'], type: 'minor' },
  { id: 'C', name: 'C', coords: { lat: 0, lng: 0 }, neighbors: ['B', 'D'], type: 'minor' },
  { id: 'D', name: 'D', coords: { lat: 0, lng: 0 }, neighbors: ['C', 'E'], type: 'minor' },
  { id: 'E', name: 'E', coords: { lat: 0, lng: 0 }, neighbors: ['D'], type: 'minor' },
]

describe('bfsHopsFiltered', () => {
  it('returns 0 for same node', () => {
    expect(bfsHopsFiltered('A', 'A', LINE, new Set())).toBe(0)
  })

  it('routes through allowed nodes', () => {
    const allowed = new Set(['B', 'C', 'D'])
    expect(bfsHopsFiltered('A', 'E', LINE, allowed)).toBe(4)
  })

  it('returns Infinity when an intermediate is forbidden', () => {
    // Removing C breaks the only path from A to E
    const allowed = new Set(['B', 'D'])
    expect(bfsHopsFiltered('A', 'E', LINE, allowed)).toBe(Infinity)
  })

  it('start and target need not be in the allowed set', () => {
    const allowed = new Set(['B'])
    expect(bfsHopsFiltered('A', 'C', LINE, allowed)).toBe(2)
  })

  it('still reaches an adjacent target with no allowed intermediates', () => {
    expect(bfsHopsFiltered('A', 'B', LINE, new Set())).toBe(1)
  })
})

describe('findArticulationPoints', () => {
  it('identifies all middle nodes of a line graph as cut vertices', () => {
    const all = new Set(['A', 'B', 'C', 'D', 'E'])
    const cuts = findArticulationPoints(LINE, all)
    // B, C, D are articulation points; A and E are leaves
    expect(cuts.has('B')).toBe(true)
    expect(cuts.has('C')).toBe(true)
    expect(cuts.has('D')).toBe(true)
    expect(cuts.has('A')).toBe(false)
    expect(cuts.has('E')).toBe(false)
  })

  it('finds no cut vertex in a triangle', () => {
    const tri: CAP[] = [
      { id: 'X', name: 'X', coords: { lat: 0, lng: 0 }, neighbors: ['Y', 'Z'], type: 'minor' },
      { id: 'Y', name: 'Y', coords: { lat: 0, lng: 0 }, neighbors: ['X', 'Z'], type: 'minor' },
      { id: 'Z', name: 'Z', coords: { lat: 0, lng: 0 }, neighbors: ['X', 'Y'], type: 'minor' },
    ]
    const cuts = findArticulationPoints(tri, new Set(['X', 'Y', 'Z']))
    expect(cuts.size).toBe(0)
  })

  it('respects the allowed-nodes induced subgraph', () => {
    // If we exclude C, the induced subgraph splits into {A,B} and {D,E};
    // neither component has an articulation point on its own.
    const allowed = new Set(['A', 'B', 'D', 'E'])
    const cuts = findArticulationPoints(LINE, allowed)
    expect(cuts.size).toBe(0)
  })
})
