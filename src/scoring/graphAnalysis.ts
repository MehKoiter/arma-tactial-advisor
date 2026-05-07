/**
 * Graph analysis utilities — faction-filtered BFS and articulation-point
 * (chokepoint) detection over the CAP adjacency graph.
 *
 * These functions treat the geographic adjacency from `cap.neighbors` as the
 * base graph, and accept a set of "allowed" node IDs to induce a subgraph.
 * Used by the scoring engine so:
 *   - Movement feasibility only counts hops through friendly territory.
 *   - Defensive value rewards holding cut vertices that would split the
 *     friendly network if lost (Reforger-style chain severance).
 *   - Offensive value rewards capturing enemy cut vertices that would split
 *     the enemy network.
 */

import type { CAP } from '@/data/capSchema'

/**
 * BFS hop distance from `startId` to `targetId`, traversing only intermediate
 * nodes whose IDs are in `allowedIntermediate`. The start and target nodes
 * themselves do not need to be in the set.
 */
export function bfsHopsFiltered(
  startId: string,
  targetId: string,
  caps: ReadonlyArray<CAP>,
  allowedIntermediate: ReadonlySet<string>,
): number {
  if (startId === targetId) return 0
  const adj = new Map(caps.map((c) => [c.id, c.neighbors]))
  const visited = new Set<string>([startId])
  const queue: Array<{ id: string; dist: number }> = [{ id: startId, dist: 0 }]
  while (queue.length) {
    const { id, dist } = queue.shift()!
    for (const nb of adj.get(id) ?? []) {
      if (nb === targetId) return dist + 1
      if (visited.has(nb)) continue
      if (!allowedIntermediate.has(nb)) continue
      visited.add(nb)
      queue.push({ id: nb, dist: dist + 1 })
    }
  }
  return Infinity
}

/**
 * Find articulation points (cut vertices) in the subgraph induced by `nodes`.
 * A node is an articulation point if removing it would disconnect at least
 * two other nodes in its connected component.
 *
 * Implementation: iterative Tarjan-style DFS to avoid stack overflow on
 * arbitrary graph sizes.
 */
export function findArticulationPoints(
  caps: ReadonlyArray<CAP>,
  nodes: ReadonlySet<string>,
): Set<string> {
  const adj = new Map<string, string[]>()
  for (const c of caps) {
    if (!nodes.has(c.id)) continue
    adj.set(
      c.id,
      c.neighbors.filter((n) => nodes.has(n)),
    )
  }

  const articulation = new Set<string>()
  const disc = new Map<string, number>()
  const low = new Map<string, number>()
  const parent = new Map<string, string | null>()
  let timer = 0

  // Iterative DFS using an explicit stack of "frames" so we can post-process
  // each child after recursing into it (essential for low-link propagation).
  type Frame = { u: string; iter: number; childCount: number }

  for (const root of nodes) {
    if (disc.has(root)) continue
    parent.set(root, null)
    disc.set(root, timer)
    low.set(root, timer)
    timer++
    const stack: Frame[] = [{ u: root, iter: 0, childCount: 0 }]

    while (stack.length) {
      const frame = stack[stack.length - 1]
      const neighbors = adj.get(frame.u) ?? []
      if (frame.iter < neighbors.length) {
        const v = neighbors[frame.iter++]
        if (!disc.has(v)) {
          frame.childCount++
          parent.set(v, frame.u)
          disc.set(v, timer)
          low.set(v, timer)
          timer++
          stack.push({ u: v, iter: 0, childCount: 0 })
        } else if (v !== parent.get(frame.u)) {
          low.set(frame.u, Math.min(low.get(frame.u)!, disc.get(v)!))
        }
      } else {
        // Done with this node — propagate low to parent and check articulation
        stack.pop()
        const p = parent.get(frame.u)
        if (p != null) {
          low.set(p, Math.min(low.get(p)!, low.get(frame.u)!))
          if (parent.get(p) != null && low.get(frame.u)! >= disc.get(p)!) {
            articulation.add(p)
          }
        }
      }
    }

    // Root is articulation iff it has >1 DFS child
    const rootFirstFrameChildren = (() => {
      // We need to recount root's DFS children since the frame is gone.
      // Simpler: iterate adjacency and count direct children whose parent === root.
      let n = 0
      for (const v of adj.get(root) ?? []) {
        if (parent.get(v) === root) n++
      }
      return n
    })()
    if (rootFirstFrameChildren > 1) articulation.add(root)
  }

  return articulation
}
