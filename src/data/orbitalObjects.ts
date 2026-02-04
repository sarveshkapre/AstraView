import type { OrbitObject, OrbitRegime, OrbitType } from '../types'

const EARTH_RADIUS_KM = 6371

const CONSTELLATIONS = [
  'Starlink',
  'OneWeb',
  'Iridium',
  'GPS',
  'Galileo',
  'GLONASS',
  'BeiDou',
  'PlanetScope',
  'Sentinel',
]

const OPERATORS = [
  'SpaceX',
  'OneWeb',
  'Iridium',
  'ESA',
  'NASA',
  'ISRO',
  'CNSA',
  'Roscosmos',
  'USSF',
  'JAXA',
]

const COUNTRIES = ['USA', 'EU', 'UK', 'Japan', 'China', 'India', 'Russia', 'Canada']

const TYPE_WEIGHTS: Array<[OrbitType, number]> = [
  ['Payload', 0.62],
  ['Rocket Body', 0.14],
  ['Debris', 0.24],
]

const REGIME_CONFIG: Array<{ regime: OrbitRegime; count: number; altitudeRange: [number, number] }> = [
  { regime: 'LEO', count: 1600, altitudeRange: [320, 1800] },
  { regime: 'MEO', count: 380, altitudeRange: [2000, 18000] },
  { regime: 'GEO', count: 220, altitudeRange: [35000, 36000] },
]

const seededRandom = (seed: number) => {
  let value = seed % 2147483647
  if (value <= 0) value += 2147483646
  return () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
}

const pickWeighted = <T,>(rand: () => number, weighted: Array<[T, number]>) => {
  const roll = rand()
  let acc = 0
  for (const [item, weight] of weighted) {
    acc += weight
    if (roll <= acc) return item
  }
  return weighted[weighted.length - 1][0]
}

const pickFrom = <T,>(rand: () => number, list: T[]) => list[Math.floor(rand() * list.length)]

const randomBetween = (rand: () => number, min: number, max: number) => min + rand() * (max - min)

const estimatePeriodMin = (altitudeKm: number) => {
  const mu = 398600
  const semiMajorAxis = EARTH_RADIUS_KM + altitudeKm
  const periodSec = 2 * Math.PI * Math.sqrt(Math.pow(semiMajorAxis, 3) / mu)
  return periodSec / 60
}

const formatName = (regime: OrbitRegime, constellation?: string, index?: number) => {
  if (constellation) {
    return `${constellation.toUpperCase()}-${String(index ?? 0).padStart(4, '0')}`
  }
  const prefix = regime === 'GEO' ? 'GEO' : regime === 'MEO' ? 'MEO' : 'LEO'
  return `${prefix}-${String(index ?? 0).padStart(5, '0')}`
}

export const generateObjects = (seed = 42): OrbitObject[] => {
  const rand = seededRandom(seed)
  const objects: OrbitObject[] = []
  let norad = 12000

  REGIME_CONFIG.forEach(({ regime, count, altitudeRange }, regimeIndex) => {
    for (let i = 0; i < count; i += 1) {
      const type = pickWeighted(rand, TYPE_WEIGHTS)
      const altitudeKm = Math.round(randomBetween(rand, altitudeRange[0], altitudeRange[1]))
      const inclinationDeg = Math.round(randomBetween(rand, 0, regime === 'GEO' ? 5 : 98))
      const raanDeg = Math.round(randomBetween(rand, 0, 360))
      const meanAnomalyDeg = Math.round(randomBetween(rand, 0, 360))
      const periodMin = estimatePeriodMin(altitudeKm)
      const hasConstellation = rand() > 0.55 && regime === 'LEO'
      const constellation = hasConstellation ? pickFrom(rand, CONSTELLATIONS) : undefined
      const operator = hasConstellation ? constellation : pickFrom(rand, OPERATORS)
      const launchYear = Math.round(randomBetween(rand, 1998, 2024))
      const launchMonth = Math.round(randomBetween(rand, 1, 12))
      const launchDay = Math.round(randomBetween(rand, 1, 28))
      const name = formatName(regime, constellation, i + 1 + regimeIndex * 1000)

      objects.push({
        id: `OBJ-${norad}`,
        noradId: norad,
        name,
        regime,
        type,
        altitudeKm,
        inclinationDeg,
        raanDeg,
        meanAnomalyDeg,
        periodMin,
        operator,
        constellation,
        launchDate: `${launchYear}-${String(launchMonth).padStart(2, '0')}-${String(launchDay).padStart(2, '0')}`,
        country: pickFrom(rand, COUNTRIES),
        source: 'synthetic',
      })
      norad += 1
    }
  })

  return objects
}
