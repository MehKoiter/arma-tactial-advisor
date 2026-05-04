import type { CAP } from '@/data/capSchema'
import type { Owner, OwnershipState, PlayerTeam } from '@/state/ownershipReducer'
import type { ScoringConfig, AttackScoringConfig, AttackHeloConfig, TransportHeloConfig, ReinforceConfig } from './scoringConfig'
import type { PositionNote } from '@/data/positionNotes'
import type { SupplyPoint } from '@/data/everonSupplyPoints'
import { bfsHopsFiltered, findArticulationPoints } from './graphAnalysis'
import { analyzeRadioNetwork, type MobAnchor } from './radioNetwork'
import { RADIO_RANGE_METRES } from '@/data/radioConfig'

// Virtual coordinate system: 1 degree = METRES_PER_DEGREE metres (same as mapConfig)
const METRES_PER_DEGREE = 111_320

export interface FactorBreakdown {
  enemyPressure: number
  contestedCentrality: number
  overextensionPenalty: number
  movementFeasibility: number
  /** Bias from nearby position notes. Range [-1, +1]: +1 = all ideal, -1 = all avoid, 0 = no data or neutral. */
  notesBias: number
  /** 1 if this CAP is currently flagged under attack, 0 otherwise. */
  underAttackUrgency: number
  /** Count of neighboring enemy CAPs with the attacking flag set. */
  attackingPressure: number
  /** Normalised [0-1] score based on total supply resources within search radius. */
  supplyProximity: number
  /** 1 if this friendly CAP is a cut vertex in the friendly subgraph (losing it severs the network). */
  chokepoint: number
  /** 1 if this friendly CAP is connected to the HQ-rooted radio network. */
  radioConnected: number
  /** 1 if this friendly CAP is owned but NOT in the HQ-rooted radio network. */
  radioIsolated: number
  /** 1 if this friendly CAP is a cut vertex in the radio subgraph specifically. */
  radioChokepoint: number
}

export interface ScoredCAP {
  cap: CAP
  totalScore: number
  factors: FactorBreakdown
  rationale: string[]
}

// ---------------------------------------------------------------------------
// Individual factor functions
// ---------------------------------------------------------------------------

/** Enemy pressure: count of enemy-owned neighbours of a friendly/neutral CAP. */
export function calcEnemyPressure(cap: CAP, ownership: Record<string, Owner>, enemy: PlayerTeam): number {
  const own = ownership[cap.id] ?? 'neutral'
  if (own === enemy) return 0
  const enemyNeighbors = cap.neighbors.filter((n) => ownership[n] === enemy).length
  return enemyNeighbors
}

/**
 * Contested centrality: ratio of frontline-adjacent neighbours (enemy or neutral)
 * to total neighbours. Range [0, 1]. Distinct from raw enemy-pressure: a CAP
 * surrounded by neutrals (no friendly support) scores high here even with no enemy contact.
 */
export function calcContestedCentrality(cap: CAP, ownership: Record<string, Owner>, enemy: PlayerTeam): number {
  const own = ownership[cap.id] ?? 'neutral'
  if (own === enemy) return 0
  if (!cap.neighbors.length) return 0
  const frontline = cap.neighbors.filter((n) => {
    const o = ownership[n] ?? 'neutral'
    return o === enemy || o === 'neutral'
  }).length
  return frontline / cap.neighbors.length
}

/**
 * Overextension: graded penalty for friendlies cut off behind enemy lines.
 * Returns 0 if <50% of neighbours are enemy, scaling linearly to 1 at 100% enemy.
 */
export function calcOverextension(cap: CAP, ownership: Record<string, Owner>, enemy: PlayerTeam): number {
  if (!cap.neighbors.length) return 0
  const enemyRatio =
    cap.neighbors.filter((n) => ownership[n] === enemy).length / cap.neighbors.length
  if (enemyRatio < 0.5) return 0
  return (enemyRatio - 0.5) * 2 // 0.5 → 0, 1.0 → 1.0
}

/** BFS hop distance from lavPosition. Returns Infinity if unreachable. */
export function bfsHopDistance(
  startId: string,
  targetId: string,
  caps: CAP[],
): number {
  if (startId === targetId) return 0
  const adjMap = new Map(caps.map((c) => [c.id, c.neighbors]))
  const visited = new Set<string>([startId])
  const queue: Array<{ id: string; dist: number }> = [{ id: startId, dist: 0 }]
  while (queue.length) {
    const { id, dist } = queue.shift()!
    for (const neighbor of adjMap.get(id) ?? []) {
      if (neighbor === targetId) return dist + 1
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push({ id: neighbor, dist: dist + 1 })
      }
    }
  }
  return Infinity
}

