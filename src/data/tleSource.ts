import * as satellite from 'satellite.js'
import type { OMMJsonObject } from 'satellite.js'
import type { OrbitObject, OrbitRegime, OrbitType, TleCatalogGroup } from '../types'

const EARTH_RADIUS_KM = 6371
const MU = 398600.4418
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 12000
type CatalogFormat = 'tle' | 'json'
const MAX_CACHE_CHARS = 4_500_000

export const TLE_CATALOG_GROUPS: { key: TleCatalogGroup; label: string; groupParam: string }[] = [
  { key: 'active', label: 'Active', groupParam: 'ACTIVE' },
  { key: 'stations', label: 'Stations', groupParam: 'STATIONS' },
  { key: 'starlink', label: 'Starlink', groupParam: 'STARLINK' },
  { key: 'oneweb', label: 'OneWeb', groupParam: 'ONEWEB' },
  { key: 'gps-ops', label: 'GPS (Ops)', groupParam: 'GPS-OPS' },
  { key: 'iridium', label: 'Iridium', groupParam: 'IRIDIUM' },
]

const GROUP_PARAM_BY_KEY = new Map(TLE_CATALOG_GROUPS.map((entry) => [entry.key, entry.groupParam]))
const labelForGroup = (group: TleCatalogGroup) =>
  TLE_CATALOG_GROUPS.find((entry) => entry.key === group)?.label ?? 'Active'

const cacheKeyForGroup = (group: TleCatalogGroup) => `astraview.tle.gp.${group}.v2`
const urlForGroup = (group: TleCatalogGroup, format: CatalogFormat) => {
  const param = GROUP_PARAM_BY_KEY.get(group) ?? 'ACTIVE'
  return `https://celestrak.org/NORAD/elements/gp.php?GROUP=${encodeURIComponent(param)}&FORMAT=${format}`
}

const guessConstellation = (name: string) => {
  const upper = name.toUpperCase()
  if (upper.includes('STARLINK')) return 'Starlink'
  if (upper.includes('ONEWEB')) return 'OneWeb'
  if (upper.includes('IRIDIUM')) return 'Iridium'
  if (upper.includes('GPS')) return 'GPS'
  if (upper.includes('GALILEO')) return 'Galileo'
  if (upper.includes('GLONASS')) return 'GLONASS'
  if (upper.includes('BEIDOU')) return 'BeiDou'
  if (upper.includes('SENTINEL')) return 'Sentinel'
  return undefined
}

const guessOperator = (name: string, constellation?: string) => {
  if (constellation) return constellation
  const upper = name.toUpperCase()
  if (upper.includes('STARLINK')) return 'SpaceX'
  if (upper.includes('ONEWEB')) return 'OneWeb'
  if (upper.includes('IRIDIUM')) return 'Iridium'
  if (upper.includes('GALILEO')) return 'ESA'
  if (upper.includes('SENTINEL')) return 'ESA'
  if (upper.includes('GPS')) return 'USSF'
  return undefined
}

const estimateAltitudeKm = (satrec: satellite.SatRec) => {
  const meanMotionRadPerMin = satrec.no
  if (!meanMotionRadPerMin || Number.isNaN(meanMotionRadPerMin)) return 0
  const meanMotionRadPerSec = meanMotionRadPerMin / 60
  const semiMajorAxis = Math.cbrt(MU / Math.pow(meanMotionRadPerSec, 2))
  return semiMajorAxis - EARTH_RADIUS_KM
}

const regimeFromAltitude = (altitudeKm: number): OrbitRegime => {
  if (altitudeKm < 2000) return 'LEO'
  if (altitudeKm < 20000) return 'MEO'
  return 'GEO'
}

