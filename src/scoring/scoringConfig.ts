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
   * Radius in metres around a CAP centre within which position notes are considered.
   * Notes outside this radius do not influence that CAP's score.
   */
  notesSearchRadiusMetres: number
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
  /** How many top recommendations to return */
  topN: number
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  enemyPressureWeight: 3.0,
  contestedCentralityWeight: 2.5, // ratio [0,1]; weight tuned up since values are smaller
  overextensionPenalty: 3.0,      // graded [0,1]; meaningful penalty when deep in enemy territory
  movementFeasibilityWeight: 1.5,
  maxFeasibleHops: 3,
  notesBiasWeight: 2.0,
  notesSearchRadiusMetres: 500,
  underAttackUrgencyWeight: 4.0,
  attackingNeighborWeight: 2.0,
  supplyProximityWeight: 1.5,
  supplyProximityRadiusMetres: 1500,
  chokepointWeight: 3.5,          // strong signal — cut vertices are critical
  topN: 5,
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
  /** Radius in metres to search for nearby position notes */
  notesSearchRadiusMetres: number
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
  notesSearchRadiusMetres: 500,
  // Soft tiebreaker for player-flagged targets, not a runaway boost.
  momentumWeight: 1.0,
  // Capped at 1.0 in the engine, so this is the ceiling, not multiplied per ally.
  reliefWeight: 2.5,
  supplyProximityWeight: 2.0,
  supplyProximityRadiusMetres: 1500,
  chokepointWeight: 3.0,
  topN: 5,
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
  /** Radius in metres for nearby notes search */
  notesSearchRadiusMetres: number
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
  notesSearchRadiusMetres: 600,
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
  notesSearchRadiusMetres: number
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
  notesSearchRadiusMetres: 600,
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
  notesSearchRadiusMetres: number
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
  notesSearchRadiusMetres: 600,
  supplyProximityWeight: 2.0,
  supplyProximityRadiusMetres: 1500,
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
    { key: 'min',   label: 'Min (300 m)',     radiusM: 300,  color: '#ef5350' },
    { key: 'ideal', label: 'Ideal (1 500 m)', radiusM: 1500, color: '#66bb6a' },
    { key: 'max',   label: 'Max (2 000 m)',   radiusM: 2000, color: '#ffa726' },
  ],
  ATTACK_HELO: [
    { key: 'min',   label: 'Min (500 m)',     radiusM: 500,  color: '#ef5350' },
    { key: 'ideal', label: 'Ideal (2 500 m)', radiusM: 2500, color: '#66bb6a' },
    { key: 'max',   label: 'Max (4 000 m)',   radiusM: 4000, color: '#ffa726' },
  ],
  TRANSPORT_HELO: [
    { key: 'lz', label: 'LZ radius (200 m)', radiusM: 200, color: '#ab47bc' },
  ],
}
