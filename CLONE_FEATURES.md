# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do
- [ ] [P2] Add lightweight keyboard shortcuts for stepping scrub time backward/forward while paused. Score: impact 3, effort 2, strategic-fit 4, differentiation 2, risk 2, confidence 4.
- [ ] [P2] Add selected-object speed/lat/lon readout in Inspect panel for stronger inspection value. Score: impact 3, effort 3, strategic-fit 4, differentiation 2, risk 3, confidence 3.
- [ ] [P2] Add optional object labels for selected + pinned objects with a strict cap for perf safety. Score: impact 2, effort 3, strategic-fit 3, differentiation 2, risk 3, confidence 3.
- [ ] [P2] Add search-result badges for data source (live/synthetic) and watchlist membership. Score: impact 2, effort 2, strategic-fit 3, differentiation 2, risk 2, confidence 4.
- [ ] [P2] Add camera-focus animation easing for selection/focus actions (reduced-motion aware). Score: impact 3, effort 3, strategic-fit 3, differentiation 3, risk 3, confidence 3.
- [ ] [P3] Catalog import (safe): allow `tle=` URL param via allowlisted domains only. Score: impact 3, effort 4, strategic-fit 4, differentiation 2, risk 4, confidence 2.
- [ ] [P3] Move propagation + point-buffer updates off the main thread (Web Worker) for larger catalogs. Score: impact 4, effort 4, strategic-fit 4, differentiation 2, risk 4, confidence 2.
- [ ] [P3] Add offline app-shell caching (service worker) with explicit freshness copy for cached textures/catalog metadata. Score: impact 3, effort 4, strategic-fit 3, differentiation 1, risk 3, confidence 2.
- [ ] [P3] Add pluggable local-first telemetry hooks for search/filter/inspect/share/export actions. Score: impact 3, effort 2, strategic-fit 4, differentiation 1, risk 2, confidence 4.
- [ ] [P3] Add an optional ground footprint cone for selected object at high zoom only. Score: impact 2, effort 4, strategic-fit 3, differentiation 3, risk 3, confidence 2.

