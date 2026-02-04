import type { FiltersState, OrbitRegime, OrbitType, ViewState, TimeState } from '../types'

const parseList = (value: string | null) =>
  value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []

const parseVector = (value: string | null): [number, number, number] | null => {
  if (!value) return null
  const parts = value.split(',').map((item) => Number(item))
  if (parts.length !== 3 || parts.some((num) => Number.isNaN(num))) return null
  return [parts[0], parts[1], parts[2]]
}

export type UrlState = {
  filters?: FiltersState
  selectedId?: string | null
  search?: string
  view?: ViewState
  time?: TimeState
}

export const parseUrlState = (): UrlState => {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const regimes = parseList(params.get('r')) as OrbitRegime[]
  const types = parseList(params.get('t')) as OrbitType[]
  const constellations = parseList(params.get('c'))
  const altitudeBand = params.get('a')
  const dataset = params.get('ds') === 'p' ? 'payloads' : 'all'
  const performance = params.get('pf') === 'h' ? 'high' : params.get('pf') === 'l' ? 'low' : 'balanced'
  const search = params.get('q') ?? undefined
  const selectedId = params.get('s')

  const camera = parseVector(params.get('cam'))
  const target = parseVector(params.get('tar'))
  const distance = Number(params.get('d'))
  const view = camera && target && !Number.isNaN(distance) ? { camera, target, distance } : undefined

  const timeMode = params.get('tm')
  const pausedAtSec = Number(params.get('tt'))
  const speed = Number(params.get('sp'))
  const speedValue = !Number.isNaN(speed) && speed > 0 ? speed : undefined
  const time: TimeState | undefined =
    timeMode === 'p' && !Number.isNaN(pausedAtSec)
      ? { mode: 'paused', pausedAtSec, speed: speedValue }
      : timeMode === 'l'
        ? { mode: 'live', speed: speedValue }
        : speedValue
          ? { mode: 'live', speed: speedValue }
          : undefined

  const filters: FiltersState = {
    regimes: new Set(regimes),
    types: new Set(types),
    constellations: new Set(constellations),
    altitudeBand: (altitudeBand as FiltersState['altitudeBand']) ?? 'All',
    dataset,
    performance,
  }

  if (filters.dataset === 'payloads' && !filters.types.has('Payload')) {
    filters.types = new Set<OrbitType>(['Payload'])
  }

  return {
    filters,
    selectedId: selectedId ?? undefined,
    search,
    view,
    time,
  }
}

export const serializeUrlState = (state: UrlState) => {
  if (typeof window === 'undefined') return
  const params = new URLSearchParams()

  if (state.filters) {
    if (state.filters.regimes.size > 0) params.set('r', [...state.filters.regimes].join(','))
    if (state.filters.types.size > 0) params.set('t', [...state.filters.types].join(','))
    if (state.filters.constellations.size > 0) params.set('c', [...state.filters.constellations].join(','))
    if (state.filters.altitudeBand && state.filters.altitudeBand !== 'All') {
      params.set('a', state.filters.altitudeBand)
    }
    if (state.filters.dataset && state.filters.dataset !== 'all') {
      params.set('ds', 'p')
    }
    if (state.filters.performance && state.filters.performance !== 'balanced') {
      params.set('pf', state.filters.performance === 'high' ? 'h' : 'l')
    }
  }

  if (state.selectedId) params.set('s', state.selectedId)
  if (state.search) params.set('q', state.search)

  if (state.view) {
    params.set('cam', state.view.camera.map((num) => num.toFixed(3)).join(','))
    params.set('tar', state.view.target.map((num) => num.toFixed(3)).join(','))
    params.set('d', state.view.distance.toFixed(3))
  }

  if (state.time) {
    params.set('tm', state.time.mode === 'paused' ? 'p' : 'l')
    if (state.time.mode === 'paused' && state.time.pausedAtSec) {
      params.set('tt', Math.round(state.time.pausedAtSec).toString())
    }
    if (state.time.speed && state.time.speed !== 1) {
      params.set('sp', state.time.speed.toString())
    }
  }

  const url = `${window.location.pathname}?${params.toString()}`
  window.history.replaceState({}, '', url)
}
