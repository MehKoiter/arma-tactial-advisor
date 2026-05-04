// MOB (Main Operating Base) markers.
// Each room has at most one friendly MOB and at most one (discovered) enemy MOB.
// MOBs are NOT attackable — they're recorded purely for situational awareness
// and to inform scoring/routing about real spawn anchors that aren't CAP points.

import type { PlayerTeam } from '@/state/ownershipReducer'

export type MobFaction = PlayerTeam // 'US' | 'RUS'

export interface MobMarker {
  faction: MobFaction
  lng: number
  lat: number
}

export const MOB_COLORS: Record<MobFaction, string> = {
  US: '#42a5f5',
  RUS: '#ef5350',
}

/** Glyph used inside the marker disc on the map. */
export const MOB_GLYPH = '★'
