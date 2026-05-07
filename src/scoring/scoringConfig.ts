/**
 * Scoring configuration — all weights are tunable without code changes.
 * Adjust values in this file to re-balance tactical recommendations.
 */
export interface ScoringConfig {
  /** Weight for enemy-adjacent CAPs (enemy pressure / opportunity) */
  enemyPressureWeight: number
  /** Weight for centrality (number of contested+enemy neighbors) */
  contestedCentralityWeight: number
  /** Penalty multiplier for CAPs surrounded by enemy (overextension) */
  overextensionPenalty: number
  /** Bonus for CAPs reachable from LAV position within N hops */
  movementFeasibilityWeight: number
  /** Max hop distance considered "feasible" for movement bonus */
  maxFeasibleHops: number
  /**
   * Weight applied to the position-notes bias factor.
   * Bias is derived from the average rating of notes near a CAP, mapped to [-1, +1]:
   *   rating 5 → +1.0 (boost), rating 3 → 0 (neutral), rating 1 → -1.0 (penalty).
   */
  notesBiasWeight: number
  /**
   * Urgency multiplier when a friendly CAP is actively flagged as under attack.
   * Adds a flat bonus equal to this weight, pushing the CAP to the top of defend recommendations.
   */
  underAttackUrgencyWeight: number
  /**
   * Bonus per neighboring enemy CAP that has the "attacking" flag set.
   * Reflects coordinated enemy pressure toward this friendly CAP.
   */
  attackingNeighborWeight: number
  /** Bonus for CAPs near supply depots — strategic asset access */
  supplyProximityWeight: number
  /** Radius in metres to search for nearby supply depots */
  supplyProximityRadiusMetres: number
  /**
   * Bonus for friendly CAPs that are cut vertices in the friendly subgraph —
   * losing them would sever the network. (Reforger-style chokepoint defence.)
   */
  chokepointWeight: number
  /**
   * Bonus for friendly CAPs that are part of the HQ-connected radio network.
   * Reflects the fact that connected bases can spawn troops & receive supply.
   */
  radioConnectedWeight: number
  /**
   * Penalty for friendly CAPs that are NOT connected to the HQ radio network.
   * Soft signal — isolated bases are functionally compromised.
   */
  radioIsolatedPenalty: number
  /**
   * Bonus for friendly CAPs that are cut vertices specifically in the radio
   * subgraph — losing them disconnects part of the chain from HQ.
   */
  radioChokepointWeight: number
  /** How many top recommendations to return */
  topN: number
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  enemyPressureWeight: 3.0,
  contestedCentralityWeight: 2.5, // ratio [0,1]; weight tuned up since values are smaller
  overextensionPenalty: 3.0, // graded [0,1]; meaningful penalty when deep in enemy territory
  movementFeasibilityWeight: 1.5,
  maxFeasibleHops: 3,
  notesBiasWeight: 2.0,
  underAttackUrgencyWeight: 4.0,
  attackingNeighborWeight: 2.0,
  supplyProximityWeight: 1.5,
  supplyProximityRadiusMetres: 1500,
  chokepointWeight: 3.5, // strong signal — cut vertices are critical
  radioConnectedWeight: 2.0, // online bases are worth defending
  radioIsolatedPenalty: 2.5, // isolated bases are write-offs
  radioChokepointWeight: 4.5, // sharper than topology — the Reforger sever
  topN: 3, // condensed list — quality over quantity
}

/**
 * Scoring configuration for attack target ranking.
 */