const parseTleText = (tleText: string): OrbitObject[] => {
  const lines = tleText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const objects: OrbitObject[] = []
  for (let i = 0; i < lines.length; i += 3) {
    const nameLine = lines[i]
    const line1 = lines[i + 1]
    const line2 = lines[i + 2]
    if (!line1 || !line2) continue
    if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) {
      // Handle cases where name is omitted
      if (lines[i].startsWith('1 ') && lines[i + 1]?.startsWith('2 ')) {
        i -= 1
        continue
      }
      continue
    }
    const name = nameLine.startsWith('0 ') ? nameLine.slice(2) : nameLine
    const satrec = satellite.twoline2satrec(line1, line2)
    const noradId = Number(satrec.satnum)
    const altitudeKm = Math.max(0, Math.round(estimateAltitudeKm(satrec)))
    const periodMin = satrec.no ? (2 * Math.PI) / satrec.no : 0
    const regime = regimeFromAltitude(altitudeKm)
    const constellation = guessConstellation(name)

    objects.push({
      id: `TLE-${noradId}`,
      noradId,
      name,
      regime,
      type: 'Payload' as OrbitType,
      altitudeKm,
      inclinationDeg: Math.round((satrec.inclo * 180) / Math.PI),
      raanDeg: Math.round((satrec.nodeo * 180) / Math.PI),
      meanAnomalyDeg: Math.round((satrec.mo * 180) / Math.PI),
      periodMin,
      operator: guessOperator(name, constellation),
      constellation,
      source: 'tle',
      tle: { line1, line2 },
      satrec,
    })
  }

  return objects
}

export const parseCelestrakJsonText = (jsonText: string): OrbitObject[] => {
  const parsed = JSON.parse(jsonText) as unknown
  const entries = Array.isArray(parsed) ? (parsed as OMMJsonObject[]) : parsed ? [parsed as OMMJsonObject] : []

  const objects: OrbitObject[] = []
  const seenNorad = new Set<number>()
  for (const entry of entries) {
    let satrec: satellite.SatRec
    try {
      satrec = satellite.json2satrec(entry)
    } catch {
      continue
    }
    if (typeof satrec.error === 'number' && satrec.error !== 0) continue
    const noradIdRaw = Number(entry.NORAD_CAT_ID ?? satrec.satnum)
    if (!Number.isFinite(noradIdRaw) || noradIdRaw <= 0) continue
    const noradId = Math.trunc(noradIdRaw)
    if (seenNorad.has(noradId)) continue
    if (!Number.isFinite(satrec.no) || satrec.no <= 0) continue
    if (![satrec.inclo, satrec.nodeo, satrec.mo].every((value) => Number.isFinite(value))) continue

    const name = (entry.OBJECT_NAME ?? '').trim() || `NORAD ${noradId}`
    const altitudeKm = Math.max(0, Math.round(estimateAltitudeKm(satrec)))
    const periodMin = satrec.no ? (2 * Math.PI) / satrec.no : 0
    const regime = regimeFromAltitude(altitudeKm)
    const constellation = guessConstellation(name)

    objects.push({
      id: `TLE-${noradId}`,
      noradId,
      name,
      regime,
      type: 'Payload' as OrbitType,
      altitudeKm,
      inclinationDeg: Math.round((satrec.inclo * 180) / Math.PI),
      raanDeg: Math.round((satrec.nodeo * 180) / Math.PI),
      meanAnomalyDeg: Math.round((satrec.mo * 180) / Math.PI),
      periodMin,
      operator: guessOperator(name, constellation),
      constellation,
      source: 'tle',
      satrec,
    })
    seenNorad.add(noradId)
  }

  return objects
}

const parseCatalogText = (format: CatalogFormat, text: string) => {
  if (format === 'json') return parseCelestrakJsonText(text)
  return parseTleText(text)
}

type CachePayloadV1 = { fetchedAt: number; tle: string }
type CachePayloadV2 = { fetchedAt: number; format: CatalogFormat; data: string }

const readCache = (group: TleCatalogGroup): CachePayloadV2 | null => {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(cacheKeyForGroup(group))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as CachePayloadV1 | CachePayloadV2
    if (!parsed?.fetchedAt) return null
    if ('data' in parsed && parsed.data && parsed.format) {
      return parsed
    }
    if ('tle' in parsed && parsed.tle) {
      return { fetchedAt: parsed.fetchedAt, format: 'tle', data: parsed.tle }
    }
    return null
  } catch {
    return null
  }
}

const writeCache = (group: TleCatalogGroup, payload: CachePayloadV2) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(cacheKeyForGroup(group), JSON.stringify(payload))
  } catch {
    // localStorage quota issues should never prevent live loads.
  }
}

