import type { AltitudeBand, FiltersState, OrbitRegime, OrbitType } from '../types'

// Centralized lists used in both UI and URL-state parsing/serialization.
// Keeping these in one place avoids subtle drift between chips, defaults, and permalink invariants.
export const ALL_REGIMES: OrbitRegime[] = ['LEO', 'MEO', 'GEO']
export const ALL_TYPES: OrbitType[] = ['Payload', 'Rocket Body', 'Debris']
export const ALTITUDE_BANDS: AltitudeBand[] = ['All', '<500km', '500-1200km', '1200-20000km', '20000km+']
export const PERFORMANCE_MODES: FiltersState['performance'][] = ['high', 'balanced', 'low']

