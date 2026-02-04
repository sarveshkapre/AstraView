import * as THREE from 'three'
import * as satellite from 'satellite.js'
import type { OrbitObject } from '../types'

export const EARTH_RADIUS_KM = 6371
export const EARTH_RADIUS_UNITS = 1

const degToRad = (deg: number) => (deg * Math.PI) / 180

export const getOrbitRadius = (altitudeKm: number) => {
  return EARTH_RADIUS_UNITS + altitudeKm / EARTH_RADIUS_KM
}

export const positionForObject = (object: OrbitObject, timeSeconds: number) => {
  if (object.satrec) {
    const date = new Date(Date.now() + timeSeconds * 1000)
    const positionAndVelocity = satellite.propagate(object.satrec, date)
    if (positionAndVelocity && positionAndVelocity.position) {
      const gmst = satellite.gstime(date)
      const ecf = satellite.eciToEcf(positionAndVelocity.position, gmst)
      if ([ecf.x, ecf.y, ecf.z].some((val) => Number.isNaN(val))) {
        return null
      }
      return new THREE.Vector3(ecf.x / EARTH_RADIUS_KM, ecf.z / EARTH_RADIUS_KM, ecf.y / EARTH_RADIUS_KM)
    }
    return null
  }
  const radius = getOrbitRadius(object.altitudeKm)
  const angularSpeed = (2 * Math.PI) / (object.periodMin * 60)
  const theta = degToRad(object.meanAnomalyDeg) + angularSpeed * timeSeconds

  const position = new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0)
  position.applyAxisAngle(new THREE.Vector3(1, 0, 0), degToRad(object.inclinationDeg))
  position.applyAxisAngle(new THREE.Vector3(0, 0, 1), degToRad(object.raanDeg))

  return position
}

export const buildOrbitPath = (object: OrbitObject, segments = 180) => {
  if (object.satrec) {
    const periodSeconds = object.satrec.no ? (2 * Math.PI) / object.satrec.no * 60 : 5400
    const points: THREE.Vector3[] = []
    for (let i = 0; i <= segments; i += 1) {
      const timeOffset = (i / segments) * periodSeconds
      const pos = positionForObject(object, timeOffset)
      if (pos) points.push(pos)
    }
    return points
  }
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= segments; i += 1) {
    const theta = (i / segments) * Math.PI * 2
    const radius = getOrbitRadius(object.altitudeKm)
    const position = new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0)
    position.applyAxisAngle(new THREE.Vector3(1, 0, 0), degToRad(object.inclinationDeg))
    position.applyAxisAngle(new THREE.Vector3(0, 0, 1), degToRad(object.raanDeg))
    points.push(position)
  }
  return points
}
