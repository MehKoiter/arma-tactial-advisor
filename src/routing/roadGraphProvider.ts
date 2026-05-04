import type { Coordinate, RouteResult, RoutingProvider } from './routingProvider'
import { InterimRoutingProvider } from './interimProvider'

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'
const TIMEOUT_MS = 5_000

/**
 * RoadGraphRoutingProvider — uses OSRM public demo server.
 * Falls back to InterimRoutingProvider on timeout or any error.
 *
 * Replace OSRM_BASE with a self-hosted OSRM instance for production use.
 * The public demo server is rate-limited and not suitable for high-volume use.
 */
export class RoadGraphRoutingProvider implements RoutingProvider {
  readonly name = 'road-graph-osrm'
  private readonly fallback = new InterimRoutingProvider()

  async getRoute(from: Coordinate, to: Coordinate): Promise<RouteResult> {
    const url =
      `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}` +
      `?overview=full&geometries=geojson`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const resp = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)

      if (!resp.ok) throw new Error(`OSRM HTTP ${resp.status}`)

      const json = await resp.json()
      const route = json?.routes?.[0]
      if (!route) throw new Error('No route returned by OSRM')

      const coords: Coordinate[] = (route.geometry.coordinates as [number, number][]).map(
        ([lng, lat]) => ({ lng, lat }),
      )

      return {
        coordinates: coords,
        distanceMetres: route.distance as number,
        provider: this.name,
      }
    } catch {
      clearTimeout(timer)
      return this.fallback.getRoute(from, to)
    }
  }
}
