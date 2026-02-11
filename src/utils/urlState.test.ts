// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { FiltersState } from '../types'
import { parseUrlState, serializeUrlState } from './urlState'

const setSearch = (search: string) => {
  const next = search ? `/${search.startsWith('?') ? search : `?${search}`}` : '/'
  window.history.replaceState({}, '', next)
}

const toSorted = <T,>(set: Set<T>) => [...set].slice().sort()

describe('urlState', () => {
  beforeEach(() => {
    setSearch('')
  })

  it('parses defaults when query params are absent', () => {
    const state = parseUrlState()
    expect(state.filters).toBeTruthy()
    expect(toSorted(state.filters!.regimes)).toEqual(['GEO', 'LEO', 'MEO'])
    expect(toSorted(state.filters!.types)).toEqual(['Debris', 'Payload', 'Rocket Body'])
    expect(state.filters!.altitudeBand).toBe('All')
    expect(state.filters!.dataset).toBe('all')
    expect(state.filters!.performance).toBe('balanced')
    expect(state.filters!.catalogGroup).toBe('active')
    expect(state.snapshot).toEqual({ mode: 'globe', preset: 'custom', scale: 1, watermark: true })
    expect(state.overlays).toEqual({ groundTrack: false })
  })

  it('enforces payload-only invariants when dataset=payloads', () => {
    setSearch('?ds=p&t=Debris,Payload')
    const state = parseUrlState()
    expect(state.filters!.dataset).toBe('payloads')
    expect([...state.filters!.types]).toEqual(['Payload'])
  })

  it('round-trips core state via serialize/parse', () => {
    const filters: FiltersState = {
      regimes: new Set(['LEO', 'GEO']),
      types: new Set(['Payload', 'Debris']),
      constellations: new Set(['Starlink']),
      altitudeBand: '<500km',
      dataset: 'all',
      performance: 'high',
      catalogGroup: 'starlink',
    }

    serializeUrlState({
      filters,
      selectedId: 'TLE-12345',
      search: 'starlink',
      watchlist: ['TLE-12345', 'OBJ-12001'],
      view: { camera: [1.23456, 2.34567, 3.45678], target: [0.1, 0.2, 0.3], distance: 4.56789 },
      time: { mode: 'paused', pausedAtSec: 321, speed: 5 },
      snapshot: { mode: 'full', preset: 'social', scale: 2, watermark: false },
      overlays: { groundTrack: true },
    })

    const parsed = parseUrlState()
    expect(parsed.selectedId).toBe('TLE-12345')
    expect(parsed.search).toBe('starlink')
    expect(parsed.watchlist).toEqual(['TLE-12345', 'OBJ-12001'])
    expect(toSorted(parsed.filters!.regimes)).toEqual(['GEO', 'LEO'])
    expect(toSorted(parsed.filters!.types)).toEqual(['Debris', 'Payload'])
    expect([...parsed.filters!.constellations]).toEqual(['Starlink'])
    expect(parsed.filters!.altitudeBand).toBe('<500km')
    expect(parsed.filters!.dataset).toBe('all')
    expect(parsed.filters!.performance).toBe('high')
    expect(parsed.filters!.catalogGroup).toBe('starlink')
    expect(parsed.time).toEqual({ mode: 'paused', pausedAtSec: 321, speed: 5 })
    expect(parsed.snapshot).toEqual({ mode: 'full', preset: 'social', scale: 2, watermark: false })
    expect(parsed.overlays).toEqual({ groundTrack: true })
    expect(parsed.view).toBeTruthy()
    expect(parsed.view!.distance).toBeCloseTo(4.568, 3)
  })
})
