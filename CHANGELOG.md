# Changelog

All notable changes to this project will be documented in this file.

## [1.7.0] - 2026-02-11

### Added
- Selected-object ground track overlay with an explicit toggle in the Inspect panel.
- Ground-track overlay state is now encoded in permalinks and restored on load.

### Fixed
- CelesTrak OMM/JSON parsing now skips malformed entries and de-duplicates repeated NORAD IDs to keep object IDs stable.

## [1.8.0] - 2026-02-17

### Added
- Trust panel now displays active catalog element format (`OMM JSON` or `TLE`) alongside source status.

## [1.8.1] - 2026-02-17

### Added
- Trust panel action to clear per-group catalog cache and force a fresh next fetch.

## [1.8.2] - 2026-02-17

### Added
- Configurable catalog auto-refresh interval (off/5/15 min), persisted in permalinks.

## [1.8.3] - 2026-02-17

### Added
- New CelesTrak group options: Qianfan, Kuiper, and Weather.

## [1.8.4] - 2026-02-17

### Added
- Local persistence fallback for snapshot export preferences when no snapshot params are in the URL.

## [1.6.0] - 2026-02-10

### Added
- Search relevance upgrades: tokenized multi-keyword matching, score-based ordering, and matched-field indicators in results.

### Changed
- Performance: throttle live time state commits and OrbitControls view commits; smooth time inside the Three.js render loop.
- Live catalog ingestion now prefers CelesTrak GP `FORMAT=json` (OMM) with automatic fallback to TLE; cache schema bumped (and cache falls back to TLE when JSON is too large for localStorage).

## [1.5.0] - 2026-02-10

### Added
- Power search: paste comma/newline-separated NORAD ID lists and see highlighted matches in the search dropdown.
- Watchlist pins: pin/unpin objects and share pinned sets via permalinks.

## [1.4.0] - 2026-02-09

### Added
- Search dropdown keyboard navigation (up/down/enter), close on escape/outside click, NORAD IDs in results, and basic combobox/listbox `aria-*` semantics.
- Friendly WebGL-required fallback overlay when 3D initialization fails (clear “try another browser / enable WebGL” path).

### Changed
- Motion hygiene: time updates stop while paused/hidden, and the globe skips heavy point-buffer updates when time is not advancing.

## [1.3.1] - 2026-02-09

### Added
- Compact mobile drawer mode for Filters/Trust and Inspect/Share panels to keep the globe-first experience on small screens.

## [1.3.0] - 2026-02-09

### Added
- CelesTrak catalog-group selector (active/stations/starlink/oneweb/gps/iridium) with per-group caching; persisted in permalinks.

## [1.2.1] - 2026-02-09

### Added
- CI now runs unit tests; URL-state parse/serialize invariants are covered to prevent permalink regressions.
- Session Signals now include time-to-first-action plus share/export counters (local-only).

### Fixed
- URL-state parsing now enforces payload-only type chips when `dataset=payloads` for consistent UI behavior.

## [1.2.0] - 2026-02-08

### Added
- Share permalinks now persist snapshot settings (mode, watermark, preset, scale).
- GitHub Actions CI workflow for lint + build on `main`.

### Changed
- TLE fetch pipeline now applies a request timeout and returns stale cache on live fetch failures.
- Trust panel and health labeling now distinguish live, cache, stale-cache, and fallback behavior.
- Session Signals now track cumulative objects inspected during a session.

### Fixed
- URL filter parsing now defaults to full regime/type selections on first load.
- Duplicate selection-reset effect removed from `src/App.tsx`.
- Lint scope no longer includes unrelated nested project files.

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

## [0.9.1] - 2026-02-04

### Changed
- Clarified freshness messaging when live data is unavailable.

## [0.9.2] - 2026-02-04

### Changed
- Throttled position updates to improve performance with live TLE.

## [0.9.3] - 2026-02-04

### Added
- Manual data refresh control with inline status messaging.

## [0.9.4] - 2026-02-04

### Added
- Data coverage counts in the trust panel.

## [0.9.5] - 2026-02-04

### Added
- Propagation error handling with skipped TLE count reporting.

## [0.9.6] - 2026-02-04

### Added
- Refresh toast now includes invalid TLE skip count.

## [0.9.7] - 2026-02-04

### Added
- Header data health badge for live/cache/fallback state.

## [0.9.8] - 2026-02-04

### Added
- Legend for object type and data source colors.

## [0.9.9] - 2026-02-04

### Added
- Performance toggle for detail vs speed.

## [1.0.0] - 2026-02-04

### Added
- View controls for resetting camera and focusing Earth.

## [1.0.1] - 2026-02-04

### Added
- Keyboard shortcut overlay and bindings.

## [1.0.2] - 2026-02-04

### Added
- Header help button for shortcuts overlay.

## [1.0.3] - 2026-02-04

### Added
- Accessibility improvements for help button and shortcut dialog focus.

## [1.0.4] - 2026-02-04

### Added
- Focus restoration to help button after closing shortcuts dialog.

## [1.0.5] - 2026-02-04

### Added
- Header status line for dataset mode and performance.

## [1.0.6] - 2026-02-04

### Added
- Export PNG snapshot of current view.

## [1.0.7] - 2026-02-04

### Added
- Snapshot mode toggle for globe-only vs full UI exports.

## [1.0.8] - 2026-02-04

### Added
- Snapshot watermark toggle and branding stamp.

## [1.0.9] - 2026-02-04

### Added
- Snapshot export presets.

## [1.1.0] - 2026-02-04

### Added
- Export scale option (1x/2x) for snapshots.

## [1.1.1] - 2026-02-04

### Added
- Export scale tooltip warning about slower 2x captures.

## [1.1.2] - 2026-02-04

### Added
- Export progress indicator and disabled controls during snapshot.

## [1.1.3] - 2026-02-04

### Added
- Copy PNG to clipboard option.

## [1.1.4] - 2026-02-04

### Added
- Preset hint text in snapshot panel.

## [1.1.5] - 2026-02-04

### Added
- Share link toast includes snapshot preset + scale.

## [1.1.6] - 2026-02-04

### Added
- Reset snapshot settings button.