/** Build the set of CAP IDs the LAV can transit through — same-faction only. */
function buildFriendlyTransitSet(
  caps: ReadonlyArray<CAP>,
  ownership: Record<string, Owner>,
  playerTeam: PlayerTeam,
): Set<string> {
  const s = new Set<string>()
  for (const c of caps) {
    if ((ownership[c.id] ?? 'neutral') === playerTeam) s.add(c.id)
  }
  return s
}

/** Build the set of enemy-held CAP IDs (used for enemy-network chokepoint analysis). */
function buildEnemyHoldSet(
  caps: ReadonlyArray<CAP>,
  ownership: Record<string, Owner>,
  enemy: PlayerTeam,
): Set<string> {
  const s = new Set<string>()
  for (const c of caps) {
    if ((ownership[c.id] ?? 'neutral') === enemy) s.add(c.id)
  }
  return s
}

/**
 * Supply proximity: normalised [0, 1] score based on total resources of supply points
 * within radiusMetres of the CAP. Capped at maxResources (default 10 000).
 */
export function calcSupplyProximity(
  cap: CAP,
  supplyPoints: SupplyPoint[],
  radiusMetres: number,
  maxResources = 10_000,
): number {
  const radiusDeg = radiusMetres / METRES_PER_DEGREE
  const total = supplyPoints.reduce((sum, sp) => {
    const dLng = sp.lng - cap.coords.lng
    const dLat = sp.lat - cap.coords.lat
    return Math.sqrt(dLng * dLng + dLat * dLat) <= radiusDeg ? sum + sp.resources : sum
  }, 0)
  return Math.min(total / maxResources, 1)
}

/**
 * Notes bias: average rating of position notes tagged to this specific CAP, mapped to [-1, +1].
 * avgRating 5 → +1.0, avgRating 3 → 0, avgRating 1 → -1.0.
 * Returns 0 if no notes are tagged to this CAP.
 * The radiusMetres parameter is kept for legacy compatibility but notes are filtered by capId first.
 */
export function calcNotesBias(
  cap: CAP,
  notes: PositionNote[],
  radiusMetres: number,
): number {
  const radiusDeg = radiusMetres / METRES_PER_DEGREE
  const nearby = notes.filter((n) => {
    if (n.capId !== cap.id) return false
    const dLng = n.lng - cap.coords.lng
    const dLat = n.lat - cap.coords.lat
    return Math.sqrt(dLng * dLng + dLat * dLat) <= radiusDeg
  })
  if (nearby.length === 0) return 0
  const avg = nearby.reduce((sum, n) => sum + n.rating, 0) / nearby.length
  return (avg - 3) / 2
}

/**
 * Movement feasibility: bonus if CAP is reachable from LAV within maxFeasibleHops,
 * traversing **only same-faction CAPs** (or, optionally, the target itself for assault).
 *
 * `transitSet` should contain the IDs the LAV can pass through. The start and
 * target nodes are always permitted as endpoints regardless of membership.
 */
export function calcMovementFeasibility(
  cap: CAP,
  lavPosition: string | null,
  caps: CAP[],
  maxHops: number,
  transitSet?: ReadonlySet<string>,
): number {
  if (!lavPosition) return 0
  const dist = transitSet
    ? bfsHopsFiltered(lavPosition, cap.id, caps, transitSet)
    : bfsHopDistance(lavPosition, cap.id, caps)
  if (dist === Infinity || dist > maxHops) return 0
  // Linear decay: closer = more bonus
  return (maxHops - dist + 1) / (maxHops + 1)
}

// ---------------------------------------------------------------------------
// Main scorer
// ---------------------------------------------------------------------------

export type FactionMobs = Partial<Record<PlayerTeam, MobAnchor>>

