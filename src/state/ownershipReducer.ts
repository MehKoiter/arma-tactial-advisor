export type Owner = 'neutral' | 'US' | 'RUS'
export type PlayerTeam = 'US' | 'RUS'
export type VehicleType = 'LAV' | 'ATTACK_HELO' | 'TRANSPORT_HELO'

export interface OwnershipState {
  /** Map from CAP ID → current owner */
  ownership: Record<string, Owner>
  /** ID of the CAP the LAV is currently positioned at (origin for route calc) */
  lavPosition: string | null
  /** Which faction the player is fighting for */
  playerTeam: PlayerTeam
  /** Vehicle type the player is operating */
  vehicleType: VehicleType
  /** CAP IDs currently flagged as under attack (friendly CAPs being attacked) */
  underAttack: ReadonlySet<string>
  /** Enemy CAP IDs we are currently attacking */
  attacking: ReadonlySet<string>
}

export type OwnershipAction =
  | { type: 'SET_OWNER'; capId: string; owner: Owner }
  | { type: 'CYCLE_OWNER'; capId: string }
  | { type: 'RESET_ALL' }
  | { type: 'SET_LAV_POSITION'; capId: string | null }
  | { type: 'BULK_SET'; ownership: Record<string, Owner> }
  | { type: 'SET_PLAYER_TEAM'; team: PlayerTeam }
  | { type: 'SET_VEHICLE_TYPE'; vehicleType: VehicleType }
  | { type: 'TOGGLE_UNDER_ATTACK'; capId: string }
  | { type: 'TOGGLE_ATTACKING'; capId: string }

function cycleOwner(current: Owner): Owner {
  if (current === 'neutral') return 'US'
  if (current === 'US') return 'RUS'
  return 'US'
}

export function ownershipReducer(state: OwnershipState, action: OwnershipAction): OwnershipState {
  switch (action.type) {
    case 'SET_OWNER':
      return {
        ...state,
        ownership: { ...state.ownership, [action.capId]: action.owner },
      }

    case 'CYCLE_OWNER': {
      const current: Owner = state.ownership[action.capId] ?? 'neutral'
      const next = cycleOwner(current)
      const enemy: Owner = state.playerTeam === 'US' ? 'RUS' : 'US'
      // If the CAP is leaving friendly ownership, clear its under-attack flag
      const ua = new Set(state.underAttack)
      if (next !== state.playerTeam) ua.delete(action.capId)
      // If the CAP is leaving enemy ownership, clear its attacking flag
      const atk = new Set(state.attacking)
      if (next !== enemy) atk.delete(action.capId)
      return {
        ...state,
        ownership: { ...state.ownership, [action.capId]: next },
        underAttack: ua,
        attacking: atk,
      }
    }

    case 'RESET_ALL':
      return {
        ...state,
        ownership: Object.fromEntries(Object.keys(state.ownership).map((id) => [id, 'neutral'])),
        underAttack: new Set(),
        attacking: new Set(),
      }

    case 'SET_LAV_POSITION':
      return { ...state, lavPosition: action.capId }

    case 'BULK_SET':
      return { ...state, ownership: { ...action.ownership } }

    case 'SET_PLAYER_TEAM':
      return { ...state, playerTeam: action.team }

    case 'SET_VEHICLE_TYPE':
      return { ...state, vehicleType: action.vehicleType }

    case 'TOGGLE_UNDER_ATTACK': {
      const ua = new Set(state.underAttack)
      if (ua.has(action.capId)) ua.delete(action.capId)
      else ua.add(action.capId)
      return { ...state, underAttack: ua }
    }

    case 'TOGGLE_ATTACKING': {
      const atk = new Set(state.attacking)
      if (atk.has(action.capId)) atk.delete(action.capId)
      else atk.add(action.capId)
      return { ...state, attacking: atk }
    }

    default:
      return state
  }
}

export function buildInitialOwnership(capIds: string[]): OwnershipState {
  return {
    ownership: Object.fromEntries(capIds.map((id) => [id, 'neutral' as Owner])),
    lavPosition: null,
    playerTeam: 'US',
    vehicleType: 'LAV',
    underAttack: new Set(),
    attacking: new Set(),
  }
}
