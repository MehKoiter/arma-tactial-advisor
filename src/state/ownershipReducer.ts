export type Owner = 'neutral' | 'US' | 'RUS'
export type PlayerTeam = 'US' | 'RUS'
export type VehicleType = 'LAV' | 'ATTACK_HELO' | 'TRANSPORT_HELO'

export interface CapStateRow {
  cap_id: string
  owner: Owner
  under_attack: boolean
  attacking: boolean
  radio: boolean
  is_hq: boolean
}

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
  /** CAP IDs that currently have an active radio antenna (network node) */
  radio: ReadonlySet<string>
  /** CAP IDs designated as HQ. Constrained to at most one per owner-faction. */
  hq: ReadonlySet<string>
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
  | { type: 'TOGGLE_RADIO'; capId: string }
  | { type: 'TOGGLE_HQ'; capId: string }
  | { type: 'HYDRATE'; rows: CapStateRow[] }
  | { type: 'SET_ROW'; row: CapStateRow }

export function cycleOwner(current: Owner): Owner {
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
        radio: new Set(),
        hq: new Set(),
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

    case 'TOGGLE_RADIO': {
      const r = new Set(state.radio)
      if (r.has(action.capId)) r.delete(action.capId)
      else r.add(action.capId)
      return { ...state, radio: r }
    }

    case 'TOGGLE_HQ': {
      const hq = new Set(state.hq)
      if (hq.has(action.capId)) {
        hq.delete(action.capId)
      } else {
        // Enforce one HQ per owner-faction: clear any existing HQ owned by the
        // same faction as the CAP being designated.
        const newOwner = state.ownership[action.capId] ?? 'neutral'
        if (newOwner !== 'neutral') {
          for (const existing of hq) {
            if ((state.ownership[existing] ?? 'neutral') === newOwner) hq.delete(existing)
          }
        }
        hq.add(action.capId)
      }
      return { ...state, hq }
    }

    case 'HYDRATE': {
      const ownership = { ...state.ownership }
      const ua = new Set<string>()
      const atk = new Set<string>()
      const r = new Set<string>()
      const hq = new Set<string>()
      for (const row of action.rows) {
        ownership[row.cap_id] = row.owner
        if (row.under_attack) ua.add(row.cap_id)
        if (row.attacking) atk.add(row.cap_id)
        if (row.radio) r.add(row.cap_id)
        if (row.is_hq) hq.add(row.cap_id)
      }
      return { ...state, ownership, underAttack: ua, attacking: atk, radio: r, hq }
    }

    case 'SET_ROW': {
      const { cap_id, owner, under_attack, attacking, radio, is_hq } = action.row
      const currentOwner = state.ownership[cap_id] ?? 'neutral'
      const currentUA = state.underAttack.has(cap_id)
      const currentAtk = state.attacking.has(cap_id)
      const currentRadio = state.radio.has(cap_id)
      const currentHq = state.hq.has(cap_id)
      // Bail-out: skip re-render if nothing actually changed (prevents
      // self-broadcast loops from realtime triggering redundant renders)
      if (
        currentOwner === owner &&
        currentUA === under_attack &&
        currentAtk === attacking &&
        currentRadio === radio &&
        currentHq === is_hq
      ) {
        return state
      }
      const ua = new Set(state.underAttack)
      const atk = new Set(state.attacking)
      const r = new Set(state.radio)
      const hq = new Set(state.hq)
      if (under_attack) ua.add(cap_id); else ua.delete(cap_id)
      if (attacking) atk.add(cap_id); else atk.delete(cap_id)
      if (radio) r.add(cap_id); else r.delete(cap_id)
      if (is_hq) hq.add(cap_id); else hq.delete(cap_id)
      return {
        ...state,
        ownership: { ...state.ownership, [cap_id]: owner },
        underAttack: ua,
        attacking: atk,
        radio: r,
        hq,
      }
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
    radio: new Set(),
    hq: new Set(),
  }
}
