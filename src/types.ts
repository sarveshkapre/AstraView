import type { SatRec } from 'satellite.js'

export type OrbitRegime = 'LEO' | 'MEO' | 'GEO'
export type OrbitType = 'Payload' | 'Rocket Body' | 'Debris'
export type AltitudeBand = 'All' | '<500km' | '500-1200km' | '1200-20000km' | '20000km+'

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
