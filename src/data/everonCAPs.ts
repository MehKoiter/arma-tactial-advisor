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
  elevationM?: number,
) {
  return {
    id,
    name,
    shortName,
    type,
    coords: gameToCoords(gameX, gameZ),
    neighbors,
    zone,
    elevationM,
  }
}

const everonCAPs: CAPDataset = [
  // ── MAJOR BASES (purple) — military installation anchor points ──────────────
  cap(
    'CAP_ST_PHILLIPE',
    'St Phillipe',
    'SPH',
    'major',
    4400,
    11000,
    ['CAP_AIRPORT', 'CAP_MEAUX', 'CAP_TYRONE'],
    'north',
    0,
  ),

  cap('CAP_ST_PIERRE', 'St Pierre', 'STP', 'major', 10100, 1500, ['CAP_QUARRY'], 'south', 5),

  // ── MINOR BASES (blue) — town/location centre points ───────────────────────
  cap(
    'CAP_AIRPORT',
    'Airbase Saint-Philippe',
    'AIR',
    'minor',
    4900,
    11900,
    ['CAP_ST_PHILLIPE', 'CAP_MEAUX'],
    'north',
    30,
  ),

  cap(
    'CAP_MEAUX',
    'Meaux',
    'MEX',
    'minor',
    4500,
    9700,
    [
      'CAP_AIRPORT',
      'CAP_ST_PHILLIPE',
      'CAP_TYRONE',
      'CAP_GRAVETTE',
      'CAP_MILITARY_HOSPITAL',
      'CAP_HORNBEAM_VALLEY',
    ],
    'north',
    20,
  ),

  cap(
    'CAP_TYRONE',
    'Tyrone',
    'TYR',
    'minor',
    5000,
    8900,
    [
      'CAP_ST_PHILLIPE',
      'CAP_MEAUX',
      'CAP_ANDRES_BEACON',
      'CAP_GRAVETTE',
      'CAP_MONTIGNAC',
      'CAP_KERMOVAN',
      'CAP_MILITARY_HOSPITAL',
      'CAP_HORNBEAM_VALLEY',
    ],
    'north',
    50,
  ),

  cap(
    'CAP_ANDRES_BEACON',
    'Andres Beacon',
    'AND',
    'minor',
    6800,
    8100,
    ['CAP_TYRONE', 'CAP_LEVIE', 'CAP_KERMOVAN', 'CAP_CHOTAIN_TOWN', 'CAP_COASTAL_BASE_CHOTAIN'],
    'north',
    45,
  ),

  cap(
    'CAP_GRAVETTE',
    'Gravette',
    'GRV',
    'minor',
    3900,
    7800,
    [
      'CAP_MEAUX',
      'CAP_TYRONE',
      'CAP_MONTIGNAC',
      'CAP_VILLENEUVE',
      'CAP_MILITARY_HOSPITAL',
      'CAP_HORNBEAM_VALLEY',
      'CAP_PINEWOOD_LAKE',
    ],
    'central',
    30,
  ),

  cap(
    'CAP_MONTIGNAC',
    'Montignac',
    'MON',
    'minor',
    5100,
    7400,
    [
      'CAP_TYRONE',
      'CAP_GRAVETTE',
      'CAP_VILLENEUVE',
      'CAP_PROVINS',
      'CAP_FIGARI',
      'CAP_ENTRE_DEUX',
      'CAP_PINEWOOD_LAKE',
    ],
    'central',
    175,
  ),

  cap(
    'CAP_VILLENEUVE',
    'Villeneuve',
    'VIL',
    'minor',
    2800,
    6500,
    [
      'CAP_GRAVETTE',
      'CAP_MONTIGNAC',
      'CAP_PROVINS',
      'CAP_OLD_WOOD',
      'CAP_CALVARY_HILL',
      'CAP_LE_MOULE',
      'CAP_PINEWOOD_LAKE',
    ],
    'central',
    75,
  ),

  cap(
    'CAP_PROVINS',
    'Provins',
    'PRV',
    'minor',
    5500,
    5900,
    ['CAP_MONTIGNAC', 'CAP_VILLENEUVE', 'CAP_FIGARI', 'CAP_ENTRE_DEUX', 'CAP_MORTON_VALLEY'],
    'central',
    90,
  ),

  cap(
    'CAP_FIGARI',
    'Figari',
    'FIG',
    'minor',
    5100,
    5400,
    ['CAP_MONTIGNAC', 'CAP_PROVINS', 'CAP_LEVIE', 'CAP_MORTON_VALLEY', 'CAP_SIMONS_WOOD'],
    'central',
    55,
  ),

  cap(
    'CAP_LEVIE',
    'Levie',
    'LEV',
    'minor',
    7400,
    4700,
    [
      'CAP_ANDRES_BEACON',
      'CAP_FIGARI',
      'CAP_QUARRY',
      'CAP_LARUNS',
      'CAP_MILITARY_BASE_LEVIE',
      'CAP_SIMONS_WOOD',
    ],
    'east',
    135,
  ),

  cap(
    'CAP_QUARRY',
    'Quarry',
    'QRY',
    'minor',
    5700,
    3800,
    ['CAP_LEVIE', 'CAP_ST_PIERRE', 'CAP_MILITARY_BASE_LEVIE'],
    'east',
    195,
  ),

  cap(
    'CAP_CAMURAC',
    'Camurac',
    'CAM',
    'minor',
    6600,
    3100,
    ['CAP_FIGARI', 'CAP_MILITARY_BASE_LEVIE', 'CAP_SIMONS_WOOD'],
    'south',
    5,
  ),

  // ── MISSING CAPs (sourced from EnfusionMapMaker everon-locations.js) ────────
  cap(
    'CAP_ENTRE_DEUX',
    'Entre Deux',
    'EDT',
    'minor',
    6200,
    7100,
    ['CAP_MONTIGNAC', 'CAP_PROVINS', 'CAP_CHOTAIN_TOWN'],
    'central',
    195,
  ),

  cap(
    'CAP_KERMOVAN',
    'Kermovan',
    'KER',
    'minor',
    6400,
    9600,
    ['CAP_ANDRES_BEACON', 'CAP_TYRONE'],
    'north',
    10,
  ),

  cap(
    'CAP_MILITARY_HOSPITAL',
    'Military Hospital',
    'HSP',
    'minor',
    3900,
    9400,
    ['CAP_GRAVETTE', 'CAP_TYRONE', 'CAP_MEAUX', 'CAP_HORNBEAM_VALLEY'],
    'north',
    15,
  ),

  cap(
    'CAP_OLD_WOOD',
    'Old Wood',
    'OWD',
    'minor',
    3200,
    4400,
    ['CAP_VILLENEUVE', 'CAP_MORTON_VALLEY', 'CAP_CALVARY_HILL', 'CAP_LE_MOULE'],
    'west',
    120,
  ),

  cap(
    'CAP_MORTON_VALLEY',
    'Morton Valley',
    'MVL',
    'minor',
    4500,
    4900,
    ['CAP_FIGARI', 'CAP_OLD_WOOD', 'CAP_PROVINS', 'CAP_CALVARY_HILL', 'CAP_PINEWOOD_LAKE'],
    'central',
    65,
  ),

  cap(
    'CAP_LARUNS',
    'Laruns',
    'LAR',
    'minor',
    7300,
    5200,
    ['CAP_LEVIE', 'CAP_FIGARI', 'CAP_CHOTAIN_TOWN', 'CAP_MILITARY_BASE_LEVIE', 'CAP_SIMONS_WOOD'],
    'east',
    120,
  ),

  cap(
    'CAP_CALVARY_HILL',
    'Calvary Hill',
    'CAL',
    'minor',
    3500,
    5700,
    ['CAP_VILLENEUVE', 'CAP_OLD_WOOD', 'CAP_MORTON_VALLEY', 'CAP_LE_MOULE'],
    'west',
    180,
  ),

  cap(
    'CAP_HORNBEAM_VALLEY',
    'Hornbeam Valley',
    'HBV',
    'minor',
    5300,
    8300,
    ['CAP_TYRONE', 'CAP_GRAVETTE', 'CAP_MEAUX', 'CAP_MILITARY_HOSPITAL'],
    'north',
    25,
  ),

  cap(
    'CAP_LE_MOULE',
    'Le Moule',
    'LMO',
    'minor',
    2400,
    5400,
    ['CAP_VILLENEUVE', 'CAP_CALVARY_HILL', 'CAP_OLD_WOOD'],
    'west',
    165,
  ),

  cap(
    'CAP_PINEWOOD_LAKE',
    'Pinewood Lake',
    'PWL',
    'minor',
    4400,
    6200,
    ['CAP_GRAVETTE', 'CAP_MONTIGNAC', 'CAP_VILLENEUVE', 'CAP_MORTON_VALLEY'],
    'central',
    60,
  ),

  cap(
    'CAP_CHOTAIN_TOWN',
    'Chotain Town',
    'CHT',
    'minor',
    6900,
    6000,
    ['CAP_ANDRES_BEACON', 'CAP_ENTRE_DEUX', 'CAP_LARUNS', 'CAP_COASTAL_BASE_CHOTAIN'],
    'central',
    120,
  ),

  cap(
    'CAP_MILITARY_BASE_LEVIE',
    'Military Base Levie',
    'MBL',
    'major',
    7400,
    4200,
    ['CAP_LEVIE', 'CAP_LARUNS', 'CAP_QUARRY', 'CAP_CAMURAC'],
    'east',
    165,
  ),

  cap(
    'CAP_SIMONS_WOOD',
    "Simon's Wood",
    'SIM',
    'minor',
    6500,
    5000,
    ['CAP_FIGARI', 'CAP_LEVIE', 'CAP_LARUNS', 'CAP_CAMURAC'],
    'central',
    80,
  ),

  cap(
    'CAP_COASTAL_BASE_CHOTAIN',
    'Coastal Base Chotain',
    'CBC',
    'major',
    7400,
    6700,
    ['CAP_CHOTAIN_TOWN', 'CAP_ANDRES_BEACON'],
    'east',
    10,
  ),

  cap(
    'CAP_VERNON',
    'Vernon',
    'VRN',
    'minor',
    9100,
    2200,
    ['CAP_QUARRY', 'CAP_ST_PIERRE'],
    'east',
    75,
  ),

  cap(
    'CAP_PENNANTS_PASS',
    'Pennants Pass',
    'PNP',
    'minor',
    8200,
    2100,
    ['CAP_VERNON'],
    'south',
    270,
  ),

  cap(
    'CAP_TOWER_REGINA',
    'Tower Régina',
    'TRG',
    'minor',
    7600,
    3000,
    ['CAP_CAMURAC', 'CAP_PENNANTS_PASS'],
    'south',
    340,
  ),

  cap('CAP_COASTAL_BASE_MORTON', 'Coastal Base Morton', 'CBM', 'major', 4900, 3800, [], 'south', 0),

  cap(
    'CAP_COASTAL_BASE_LAMENTIN',
    'Coastal Base Lamentin',
    'CBL',
    'major',
    1000,
    6000,
    ['CAP_LE_MOULE'],
    'west',
    0,
  ),

  cap(
    'CAP_TOWER_ENTRE_DEUX',
    'Tower Entre-Deux',
    'TED',
    'minor',
    5800,
    7200,
    ['CAP_ENTRE_DEUX', 'CAP_MONTIGNAC', 'CAP_PROVINS'],
    'central',
    233,
  ),

  cap(
    'CAP_TILLERS_FIND',
    "Tiller's Find",
    'TIL',
    'minor',
    3700,
    7000,
    ['CAP_GRAVETTE', 'CAP_MONTIGNAC', 'CAP_VILLENEUVE', 'CAP_PINEWOOD_LAKE'],
    'central',
    60,
  ),

  cap(
    'CAP_MILITARY_DEPOT',
    'Military Depot',
    'DEP',
    'minor',
    5200,
    10600,
    ['CAP_AIRPORT', 'CAP_MEAUX', 'CAP_ST_PHILLIPE'],
    'north',
    35,
  ),
]

export default everonCAPs