export interface AttackScoringConfig {
  /** Bonus for each friendly CAP neighboring the target (attack angles) */
  friendlySupportWeight: number
  /**
   * Bonus for target isolation: 1 - (enemyNeighbors / totalNeighbors).
   * High value = fewer enemy CAPs can reinforce — easier to hold after capture.
   */
  isolationWeight: number
  /** Bonus for reachability from LAV position */
  movementFeasibilityWeight: number
  /** Max hop distance considered feasible */
  maxFeasibleHops: number
  /** Bonus for major bases over minor */
  majorBaseBonus: number
  /** Weight for positive field notes near the target */
  notesBiasWeight: number
  /**
   * Bonus when the target enemy CAP already has the "attacking" flag set.
   * Rewards maintaining momentum on an active assault.
   */
  momentumWeight: number
  /**
   * Bonus per neighboring friendly CAP that is currently under attack.
   * Capturing this enemy CAP would relieve pressure on those friendlies.
   */
  reliefWeight: number
  /** Bonus for enemy CAPs near supply depots — capturing grants resupply access */
  supplyProximityWeight: number
  supplyProximityRadiusMetres: number
  /**
   * Bonus for capturing an enemy cut vertex — severs the enemy network.
   * (Reforger-style chain-cut play.)
   */
  chokepointWeight: number
  /**
   * Bonus for capturing an enemy radio cut vertex — severs their HQ chain.
   * Sharper than the topology-only chokepoint.
   */
  enemyRadioChokepointWeight: number
  /**
   * Bonus for attacking enemy CAPs that are offline (not connected to enemy HQ).
   * Easy marks — they can't reinforce or spawn troops.
   */
  enemyOfflineWeight: number
  /**
   * Penalty when no friendly *online* CAP borders this target. We can't
   * sustain an assault without a connected staging base nearby.
   */
  noProjectionPenalty: number
  /**
   * Penalty when no friendly online CAP (or friendly MOB) is within radio
   * range of the target. Without coverage, captured ground can't be held.
   */
  outOfRadioRangePenalty: number
  /** How many top attack recommendations to return */
  topN: number
}

export const DEFAULT_ATTACK_CONFIG: AttackScoringConfig = {
  friendlySupportWeight: 2.5,
  isolationWeight: 2.0,
  movementFeasibilityWeight: 1.5,
  maxFeasibleHops: 4,
  majorBaseBonus: 1.5,
  notesBiasWeight: 2.0,
  // Soft tiebreaker for player-flagged targets, not a runaway boost.
  momentumWeight: 1.0,
  // Capped at 1.0 in the engine, so this is the ceiling, not multiplied per ally.
  reliefWeight: 2.5,
  supplyProximityWeight: 2.0,
  supplyProximityRadiusMetres: 1500,
  chokepointWeight: 3.0,
  enemyRadioChokepointWeight: 4.5, // headline play — sever the enemy chain
  enemyOfflineWeight: 2.5, // offline bases are easy captures
  noProjectionPenalty: 2.0, // soft — still listed, just downranked
  outOfRadioRangePenalty: 3.5, // soft — stronger than projection, weaker than chokepoint
  topN: 3, // condensed list
}

// ---------------------------------------------------------------------------
// Attack helicopter — strike targeting config
// ---------------------------------------------------------------------------

/**
 * Scoring config for attack helicopter strike target selection.
 * Uses straight-line range instead of BFS hops.
 */
export interface AttackHeloConfig {
  /** Bonus per enemy CAP neighbor — dense clusters are priority targets */
  enemyDensityWeight: number
  /** Bonus for high-value (major) bases */
  majorBaseBonus: number
  /** Bonus when this CAP is already flagged as being attacked (support ground assault) */
  momentumWeight: number
  /** Bonus per neighboring friendly CAP that is under attack (air CAS) */
  casReliefWeight: number
  /** Bonus for reachability within maxRangeMetres straight-line */
  rangeWeight: number
  /** Maximum straight-line range in metres from LAV/spawn position */
  maxRangeMetres: number
  /** Weight for positive field notes near target */
  notesBiasWeight: number
  /** Bonus for enemy CAPs near supply depots — denies enemy resupply */
  supplyProximityWeight: number
  supplyProximityRadiusMetres: number
  topN: number
}

