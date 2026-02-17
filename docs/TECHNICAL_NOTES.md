# Technical Notes

## Rendering
- Three.js scene with Earth sphere, atmosphere halo, starfield, lat/long grid, and shader-based night lights.
- Day, night, and normal textures sourced from the three.js example texture pack (NASA Blue Marble derived).
- Cloud texture sphere layered above the surface and slow atmospheric rotation.
- Objects rendered as a single `Points` buffer with per-vertex colors.
- Orbit path, trailing path, and terminator glow rendered when a selection is active.
- Optional ground-track polyline is rendered for the selected object and updated over time.
- Earth group rotates slowly for a sense of motion.
- Globe initialization errors (including missing WebGL) surface a friendly in-app fallback message instead of a blank stage.

## Data Model
- Synthetic orbital object generator in `src/data/orbitalObjects.ts`.
- Each object includes regime, type, altitude, inclination, mean anomaly, RAAN, and metadata fields.
- Dataset toggle in UI filters payloads-only vs all objects without a second dataset.
- Live catalog ingestion via CelesTrak GP with localStorage caching and fallback to synthetic.

## Data Pipeline
- `src/data/tleSource.ts` prefers CelesTrak GP `FORMAT=json` (OMM) and falls back to TLE if needed; cached for 6 hours and parsed into `OrbitObject`. When the JSON payload is too large for localStorage, caching falls back to the smaller TLE text when available.
- OMM parsing skips malformed entries and de-duplicates NORAD IDs to avoid unstable duplicate object IDs.
- CelesTrak "Current Data" catalog groups are curated and whitelisted; each group has its own cache key.
- Live fetches use an abort timeout guard; failed refreshes can fall back to stale cache before synthetic-only mode.
- `satellite.js` propagates live objects to ECEF for rendering on the globe (TLE via `twoline2satrec`, OMM via `json2satrec`).
- Manual refresh bypasses cache and updates the dataset immediately.
- Cache can be cleared per selected CelesTrak group to force a fresh fetch on next reload.
- Data coverage metrics are derived from `source` and `type` on the merged dataset.
- Invalid catalog entries are skipped during propagation and reported in the trust panel.
- Trust metadata also shows the active element format (`OMM JSON` vs `TLE`) for quick fidelity checks.

## State & URL
- Filters, search, time mode, selection, and camera encoded in URL query params.
- Watchlist pins are encoded in URL query params to keep shareable sets reproducible.
- The selected CelesTrak catalog group is encoded in URL query params to keep permalinks reproducible.
- Snapshot mode, watermark, scale, and preset are encoded in URL query params for reproducible exports.
- Overlay toggles (for example, selected-object ground track) are encoded in URL query params for reproducible views.
- URL state is updated via `history.replaceState`.

## Search
- Multi-NORAD list parsing lives in `src/utils/search.ts` and is activated only when explicit list delimiters are present (comma/newline/semicolon).

## Performance
- Density mode reduces point size and down-samples when zoomed out or when object count is high.
- Offline detection keeps the cached dataset visible with a freshness indicator.
- Simple seeded generator ensures repeatable dataset without network dependency.
- Point updates are throttled (~12 FPS) to keep interaction smooth with live propagation.
- Live time state commits and view-state commits are throttled to reduce React rerender and `history.replaceState` pressure while keeping the Three.js loop smooth.
- When time is paused (or the tab is hidden), heavy point-buffer updates are skipped to reduce background CPU usage.