const fetchCatalogText = async (group: TleCatalogGroup, format: CatalogFormat) => {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(urlForGroup(group, format), { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Catalog fetch failed (${format}): ${response.status}`)
    }
    return await response.text()
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

export type TleLoadResult = {
  objects: OrbitObject[]
  fetchedAt: Date
  source: 'network' | 'cache' | 'stale-cache'
  group: TleCatalogGroup
  groupLabel: string
  format: CatalogFormat
}

export const loadTleObjects = async (
  group: TleCatalogGroup,
  options?: { allowNetwork?: boolean },
): Promise<TleLoadResult> => {
  const allowNetwork = options?.allowNetwork ?? true
  const cached = readCache(group)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return {
      objects: parseCatalogText(cached.format, cached.data),
      fetchedAt: new Date(cached.fetchedAt),
      source: 'cache' as const,
      group,
      groupLabel: labelForGroup(group),
      format: cached.format,
    }
  }

  if (!allowNetwork) {
    if (cached) {
      return {
        objects: parseCatalogText(cached.format, cached.data),
        fetchedAt: new Date(cached.fetchedAt),
        source: 'stale-cache' as const,
        group,
        groupLabel: labelForGroup(group),
        format: cached.format,
      }
    }
    throw new Error('Offline and no cached catalog data is available for this group')
  }

  try {
    let format: CatalogFormat = 'json'
    let data = await fetchCatalogText(group, 'json')
    try {
      // Validate that we can parse before committing to cache/return.
      parseCatalogText(format, data)
    } catch {
      format = 'tle'
      data = await fetchCatalogText(group, 'tle')
    }

    const fetchedAt = Date.now()
    if (data.length <= MAX_CACHE_CHARS) {
      writeCache(group, { fetchedAt, format, data })
    } else if (format === 'json') {
      // JSON OMM can exceed localStorage quotas; cache a smaller TLE fallback when possible.
      try {
        const tle = await fetchCatalogText(group, 'tle')
        if (tle.length <= MAX_CACHE_CHARS) {
          writeCache(group, { fetchedAt, format: 'tle', data: tle })
        }
      } catch {
        // Ignore cache failures; live objects still load.
      }
    }
    return {
      objects: parseCatalogText(format, data),
      fetchedAt: new Date(fetchedAt),
      source: 'network' as const,
      group,
      groupLabel: labelForGroup(group),
      format,
    }
  } catch {
    if (cached) {
      return {
        objects: parseCatalogText(cached.format, cached.data),
        fetchedAt: new Date(cached.fetchedAt),
        source: 'stale-cache' as const,
        group,
        groupLabel: labelForGroup(group),
        format: cached.format,
      }
    }
    throw new Error('Catalog fetch failed and no cache was available')
  }
}

export const refreshTleObjects = async (group: TleCatalogGroup): Promise<TleLoadResult> => {
  try {
    let format: CatalogFormat = 'json'
    let data = await fetchCatalogText(group, 'json')
    try {
      parseCatalogText(format, data)
    } catch {
      format = 'tle'
      data = await fetchCatalogText(group, 'tle')
    }
    const fetchedAt = Date.now()
    if (data.length <= MAX_CACHE_CHARS) {
      writeCache(group, { fetchedAt, format, data })
    } else if (format === 'json') {
      try {
        const tle = await fetchCatalogText(group, 'tle')
        if (tle.length <= MAX_CACHE_CHARS) {
          writeCache(group, { fetchedAt, format: 'tle', data: tle })
        }
      } catch {
        // Ignore cache failures; refresh still succeeds.
      }
    }
    return {
      objects: parseCatalogText(format, data),
      fetchedAt: new Date(fetchedAt),
      source: 'network' as const,
      group,
      groupLabel: labelForGroup(group),
      format,
    }
  } catch {
    const cached = readCache(group)
    if (cached) {
      return {
        objects: parseCatalogText(cached.format, cached.data),
        fetchedAt: new Date(cached.fetchedAt),
        source: 'stale-cache' as const,
        group,
        groupLabel: labelForGroup(group),
        format: cached.format,
      }
    }
    throw new Error('Catalog refresh failed and no cache was available')
  }
}

export const clearTleCache = (group?: TleCatalogGroup) => {
  if (typeof localStorage === 'undefined') return 0
  if (group) {
    const key = cacheKeyForGroup(group)
    if (localStorage.getItem(key) === null) return 0
    localStorage.removeItem(key)
    return 1
  }

  let removed = 0
  for (const entry of TLE_CATALOG_GROUPS) {
    const key = cacheKeyForGroup(entry.key)
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key)
      removed += 1
    }
  }
  return removed
}
