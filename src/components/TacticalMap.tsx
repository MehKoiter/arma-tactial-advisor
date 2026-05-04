import { useState, useEffect, useMemo, useCallback } from 'react'
import MapGL, { Source, Layer, Marker, NavigationControl } from 'react-map-gl/maplibre'
import type { ExpressionSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useOwnership } from '@/state/OwnershipContext'
import { useRouting } from '@/routing/RoutingContext'
import everonCAPs from '@/data/everonCAPs'
import { MAP_INITIAL_VIEW, MAP_BOUNDS, TILE_SOURCE, METRES_PER_DEGREE } from '@/data/mapConfig'
import { INDICATOR_BY_ID } from '@/data/indicators'
import type { Rating } from '@/data/positionNotes'
import { RATING_COLORS, RATING_LABELS } from '@/data/positionNotes'
import { RANGEFINDER_RINGS_BY_VEHICLE } from '@/scoring/scoringConfig'
import type { RouteResult } from '@/routing/routingProvider'
import { usePositionNotesContext } from '@/providers/PositionNotesContext'
import { useIndicatorsContext } from '@/providers/IndicatorsContext'
import { useMobsContext } from '@/providers/MobsContext'
import { MOB_COLORS, MOB_GLYPH } from '@/data/mobs'
import type { MobFaction } from '@/data/mobs'
import { useRecommendation } from '@/providers/RecommendationContext'
import type { AnyScored } from '@/providers/RecommendationContext'
import everonSupplyPoints from '@/data/everonSupplyPoints'
import { computeRadioLinks, computeMobRadioLinks, computeAttackProjectionLines } from '@/data/radioConfig'
import { analyzeRadioNetwork } from '@/scoring/radioNetwork'
import { MapContextMenu } from './MapContextMenu'
import styles from './TacticalMap.module.css'

// ── Rangefinder rings come from per-vehicle config ─────────────────────────────

function makeCircleGeoJSON(lng: number, lat: number, radiusM: number, steps = 72) {
  const r = radiusM / METRES_PER_DEGREE
  const coords = Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI
    return [lng + r * Math.cos(a), lat + r * Math.sin(a)]
  })
  return {
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      geometry: { type: 'Polygon' as const, coordinates: [coords] },
      properties: {},
    }],
  }
}

const OWNER_COLORS: Record<string, string> = {
  neutral: '#78909c',
  US:      '#42a5f5',
  RUS:     '#ef5350',
}

const MAP_STYLE = {
  version: 8 as const,
  sources: {
    'everon-tiles': {
      type: 'raster' as const,
      tiles: [...TILE_SOURCE.tiles],
      tileSize: TILE_SOURCE.tileSize,
      minzoom: TILE_SOURCE.minzoom,
      maxzoom: TILE_SOURCE.maxzoom,
      bounds: [...TILE_SOURCE.bounds] as [number, number, number, number],
    },
  },
  layers: [
    { id: 'background', type: 'background' as const, paint: { 'background-color': '#1a1a2e' } },
    {
      id: 'everon-tiles-layer',
      type: 'raster' as const,
      source: 'everon-tiles',
      paint: {
        'raster-opacity': 1,
        'raster-fade-duration': 0,
        'raster-resampling': 'nearest' as const,
      },
    },
  ],
}