export function scoreCandidates(
  caps: CAP[],
  ownershipState: OwnershipState,
  config: ScoringConfig,
  notes: PositionNote[] = [],
  supplyPoints: SupplyPoint[] = [],
  mobs: FactionMobs = {},
): ScoredCAP[] {
  const { ownership, lavPosition, playerTeam, underAttack, attacking } = ownershipState
  const enemy: PlayerTeam = playerTeam === 'US' ? 'RUS' : 'US'

  // Pre-compute graph-derived sets once per scoring pass.
  const friendlySet = buildFriendlyTransitSet(caps, ownership, playerTeam)
  const friendlyChokepoints = findArticulationPoints(caps, friendlySet)

  // Radio-network analysis for the player faction. MOBs act as built-in
  // always-on radio relays, so we feed the placed MOB (if any) as the anchor.
  const myMob = mobs[playerTeam] ?? null
  const radioAnalysis = analyzeRadioNetwork(caps, ownershipState, playerTeam, undefined, myMob)
  const radioActive = radioAnalysis.hqValid || radioAnalysis.mobAnchored || radioAnalysis.onlineSet.size >= 2

  const scored: ScoredCAP[] = caps
    .filter((cap) => {
      const own = ownership[cap.id] ?? 'neutral'
      // Only recommend friendly-held CAPs
      return own === playerTeam
    })
    .map((cap) => {
      const enemyPressure = calcEnemyPressure(cap, ownership, enemy)
      const contestedCentrality = calcContestedCentrality(cap, ownership, enemy)
      const overextension = calcOverextension(cap, ownership, enemy)
      const movementFeasibility = calcMovementFeasibility(cap, lavPosition, caps, config.maxFeasibleHops, friendlySet)
      const notesBias = calcNotesBias(cap, notes, config.notesSearchRadiusMetres)
      const supplyProximity = calcSupplyProximity(cap, supplyPoints, config.supplyProximityRadiusMetres)
      const chokepoint = friendlyChokepoints.has(cap.id) ? 1 : 0

      // Radio-network factors — only contribute when the player has a real network.
      const onNetwork = radioAnalysis.onlineSet.has(cap.id)
      const radioConnected = radioActive && onNetwork ? 1 : 0
      const radioIsolated = radioActive && !onNetwork ? 1 : 0
      const radioChokepoint = radioActive && radioAnalysis.cutVertices.has(cap.id) ? 1 : 0

      // Live-battle factors from manual flags
      const underAttackUrgency = underAttack.has(cap.id) ? 1 : 0
      const attackingPressure = cap.neighbors.filter(
        (n) => (ownership[n] ?? 'neutral') === enemy && attacking.has(n)
      ).length

      const totalScore =
        enemyPressure * config.enemyPressureWeight +
        contestedCentrality * config.contestedCentralityWeight -
        overextension * config.overextensionPenalty +
        movementFeasibility * config.movementFeasibilityWeight +
        notesBias * config.notesBiasWeight +
        underAttackUrgency * config.underAttackUrgencyWeight +
        attackingPressure * config.attackingNeighborWeight +
        supplyProximity * config.supplyProximityWeight +
        chokepoint * config.chokepointWeight +
        radioConnected * config.radioConnectedWeight -
        radioIsolated * config.radioIsolatedPenalty +
        radioChokepoint * config.radioChokepointWeight

      const rationale: string[] = []
      if (enemyPressure > 0)
        rationale.push(`${enemyPressure} adjacent enemy CAP(s) — high pressure zone`)
      if (contestedCentrality > 0.5)
        rationale.push('Mostly bordered by neutral / enemy CAPs — frontline position')
      if (overextension > 0)
        rationale.push(overextension >= 1
          ? 'Surrounded by enemy — overextension risk'
          : 'Mostly surrounded by enemy — overextension risk')
      if (movementFeasibility > 0)
        rationale.push(`Reachable from current LAV position via the CAP graph (≤ ${config.maxFeasibleHops} adjacent CAPs)`)
      if (chokepoint)
        rationale.push('Chokepoint — losing this CAP would split the friendly network')
      if (radioChokepoint)
        rationale.push('Radio chokepoint — losing this CAP severs allies from HQ')
      if (radioIsolated)
        rationale.push('Off the radio network — cannot spawn or resupply; consider abandoning')
      else if (radioConnected)
        rationale.push('On the HQ radio network — active spawn/supply node')
      if (notesBias > 0.15)
        rationale.push(`Field notes rate this area positively (avg ${(notesBias * 2 + 3).toFixed(1)}/5)`)
      else if (notesBias < -0.15)
        rationale.push(`Field notes flag this area as risky (avg ${(notesBias * 2 + 3).toFixed(1)}/5)`)
      if (underAttackUrgency)
        rationale.push('⚠ Under active attack — urgent LAV support needed')
      if (attackingPressure > 0)
        rationale.push(`${attackingPressure} neighboring enemy CAP(s) flagged as attacking — coordinated push`)
      if (supplyProximity > 0.1)
        rationale.push('Near supply depot(s) — strategic asset worth defending')
      if (rationale.length === 0)
        rationale.push('Low activity zone — safe repositioning option')

      return {
        cap,
        totalScore,
        factors: { enemyPressure, contestedCentrality, overextensionPenalty: overextension, movementFeasibility, notesBias, underAttackUrgency, attackingPressure, supplyProximity, chokepoint, radioConnected, radioIsolated, radioChokepoint },
        rationale,
      }
    })

  return scored.sort((a, b) => b.totalScore - a.totalScore).slice(0, config.topN)
}

