import type {
  FiltersState,
  OrbitRegime,
  OrbitType,
  ViewState,
  TimeState,
  SnapshotState,
  SnapshotPreset,
  TleCatalogGroup,
  OverlayState,
  RefreshIntervalMinutes,
} from '../types'
import { ALTITUDE_BANDS, ALL_REGIMES, ALL_TYPES, PERFORMANCE_MODES } from '../constants/filters'

const SNAPSHOT_PRESET_KEYS: Record<SnapshotPreset, string> = {
  custom: 'c',
  presentation: 'p',
  social: 's',
  report: 'r',
}
const SNAPSHOT_PRESET_FROM_KEY = new Map(
  Object.entries(SNAPSHOT_PRESET_KEYS).map(([preset, key]) => [key, preset as SnapshotPreset]),
)

const CATALOG_GROUP_KEYS: Record<TleCatalogGroup, string> = {
  active: 'a',
  stations: 'st',
  starlink: 'sl',
  oneweb: 'ow',
  'gps-ops': 'g',
  iridium: 'ir',
  qianfan: 'qf',
  kuiper: 'kp',
  weather: 'wx',
}
const CATALOG_GROUP_FROM_KEY = new Map(
  Object.entries(CATALOG_GROUP_KEYS).map(([group, key]) => [key, group as TleCatalogGroup]),
)

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
  watchlist?: string[]
  view?: ViewState
  time?: TimeState
  snapshot?: SnapshotState
  overlays?: OverlayState
  refreshMinutes?: RefreshIntervalMinutes
}

export const parseUrlState = (): UrlState => {
  if (typeof window === 'undefined') return {}
  const params = new URLSearchParams(window.location.search)
  const regimes = parseList(params.get('r')) as OrbitRegime[]
  const types = parseList(params.get('t')) as OrbitType[]
  const constellations = parseList(params.get('c'))
  const altitudeBand = params.get('a')
  const dataset = params.get('ds') === 'p' ? 'payloads' : 'all'
  const performanceParam = params.get('pf')
  const performance: FiltersState['performance'] =
    performanceParam === 'h'
      ? 'high'
      : performanceParam === 'l'
        ? 'low'
        : 'balanced'
  const catalogGroupParam = params.get('cg')
  const catalogGroup =
    CATALOG_GROUP_FROM_KEY.get(catalogGroupParam ?? '') ??
    // Back-compat: allow older permalinks (or manual edits) to specify the full group name.
    (Object.keys(CATALOG_GROUP_KEYS).includes((catalogGroupParam ?? '') as TleCatalogGroup)
      ? (catalogGroupParam as TleCatalogGroup)
      : 'active')
  const search = params.get('q') ?? undefined
  const selectedId = params.get('s')
  const watchlist = parseList(params.get('w'))

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
    regimes: new Set(regimes.length > 0 ? regimes : ALL_REGIMES),
    types: new Set(types.length > 0 ? types : ALL_TYPES),
    constellations: new Set(constellations),
    altitudeBand: ALTITUDE_BANDS.includes(altitudeBand as FiltersState['altitudeBand'])
      ? (altitudeBand as FiltersState['altitudeBand'])
      : 'All',
    dataset,
    performance: PERFORMANCE_MODES.includes(performance) ? performance : 'balanced',
    catalogGroup,
  }

  if (filters.dataset === 'payloads') {
    // Keep chip state consistent with behavior: payloads-only implies Payload type only.
    filters.types = new Set<OrbitType>(['Payload'])
  }

  const snapshotModeParam = params.get('xm')
  const snapshotPresetParam = params.get('xp')
  const snapshotScaleParam = Number(params.get('xs'))
  const snapshotWatermarkParam = params.get('xw')

  const snapshotMode: SnapshotState['mode'] = snapshotModeParam === 'f' ? 'full' : 'globe'
  const snapshotPreset = SNAPSHOT_PRESET_FROM_KEY.get(snapshotPresetParam ?? '') ?? 'custom'
  const snapshotScale: SnapshotState['scale'] = snapshotScaleParam === 2 ? 2 : 1
  const snapshotWatermark = snapshotWatermarkParam === '0' ? false : true
  const snapshot: SnapshotState = {
    mode: snapshotMode,
    preset: snapshotPreset,
    scale: snapshotScale,
    watermark: snapshotWatermark,
  }
  const overlays: OverlayState = {
    groundTrack: params.get('gt') === '1',
  }
  const refreshParam = Number(params.get('rf'))
  const refreshMinutes: RefreshIntervalMinutes = refreshParam === 5 ? 5 : refreshParam === 15 ? 15 : 0

  return {
    filters,
    selectedId: selectedId ?? undefined,
    search,
    watchlist: watchlist.length > 0 ? watchlist : undefined,
    view,
    time,
    snapshot,
    overlays,
    refreshMinutes,
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
    if (state.filters.catalogGroup && state.filters.catalogGroup !== 'active') {
      params.set('cg', CATALOG_GROUP_KEYS[state.filters.catalogGroup])
    }
  }

  if (state.selectedId) params.set('s', state.selectedId)
  if (state.search) params.set('q', state.search)
  if (state.watchlist && state.watchlist.length > 0) params.set('w', state.watchlist.join(','))

  if (state.view) {
    params.set('cam', state.view.camera.map((num) => num.toFixed(3)).join(','))
    params.set('tar', state.view.target.map((num) => num.toFixed(3)).join(','))
    params.set('d', state.view.distance.toFixed(3))
  }

  if (state.time) {
    params.set('tm', state.time.mode === 'paused' ? 'p' : 'l')
    if (state.time.mode === 'paused' && state.time.pausedAtSec !== undefined) {
      params.set('tt', Math.round(state.time.pausedAtSec).toString())
    }
    if (state.time.speed && state.time.speed !== 1) {
      params.set('sp', state.time.speed.toString())
    }
  }

  if (state.snapshot) {
    if (state.snapshot.mode !== 'globe') {
      params.set('xm', state.snapshot.mode === 'full' ? 'f' : 'g')
    }
    if (state.snapshot.preset !== 'custom') {
      params.set('xp', SNAPSHOT_PRESET_KEYS[state.snapshot.preset])
    }
    if (state.snapshot.scale !== 1) {
      params.set('xs', state.snapshot.scale.toString())
    }
    if (!state.snapshot.watermark) {
      params.set('xw', '0')
    }
  }

  if (state.overlays?.groundTrack) {
    params.set('gt', '1')
  }
  if (state.refreshMinutes && state.refreshMinutes > 0) {
    params.set('rf', state.refreshMinutes.toString())
  }

  const query = params.toString()
  const url = query ? `${window.location.pathname}?${query}` : window.location.pathname
  window.history.replaceState({}, '', url)
}