export function TacticalMap() {
  const { state } = useOwnership()
  const { provider: routingProvider } = useRouting()
  const { tab, primaryList, secondaryList, showSupplies } = useRecommendation()
  const [selectedSuggestion, setSelectedSuggestion] = useState<AnyScored | null>(null)
  const RANGEFINDER_RINGS = RANGEFINDER_RINGS_BY_VEHICLE[state.vehicleType] ?? RANGEFINDER_RINGS_BY_VEHICLE['LAV']
  const [routes, setRoutes] = useState<globalThis.Map<string, RouteResult>>(new globalThis.Map())
  const [rangefinderActive, setRangefinderActive] = useState(false)
  const [rangefinderLocked, setRangefinderLocked] = useState(false)
  const [rangefinderCenter, setRangefinderCenter] = useState<{ lng: number; lat: number } | null>(null)
  const { indicators, addIndicator, removeIndicator } = useIndicatorsContext()
  const { mobs, setMob, clearMob } = useMobsContext()
  const [showNotesHeatmap, setShowNotesHeatmap] = useState(true)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; lng: number; lat: number } | null>(null)

  const handleMapClick = useCallback((e: { lngLat: { lng: number; lat: number } }) => {
    setContextMenu(null)
    if (rangefinderActive && !rangefinderLocked) {
      setRangefinderCenter({ lng: e.lngLat.lng, lat: e.lngLat.lat })
    }
  }, [rangefinderActive, rangefinderLocked])

  const handleMapContextMenu = useCallback((e: { lngLat: { lng: number; lat: number }; originalEvent: MouseEvent }) => {
    e.originalEvent.preventDefault()
    setContextMenu({ x: e.originalEvent.clientX, y: e.originalEvent.clientY, lng: e.lngLat.lng, lat: e.lngLat.lat })
  }, [])

  const { notes, addNote, removeNote, clearNotes } = usePositionNotesContext()

  const handlePlaceIndicator = useCallback((typeId: string) => {
    if (!contextMenu) return
    addIndicator(typeId, contextMenu.lng, contextMenu.lat)
  }, [contextMenu, addIndicator])

  const handleRemoveIndicator = useCallback((uid: string) => {
    removeIndicator(uid)
  }, [removeIndicator])

  const handleRatePosition = useCallback((rating: Rating) => {
    if (!contextMenu || !selectedSuggestion) return
    addNote(contextMenu.lng, contextMenu.lat, rating, selectedSuggestion.cap.id)
  }, [contextMenu, selectedSuggestion, addNote])

  const handleSetMob = useCallback((faction: MobFaction) => {
    if (!contextMenu) return
    setMob(faction, contextMenu.lng, contextMenu.lat)
  }, [contextMenu, setMob])

  const handleClearMob = useCallback((faction: MobFaction) => {
    clearMob(faction)
  }, [clearMob])

  // Active list switches with tab; clear any stale selection on tab change
  const activeList: AnyScored[] = tab === 'secondary' ? secondaryList : primaryList

  useEffect(() => {
    setSelectedSuggestion(null)
  }, [tab])

  useEffect(() => {
    if (!state.lavPosition) {
      setRoutes(new globalThis.Map())
      return
    }
    const originCap = everonCAPs.find((c) => c.id === state.lavPosition)
    if (!originCap) return
    const from = { lng: originCap.coords.lng, lat: originCap.coords.lat }
    let cancelled = false
    Promise.all(
      activeList.map(async (s) => {
        const to = { lng: s.cap.coords.lng, lat: s.cap.coords.lat }
        const route = await routingProvider.getRoute(from, to)
        return [s.cap.id, route] as const
      }),
    ).then((results) => {
      if (cancelled) return
      setRoutes(new globalThis.Map(results))
    })
    return () => {
      cancelled = true
    }
  }, [activeList, state.lavPosition, routingProvider])

  const heatmapGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: activeList.map((s) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.cap.coords.lng, s.cap.coords.lat] },
        properties: { score: Math.max(s.totalScore, 0) },
      })),
    }),
    [activeList],
  )

  const routeGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: Array.from(routes.values()).map((r) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: r.coordinates.map((c) => [c.lng, c.lat]),
        },
        properties: {},
      })),
    }),
    [routes],
  )

  const radioLinksGeoJSON = useMemo(() => {
    const capLinks = computeRadioLinks(everonCAPs, state.ownership, state.radio)
    const mobAnchors = (['US', 'RUS'] as const)
      .map((f) => mobs[f] ? { faction: f, lng: mobs[f]!.lng, lat: mobs[f]!.lat } : null)
      .filter((x): x is { faction: 'US' | 'RUS'; lng: number; lat: number } => x != null)
    const mobLinks = computeMobRadioLinks(everonCAPs, state.ownership, state.radio, mobAnchors)
    const links = [...capLinks, ...mobLinks]
    return {
      type: 'FeatureCollection' as const,
      features: links.map((l) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [l.fromLng, l.fromLat],
            [l.toLng, l.toLat],
          ],
        },
        properties: { owner: l.owner, distanceM: Math.round(l.distanceM) },
      })),
    }
  }, [state.ownership, state.radio, mobs])

  // Attack-projection lines: from each friendly online CAP/MOB to enemy CAPs in radio range.
  const attackProjectionGeoJSON = useMemo(() => {
    const playerTeam = state.playerTeam
    const myMob = mobs[playerTeam] ? { lng: mobs[playerTeam]!.lng, lat: mobs[playerTeam]!.lat } : null
    const myRadio = analyzeRadioNetwork(everonCAPs, state, playerTeam, undefined, myMob)
    const lines = computeAttackProjectionLines(
      everonCAPs,
      state.ownership,
      playerTeam,
      myRadio.onlineSet,
      myMob,
    )
    return {
      type: 'FeatureCollection' as const,
      features: lines.map((l) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [
            [l.fromLng, l.fromLat],
            [l.toLng, l.toLat],
          ],
        },
        properties: { attacker: l.attacker, distanceM: Math.round(l.distanceM) },
      })),
    }
  }, [state, mobs])

  // Two GeoJSON sets — one encodes "how good" (rating 5 = weight 1), one "how bad" (rating 1 = weight 1).
  // Layering a red heatmap (avoidance) under a green heatmap (desired) produces a correct red→green grade.
  // heatmap-radius uses exponential zoom interpolation to keep the blob a fixed geographic size (~300 m).
  // At zoom 13, 300 m ≈ 16 px (19.1 m/px); radius doubles every zoom level matching tile scaling.
  const HEATMAP_RADIUS_EXPR = ['interpolate', ['exponential', 2], ['zoom'], 10, 2.66, 24, 43581] as ExpressionSpecification

  const notesAvoidGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: notes
        .filter((n) => n.capId === selectedSuggestion?.cap.id)
        .map((n) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [n.lng, n.lat] },
          properties: { weight: (5 - n.rating) / 4 }, // rating 1 → 1.0, rating 5 → 0.0
        })),
    }),
    [notes, selectedSuggestion],
  )

  const notesDesiredGeoJSON = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: notes
        .filter((n) => n.capId === selectedSuggestion?.cap.id)
        .map((n) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [n.lng, n.lat] },
          properties: { weight: (n.rating - 1) / 4 }, // rating 5 → 1.0, rating 1 → 0.0
        })),
    }),
    [notes, selectedSuggestion],
  )

  return (
    <div className={styles.mapContainer}>
      <MapGL
        initialViewState={MAP_INITIAL_VIEW}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        onClick={handleMapClick}
        onContextMenu={handleMapContextMenu}
        dragRotate={false}
        touchPitch={false}
        maxBounds={[
          [MAP_BOUNDS.minLng, MAP_BOUNDS.minLat],
          [MAP_BOUNDS.maxLng, MAP_BOUNDS.maxLat],
        ]}
      >
        <NavigationControl position="top-right" />

        {rangefinderActive && rangefinderCenter && RANGEFINDER_RINGS.map((ring) => (
          <Source
            key={ring.key}
            id={`rf-${ring.key}`}
            type="geojson"
            data={makeCircleGeoJSON(rangefinderCenter.lng, rangefinderCenter.lat, ring.radiusM)}
          >
            <Layer
              id={`rf-${ring.key}-fill`}
              type="fill"
              paint={{ 'fill-color': ring.color, 'fill-opacity': 0.07 }}
            />
            <Layer
              id={`rf-${ring.key}-line`}
              type="line"
              paint={{ 'line-color': ring.color, 'line-width': 2, 'line-opacity': 0.9 }}
            />
          </Source>
        ))}

        {activeList.length > 0 && (
          <Source id="heatmap" type="geojson" data={heatmapGeoJSON}>
            <Layer
              id="heatmap-layer"
              type="heatmap"
              paint={{
                'heatmap-weight': ['interpolate', ['linear'], ['get', 'score'], 0, 0, 10, 1],
                'heatmap-intensity': 0.8,
                'heatmap-color': [
                  'interpolate',
                  ['linear'],
                  ['heatmap-density'],
                  0,
                  'rgba(0,0,255,0)',
                  0.2,
                  'rgba(0,128,255,0.4)',
                  0.5,
                  'rgba(255,200,0,0.6)',
                  1,
                  'rgba(255,50,0,0.8)',
                ],
                'heatmap-radius': 40,
                'heatmap-opacity': 0.6,
              }}
            />
          </Source>
        )}

        {routes.size > 0 && (
          <Source id="routes" type="geojson" data={routeGeoJSON}>
            <Layer
              id="route-lines"
              type="line"
              paint={{
                'line-color': '#90caf9',
                'line-width': 2,
                'line-dasharray': [4, 2],
                'line-opacity': 0.8,
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
          </Source>
        )}

        {radioLinksGeoJSON.features.length > 0 && (
          <Source id="radio-links" type="geojson" data={radioLinksGeoJSON}>
            {/* Glow halo */}
            <Layer
              id="radio-links-glow"
              type="line"
              paint={{
                'line-color': [
                  'match',
                  ['get', 'owner'],
                  'US', '#42a5f5',
                  'RUS', '#ef5350',
                  '#ef5350',
                ] as ExpressionSpecification,
                'line-width': 6,
                'line-opacity': 0.25,
                'line-blur': 3,
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
            {/* Core line — ARMA-style segmented broadcast */}
            <Layer
              id="radio-links-line"
              type="line"
              paint={{
                'line-color': [
                  'match',
                  ['get', 'owner'],
                  'US', '#64b5f6',
                  'RUS', '#ef5350',
                  '#ef5350',
                ] as ExpressionSpecification,
                'line-width': 1.5,
                'line-opacity': 0.9,
                'line-dasharray': [2, 2],
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
          </Source>
        )}

        {attackProjectionGeoJSON.features.length > 0 && (
          <Source id="attack-projection" type="geojson" data={attackProjectionGeoJSON}>
            {/* Color is the *enemy* faction colour — what we project ONTO. */}
            <Layer
              id="attack-projection-line"
              type="line"
              paint={{
                'line-color': [
                  'match',
                  ['get', 'attacker'],
                  'US', '#ef5350',   // US player → red lines onto RUS targets
                  'RUS', '#64b5f6',  // RUS player → blue lines onto US targets
                  '#ef5350',
                ] as ExpressionSpecification,
                'line-width': 1.4,
                'line-opacity': 0.7,
                'line-dasharray': [1, 3],
              }}
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            />
          </Source>
        )}

        {showSupplies && everonSupplyPoints.map((sp, i) => (
          <Marker key={`supply-${i}`} longitude={sp.lng} latitude={sp.lat}>
            <div
              className={styles.supplyMarker}
              title={`Supply depot — ${sp.resources.toLocaleString()} resources`}
              aria-label={`Supply depot, ${sp.resources.toLocaleString()} resources`}
            >
              📦
            </div>
          </Marker>
        ))}

        {notes.length > 0 && showNotesHeatmap && (
          <>
            {/* Red layer — avoidance (rating 1 = full weight, rating 5 = zero weight) */}
            <Source id="notes-avoid" type="geojson" data={notesAvoidGeoJSON}>
              <Layer
                id="notes-avoid-layer"
                type="heatmap"
                paint={{
                  'heatmap-weight': ['get', 'weight'],
                  'heatmap-intensity': 2.5,
                  'heatmap-radius': HEATMAP_RADIUS_EXPR,
                  'heatmap-opacity': 0.75,
                  'heatmap-color': [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0,    'rgba(0,0,0,0)',
                    0.05, 'rgba(239,83,80,0.25)',
                    0.4,  'rgba(239,83,80,0.65)',
                    1,    'rgba(239,83,80,0.9)',
                  ],
                }}
              />
            </Source>
            {/* Green layer — desired (rating 5 = full weight, rating 1 = zero weight) painted on top */}
            <Source id="notes-desired" type="geojson" data={notesDesiredGeoJSON}>
              <Layer
                id="notes-desired-layer"
                type="heatmap"
                paint={{
                  'heatmap-weight': ['get', 'weight'],
                  'heatmap-intensity': 2.5,
                  'heatmap-radius': HEATMAP_RADIUS_EXPR,
                  'heatmap-opacity': 0.75,
                  'heatmap-color': [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0,    'rgba(0,0,0,0)',
                    0.05, 'rgba(102,187,106,0.25)',
                    0.4,  'rgba(102,187,106,0.65)',
                    1,    'rgba(102,187,106,0.9)',
                  ],
                }}
              />
            </Source>
          </>
        )}

        {/* Note dot markers — right-click to remove */}
        {showNotesHeatmap && notes
          .filter((n) => n.capId === selectedSuggestion?.cap.id)
          .map((n) => (
            <Marker key={n.uid} longitude={n.lng} latitude={n.lat} anchor="center">
              <div
                className={styles.noteDot}
                style={{ '--note-color': RATING_COLORS[n.rating] } as React.CSSProperties}
                title={`Rating ${n.rating} — ${RATING_LABELS[n.rating]}. Right-click to remove.`}
                onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); removeNote(n.uid) }}
              />
            </Marker>
          ))
        }

        {everonCAPs.map((cap) => {
          const owner = state.ownership[cap.id] ?? 'neutral'
          const enemy: string = state.playerTeam === 'US' ? 'RUS' : 'US'
          const isLav = state.lavPosition === cap.id
          const isMajor = cap.type === 'major'
          const isUnderAttack = state.underAttack.has(cap.id)
          const isAttacking = owner === enemy && state.attacking.has(cap.id)
          return (
            <Marker
              key={cap.id}
              longitude={cap.coords.lng}
              latitude={cap.coords.lat}
              anchor="center"
            >
              <div style={{ position: 'relative' }}>
                {isUnderAttack && <div className={styles.underAttackRing} />}
                {isAttacking && <div className={styles.attackingRing} />}
                <div
                  className={`${styles.capMarker} ${isMajor ? styles.majorMarker : styles.minorMarker} ${isLav ? styles.lavMarker : ''}`}
                  style={{
                    borderColor: OWNER_COLORS[owner],
                    background: OWNER_COLORS[owner] + '33',
                  }}
                  title={`${cap.name} (${isMajor ? 'major' : 'minor'}) — ${owner}${isLav ? ' (LAV)' : ''}${isUnderAttack ? ' ⚠ UNDER ATTACK' : ''}${isAttacking ? ' ⚔ BEING ATTACKED' : ''}`}
                >
                  {isLav && <span className={styles.lavIcon}>▲</span>}
                </div>
                {isUnderAttack && <span className={styles.underAttackBadge}>⚠</span>}
                {isAttacking && <span className={styles.attackingBadge}>⚔</span>}
                <span className={`${styles.capFullName} ${isMajor ? styles.capFullNameMajor : ''}`}>
                  {cap.name}
                </span>
              </div>
            </Marker>
          )
        })}

        {(['US', 'RUS'] as const).map((faction) => {
          const m = mobs[faction]
          if (!m) return null
          const isFriendly = faction === state.playerTeam
          return (
            <Marker key={`mob-${faction}`} longitude={m.lng} latitude={m.lat} anchor="center">
              <div
                className={styles.mobMarker}
                style={{ '--mob-color': MOB_COLORS[faction] } as React.CSSProperties}
                title={`${faction} MOB${isFriendly ? ' (friendly)' : ' (enemy — discovered)'} — right-click map to move or clear`}
                aria-label={`${faction} MOB`}
              >
                <span className={styles.mobGlyph}>{MOB_GLYPH}</span>
                <span className={styles.mobLabel}>{faction} MOB</span>
              </div>
            </Marker>
          )
        })}

        {indicators.map((ind) => {
          const type = INDICATOR_BY_ID[ind.typeId]
          if (!type) return null
          return (
            <Marker key={ind.uid} longitude={ind.lng} latitude={ind.lat} anchor="center">
              <button
                type="button"
                className={styles.indicatorMarker}
                style={{ '--ind-color': type.color } as React.CSSProperties}
                onClick={(e) => { e.stopPropagation(); handleRemoveIndicator(ind.uid) }}
                title={`${type.label} — click to remove`}
                aria-label={`Remove ${type.label} indicator`}
              >
                <span className={styles.indicatorIcon}>{type.icon}</span>
              </button>
            </Marker>
          )
        })}

        {activeList.map((s, i) => (
          <Marker
            key={`sug-${s.cap.id}`}
            longitude={s.cap.coords.lng}
            latitude={s.cap.coords.lat}
            anchor="bottom"
          >
            <button
              type="button"
              className={`${styles.suggestionMarker} ${tab === 'secondary' ? styles.suggestionMarkerAttack : ''} ${selectedSuggestion?.cap.id === s.cap.id ? styles.selected : ''}`}
              onClick={() =>
                setSelectedSuggestion((prev) => (prev?.cap.id === s.cap.id ? null : s))
              }
              aria-label={`${tab === 'secondary' ? 'Target' : 'Suggestion'} ${i + 1}: ${s.cap.name}, score ${s.totalScore.toFixed(1)}`}
            >
              #{i + 1}
              <span className={styles.scoreLabel}>{s.totalScore.toFixed(1)}</span>
            </button>
          </Marker>
        ))}
      </MapGL>

      <div className={styles.rangefinderControls}>
        {!mobs[state.playerTeam] && (
          <div className={styles.mobHint} role="status">
            ★ Right-click the map to set your <strong>{state.playerTeam} MOB</strong>
          </div>
        )}
        <div className={styles.rangefinderRow}>
          <button
            type="button"
            className={`${styles.rangefinderBtn} ${showNotesHeatmap ? styles.rangefinderBtnActive : ''}`}
            onClick={() => setShowNotesHeatmap((v) => !v)}
            title={showNotesHeatmap ? 'Hide position heatmap' : 'Show position heatmap'}
          >
            <span className={styles.rangefinderDot} />
            {showNotesHeatmap ? 'Heatmap ON' : 'Heatmap OFF'}
          </button>
          {showNotesHeatmap && notes.length > 0 && (
            <>
              <span className={styles.notesCount}>{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
              <button
                type="button"
                className={styles.notesClearBtn}
                onClick={clearNotes}
                title="Clear all position notes"
              >
                Clear notes
              </button>
            </>
          )}
        </div>
        <div className={styles.rangefinderRow}>
          <button
            type="button"
            className={`${styles.rangefinderBtn} ${rangefinderActive ? styles.rangefinderBtnActive : ''}`}
            onClick={() => {
              if (rangefinderActive) {
                setRangefinderActive(false)
                setRangefinderLocked(false)
                setRangefinderCenter(null)
              } else {
                setRangefinderActive(true)
              }
            }}
          >
            <span className={styles.rangefinderDot} />
            {rangefinderActive ? 'Rangefinder ON' : 'Rangefinder OFF'}
          </button>
          {rangefinderActive && rangefinderCenter && (
            <button
              type="button"
              className={`${styles.rangefinderLockBtn} ${rangefinderLocked ? styles.rangefinderLockBtnActive : ''}`}
              onClick={() => setRangefinderLocked((v) => !v)}
              title={rangefinderLocked ? 'Unlock rangefinder (click map to move)' : 'Lock rangefinder in place'}
              aria-label={rangefinderLocked ? 'Unlock rangefinder' : 'Lock rangefinder'}
            >
              {rangefinderLocked ? '🔒' : '🔓'}
            </button>
          )}
        </div>
        {rangefinderActive && !rangefinderCenter && (
          <span className={styles.rangefinderHint}>Click map to place</span>
        )}
        {rangefinderActive && rangefinderCenter && (
          <span className={styles.rangefinderLegend}>
            {RANGEFINDER_RINGS.map((r) => (
              <span key={r.key} className={styles.legendItem} style={{ color: r.color }}>
                ● {r.label}
              </span>
            ))}
          </span>
        )}
      </div>

      {selectedSuggestion && (
        <div className={styles.rationalePanel} role="dialog" aria-label="Suggestion rationale">
          <div className={styles.rationaleHeader}>
            <strong>{selectedSuggestion.cap.name}</strong>
            <span className={styles.rationaleScore}>
              Score: {selectedSuggestion.totalScore.toFixed(2)}
            </span>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => setSelectedSuggestion(null)}
              aria-label="Close rationale"
            >
              ×
            </button>
          </div>
          <ul className={styles.rationaleList}>
            {selectedSuggestion.rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {'factors' in selectedSuggestion ? (
            <dl className={styles.factorGrid}>
              <dt>Enemy pressure</dt>
              <dd>{selectedSuggestion.factors.enemyPressure.toFixed(2)}</dd>
              <dt>Contested centrality</dt>
              <dd>{selectedSuggestion.factors.contestedCentrality.toFixed(2)}</dd>
              <dt>Overextension</dt>
              <dd>{selectedSuggestion.factors.overextensionPenalty.toFixed(2)}</dd>
              <dt>Movement feasibility</dt>
              <dd>{selectedSuggestion.factors.movementFeasibility.toFixed(2)}</dd>
              {selectedSuggestion.factors.underAttackUrgency > 0 && (
                <><dt>⚠ Under attack</dt><dd>URGENT</dd></>
              )}
              {selectedSuggestion.factors.attackingPressure > 0 && (
                <><dt>⚔ Enemy pushing</dt><dd>{selectedSuggestion.factors.attackingPressure} neighbor(s)</dd></>
              )}
              {selectedSuggestion.factors.supplyProximity > 0.05 && (
                <><dt>📦 Supply proximity</dt><dd>{(selectedSuggestion.factors.supplyProximity * 100).toFixed(0)}%</dd></>
              )}
            </dl>
          ) : 'attackFactors' in selectedSuggestion ? (
            <dl className={styles.factorGrid}>
              <dt>Friendly support</dt>
              <dd>{selectedSuggestion.attackFactors.friendlySupport.toFixed(2)}</dd>
              <dt>Isolation</dt>
              <dd>{selectedSuggestion.attackFactors.isolation.toFixed(2)}</dd>
              <dt>Movement feasibility</dt>
              <dd>{selectedSuggestion.attackFactors.movementFeasibility.toFixed(2)}</dd>
              {selectedSuggestion.attackFactors.majorBonus > 0 && (
                <><dt>Major base bonus</dt><dd>{selectedSuggestion.attackFactors.majorBonus.toFixed(2)}</dd></>
              )}
              {selectedSuggestion.attackFactors.momentum > 0 && (
                <><dt>⚔ Momentum</dt><dd>ACTIVE</dd></>
              )}
              {selectedSuggestion.attackFactors.reliefValue > 0 && (
                <><dt>Relieves friendlies</dt><dd>{selectedSuggestion.attackFactors.reliefValue} CAP(s)</dd></>
              )}
              {selectedSuggestion.attackFactors.supplyProximity > 0.05 && (
                <><dt>📦 Supply proximity</dt><dd>{(selectedSuggestion.attackFactors.supplyProximity * 100).toFixed(0)}%</dd></>
              )}
            </dl>
          ) : 'strikeFactors' in selectedSuggestion ? (
            <dl className={styles.factorGrid}>
              <dt>Enemy density</dt>
              <dd>{selectedSuggestion.strikeFactors.enemyDensity}</dd>
              {selectedSuggestion.strikeFactors.majorBonus > 0 && (
                <><dt>Major base</dt><dd>Yes</dd></>
              )}
              {selectedSuggestion.strikeFactors.momentum > 0 && (
                <><dt>⚔ Ground assault active</dt><dd>CAS requested</dd></>
              )}
              {selectedSuggestion.strikeFactors.casRelief > 0 && (
                <><dt>CAS relief</dt><dd>{selectedSuggestion.strikeFactors.casRelief} friendly CAP(s)</dd></>
              )}
              <dt>Range score</dt>
              <dd>{selectedSuggestion.strikeFactors.rangeScore.toFixed(2)}</dd>
              {selectedSuggestion.strikeFactors.supplyProximity > 0.05 && (
                <><dt>📦 Supply proximity</dt><dd>{(selectedSuggestion.strikeFactors.supplyProximity * 100).toFixed(0)}%</dd></>
              )}
            </dl>
          ) : 'resupplyFactors' in selectedSuggestion ? (
            <dl className={styles.factorGrid}>
              {selectedSuggestion.resupplyFactors.underAttackBonus > 0 && (
                <><dt>⚠ Under attack</dt><dd>URGENT</dd></>
              )}
              <dt>Frontline score</dt>
              <dd>{selectedSuggestion.resupplyFactors.frontlineScore.toFixed(2)}</dd>
              {selectedSuggestion.resupplyFactors.majorBonus > 0 && (
                <><dt>Major base</dt><dd>Yes</dd></>
              )}
              <dt>Range score</dt>
              <dd>{selectedSuggestion.resupplyFactors.rangeScore.toFixed(2)}</dd>
              {selectedSuggestion.resupplyFactors.supplyProximity > 0.05 && (
                <><dt>📦 Supply proximity</dt><dd>{(selectedSuggestion.resupplyFactors.supplyProximity * 100).toFixed(0)}%</dd></>
              )}
            </dl>
          ) : 'reinforceFactors' in selectedSuggestion ? (
            <dl className={styles.factorGrid}>
              <dt>Isolation</dt>
              <dd>{(selectedSuggestion.reinforceFactors.isolation * 100).toFixed(0)}%</dd>
              {selectedSuggestion.reinforceFactors.majorBonus > 0 && (
                <><dt>Major base</dt><dd>Yes</dd></>
              )}
              {selectedSuggestion.reinforceFactors.friendlySupport > 0 && (
                <><dt>Friendly neighbors</dt><dd>{selectedSuggestion.reinforceFactors.friendlySupport}</dd></>
              )}
              <dt>Range score</dt>
              <dd>{selectedSuggestion.reinforceFactors.rangeScore.toFixed(2)}</dd>
              {selectedSuggestion.reinforceFactors.supplyProximity > 0.05 && (
                <><dt>📦 Supply proximity</dt><dd>{(selectedSuggestion.reinforceFactors.supplyProximity * 100).toFixed(0)}%</dd></>
              )}
            </dl>
          ) : null}
        </div>
      )}
      {contextMenu && (
        <MapContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetCapName={selectedSuggestion?.cap.name ?? null}
          playerTeam={state.playerTeam}
          hasFriendlyMob={!!mobs[state.playerTeam]}
          hasEnemyMob={!!mobs[state.playerTeam === 'US' ? 'RUS' : 'US']}
          onPlace={handlePlaceIndicator}
          onRate={handleRatePosition}
          onSetMob={handleSetMob}
          onClearMob={handleClearMob}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}