// ---------------------------------------------------------------------------
// Attack scorer
// ---------------------------------------------------------------------------

export interface AttackScoredCAP {
  cap: CAP
  totalScore: number
  rationale: string[]
  attackFactors: {
    friendlySupport: number
    isolation: number
    movementFeasibility: number
    majorBonus: number
    notesBias: number
    momentum: number
    reliefValue: number
    supplyProximity: number
    /** 1 if this enemy CAP is a cut vertex in the enemy subgraph — capturing severs their network. */
    chokepoint: number
    /** 1 if this enemy CAP is a cut vertex in the enemy radio subgraph specifically. */
    enemyRadioChokepoint: number
    /** 1 if this enemy CAP is offline (not in the enemy HQ-rooted radio network). */
    enemyOffline: number
    /** 1 if no friendly *online* CAP borders this target (player has no projection). */
    noProjection: number
    /** 1 if no friendly online CAP (or MOB) is within radio range of this target. */
    outOfRadioRange: number
  }
}

/**
 * Ranks enemy CAPs adjacent to at least one friendly CAP as attack targets.
 * Higher score = better opportunity to assault.
 */
export function scoreAttackCandidates(
  caps: CAP[],
  ownershipState: OwnershipState,
  config: AttackScoringConfig,
  notes: PositionNote[] = [],
  supplyPoints: SupplyPoint[] = [],
  mobs: FactionMobs = {},
): AttackScoredCAP[] {
  const { ownership, lavPosition, playerTeam, underAttack, attacking } = ownershipState
  const enemy: PlayerTeam = playerTeam === 'US' ? 'RUS' : 'US'

  // Friendly transit graph (LAV can drive through friendly CAPs to the assault target).
  const friendlySet = buildFriendlyTransitSet(caps, ownership, playerTeam)
  // Enemy chokepoints — capturing one severs their network.
  const enemySet = buildEnemyHoldSet(caps, ownership, enemy)
  const enemyChokepoints = findArticulationPoints(caps, enemySet)

  // Radio-network analyses for both factions, with MOB anchors.
  const myMob = mobs[playerTeam] ?? null
  const enemyMob = mobs[enemy] ?? null
  const myRadio = analyzeRadioNetwork(caps, ownershipState, playerTeam, undefined, myMob)
  const enemyRadio = analyzeRadioNetwork(caps, ownershipState, enemy, undefined, enemyMob)
  const myRadioActive = myRadio.hqValid || myRadio.mobAnchored || myRadio.onlineSet.size >= 2
  const enemyRadioActive = enemyRadio.hqValid || enemyRadio.mobAnchored || enemyRadio.onlineSet.size >= 2

  // Pre-resolve coordinates of friendly online CAPs for radio-range tests
  // against attack targets. The MOB (if placed) is also a valid radio anchor.
  const onlineCoords: { lng: number; lat: number }[] = []
  for (const id of myRadio.onlineSet) {
    const c = caps.find((x) => x.id === id)
    if (c) onlineCoords.push(c.coords)
  }
  if (myMob) onlineCoords.push({ lng: myMob.lng, lat: myMob.lat })

  const scored = caps
    .filter((cap) => {
      // Must be enemy-held
      if ((ownership[cap.id] ?? 'neutral') !== enemy) return false
      // Must border at least one friendly CAP (frontline target)
      return cap.neighbors.some((n) => (ownership[n] ?? 'neutral') === playerTeam)
    })
    .map((cap) => {
      const totalNeighbors = cap.neighbors.length || 1

      // How many friendly CAPs border this target (attack support angles)
      const friendlyNeighbors = cap.neighbors.filter((n) => (ownership[n] ?? 'neutral') === playerTeam).length
      const friendlySupport = friendlyNeighbors / totalNeighbors

      // Isolation: 1 - ratio of enemy neighbors (fewer enemy reinforcers = easier to hold)
      const enemyNeighbors = cap.neighbors.filter((n) => (ownership[n] ?? 'neutral') === enemy).length
      const isolation = 1 - enemyNeighbors / totalNeighbors

      // Reachability from LAV — drives only through friendly territory; target is the endpoint exception
      const movementFeasibility = calcMovementFeasibility(cap, lavPosition, caps, config.maxFeasibleHops, friendlySet)

      // Major base bonus
      const majorBonus = cap.type === 'major' ? 1 : 0

      // Field notes near the target
      const notesBias = calcNotesBias(cap, notes, config.notesSearchRadiusMetres)
      const supplyProximity = calcSupplyProximity(cap, supplyPoints, config.supplyProximityRadiusMetres)

      // Live-battle factors from manual flags
      const momentum = attacking.has(cap.id) ? 1 : 0
      const relievedNeighbors = cap.neighbors.filter(
        (n) => (ownership[n] ?? 'neutral') === playerTeam && underAttack.has(n)
      ).length
      // Cap relief at 1.0 so a single bordering ally under attack saturates;
      // additional ones provide diminishing returns rather than runaway score.
      const reliefValue = Math.min(relievedNeighbors, 1)

      // Capturing a cut vertex in the enemy subgraph severs their chain — high strategic value.
      const chokepoint = enemyChokepoints.has(cap.id) ? 1 : 0

      // Radio-network factors
      const enemyRadioChokepoint = enemyRadioActive && enemyRadio.cutVertices.has(cap.id) ? 1 : 0
      const enemyOffline = enemyRadioActive && !enemyRadio.onlineSet.has(cap.id) ? 1 : 0
      // Soft penalty when the player has a network but no online CAP borders this target.
      const noProjection =
        myRadioActive &&
        !cap.neighbors.some((n) => myRadio.onlineSet.has(n))
          ? 1
          : 0

      // Soft penalty when the target is outside radio range of every friendly
      // online CAP/MOB. Captured ground we can't cover by radio is hard to hold.
      const outOfRadioRange = (() => {
        if (!myRadioActive) return 0
        if (onlineCoords.length === 0) return 1
        for (const oc of onlineCoords) {
          const dx = (cap.coords.lng - oc.lng) * METRES_PER_DEGREE
          const dy = (cap.coords.lat - oc.lat) * METRES_PER_DEGREE
          if (Math.hypot(dx, dy) <= RADIO_RANGE_METRES) return 0
        }
        return 1
      })()

      const totalScore =
        friendlySupport  * config.friendlySupportWeight +
        isolation        * config.isolationWeight +
        movementFeasibility * config.movementFeasibilityWeight +
        majorBonus       * config.majorBaseBonus +
        notesBias        * config.notesBiasWeight +
        momentum         * config.momentumWeight +
        reliefValue      * config.reliefWeight +
        supplyProximity  * config.supplyProximityWeight +
        chokepoint       * config.chokepointWeight +
        enemyRadioChokepoint * config.enemyRadioChokepointWeight +
        enemyOffline     * config.enemyOfflineWeight -
        noProjection     * config.noProjectionPenalty -
        outOfRadioRange  * config.outOfRadioRangePenalty

      const rationale: string[] = []
      if (friendlyNeighbors > 0)
        rationale.push(`${friendlyNeighbors} friendly neighbor(s) — supported assault`)
      if (isolation >= 0.6)
        rationale.push('Isolated from enemy support — easier to hold after capture')
      else if (isolation < 0.3)
        rationale.push('Heavy enemy reinforcement risk — coordinate carefully')
      if (movementFeasibility > 0)
        rationale.push(`LAV can reach via ≤ ${config.maxFeasibleHops} adjacent CAPs`)
      if (majorBonus)
        rationale.push('Major base — high strategic value')
      if (notesBias > 0.15)
        rationale.push(`Good nearby firing positions (avg ${(notesBias * 2 + 3).toFixed(1)}/5)`)
      else if (notesBias < -0.15)
        rationale.push(`Poor nearby firing positions (avg ${(notesBias * 2 + 3).toFixed(1)}/5)`)
      if (momentum)
        rationale.push('Flagged as active assault target — player intent')
      if (relievedNeighbors > 0)
        rationale.push(relievedNeighbors === 1
          ? 'Capturing this relieves pressure on a friendly CAP under attack'
          : `Capturing this relieves pressure on ${relievedNeighbors} friendly CAPs under attack`)
      if (supplyProximity > 0.1)
        rationale.push('Near supply depot(s) — capturing grants resupply access')
      if (chokepoint)
        rationale.push('Enemy chokepoint — capturing severs their network chain')
      if (enemyRadioChokepoint)
        rationale.push('Enemy radio chokepoint — capturing severs their HQ chain')
      if (enemyOffline)
        rationale.push('Enemy CAP is offline — no spawn/resupply; soft target')
      if (noProjection)
        rationale.push('No friendly online CAP adjacent — limited assault projection')
      if (outOfRadioRange)
        rationale.push('📡 Out of radio range — no friendly online CAP/MOB can cover this target')

      return { cap, totalScore, rationale, attackFactors: { friendlySupport, isolation, movementFeasibility, majorBonus, notesBias, momentum, reliefValue, supplyProximity, chokepoint, enemyRadioChokepoint, enemyOffline, noProjection, outOfRadioRange } }
    })

  return scored.sort((a, b) => b.totalScore - a.totalScore).slice(0, config.topN)
}