export const DEFAULT_ATTACK_HELO_CONFIG: AttackHeloConfig = {
  enemyDensityWeight: 2.5,
  majorBaseBonus: 2.0,
  momentumWeight: 3.0,
  casReliefWeight: 3.5,
  rangeWeight: 1.5,
  maxRangeMetres: 8000,
  notesBiasWeight: 1.5,
  supplyProximityWeight: 1.5,
  supplyProximityRadiusMetres: 2000,
  topN: 5,
}

// ---------------------------------------------------------------------------
// Transport helicopter — resupply / troop-drop config
// ---------------------------------------------------------------------------

/**
 * Scoring config for transport helicopter landing zone prioritisation.
 */
export interface TransportHeloConfig {
  /** High bonus if LZ is currently under attack — priority resupply */
  underAttackBonus: number
  /** Bonus per neighboring enemy CAP — frontline LZ needs reinforcement */
  frontlineWeight: number
  /** Bonus for major bases — larger troop capacity */
  majorBaseBonus: number
  /** Reachability bonus within maxRangeMetres straight-line */
  rangeWeight: number
  /** Maximum straight-line range in metres */
  maxRangeMetres: number
  /** Weight for positive field notes near LZ */
  notesBiasWeight: number
  /** Bonus for friendly LZs near supply depots — troops can rearm locally */
  supplyProximityWeight: number
  supplyProximityRadiusMetres: number
  topN: number
}

export const DEFAULT_TRANSPORT_HELO_CONFIG: TransportHeloConfig = {
  underAttackBonus: 5.0,
  frontlineWeight: 2.0,
  majorBaseBonus: 1.5,
  rangeWeight: 1.0,
  maxRangeMetres: 10000,
  notesBiasWeight: 1.0,
  supplyProximityWeight: 2.0,
  supplyProximityRadiusMetres: 1000,
  topN: 5,
}

// ---------------------------------------------------------------------------
// Transport helicopter — reinforce / assault staging config
// ---------------------------------------------------------------------------

/**
 * Scoring config for selecting friendly LZs to stage troop assaults from.
 * Ranks friendly CAPs adjacent to capturable enemy positions.
 */
export interface ReinforceConfig {
  /** Bonus for isolated targets — fewer enemy reinforcers = easier to hold */
  isolatedTargetWeight: number
  /** Bonus for major bases */
  majorOpportunityBonus: number
  /** Bonus per adjacent friendly CAP — better landing support */
  friendlySupportWeight: number
  /** Reachability bonus within maxRangeMetres straight-line */
  rangeWeight: number
  /** Maximum straight-line range in metres from spawn */
  maxRangeMetres: number
  /** Weight for positive field notes near the target */
  notesBiasWeight: number
  /** Bonus for enemy CAPs near supply depots — high-value capture target */
  supplyProximityWeight: number
  supplyProximityRadiusMetres: number
  topN: number
}

export const DEFAULT_REINFORCE_CONFIG: ReinforceConfig = {
  isolatedTargetWeight: 3.0,
  majorOpportunityBonus: 2.0,
  friendlySupportWeight: 2.0,
  rangeWeight: 1.0,
  maxRangeMetres: 10000,
  notesBiasWeight: 1.0,
  supplyProximityWeight: 2.0,
  supplyProximityRadiusMetres: 1500,
  topN: 5,
}

// ---------------------------------------------------------------------------
// Infantry — on-foot squad config
// ---------------------------------------------------------------------------

/**
 * Scoring config for ranking friendly CAPs an infantry squad should garrison.
 */
export interface InfantryDefendConfig {
  /** High bonus when the friendly CAP is currently under attack. */
  underAttackBonus: number
  /** Bonus per enemy-adjacent neighbor — frontline garrison priority. */
  frontlineWeight: number
  /** Bonus for major bases — more buildings to fortify. */
  majorBaseBonus: number
  /** Reachability within maxRangeMetres straight-line from squad position. */
  rangeWeight: number
  /** Maximum on-foot operating range in metres. */
  maxRangeMetres: number
  /** Notes-bias weight (uses position notes tagged for INFANTRY). */
  notesBiasWeight: number
  /** Bonus for friendly CAPs near supply caches — squad can rearm locally. */
  supplyProximityWeight: number
  supplyProximityRadiusMetres: number
  topN: number
}

