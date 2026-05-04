export type IndicatorCategory = 'fire-support' | 'logistics' | 'recon' | 'movement' | 'hazard'

export interface IndicatorType {
  id: string
  label: string
  category: IndicatorCategory
  icon: string   // emoji / unicode glyph rendered inside the marker
  color: string  // hex accent colour
}

export interface PlacedIndicator {
  uid: string
  typeId: string
  lng: number
  lat: number
}

export const INDICATOR_CATEGORIES: { id: IndicatorCategory; label: string }[] = [
  { id: 'fire-support', label: 'Fire Support' },
  { id: 'logistics',    label: 'Logistics' },
  { id: 'recon',        label: 'Recon / Intel' },
  { id: 'movement',     label: 'Movement' },
  { id: 'hazard',       label: 'Hazards' },
]

export const INDICATOR_TYPES: IndicatorType[] = [
  // ── Fire Support ─────────────────────────────────────────────────────────────
  { id: 'mortar',     label: 'Mortar Team',       category: 'fire-support', icon: '💥', color: '#ef5350' },
  { id: 'hmg',        label: 'HMG Position',      category: 'fire-support', icon: '🔫', color: '#ef5350' },
  { id: 'sniper',     label: 'Sniper / DMR',       category: 'fire-support', icon: '🎯', color: '#ef5350' },
  { id: 'at-team',    label: 'Anti-Tank Team',     category: 'fire-support', icon: '🚀', color: '#ef5350' },
  { id: 'aa-pos',     label: 'Anti-Air Position',  category: 'fire-support', icon: '✈️', color: '#ef5350' },

  // ── Logistics ────────────────────────────────────────────────────────────────
  { id: 'supply',     label: 'Supply Cache',       category: 'logistics', icon: '📦', color: '#66bb6a' },
  { id: 'ammo',       label: 'Ammo Depot',         category: 'logistics', icon: '🔶', color: '#66bb6a' },
  { id: 'fuel',       label: 'Fuel Point',         category: 'logistics', icon: '⛽', color: '#66bb6a' },
  { id: 'repair',     label: 'Repair Station',     category: 'logistics', icon: '🔧', color: '#66bb6a' },
  { id: 'aid-post',   label: 'Aid Post / Medevac', category: 'logistics', icon: '➕', color: '#66bb6a' },

  // ── Recon / Intel ────────────────────────────────────────────────────────────
  { id: 'obs-post',   label: 'Observation Post',   category: 'recon', icon: '👁', color: '#90caf9' },
  { id: 'enemy-inf',  label: 'Enemy Spotted',      category: 'recon', icon: '⚠️', color: '#90caf9' },
  { id: 'enemy-veh',  label: 'Enemy Vehicle',      category: 'recon', icon: '🚗', color: '#90caf9' },
  { id: 'enemy-lkp',  label: 'Enemy Last Known',   category: 'recon', icon: '❓', color: '#90caf9' },

  // ── Movement ─────────────────────────────────────────────────────────────────
  { id: 'rally',      label: 'Rally Point',        category: 'movement', icon: '🚩', color: '#ffa726' },
  { id: 'waypoint',   label: 'Waypoint',           category: 'movement', icon: '📍', color: '#ffa726' },
  { id: 'lz',         label: 'Landing Zone',       category: 'movement', icon: '🚁', color: '#ffa726' },
  { id: 'extract',    label: 'Extraction Point',   category: 'movement', icon: '⬆️', color: '#ffa726' },
  { id: 'block',      label: 'Blocking Position',  category: 'movement', icon: '🚧', color: '#ffa726' },

  // ── Hazards ──────────────────────────────────────────────────────────────────
  { id: 'minefield',  label: 'Minefield',          category: 'hazard', icon: '💣', color: '#ce93d8' },
  { id: 'roadblock',  label: 'Roadblock',          category: 'hazard', icon: '🚫', color: '#ce93d8' },
  { id: 'ied',        label: 'IED',                category: 'hazard', icon: '☠️', color: '#ce93d8' },
]

export const INDICATOR_BY_ID = Object.fromEntries(INDICATOR_TYPES.map((t) => [t.id, t]))
