# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do
- [ ] [Selected] [P1] Add lightweight automated tests for URL-state parse/serialize invariants (permalink regressions). Score: impact 5, effort 2, strategic-fit 5, differentiation 2, risk 1, confidence 5.
- [ ] [Selected] [P1] Improve “Session Signals” to better match success metrics: time-to-first-meaningful-action + share/export counters (local-only; no network). Score: impact 4, effort 2, strategic-fit 5, differentiation 2, risk 1, confidence 4.
- [ ] [Selected] [P2] Align `package.json` version + scripts with `CHANGELOG.md` and add a `test` script that CI runs. Score: impact 3, effort 1, strategic-fit 4, differentiation 1, risk 1, confidence 5.
- [ ] [P2] Add a compact mobile filter drawer mode to reduce panel crowding on small screens. Score: impact 4, effort 3, strategic-fit 4, differentiation 2, risk 2, confidence 3.
- [ ] [P2] Add a safe CelesTrak “catalog group” selector (URL + UI) with caching and trust copy (active/starlink/gps/etc.). Score: impact 4, effort 3, strategic-fit 4, differentiation 3, risk 3, confidence 3.
- [ ] [P3] Add in-app telemetry event hooks (pluggable; local-first) for actions: search, filter, inspect, share, export. Score: impact 3, effort 2, strategic-fit 4, differentiation 1, risk 2, confidence 4.
- [ ] [P3] Add “watchlist” (pin objects) with URL encoding for shareable sets. Score: impact 3, effort 3, strategic-fit 3, differentiation 2, risk 2, confidence 3.
- [ ] [P3] Add a ground track overlay layer for selected object (toggle). Score: impact 3, effort 4, strategic-fit 3, differentiation 3, risk 3, confidence 2.
- [ ] [P3] Move TLE propagation and point-buffer updates off the main thread (Web Worker) for larger catalogs. Score: impact 4, effort 4, strategic-fit 4, differentiation 2, risk 4, confidence 2.
- [ ] [P3] Add offline app-shell caching (service worker) and texture caching with explicit freshness copy. Score: impact 3, effort 4, strategic-fit 3, differentiation 1, risk 3, confidence 2.

## Implemented
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

## Notes
- This file is maintained by the autonomous clone loop.