// ---------------------------------------------------------------------------
// Straight-line range utility (used by helo scorers)
// ---------------------------------------------------------------------------

function straightLineRangeScore(
  cap: CAP,
  lavPosition: string | null,
  caps: CAP[],
  maxRangeMetres: number,
): number {
  if (!lavPosition) return 0
  const origin = caps.find((c) => c.id === lavPosition)
  if (!origin) return 0
  const dLng = cap.coords.lng - origin.coords.lng
  const dLat = cap.coords.lat - origin.coords.lat
  const distMetres = Math.sqrt(dLng * dLng + dLat * dLat) * 111_320
  if (distMetres > maxRangeMetres) return 0
  return (maxRangeMetres - distMetres) / maxRangeMetres
}

// ---------------------------------------------------------------------------
// Attack helicopter — strike target scorer
// ---------------------------------------------------------------------------

export interface StrikeScoredCAP {
  cap: CAP
  totalScore: number
  rationale: string[]
  strikeFactors: {
    enemyDensity: number
    majorBonus: number
    momentum: number
    casRelief: number
    rangeScore: number
    notesBias: number
    supplyProximity: number
  }
}

/**
 * Ranks enemy CAPs as strike targets for attack helicopter pilots.
 * Prioritises dense enemy clusters, active ground assaults needing CAS,
 * and CAPs relieving friendly units under attack.
 */
