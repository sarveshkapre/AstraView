import * as THREE from 'three'
import type { OrbitObject } from '../types'

export const EARTH_RADIUS_KM = 6371
export const EARTH_RADIUS_UNITS = 1

const degToRad = (deg: number) => (deg * Math.PI) / 180

export const getOrbitRadius = (altitudeKm: number) => {
  return EARTH_RADIUS_UNITS + altitudeKm / EARTH_RADIUS_KM
}

export const positionForObject = (object: OrbitObject, timeSeconds: number) => {
  const radius = getOrbitRadius(object.altitudeKm)
  const angularSpeed = (2 * Math.PI) / (object.periodMin * 60)
  const theta = degToRad(object.meanAnomalyDeg) + angularSpeed * timeSeconds

  const position = new THREE.Vector3(Math.cos(theta) * radius, Math.sin(theta) * radius, 0)
  position.applyAxisAngle(new THREE.Vector3(1, 0, 0), degToRad(object.inclinationDeg))
  position.applyAxisAngle(new THREE.Vector3(0, 0, 1), degToRad(object.raanDeg))

  return position
}

export const buildOrbitPath = (object: OrbitObject, segments = 180) => {
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