## Implemented
- [x] [2026-02-11] Ground track overlay: selected-object projected subsatellite path toggle in Inspect panel, rendered on the globe and updated over time. Evidence: `src/App.tsx`, `src/components/Globe.tsx`, `src/App.css`, `npm run lint` (pass), `npm run test` (pass), `npm run build` (pass).
- [x] [2026-02-11] Permalink coverage: overlay toggle (`ground track`) encoded/restored via URL state with regression tests. Evidence: `src/utils/urlState.ts`, `src/utils/urlState.test.ts`, `src/types.ts`, `src/App.tsx`, `npm run test` (pass).
- [x] [2026-02-11] Live-data hardening: OMM parser now skips malformed entries and de-duplicates repeated NORAD IDs to avoid unstable duplicate objects. Evidence: `src/data/tleSource.ts`, `src/data/tleSource.test.ts`, `curl -sS -D - 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json' -o /tmp/celestrak-active.json` (HTTP 200), `npm run test` (pass).
- [x] [2026-02-10] Perf: reduce React render load in live mode by throttling time state commits; smooth time inside Three.js loop; throttle OrbitControls view commits to avoid URL spam. Evidence: `src/App.tsx`, `src/components/Globe.tsx`, `npm run lint` (pass), `npm run test` (pass), `npm run build` (pass).
- [x] [2026-02-10] Data pipeline: prefer CelesTrak GP `FORMAT=json` (OMM) ingestion (with `satellite.js json2satrec`) and automatic fallback to TLE; bump cache schema to v2; add parser unit test. Evidence: `src/data/tleSource.ts`, `src/data/tleSource.test.ts`, `src/App.tsx`, `npm run test` (pass).
- [x] [2026-02-10] Search relevance: tokenized multi-keyword matching, match-field indicator in results, and score-based ordering. Evidence: `src/utils/search.ts`, `src/utils/search.test.ts`, `src/App.tsx`, `npm run lint` (pass), `npm run test` (pass), `npm run build` (pass).
- [x] [2026-02-10] Power search: comma/newline-separated NORAD ID list paste flows + matched substring highlighting in search results. Evidence: `src/App.tsx`, `src/utils/search.ts`, `src/utils/search.test.ts`, `src/App.css`, `npm run lint` (pass), `npm run test` (pass), `npm run build` (pass).
- [x] [2026-02-10] Watchlist (pin objects): pin/unpin from Selection, quick re-select list, and URL encoding for shareable sets. Evidence: `src/App.tsx`, `src/utils/urlState.ts`, `src/utils/urlState.test.ts`, `src/App.css`, `npm run lint` (pass), `npm run test` (pass), `npm run build` (pass).
- [x] [2026-02-09] Search dropdown polish: keyboard navigation + close on escape/outside click + NORAD ID in results + basic combobox/listbox `aria-*`. Evidence: `src/App.tsx`, `src/App.css`, `npm run lint` (pass), `npm run test` (pass), `npm run build` (pass).
- [x] [2026-02-09] Motion hygiene: pause time RAF when paused; skip heavy object updates when time is not advancing; pause animation work while tab is hidden; default to paused time for `prefers-reduced-motion: reduce` (unless URL overrides). Evidence: `src/App.tsx`, `src/components/Globe.tsx`, `npm run lint` (pass), `npm run build` (pass), `npm run preview` + `curl -I` (HTTP 200).
- [x] [2026-02-09] WebGL capability detection + friendly fallback UI when 3D init fails (try another browser / enable WebGL path). Evidence: `src/components/Globe.tsx`, `src/App.tsx`, `src/App.css`, `npm run build` (pass).
- [x] [2026-02-09] Added compact mobile drawer mode for Filters/Trust and Inspect/Share panels. Evidence: `src/App.tsx`, `src/App.css`, `npm run build` (pass).
- [x] [2026-02-09] Added safe CelesTrak catalog-group selector (URL + UI) with per-group caching and trust copy. Evidence: `src/data/tleSource.ts`, `src/utils/urlState.ts`, `src/utils/urlState.test.ts`, `src/App.tsx`, `npm run test` (pass), `npm run build` (pass).
- [x] [2026-02-09] Added URL-state unit tests and CI test step; scoped Vitest to AstraView `src/` tests and enforced payload-only type chips when `dataset=payloads`. Evidence: `src/utils/urlState.ts`, `src/utils/urlState.test.ts`, `vitest.config.ts`, `.github/workflows/ci.yml`, `npm run test` (pass).
- [x] [2026-02-09] Session Signals now include time-to-first-action plus share/export snapshot counters (local-only). Evidence: `src/App.tsx`.
- [x] [2026-02-09] Aligned `package.json` version with `CHANGELOG.md` for release tracking. Evidence: `package.json`, `CHANGELOG.md`.
- [x] [2026-02-08] Fixed URL-state defaults for filters so first-load chips and filtering behavior are deterministic. Evidence: `src/utils/urlState.ts`, `src/App.tsx`.
- [x] [2026-02-08] Expanded permalinks to include snapshot mode/watermark/preset/scale. Evidence: `src/utils/urlState.ts`, `src/App.tsx`, `README.md`.
- [x] [2026-02-08] Hardened live TLE loading with timeout + stale-cache fallback. Evidence: `src/data/tleSource.ts`, `src/App.tsx`.
- [x] [2026-02-08] Surfaced live/cache/stale-cache/fallback source messaging in trust panel and health status. Evidence: `src/App.tsx`.
- [x] [2026-02-08] Removed duplicate selection-reset effect and resolved AstraView lint blockers. Evidence: `src/App.tsx`, `src/components/Globe.tsx`, `eslint.config.js`, `package.json`.
- [x] [2026-02-08] Improved shortcut dialog UX (backdrop close + no accidental shortcut toggles while open). Evidence: `src/App.tsx`.
- [x] [2026-02-08] Session Signals now track cumulative inspected objects. Evidence: `src/App.tsx`.
- [x] [2026-02-08] Added GitHub Actions lint/build workflow for `main`. Evidence: `.github/workflows/ci.yml`.
- [x] [2026-02-08] Updated product memory docs for new behavior and release notes. Evidence: `CHANGELOG.md`, `docs/TECHNICAL_NOTES.md`, `CLONE_FEATURES.md`.
- [x] [2026-02-08] Verification evidence captured for lint/build/smoke/integration checks. Commands: `npm run lint` (pass), `npm run build` (pass), `curl -I http://127.0.0.1:4173` during `npm run preview` (HTTP 200), `curl -sS -D - 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'` (HTTP 200 + TLE body).

## Insights
- URL state parsing must always default to explicit full sets for multi-select filters to keep UI chip state and filtering logic aligned.
- For external data dependencies, stale-cache fallback gives a better user experience than jumping straight to synthetic demo mode.
- Real CelesTrak `FORMAT=json` payloads for `GROUP=active` currently exceed 6 MB, so strict malformed-entry filtering and dedupe guards are required to keep runtime object sets stable.
- Keeping lint focused on the active product surface avoids false-negative CI noise in mixed-purpose repositories.
- Bounded market scan (untrusted, web) gap map:
  Missing -> selected-object speed/lat/lon inspector values and paused-time keyboard stepping.
  Weak -> richer orbit analysis overlays (for example footprint cone) compared with advanced trackers.
  Parity -> fast search/selection, catalog switching, orbit/ground-track context, and WebGL fallback messaging.
  Differentiator opportunity -> trust-first freshness + fallback transparency with reproducible permalinks and minimal chrome.
  Sources: [KeepTrack interface guide](https://docs.keeptrack.space/interface/), [KeepTrack plugin list](https://docs.keeptrack.space/basic-tut/feature-list/), [N2YO controls](https://www.n2yo.com/satellites/?c=3), [CelesTrak GP formats](https://celestrak.org/NORAD/documentation/gp-data-formats.php).

## Notes
- This file is maintained by the autonomous clone loop.
