/**
 * Radio-network analysis — Reforger-style HQ-rooted connectivity.
 *
 * Builds an adjacency map over the radio-link graph (same-faction CAPs that
 * are owned + radio-active and within RADIO_RANGE_METRES of each other), then
 * derives:
 *   - "Online" set: BFS-reachable from the faction's HQ. Falls back to the
 *     largest connected component when no HQ is designated.
 *   - "Cut vertices": articulation points whose removal would split the
 *     network — capturing/losing one severs the chain.
 */

import type { CAP } from '@/data/capSchema'
import type { Owner, OwnershipState } from '@/state/ownershipReducer'
import { RADIO_RANGE_METRES } from '@/data/radioConfig'
import { METRES_PER_DEGREE } from '@/data/mapConfig'
import { findArticulationPoints } from '@/scoring/graphAnalysis'

/** Synthetic id used to represent a faction MOB inside the radio graph. */
export const MOB_NODE_ID = '__MOB__'

export interface MobAnchor {
  /** Map longitude. */
  lng: number
  /** Map latitude. */
  lat: number
}

function distanceM(
  a: { coords: { lng: number; lat: number } },
  b: { coords: { lng: number; lat: number } },
): number {
  const dx = (a.coords.lng - b.coords.lng) * METRES_PER_DEGREE
  const dy = (a.coords.lat - b.coords.lat) * METRES_PER_DEGREE
  return Math.hypot(dx, dy)
}

export interface RadioNetworkAnalysis {
  /** CAPs that are owned + radio-active and connected to the HQ (or to the largest component). */
  onlineSet: Set<string>
  /** CAPs in the radio subgraph whose removal would split the network. */
  cutVertices: Set<string>
  /** Whether the faction has a designated HQ that is currently valid (owned + radio-active). */
  hqValid: boolean
  /** Whether the faction has a placed MOB that is acting as the anchor. */
  mobAnchored: boolean
}

/**
 * Build a synthetic-CAP graph that represents the radio links for a single
 * faction. Edges are pairs of same-faction radio-active CAPs within rangeM.
 *
 * The result is shaped as `CAP[]` (with a `neighbors[]` list of radio-linked
 * IDs) so we can reuse the existing graph utilities. Coordinates and other
 * metadata are passed through for completeness.
 */
function buildRadioGraph(
  caps: ReadonlyArray<CAP>,
  ownership: Record<string, Owner>,
  radio: ReadonlySet<string>,
  faction: Exclude<Owner, 'neutral'>,
  rangeM: number,
  mob: MobAnchor | null,
): { graph: CAP[]; nodes: Set<string> } {
  const candidates = caps.filter(
    (c) => (ownership[c.id] ?? 'neutral') === faction && radio.has(c.id),
  )
  const nodes = new Set(candidates.map((c) => c.id))
  const graph: CAP[] = candidates.map((c) => {
    const neighbors: string[] = []
    for (const other of candidates) {
      if (other.id === c.id) continue
      if (distanceM(c, other) <= rangeM) neighbors.push(other.id)
    }
    // MOB acts as an always-on radio relay for its faction. Any CAP
    // within range gets an edge to the synthetic MOB node.
    if (mob && distanceM(c, { coords: { lng: mob.lng, lat: mob.lat } }) <= rangeM) {
      neighbors.push(MOB_NODE_ID)
    }
    return { ...c, neighbors }
  })
  if (mob) {
    nodes.add(MOB_NODE_ID)
    const mobNeighbors: string[] = []
    for (const c of candidates) {
      if (distanceM(c, { coords: { lng: mob.lng, lat: mob.lat } }) <= rangeM) {
        mobNeighbors.push(c.id)
      }
    }
    // Synthetic CAP node for the MOB. Coordinates are filled in for completeness;
    // the rest of the metadata is irrelevant to the network analysis.
    graph.push({
      id: MOB_NODE_ID,
      name: 'MOB',
      shortName: 'MOB',
      type: 'major',
      coords: { lng: mob.lng, lat: mob.lat },
      neighbors: mobNeighbors,
      zone: 'central',
    } as CAP)
  }
  return { graph, nodes }
}

/**
 * Compute the largest connected component over the given graph.
 * Returns the set of node IDs in the largest component (empty if no nodes).
 */
function largestComponent(graph: ReadonlyArray<CAP>, nodes: ReadonlySet<string>): Set<string> {
  const adj = new Map(graph.map((c) => [c.id, c.neighbors]))
  const visited = new Set<string>()
  let best = new Set<string>()
  for (const start of nodes) {
    if (visited.has(start)) continue
    const component = new Set<string>([start])
    const queue: string[] = [start]
    visited.add(start)
    while (queue.length) {
      const u = queue.shift()!
      for (const v of adj.get(u) ?? []) {
        if (visited.has(v)) continue
        visited.add(v)
        component.add(v)
        queue.push(v)
      }
    }
    if (component.size > best.size) best = component
  }
  return best
}

/**
 * BFS over the radio graph from the given HQ (which must be in `nodes`).
 */
function bfsFrom(graph: ReadonlyArray<CAP>, hqId: string): Set<string> {
  const adj = new Map(graph.map((c) => [c.id, c.neighbors]))
  const reached = new Set<string>([hqId])
  const queue: string[] = [hqId]
  while (queue.length) {
    const u = queue.shift()!
    for (const v of adj.get(u) ?? []) {
      if (reached.has(v)) continue
      reached.add(v)
      queue.push(v)
    }
  }
  return reached
}

/**
 * Analyze the radio network for one faction. The HQ is taken from
 * `state.hq` — at most one CAP per faction by reducer enforcement.
 */
export function analyzeRadioNetwork(
  caps: ReadonlyArray<CAP>,
  state: OwnershipState,
  faction: Exclude<Owner, 'neutral'>,
  rangeM: number = RADIO_RANGE_METRES,
  mob: MobAnchor | null = null,
): RadioNetworkAnalysis {
  const { graph, nodes } = buildRadioGraph(caps, state.ownership, state.radio, faction, rangeM, mob)

  // Find HQ for this faction: at most one entry in state.hq whose owner === faction
  let hqId: string | null = null
  for (const id of state.hq) {
    if ((state.ownership[id] ?? 'neutral') === faction) {
      hqId = id
      break
    }
  }
  const hqValid = hqId != null && nodes.has(hqId)
  const mobAnchored = mob != null

  // Anchor priority: HQ (if valid) > MOB (if placed) > largest component fallback.
  let onlineSet: Set<string>
  if (hqValid && hqId != null) {
    onlineSet = bfsFrom(graph, hqId)
  } else if (mobAnchored) {
    onlineSet = bfsFrom(graph, MOB_NODE_ID)
  } else {
    onlineSet = largestComponent(graph, nodes)
  }

  const cutVertices = findArticulationPoints(graph, nodes)

  // Strip the synthetic MOB token before returning so callers only see real CAPs.
  onlineSet.delete(MOB_NODE_ID)
  cutVertices.delete(MOB_NODE_ID)

  return { onlineSet, cutVertices, hqValid, mobAnchored }
}
