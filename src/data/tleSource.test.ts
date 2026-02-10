import { describe, expect, it } from 'vitest'
import { parseCelestrakJsonText } from './tleSource'

describe('parseCelestrakJsonText', () => {
  it('parses a CelesTrak GP JSON entry into an OrbitObject with a satrec', () => {
    const sample = [
      {
        OBJECT_NAME: 'ISS (ZARYA)',
        OBJECT_ID: '1998-067A',
        EPOCH: '2026-02-10T00:00:00.000000Z',
        MEAN_MOTION: 15.5,
        ECCENTRICITY: 0.0005,
        INCLINATION: 51.6,
        RA_OF_ASC_NODE: 0.0,
        ARG_OF_PERICENTER: 0.0,
        MEAN_ANOMALY: 0.0,
        EPHEMERIS_TYPE: 0,
        CLASSIFICATION_TYPE: 'U',
        NORAD_CAT_ID: 25544,
        ELEMENT_SET_NO: 999,
        REV_AT_EPOCH: 1,
        BSTAR: 0.0001,
        MEAN_MOTION_DOT: 0,
        MEAN_MOTION_DDOT: 0,
      },
    ]

    const objects = parseCelestrakJsonText(JSON.stringify(sample))
    expect(objects).toHaveLength(1)
    expect(objects[0].id).toBe('TLE-25544')
    expect(objects[0].noradId).toBe(25544)
    expect(objects[0].name).toBe('ISS (ZARYA)')
    expect(objects[0].source).toBe('tle')
    expect(objects[0].satrec).toBeTruthy()
  })
})

