import type { Coordinate, RouteResult, RoutingProvider } from './routingProvider'

/**
 * InterimRoutingProvider — straight-line (as-the-crow-flies) routing.
 * Immediate usability while road-graph data is not available.
 * Caches results to avoid recomputation on rapid state changes.
 */
export class InterimRoutingProvider implements RoutingProvider {
  readonly name = 'interim-straight-line'
  private readonly cache = new Map<string, RouteResult>()

  async getRoute(from: Coordinate, to: Coordinate): Promise<RouteResult> {
    const key = `${from.lng.toFixed(5)},${from.lat.toFixed(5)}|${to.lng.toFixed(5)},${to.lat.toFixed(5)}`
    const cached = this.cache.get(key)
    if (cached) return cached

    const distanceMetres = haversineMetres(from, to)
    const result: RouteResult = {
      coordinates: [from, to],
      distanceMetres,
      provider: this.name,
    }
    this.cache.set(key, result)
    return result
  }
}

function haversineMetres(a: Coordinate, b: Coordinate): number {
  const R = 6_371_000
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const sinLat = Math.sin(dLat / 2)
  const sinLng = Math.sin(dLng / 2)
  const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng
  return 2 * R * Math.asin(Math.sqrt(h))
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
