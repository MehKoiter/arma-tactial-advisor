import { describe, it, expect } from 'vitest'
import { validateCAPDataset } from '@/data/capSchema'
import everonCAPs from '@/data/everonCAPs'

describe('CAP schema validation', () => {
  it('validates the Everon dataset without errors', () => {
    expect(() => validateCAPDataset(everonCAPs)).not.toThrow()
  })

  it('all CAP IDs are unique', () => {
    const ids = everonCAPs.map((c) => c.id)
    expect(ids.length).toBe(new Set(ids).size)
  })

  it('all coordinates are within expected Everon virtual bounds', () => {
    // game world is 12 288 m / 111 320 m-per-degree ≈ 0.110 degrees
    for (const cap of everonCAPs) {
      expect(cap.coords.lat).toBeGreaterThanOrEqual(0)
      expect(cap.coords.lat).toBeLessThan(0.12)
      expect(cap.coords.lng).toBeGreaterThanOrEqual(0)
      expect(cap.coords.lng).toBeLessThan(0.12)
    }
  })

  it('all neighbor references point to valid CAP IDs', () => {
    const ids = new Set(everonCAPs.map((c) => c.id))
    for (const cap of everonCAPs) {
      for (const n of cap.neighbors) {
        expect(ids.has(n), `${cap.id} has invalid neighbor ${n}`).toBe(true)
      }
    }
  })

  it('rejects duplicate IDs', () => {
    const dup = [
      { id: 'A', name: 'A', coords: { lat: 16, lng: -18 }, neighbors: [] },
      { id: 'A', name: 'B', coords: { lat: 16, lng: -18 }, neighbors: [] },
    ]
    expect(() => validateCAPDataset(dup)).toThrow()
  })

  it('rejects out-of-range coordinates', () => {
    expect(() =>
      validateCAPDataset([{ id: 'X', name: 'X', coords: { lat: 200, lng: 0 }, neighbors: [] }]),
    ).toThrow()
  })
})
