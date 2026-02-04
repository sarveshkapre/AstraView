# Technical Notes

## Rendering
- Three.js scene with Earth sphere, atmosphere halo, starfield, lat/long grid, and shader-based night lights.
- Day, night, and normal textures sourced from the three.js example texture pack (NASA Blue Marble derived).
- Cloud texture sphere layered above the surface and slow atmospheric rotation.
- Objects rendered as a single `Points` buffer with per-vertex colors.
- Orbit path, trailing path, and terminator glow rendered when a selection is active.
- Earth group rotates slowly for a sense of motion.

## Data Model
- Synthetic orbital object generator in `src/data/orbitalObjects.ts`.
- Each object includes regime, type, altitude, inclination, mean anomaly, RAAN, and metadata fields.
- Dataset toggle in UI filters payloads-only vs all objects without a second dataset.

## State & URL
- Filters, search, time mode, selection, and camera encoded in URL query params.
- URL state is updated via `history.replaceState`.

## Performance
- Density mode reduces point size and down-samples when zoomed out or when object count is high.
- Offline detection keeps the cached dataset visible with a freshness indicator.
- Simple seeded generator ensures repeatable dataset without network dependency.
