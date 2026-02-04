# Technical Notes

## Rendering
- Three.js scene with Earth sphere, atmosphere halo, starfield, and lat/long grid.
- Objects rendered as a single `Points` buffer with per-vertex colors.
- Orbit path rendered when a selection is active.

## Data Model
- Synthetic orbital object generator in `src/data/orbitalObjects.ts`.
- Each object includes regime, type, altitude, inclination, mean anomaly, RAAN, and metadata fields.

## State & URL
- Filters, search, time mode, selection, and camera encoded in URL query params.
- URL state is updated via `history.replaceState`.

## Performance
- Density mode reduces point size and down-samples when zoomed out or when object count is high.
- Offline detection keeps the cached dataset visible with a freshness indicator.
- Simple seeded generator ensures repeatable dataset without network dependency.