export const DEFAULT_INFANTRY_DEFEND_CONFIG: InfantryDefendConfig = {
  underAttackBonus: 5.0,
  frontlineWeight: 2.5,
  majorBaseBonus: 1.5,
  rangeWeight: 2.0,
  maxRangeMetres: 1500,
  notesBiasWeight: 1.5,
  supplyProximityWeight: 1.5,
  supplyProximityRadiusMetres: 500,
  topN: 5,
}

/**
 * Scoring config for ranking enemy CAPs an infantry squad should assault.
 * Tilted toward minor bases adjacent to friendlies — realistic foot-assault targets.
 */
export interface InfantryAssaultConfig {
  /** Bonus when the squad is already attacking this CAP — keep momentum. */
  momentumWeight: number
  /** Bonus per adjacent friendly CAP — staging support. */
  friendlySupportWeight: number
  /** Bonus for isolation: 1 - enemyNeighbors/totalNeighbors. */
  isolationWeight: number
  /** Penalty for major bases — harder to take on foot. */
  majorBasePenalty: number
  /** Bonus for neutral (uncontested) CAPs — free capture. */
  uncontestedBonus: number
  /** Reachability within maxRangeMetres straight-line. */
  rangeWeight: number
  maxRangeMetres: number
  notesBiasWeight: number
  /** Bonus for enemy CAPs near supply caches — high-value capture. */
  supplyProximityWeight: number
  supplyProximityRadiusMetres: number
  topN: number
}

export const DEFAULT_INFANTRY_ASSAULT_CONFIG: InfantryAssaultConfig = {
  momentumWeight: 2.0,
  friendlySupportWeight: 3.0,
  isolationWeight: 2.5,
  majorBasePenalty: 1.5,
  uncontestedBonus: 3.0,
  rangeWeight: 2.0,
  maxRangeMetres: 1500,
  notesBiasWeight: 1.5,
  supplyProximityWeight: 2.0,
  supplyProximityRadiusMetres: 500,
  topN: 5,
}

// ---------------------------------------------------------------------------
// Rangefinder ring definitions per vehicle type
// ---------------------------------------------------------------------------

export interface RangefinderRing {
  key: string
  label: string
  radiusM: number
  color: string
}

export const RANGEFINDER_RINGS_BY_VEHICLE: Record<string, RangefinderRing[]> = {
  LAV: [
    { key: 'min', label: 'Min (300 m)', radiusM: 300, color: '#ef5350' },
    { key: 'ideal', label: 'Ideal (1 500 m)', radiusM: 1500, color: '#66bb6a' },
    { key: 'max', label: 'Max (2 000 m)', radiusM: 2000, color: '#ffa726' },
  ],
  ATTACK_HELO: [
    { key: 'min', label: 'Min (500 m)', radiusM: 500, color: '#ef5350' },
    { key: 'ideal', label: 'Ideal (2 500 m)', radiusM: 2500, color: '#66bb6a' },
    { key: 'max', label: 'Max (4 000 m)', radiusM: 4000, color: '#ffa726' },
  ],
  TRANSPORT_HELO: [{ key: 'lz', label: 'LZ radius (200 m)', radiusM: 200, color: '#ab47bc' }],
  INFANTRY: [
    { key: 'min', label: 'CQB (100 m)', radiusM: 100, color: '#ef5350' },
    { key: 'ideal', label: 'Engage (300 m)', radiusM: 300, color: '#66bb6a' },
    { key: 'max', label: 'Max (500 m)', radiusM: 500, color: '#ffa726' },
  ],
}
