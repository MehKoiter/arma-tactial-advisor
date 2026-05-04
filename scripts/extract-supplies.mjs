import { readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import path from 'path'

const METRES_PER_DEGREE = 111_320

const c = readFileSync(path.join(tmpdir(), 'supplies.js'), 'utf8')
const m = [...c.matchAll(/\{locationXZ:\[([0-9.]+),([0-9.]+)\][^}]*resourcesAvailable:([0-9e+]+)\}/g)]

const pts = m
  .filter(x => parseFloat(x[3]) > 0)
  .map(x => ({
    lng: parseFloat((parseFloat(x[1]) / METRES_PER_DEGREE).toFixed(6)),
    lat: parseFloat((parseFloat(x[2]) / METRES_PER_DEGREE).toFixed(6)),
    resources: parseFloat(x[3]),
  }))

console.log(`Extracted ${pts.length} non-zero supply points`)

const lines = pts.map(p => `  { lng: ${p.lng}, lat: ${p.lat}, resources: ${p.resources} }`)

const ts = `/**
 * Everon supply point locations, scraped from reforger.recoil.org/everon/#supplies.
 * Coordinates are in virtual lng/lat space (gameX / 111320, gameZ / 111320).
 * Only points with resourcesAvailable > 0 are included.
 */
export interface SupplyPoint {
  lng: number
  lat: number
  resources: number
}

const everonSupplyPoints: SupplyPoint[] = [
${lines.join(',\n')},
]

export default everonSupplyPoints
`

writeFileSync('src/data/everonSupplyPoints.ts', ts)
console.log('Written to src/data/everonSupplyPoints.ts')
