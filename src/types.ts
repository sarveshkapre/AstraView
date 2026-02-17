import type { SatRec } from 'satellite.js'

export type OrbitRegime = 'LEO' | 'MEO' | 'GEO'
export type OrbitType = 'Payload' | 'Rocket Body' | 'Debris'
export type AltitudeBand = 'All' | '<500km' | '500-1200km' | '1200-20000km' | '20000km+'

// Safe, curated subset of CelesTrak "Current Data" GROUPs used by AstraView.
// Keep this list small and stable; new groups can be added without breaking old permalinks.
export type TleCatalogGroup = 'active' | 'stations' | 'starlink' | 'oneweb' | 'gps-ops' | 'iridium'

export type OrbitObject = {
  id: string
  noradId: number
  name: string
  regime: OrbitRegime
  type: OrbitType
  altitudeKm: number
  inclinationDeg: number
  raanDeg: number
  meanAnomalyDeg: number
  periodMin: number
  operator?: string
  constellation?: string
  launchDate?: string
  country?: string
  source?: 'synthetic' | 'tle'
  tle?: { line1: string; line2: string }
  satrec?: SatRec
}

export type FiltersState = {
  regimes: Set<OrbitRegime>
  types: Set<OrbitType>
  constellations: Set<string>
  altitudeBand: AltitudeBand
  dataset: 'all' | 'payloads'
  performance: 'high' | 'balanced' | 'low'
  catalogGroup: TleCatalogGroup
}

export type ViewState = {
  camera: [number, number, number]
  target: [number, number, number]
  distance: number
}

export type TimeState = {
  mode: 'live' | 'paused'
  pausedAtSec?: number
  speed?: number
}

export type SnapshotPreset = 'custom' | 'presentation' | 'social' | 'report'

export type SnapshotState = {
  mode: 'globe' | 'full'
  watermark: boolean
  scale: 1 | 2
  preset: SnapshotPreset
}

export type OverlayState = {
  groundTrack: boolean
}

export type RefreshIntervalMinutes = 0 | 5 | 15
