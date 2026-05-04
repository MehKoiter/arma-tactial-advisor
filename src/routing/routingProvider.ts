export interface Coordinate {
  lng: number
  lat: number
}

export interface RouteResult {
  /** GeoJSON LineString coordinates [lng, lat][] */
  coordinates: Coordinate[]
  /** Estimated distance in metres */
  distanceMetres: number
  /** Provider that produced this result */
  provider: string
}

export interface RoutingProvider {
  readonly name: string
  getRoute(from: Coordinate, to: Coordinate): Promise<RouteResult>
}
