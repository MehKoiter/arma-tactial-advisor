/**
 * Radio-network model — inspired by ARMA Reforger's antenna chain.
 *
 * A CAP is "in the network" when:
 *   1. It is owned (US or RUS), AND
 *   2. Its `radio` flag is enabled (antenna intact / powered), AND
 *   3. It is within RADIO_RANGE_METRES of another same-faction radio-active CAP.
 *
 * Two such CAPs form a direct radio link. The full network is the connected
 * subgraph of links rooted at any HQ-equivalent node.
 *
 * The signal model is a simplification of the Friis transmission equation:
 *     P_r = P_t · (Gt · Gr · λ²) / (4π d)²
 * Game terrain density adds a path-loss coefficient. Without terrain data we
 * approximate by a hard cutoff at RADIO_RANGE_METRES; refine later by reducing
 * effective range over forested / mountainous terrain.
 */

import { METRES_PER_DEGREE } from './mapConfig'
import type { CAP } from './capSchema'
import type { Owner } from '@/state/ownershipReducer'

/** Maximum line-of-sight transmission distance in metres (~Reforger Conflict default). */
export const RADIO_RANGE_METRES = 3000

export interface RadioLink {
  fromId: string
  toId: string
  fromLng: number
  fromLat: number
  toLng: number
  toLat: number
  owner: Exclude<Owner, 'neutral'>
  /** Centre-to-centre distance in metres (informational). */
  distanceM: number
}

/** Approximate planar distance in metres between two CAPs (good enough at Everon scale). */
function distanceMetres(a: CAP, b: CAP): number {
  const dx = (a.coords.lng - b.coords.lng) * METRES_PER_DEGREE
  const dy = (a.coords.lat - b.coords.lat) * METRES_PER_DEGREE
  return Math.hypot(dx, dy)
}

/**
 * Compute every direct radio link in the current state.
 * Returns one entry per unordered pair (no duplicates).
 */
export function computeRadioLinks(
  caps: ReadonlyArray<CAP>,
  ownership: Record<string, Owner>,
  radio: ReadonlySet<string>,
  rangeM: number = RADIO_RANGE_METRES,
): RadioLink[] {
  const active = caps.filter((c) => {
    const o = ownership[c.id] ?? 'neutral'
    return o !== 'neutral' && radio.has(c.id)
  })

  const links: RadioLink[] = []
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]
      const b = active[j]
      if (ownership[a.id] !== ownership[b.id]) continue // factions don't share networks
      const d = distanceMetres(a, b)
      if (d > rangeM) continue
      links.push({
        fromId: a.id,
        toId: b.id,
        fromLng: a.coords.lng,
        fromLat: a.coords.lat,
        toLng: b.coords.lng,
        toLat: b.coords.lat,
        owner: ownership[a.id] as Exclude<Owner, 'neutral'>,
        distanceM: d,
      })
    }
  }
  return links
}

export interface MobRadioAnchor {
  faction: Exclude<Owner, 'neutral'>
  lng: number
  lat: number
}

/**
 * Compute radio links from each placed MOB to every same-faction owned +
 * radio-active CAP within range. MOBs have built-in radio antennae and
 * always participate in the network when present.
 */
export function computeMobRadioLinks(
  caps: ReadonlyArray<CAP>,
  ownership: Record<string, Owner>,
  radio: ReadonlySet<string>,
  mobs: ReadonlyArray<MobRadioAnchor>,
  rangeM: number = RADIO_RANGE_METRES,
): RadioLink[] {
  const out: RadioLink[] = []
  for (const m of mobs) {
    for (const c of caps) {
      const owner = ownership[c.id] ?? 'neutral'
      if (owner !== m.faction) continue
      if (!radio.has(c.id)) continue
      const dx = (c.coords.lng - m.lng) * METRES_PER_DEGREE
      const dy = (c.coords.lat - m.lat) * METRES_PER_DEGREE
      const d = Math.hypot(dx, dy)
      if (d > rangeM) continue
      out.push({
        fromId: `MOB_${m.faction}`,
        toId: c.id,
        fromLng: m.lng,
        fromLat: m.lat,
        toLng: c.coords.lng,
        toLat: c.coords.lat,
        owner: m.faction,
        distanceM: d,
      })
    }
  }
  return out
}

export interface AttackProjectionLine {
  fromId: string
  toId: string
  fromLng: number
  fromLat: number
  toLng: number
  toLat: number
  /** Faction projecting the attack (the player's team). */
  attacker: Exclude<Owner, 'neutral'>
  distanceM: number
}

/**
 * Compute attack-projection lines: for the given attacker faction, draw a line
 * from every friendly online anchor (CAP id in `onlineSet`, plus optional MOB)
 * to every enemy-owned CAP within radio range. These visualize where the
 * attacker can sustain an assault by radio coverage.
 */
export function computeAttackProjectionLines(
  caps: ReadonlyArray<CAP>,
  ownership: Record<string, Owner>,
  attacker: Exclude<Owner, 'neutral'>,
  onlineSet: ReadonlySet<string>,
  mob: { lng: number; lat: number } | null,
  rangeM: number = RADIO_RANGE_METRES,
): AttackProjectionLine[] {
  const enemyFaction: Exclude<Owner, 'neutral'> = attacker === 'US' ? 'RUS' : 'US'
  const enemies = caps.filter((c) => (ownership[c.id] ?? 'neutral') === enemyFaction)
  if (enemies.length === 0) return []

  const anchors: { id: string; lng: number; lat: number }[] = []
  for (const id of onlineSet) {
    const c = caps.find((x) => x.id === id)
    if (c) anchors.push({ id: c.id, lng: c.coords.lng, lat: c.coords.lat })
  }
  if (mob) anchors.push({ id: `MOB_${attacker}`, lng: mob.lng, lat: mob.lat })
  if (anchors.length === 0) return []

  const out: AttackProjectionLine[] = []
  for (const e of enemies) {
    for (const a of anchors) {
      const dx = (e.coords.lng - a.lng) * METRES_PER_DEGREE
      const dy = (e.coords.lat - a.lat) * METRES_PER_DEGREE
      const d = Math.hypot(dx, dy)
      if (d > rangeM) continue
      out.push({
        fromId: a.id,
        toId: e.id,
        fromLng: a.lng,
        fromLat: a.lat,
        toLng: e.coords.lng,
        toLat: e.coords.lat,
        attacker,
        distanceM: d,
      })
    }
  }
  return out
}
