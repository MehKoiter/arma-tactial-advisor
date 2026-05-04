import type { CAPDataset } from './capSchema'
import { gameToCoords } from './mapConfig'

/**
 * Everon (Arma Reforger) Control Area Points — all 20 locations.
 *
 * Coordinates sourced from EnfusionMapMaker (nickludlam/EnfusionMapMaker on GitHub),
 * extracted directly from Workbench game-world transforms (metres, X/Z axes).
 * Game world: 12 800 m × 12 800 m.
 *
 * Purple = major base  |  Blue = minor base
 * Major bases use the military-installation anchor point; minor bases use town centre.
 */

function cap(
  id: string,
  name: string,
  shortName: string,
  type: 'major' | 'minor',
  gameX: number,
  gameZ: number,
  neighbors: string[],
  zone: 'north' | 'central' | 'south' | 'east' | 'west',
) {
  return { id, name, shortName, type, coords: gameToCoords(gameX, gameZ), neighbors, zone }
}

const everonCAPs: CAPDataset = [
  // ── MAJOR BASES (purple) — military installation anchor points ──────────────
  cap('CAP_ST_PHILLIPE',  'St Phillipe', 'SPH', 'major',  4500.872, 10776.053,
    ['CAP_AIRPORT', 'CAP_MEAUX', 'CAP_TYRONE'],
    'north'),

  cap('CAP_LAMENTIN',     'Lamentin',    'LAM', 'major',  1062.89,   6047.846,
    ['CAP_VILLENEUVE', 'CAP_MORTON'],
    'west'),

  cap('CAP_CHOTAIN',      'Chotain',     'CHO', 'major',  7444.065,  6697.595,
    ['CAP_ANDRES_BEACON', 'CAP_MONTIGNAC', 'CAP_PROVINS', 'CAP_FIGARI', 'CAP_LEVIE', 'CAP_QUARRY'],
    'central'),

  cap('CAP_ST_PIERRE',    'St Pierre',   'STP', 'major',  9689.432,  1558.166,
    ['CAP_QUARRY', 'CAP_DURRAS'],
    'south'),

  // ── MINOR BASES (blue) — town/location centre points ───────────────────────
  cap('CAP_AIRPORT',      'Airport',     'AIR', 'minor',  4893.46,  11800.709,
    ['CAP_ST_PHILLIPE', 'CAP_POWER_PLANT', 'CAP_MEAUX'],
    'north'),

  cap('CAP_POWER_PLANT',  'Power Plant', 'PWR', 'minor',  5826.642,  9786.735,
    ['CAP_AIRPORT', 'CAP_TYRONE', 'CAP_ANDRES_BEACON'],
    'north'),

  cap('CAP_MEAUX',        'Meaux',       'MEX', 'minor',  4517.52,   9467.668,
    ['CAP_AIRPORT', 'CAP_ST_PHILLIPE', 'CAP_TYRONE', 'CAP_GRAVETTE'],
    'north'),

  cap('CAP_TYRONE',       'Tyrone',      'TYR', 'minor',  4948.837,  9075.68,
    ['CAP_ST_PHILLIPE', 'CAP_MEAUX', 'CAP_POWER_PLANT', 'CAP_ANDRES_BEACON', 'CAP_GRAVETTE', 'CAP_MONTIGNAC'],
    'north'),

  cap('CAP_ANDRES_BEACON','Andres Beacon','AND', 'minor',  6843.832,  8191.218,
    ['CAP_POWER_PLANT', 'CAP_TYRONE', 'CAP_CHOTAIN', 'CAP_LEVIE'],
    'north'),

  cap('CAP_GRAVETTE',     'Gravette',    'GRV', 'minor',  4128.282,  7792.364,
    ['CAP_MEAUX', 'CAP_TYRONE', 'CAP_MONTIGNAC', 'CAP_VILLENEUVE'],
    'central'),

  cap('CAP_MONTIGNAC',    'Montignac',   'MON', 'minor',  4775.641,  7086.945,
    ['CAP_TYRONE', 'CAP_GRAVETTE', 'CAP_VILLENEUVE', 'CAP_PROVINS', 'CAP_FIGARI', 'CAP_CHOTAIN'],
    'central'),

  cap('CAP_VILLENEUVE',   'Villeneuve',  'VIL', 'minor',  2847.008,  6339.848,
    ['CAP_GRAVETTE', 'CAP_MONTIGNAC', 'CAP_LAMENTIN', 'CAP_PROVINS'],
    'central'),

  cap('CAP_PROVINS',      'Provins',     'PRV', 'minor',  5488.17,   6083.411,
    ['CAP_MONTIGNAC', 'CAP_VILLENEUVE', 'CAP_FIGARI', 'CAP_CHOTAIN', 'CAP_MORTON'],
    'central'),

  cap('CAP_FIGARI',       'Figari',      'FIG', 'minor',  5256.366,  5341.263,
    ['CAP_MONTIGNAC', 'CAP_PROVINS', 'CAP_CHOTAIN', 'CAP_LEVIE', 'CAP_MORTON'],
    'central'),

  cap('CAP_LEVIE',        'Levie',       'LEV', 'minor',  7476.739,  4301.884,
    ['CAP_ANDRES_BEACON', 'CAP_CHOTAIN', 'CAP_FIGARI', 'CAP_QUARRY'],
    'east'),

  cap('CAP_QUARRY',       'Quarry',      'QRY', 'minor',  8786.965,  3913.078,
    ['CAP_CHOTAIN', 'CAP_LEVIE', 'CAP_DURRAS', 'CAP_ST_PIERRE'],
    'east'),

  cap('CAP_MORTON',       'Morton',      'MRT', 'minor',  4956.796,  3875.627,
    ['CAP_VILLENEUVE', 'CAP_PROVINS', 'CAP_FIGARI', 'CAP_LAMENTIN', 'CAP_CAMURAC'],
    'south'),

  cap('CAP_CAMURAC',      'Camurac',     'CAM', 'minor',  6594.162,  3116.684,
    ['CAP_MORTON', 'CAP_FIGARI', 'CAP_REGINA'],
    'south'),

  cap('CAP_REGINA',       'Regina',      'REG', 'minor',  7188.38,   2312.382,
    ['CAP_CAMURAC', 'CAP_DURRAS'],
    'south'),

  cap('CAP_DURRAS',       'Durras',      'DUR', 'minor',  8826.12,   2746.123,
    ['CAP_QUARRY', 'CAP_REGINA', 'CAP_ST_PIERRE'],
    'south'),
]

export default everonCAPs