export function scoreStrikeTargets(
  caps: CAP[],
  ownershipState: OwnershipState,
  config: AttackHeloConfig,
  notes: PositionNote[] = [],
  supplyPoints: SupplyPoint[] = [],
): StrikeScoredCAP[] {
  const { ownership, lavPosition, playerTeam, underAttack, attacking } = ownershipState
  const enemy: PlayerTeam = playerTeam === 'US' ? 'RUS' : 'US'

  const scored = caps
    .filter((cap) => (ownership[cap.id] ?? 'neutral') === enemy)
    .map((cap) => {
      // How many of this CAP's neighbors are also enemy — dense cluster = juicy target
      const enemyDensity = cap.neighbors.filter((n) => (ownership[n] ?? 'neutral') === enemy).length

      const majorBonus = cap.type === 'major' ? 1 : 0

      // Ground forces are already assaulting this target — provide CAS
      const momentum = attacking.has(cap.id) ? 1 : 0

      // Capturing/suppressing this relieves nearby friendlies under attack
      const casRelief = cap.neighbors.filter(
        (n) => (ownership[n] ?? 'neutral') === playerTeam && underAttack.has(n),
      ).length

      const rangeScore = straightLineRangeScore(cap, lavPosition, caps, config.maxRangeMetres)
      const notesBias = calcNotesBias(cap, notes, config.notesSearchRadiusMetres)
      const supplyProximity = calcSupplyProximity(cap, supplyPoints, config.supplyProximityRadiusMetres)

      const totalScore =
        enemyDensity  * config.enemyDensityWeight +
        majorBonus    * config.majorBaseBonus +
        momentum      * config.momentumWeight +
        casRelief     * config.casReliefWeight +
        rangeScore    * config.rangeWeight +
        notesBias     * config.notesBiasWeight +
        supplyProximity * config.supplyProximityWeight

      const rationale: string[] = []
      if (enemyDensity > 0)
        rationale.push(`${enemyDensity} enemy-held neighbor(s) — high-value cluster`)
      if (majorBonus)
        rationale.push('Major base — priority strike target')
      if (momentum)
        rationale.push('⚔ Ground assault in progress — CAS requested')
      if (casRelief > 0)
        rationale.push(`Suppressing this relieves ${casRelief} friendly CAP(s) under attack`)
      if (rangeScore > 0)
        rationale.push(`Within strike range from current position`)
      if (notesBias > 0.15)
        rationale.push(`Good approach corridor (avg ${(notesBias * 2 + 3).toFixed(1)}/5)`)
      else if (notesBias < -0.15)
        rationale.push(`Known AA threat in area (avg ${(notesBias * 2 + 3).toFixed(1)}/5)`)
      if (supplyProximity > 0.1)
        rationale.push('Near supply depot(s) — strike denies enemy resupply')

      return { cap, totalScore, rationale, strikeFactors: { enemyDensity, majorBonus, momentum, casRelief, rangeScore, notesBias, supplyProximity } }
    })

  return scored.sort((a, b) => b.totalScore - a.totalScore).slice(0, config.topN)
}

