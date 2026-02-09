# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do
- [ ] [P2] Search upgrades: highlight matched substrings and support comma-separated numeric search (multiple NORAD IDs). Score: impact 3, effort 3, strategic-fit 4, differentiation 1, risk 2, confidence 3.
- [ ] [P2] Add “watchlist” (pin objects) with URL encoding for shareable sets. Score: impact 3, effort 3, strategic-fit 3, differentiation 2, risk 2, confidence 3.
- [ ] [P3] Add a ground track overlay layer for selected object (toggle). Score: impact 3, effort 4, strategic-fit 3, differentiation 3, risk 3, confidence 2.
- [ ] [P3] Move TLE propagation and point-buffer updates off the main thread (Web Worker) for larger catalogs. Score: impact 4, effort 4, strategic-fit 4, differentiation 2, risk 4, confidence 2.
- [ ] [P3] Add offline app-shell caching (service worker) and texture caching with explicit freshness copy. Score: impact 3, effort 4, strategic-fit 3, differentiation 1, risk 3, confidence 2.
- [ ] [P3] Add in-app telemetry event hooks (pluggable; local-first) for actions: search, filter, inspect, share, export. Score: impact 3, effort 2, strategic-fit 4, differentiation 1, risk 2, confidence 4.

## Implemented
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
- Keeping lint focused on the active product surface avoids false-negative CI noise in mixed-purpose repositories.
- Bounded market scan (untrusted, web): orbit/satellite explorers commonly emphasize fast search + selection, category/catalog switching, time/inspection tools, and explicit “WebGL required” fallback messaging; several also support loading external TLE catalogs (or multiple NORAD IDs) via URL-driven inputs, and some extend UX into “where to look from my location” sky views. Sources: [KeepTrack external catalogs](https://docs.keeptrack.space/advanced-tut/external-catalog/), [CelesTrak GP query docs](https://www.celestrak.org/NORAD/documentation/gp-data-formats.php), [N2YO widget (multi-sat by NORAD ID)](https://www.n2yo.com/satellitemap/), [Heavens-Above live sky view](https://www.heavens-above.com/), [get.webgl.org](https://get.webgl.org/), [NASA Eyes apps](https://eyes.nasa.gov/apps/).

## Notes
- This file is maintained by the autonomous clone loop.
