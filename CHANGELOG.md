# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-02-04

### Added
- Initial Vite + React + TypeScript scaffold.
- AstraView UI layout with globe, filters, detail panel, trust panel, and shareable state.
- Synthetic orbital dataset with regimes, types, and constellations.
- 3D globe rendering with live motion, hover tooltips, selection orbit path, and focus.
- URL state encoding for filters, camera, time mode, and selection.
- Product documentation in `docs/`.

## [0.2.0] - 2026-02-04

### Added
- Zoom-aware density mode with down-sampling and improved point sizing.
- Loading overlay for initial globe setup.
- Freshness indicator with offline cached dataset messaging.
- Search result prioritization for exact name/NORAD matches.

## [0.3.0] - 2026-02-04

### Added
- Time scrubber and playback speed controls.
- Orbit trail rendering for selected objects.
- Slow Earth rotation for motion context.

## [0.4.0] - 2026-02-04

### Added
- Shader-based night lights and terminator glow for day/night cues.

## [0.5.0] - 2026-02-04

### Added
- Earth day/night textures with normal mapping and tone-mapped rendering.

## [0.6.0] - 2026-02-04

### Added
- Dataset toggle for payloads-only vs all cataloged objects.

## [0.7.0] - 2026-02-04

### Added
- Non-blocking toast feedback for share links.

## [0.8.0] - 2026-02-04

### Added
- Cloud layer and atmospheric limb glow.
- Lazy-loaded globe bundle for smaller initial load.

## [0.9.0] - 2026-02-04

### Added
- Live TLE ingestion with caching and TLE-based propagation.
- Data source + freshness age surfaced in the trust panel.