// ---------------------------------------------------------------------------
// Transport helicopter — resupply / troop-drop scorer
// ---------------------------------------------------------------------------

export interface ResupplyScoredCAP {
  cap: CAP
  totalScore: number
  rationale: string[]
  resupplyFactors: {
    underAttackBonus: number
    frontlineScore: number
    majorBonus: number
    rangeScore: number
    notesBias: number
    supplyProximity: number
  }
}

/**
 * Ranks friendly CAPs as priority landing zones for transport helicopter pilots.
 * Prioritises bases under attack, frontline positions, and major bases.
 */
export function scoreResupplyTargets(
  caps: CAP[],
  ownershipState: OwnershipState,
  config: TransportHeloConfig,
  notes: PositionNote[] = [],
  supplyPoints: SupplyPoint[] = [],
): ResupplyScoredCAP[] {
  const { ownership, lavPosition, playerTeam, underAttack } = ownershipState
  const enemy: PlayerTeam = playerTeam === 'US' ? 'RUS' : 'US'

  const scored = caps
    .filter((cap) => (ownership[cap.id] ?? 'neutral') === playerTeam)
    .map((cap) => {
      // Under active attack — highest priority resupply
      const underAttackBonus = underAttack.has(cap.id) ? 1 : 0

      // How many enemy neighbors — frontline pressure
      const enemyNeighbors = cap.neighbors.filter((n) => (ownership[n] ?? 'neutral') === enemy).length
      const frontlineScore = enemyNeighbors / (cap.neighbors.length || 1)

      const majorBonus = cap.type === 'major' ? 1 : 0

      const rangeScore = straightLineRangeScore(cap, lavPosition, caps, config.maxRangeMetres)
      const notesBias = calcNotesBias(cap, notes, config.notesSearchRadiusMetres)
      const supplyProximity = calcSupplyProximity(cap, supplyPoints, config.supplyProximityRadiusMetres)

      const totalScore =
        underAttackBonus * config.underAttackBonus +
        frontlineScore   * config.frontlineWeight +
        majorBonus       * config.majorBaseBonus +
        rangeScore       * config.rangeWeight +
        notesBias        * config.notesBiasWeight +
        supplyProximity  * config.supplyProximityWeight

      const rationale: string[] = []
      if (underAttackBonus)
        rationale.push('⚠ Under active attack — urgent troop drop needed')
      if (enemyNeighbors > 0)
        rationale.push(`${enemyNeighbors} enemy-adjacent neighbor(s) — frontline LZ`)
      if (majorBonus)
        rationale.push('Major base — large reinforcement capacity')
      if (rangeScore > 0)
        rationale.push('Within transport range from current position')
      if (notesBias > 0.15)
        rationale.push(`Good LZ conditions (avg ${(notesBias * 2 + 3).toFixed(1)}/5)`)
      else if (notesBias < -0.15)
        rationale.push(`Hazardous LZ conditions (avg ${(notesBias * 2 + 3).toFixed(1)}/5)`)
      if (supplyProximity > 0.1)
        rationale.push('Near supply depot(s) — troops can rearm locally')
      if (rationale.length === 0)
        rationale.push('Rear-area base — safe reinforcement option')

      return { cap, totalScore, rationale, resupplyFactors: { underAttackBonus, frontlineScore, majorBonus, rangeScore, notesBias, supplyProximity } }
    })

  return scored.sort((a, b) => b.totalScore - a.totalScore).slice(0, config.topN)
}

