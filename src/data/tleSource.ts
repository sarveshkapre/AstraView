import * as satellite from 'satellite.js'
import type { OrbitObject, OrbitRegime, OrbitType } from '../types'

const EARTH_RADIUS_KM = 6371
const MU = 398600.4418
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

const ACTIVE_TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'
const CACHE_KEY_ACTIVE = 'astraview.tle.active.v1'

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

const readCache = () => {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(CACHE_KEY_ACTIVE)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { fetchedAt: number; tle: string }
    if (!parsed?.fetchedAt || !parsed?.tle) return null
    return parsed
  } catch {
    return null
  }
}

const writeCache = (payload: { fetchedAt: number; tle: string }) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(CACHE_KEY_ACTIVE, JSON.stringify(payload))
}

export const loadActiveTleObjects = async () => {
  const cached = readCache()
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return {
      objects: parseTleText(cached.tle),
      fetchedAt: new Date(cached.fetchedAt),
      source: 'cache' as const,
    }
  }

  const response = await fetch(ACTIVE_TLE_URL)
  if (!response.ok) {
    throw new Error(`TLE fetch failed: ${response.status}`)
  }
  const tle = await response.text()
  const fetchedAt = Date.now()
  writeCache({ fetchedAt, tle })
  return {
    objects: parseTleText(tle),
    fetchedAt: new Date(fetchedAt),
    source: 'network' as const,
  }
}

export const refreshActiveTleObjects = async () => {
  const response = await fetch(ACTIVE_TLE_URL)
  if (!response.ok) {
    throw new Error(`TLE fetch failed: ${response.status}`)
  }
  const tle = await response.text()
  const fetchedAt = Date.now()
  writeCache({ fetchedAt, tle })
  return {
    objects: parseTleText(tle),
    fetchedAt: new Date(fetchedAt),
    source: 'network' as const,
  }
}
