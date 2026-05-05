import type { CAPDataset } from './capSchema'
import { gameToCoords } from './mapConfig'

/**
 * Everon (Arma Reforger) Control Area Points — all 26 locations.
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
    ['CAP_VILLENEUVE', 'CAP_MORTON', 'CAP_LE_MOULE'],
    'west'),

  cap('CAP_CHOTAIN',      'Chotain',     'CHO', 'major',  7444.065,  6697.595,
    ['CAP_ANDRES_BEACON', 'CAP_MONTIGNAC', 'CAP_PROVINS', 'CAP_FIGARI', 'CAP_LEVIE', 'CAP_QUARRY', 'CAP_ENTRE_DEUX', 'CAP_LARUNS', 'CAP_CHOTAIN_TOWN', 'CAP_COASTAL_BASE_CHOTAIN'],
    'central'),

  cap('CAP_ST_PIERRE',    'St Pierre',   'STP', 'major',  9689.432,  1558.166,
    ['CAP_QUARRY', 'CAP_DURRAS'],
    'south'),

  // ── MINOR BASES (blue) — town/location centre points ───────────────────────
  cap('CAP_AIRPORT',      'Airport',     'AIR', 'minor',  4893.46,  11800.709,
    ['CAP_ST_PHILLIPE', 'CAP_POWER_PLANT', 'CAP_MEAUX'],
    'north'),

  cap('CAP_POWER_PLANT',  'Power Plant', 'PWR', 'minor',  5826.642,  9786.735,
    ['CAP_AIRPORT', 'CAP_TYRONE', 'CAP_ANDRES_BEACON', 'CAP_KERMOVAN'],
    'north'),

  cap('CAP_MEAUX',        'Meaux',       'MEX', 'minor',  4517.52,   9467.668,
    ['CAP_AIRPORT', 'CAP_ST_PHILLIPE', 'CAP_TYRONE', 'CAP_GRAVETTE', 'CAP_MILITARY_HOSPITAL', 'CAP_HORNBEAM_VALLEY'],
    'north'),

  cap('CAP_TYRONE',       'Tyrone',      'TYR', 'minor',  4948.837,  9075.68,
    ['CAP_ST_PHILLIPE', 'CAP_MEAUX', 'CAP_POWER_PLANT', 'CAP_ANDRES_BEACON', 'CAP_GRAVETTE', 'CAP_MONTIGNAC', 'CAP_KERMOVAN', 'CAP_MILITARY_HOSPITAL', 'CAP_HORNBEAM_VALLEY'],
    'north'),

  cap('CAP_ANDRES_BEACON','Andres Beacon','AND', 'minor',  6843.832,  8191.218,
    ['CAP_POWER_PLANT', 'CAP_TYRONE', 'CAP_CHOTAIN', 'CAP_LEVIE', 'CAP_KERMOVAN', 'CAP_CHOTAIN_TOWN', 'CAP_COASTAL_BASE_CHOTAIN'],
    'north'),

  cap('CAP_GRAVETTE',     'Gravette',    'GRV', 'minor',  4128.282,  7792.364,
    ['CAP_MEAUX', 'CAP_TYRONE', 'CAP_MONTIGNAC', 'CAP_VILLENEUVE', 'CAP_MILITARY_HOSPITAL', 'CAP_HORNBEAM_VALLEY', 'CAP_PINEWOOD_LAKE'],
    'central'),

  cap('CAP_MONTIGNAC',    'Montignac',   'MON', 'minor',  4775.641,  7086.945,
    ['CAP_TYRONE', 'CAP_GRAVETTE', 'CAP_VILLENEUVE', 'CAP_PROVINS', 'CAP_FIGARI', 'CAP_CHOTAIN', 'CAP_ENTRE_DEUX', 'CAP_PINEWOOD_LAKE'],
    'central'),

  cap('CAP_VILLENEUVE',   'Villeneuve',  'VIL', 'minor',  2847.008,  6339.848,
    ['CAP_GRAVETTE', 'CAP_MONTIGNAC', 'CAP_LAMENTIN', 'CAP_PROVINS', 'CAP_OLD_WOOD', 'CAP_CALVARY_HILL', 'CAP_LE_MOULE', 'CAP_PINEWOOD_LAKE'],
    'central'),

  cap('CAP_PROVINS',      'Provins',     'PRV', 'minor',  5488.17,   6083.411,
    ['CAP_MONTIGNAC', 'CAP_VILLENEUVE', 'CAP_FIGARI', 'CAP_CHOTAIN', 'CAP_MORTON', 'CAP_ENTRE_DEUX', 'CAP_MORTON_VALLEY'],
    'central'),

  cap('CAP_FIGARI',       'Figari',      'FIG', 'minor',  5256.366,  5341.263,
    ['CAP_MONTIGNAC', 'CAP_PROVINS', 'CAP_CHOTAIN', 'CAP_LEVIE', 'CAP_MORTON', 'CAP_MORTON_VALLEY', 'CAP_SIMONS_WOOD'],
    'central'),

  cap('CAP_LEVIE',        'Levie',       'LEV', 'minor',  7476.739,  4301.884,
    ['CAP_ANDRES_BEACON', 'CAP_CHOTAIN', 'CAP_FIGARI', 'CAP_QUARRY', 'CAP_LARUNS', 'CAP_MILITARY_BASE_LEVIE', 'CAP_SIMONS_WOOD'],
    'east'),

  cap('CAP_QUARRY',       'Quarry',      'QRY', 'minor',  8786.965,  3913.078,
    ['CAP_CHOTAIN', 'CAP_LEVIE', 'CAP_DURRAS', 'CAP_ST_PIERRE', 'CAP_MILITARY_BASE_LEVIE'],
    'east'),

  cap('CAP_MORTON',       'Morton',      'MRT', 'minor',  4956.796,  3875.627,
    ['CAP_VILLENEUVE', 'CAP_PROVINS', 'CAP_FIGARI', 'CAP_LAMENTIN', 'CAP_CAMURAC', 'CAP_OLD_WOOD', 'CAP_MORTON_VALLEY', 'CAP_SIMONS_WOOD'],
    'south'),

  cap('CAP_CAMURAC',      'Camurac',     'CAM', 'minor',  6594.162,  3116.684,
    ['CAP_MORTON', 'CAP_FIGARI', 'CAP_REGINA', 'CAP_MILITARY_BASE_LEVIE', 'CAP_SIMONS_WOOD'],
    'south'),

  cap('CAP_REGINA',       'Regina',      'REG', 'minor',  7188.38,   2312.382,
    ['CAP_CAMURAC', 'CAP_DURRAS'],
    'south'),

  cap('CAP_DURRAS',       'Durras',      'DUR', 'minor',  8826.12,   2746.123,
    ['CAP_QUARRY', 'CAP_REGINA', 'CAP_ST_PIERRE'],
    'south'),

  // ── MISSING CAPs (sourced from EnfusionMapMaker everon-locations.js) ────────
  cap('CAP_ENTRE_DEUX',   'Entre Deux',      'EDT', 'minor',  5760.571,  7061.821,
    ['CAP_MONTIGNAC', 'CAP_PROVINS', 'CAP_CHOTAIN', 'CAP_CHOTAIN_TOWN'],
    'central'),

  cap('CAP_KERMOVAN',     'Kermovan',        'KER', 'minor',  6359.376,  9668.684,
    ['CAP_POWER_PLANT', 'CAP_ANDRES_BEACON', 'CAP_TYRONE'],
    'north'),

  cap('CAP_MILITARY_HOSPITAL', 'Military Hospital', 'HSP', 'minor', 3904.698, 8450.042,
    ['CAP_GRAVETTE', 'CAP_TYRONE', 'CAP_MEAUX', 'CAP_HORNBEAM_VALLEY'],
    'north'),

  cap('CAP_OLD_WOOD',     'Old Wood',        'OWD', 'minor',  3293.234,  4488.741,
    ['CAP_VILLENEUVE', 'CAP_MORTON', 'CAP_MORTON_VALLEY', 'CAP_CALVARY_HILL', 'CAP_LE_MOULE'],
    'west'),

  cap('CAP_MORTON_VALLEY','Morton Valley',   'MVL', 'minor',  4517.589,  4967.065,
    ['CAP_MORTON', 'CAP_FIGARI', 'CAP_OLD_WOOD', 'CAP_PROVINS', 'CAP_CALVARY_HILL', 'CAP_PINEWOOD_LAKE'],
    'central'),

  cap('CAP_LARUNS',       'Laruns',          'LAR', 'minor',  7429.288,  5318.843,
    ['CAP_LEVIE', 'CAP_CHOTAIN', 'CAP_FIGARI', 'CAP_CHOTAIN_TOWN', 'CAP_MILITARY_BASE_LEVIE', 'CAP_SIMONS_WOOD'],
    'east'),

  cap('CAP_CALVARY_HILL', 'Calvary Hill',    'CAL', 'minor',  3500,      5700,
    ['CAP_VILLENEUVE', 'CAP_OLD_WOOD', 'CAP_MORTON_VALLEY', 'CAP_LE_MOULE'],
    'west'),

  cap('CAP_HORNBEAM_VALLEY', 'Hornbeam Valley', 'HBV', 'minor',  5100,   8300,
    ['CAP_TYRONE', 'CAP_GRAVETTE', 'CAP_MEAUX', 'CAP_MILITARY_HOSPITAL'],
    'north'),

  cap('CAP_LE_MOULE',     'Le Moule',        'LMO', 'minor',  2400,      5400,
    ['CAP_LAMENTIN', 'CAP_VILLENEUVE', 'CAP_CALVARY_HILL', 'CAP_OLD_WOOD'],
    'west'),

  cap('CAP_PINEWOOD_LAKE', 'Pinewood Lake',  'PWL', 'minor',  4400,      6100,
    ['CAP_GRAVETTE', 'CAP_MONTIGNAC', 'CAP_VILLENEUVE', 'CAP_MORTON_VALLEY'],
    'central'),

  cap('CAP_CHOTAIN_TOWN', 'Chotain Town',   'CHT', 'minor',  6800,      7400,
    ['CAP_CHOTAIN', 'CAP_ANDRES_BEACON', 'CAP_ENTRE_DEUX', 'CAP_LARUNS', 'CAP_COASTAL_BASE_CHOTAIN'],
    'central'),

  cap('CAP_MILITARY_BASE_LEVIE', 'Military Base Levie', 'MBL', 'major', 7400, 3700,
    ['CAP_LEVIE', 'CAP_LARUNS', 'CAP_QUARRY', 'CAP_CAMURAC'],
    'east'),

  cap('CAP_SIMONS_WOOD', "Simon's Wood",    'SIM', 'minor',  5900,      4500,
    ['CAP_FIGARI', 'CAP_LEVIE', 'CAP_LARUNS', 'CAP_MORTON', 'CAP_CAMURAC'],
    'central'),

  cap('CAP_COASTAL_BASE_CHOTAIN', 'Coastal Base Chotain', 'CBC', 'major', 7150, 7800,
    ['CAP_CHOTAIN', 'CAP_CHOTAIN_TOWN', 'CAP_ANDRES_BEACON'],
    'east'),
]

export default everonCAPs