// ---------------------------------------------------------------------------
// Transport helicopter — reinforce / assault staging scorer
// ---------------------------------------------------------------------------

export interface ReinforceScoredCAP {
  cap: CAP
  totalScore: number
  rationale: string[]
  reinforceFactors: {
    isolation: number
    majorBonus: number
    friendlySupport: number
    rangeScore: number
    notesBias: number
    supplyProximity: number
  }
}

/**
 * Ranks enemy CAPs currently being assaulted (attacking flag set) as reinforcement drop targets.
 * Only CAPs with the attacking flag are shown. Ranks by isolation (capture probability),
 * friendly support, base value, and helo range.
 */
export function scoreReinforceTargets(
  caps: CAP[],
  ownershipState: OwnershipState,
  config: ReinforceConfig,
  notes: PositionNote[] = [],
  supplyPoints: SupplyPoint[] = [],
): ReinforceScoredCAP[] {
  const { ownership, lavPosition, playerTeam, attacking } = ownershipState
  const enemy: PlayerTeam = playerTeam === 'US' ? 'RUS' : 'US'

  const scored = caps
    .filter((cap) => (ownership[cap.id] ?? 'neutral') === enemy && attacking.has(cap.id))
    .map((cap) => {
      // How isolated is this target — fewer enemy neighbors = easier to hold after capture
      const enemySupporters = cap.neighbors.filter((n) => (ownership[n] ?? 'neutral') === enemy).length
      const isolation = cap.neighbors.length
        ? 1 - enemySupporters / cap.neighbors.length
        : 1

      const majorBonus = cap.type === 'major' ? 1 : 0

      // How many friendly CAPs are adjacent — more = better troop landing support
      const friendlySupport = cap.neighbors.filter((n) => (ownership[n] ?? 'neutral') === playerTeam).length

      const rangeScore = straightLineRangeScore(cap, lavPosition, caps, config.maxRangeMetres)
      const notesBias = calcNotesBias(cap, notes, config.notesSearchRadiusMetres)
      const supplyProximity = calcSupplyProximity(cap, supplyPoints, config.supplyProximityRadiusMetres)

      const totalScore =
        isolation      * config.isolatedTargetWeight +
        majorBonus     * config.majorOpportunityBonus +
        friendlySupport * config.friendlySupportWeight +
        rangeScore     * config.rangeWeight +
        notesBias      * config.notesBiasWeight +
        supplyProximity * config.supplyProximityWeight

      const rationale: string[] = []
      rationale.push('⚔ Active assault — troop drop will reinforce capture')
      if (isolation >= 0.6)
        rationale.push('Target is isolated — high capture probability')
      else if (isolation < 0.4)
        rationale.push('Enemy reinforcements nearby — act quickly')
      if (majorBonus)
        rationale.push('Major base — high strategic value')
      if (friendlySupport > 0)
        rationale.push(`${friendlySupport} friendly CAP(s) adjacent — good landing support`)
      if (rangeScore > 0)
        rationale.push('Within transport range from current position')
      if (notesBias > 0.15)
        rationale.push(`Good LZ conditions (avg ${(notesBias * 2 + 3).toFixed(1)}/5)`)
      else if (notesBias < -0.15)
        rationale.push(`Poor LZ conditions (avg ${(notesBias * 2 + 3).toFixed(1)}/5)`)
      if (supplyProximity > 0.1)
        rationale.push('Near supply depot(s) — high-value capture target')

      return { cap, totalScore, rationale, reinforceFactors: { isolation, majorBonus, friendlySupport, rangeScore, notesBias, supplyProximity } }
    })

  return scored.sort((a, b) => b.totalScore - a.totalScore).slice(0, config.topN)
}
