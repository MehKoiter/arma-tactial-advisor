import { describe, it, expect } from 'vitest'
import { InterimRoutingProvider } from '@/routing/interimProvider'

describe('InterimRoutingProvider', () => {
  const provider = new InterimRoutingProvider()

  it('returns a straight-line route with two coordinates', async () => {
    const result = await provider.getRoute(
      { lng: -17.88, lat: 16.18 },
      { lng: -17.82, lat: 16.14 },
    )
    expect(result.coordinates).toHaveLength(2)
    expect(result.coordinates[0]).toEqual({ lng: -17.88, lat: 16.18 })
    expect(result.coordinates[1]).toEqual({ lng: -17.82, lat: 16.14 })
  })

  it('calculates a positive distance', async () => {
    const result = await provider.getRoute(
      { lng: -17.88, lat: 16.18 },
      { lng: -17.82, lat: 16.14 },
    )
    expect(result.distanceMetres).toBeGreaterThan(0)
  })

  it('returns zero distance for identical points', async () => {
    const result = await provider.getRoute({ lng: -17.88, lat: 16.18 }, { lng: -17.88, lat: 16.18 })
    expect(result.distanceMetres).toBeCloseTo(0, 0)
  })

  it('reports the correct provider name', async () => {
    const result = await provider.getRoute({ lng: 0, lat: 0 }, { lng: 1, lat: 0 })
    expect(result.provider).toBe('interim-straight-line')
  })
})
