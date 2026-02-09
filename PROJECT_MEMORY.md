# Project Memory

## Objective
- Keep AstraView production-ready. Current focus: AstraView. Find the highest-impact pending work, implement it, test it, and push to main.

## Architecture Snapshot
- Vite + React + TypeScript single-page app.
- Three.js globe renderer with orbit objects as batched `Points`.
- URL query params are the source of truth for shareable view state (filters, selection, time, camera, snapshot settings).
- Live catalog ingestion via CelesTrak active TLE feed with caching + stale-cache fallback.

## Open Problems
- None tracked in this cycle.

## Recent Decisions
- Template: YYYY-MM-DD | Decision | Why | Evidence (tests/logs) | Commit | Confidence (high/medium/low) | Trust (trusted/untrusted)
- 2026-02-09 | Add compact mobile drawer for Filters/Trust and Inspect/Share panels | Keeps globe-first UX on small screens without removing functionality | `npm run test` (pass); `npm run build` (pass) | f54423f | high | trusted
- 2026-02-09 | Add safe CelesTrak catalog-group selector (active/stations/starlink/oneweb/gps/iridium) with per-group caching; persist in permalinks | Improves usefulness for common cohorts (Starlink/GPS/etc.) while keeping trust + reproducibility | `npm run test` (pass); `npm run build` (pass) | 02524d9 | high | trusted
- 2026-02-09 | Add Vitest unit tests for URL-state + run tests in CI; scope test discovery to AstraView `src/` | Prevent permalink regressions and avoid nested-project test noise in this workspace | `npm run test` (pass) | a4a48b3 | high | trusted
- 2026-02-09 | Expand “Session Signals” to include time-to-first-action + share/export counters (local-only) | Align the UI with success metrics and make sessions easier to reason about during iteration | `npm run build` (pass); manual `npm run preview` + HTTP 200 | 0a5f3d5 | medium | trusted
- 2026-02-09 | Align `package.json` version with `CHANGELOG.md` (release tracking) | Keep releases and dependency metadata consistent for production ops | `package.json`, `CHANGELOG.md` updated | 1600468 | high | trusted

## Mistakes And Fixes
- Template: YYYY-MM-DD | Issue | Root cause | Fix | Prevention rule | Commit | Confidence
- 2026-02-09 | Vitest discovered and ran tests in a nested unrelated project | Default Vitest include patterns scan the whole repo | Added `vitest.config.ts` to include only `src/**/*.test.ts` | Always scope test runners in multi-project repos | a4a48b3 | high
- 2026-02-09 | URL parsing allowed non-payload type chips while `dataset=payloads` | URL-state parser only corrected when Payload was absent | Enforce `types={Payload}` whenever `dataset=payloads` | Treat URL parsing as enforcing UI invariants, not just parsing | a4a48b3 | high

## Known Risks
- External dependency availability (CelesTrak) remains a product risk; stale-cache mitigation exists but catalog switching could increase surface area.

## Next Prioritized Tasks
- Improve search UX with keyboard navigation + escape/outside-close.
- Consider Web Worker offload for propagation + point updates for larger catalogs.

## Verification Evidence
- Template: YYYY-MM-DD | Command | Key output | Status (pass/fail)
- 2026-02-09 | `npm run lint` | `eslint src` | pass
- 2026-02-09 | `npm run test` | `vitest run` (3 tests) | pass
- 2026-02-09 | `npm run build` | `vite build` success | pass
- 2026-02-09 | `npm run preview -- --host 127.0.0.1 --port 4173` + `curl -I http://127.0.0.1:4173` | HTTP 200 OK | pass
- 2026-02-09 | `curl -sS -D - 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle' -o /dev/null` | HTTP/2 200 | pass
- 2026-02-09 | `gh run list -b main -L 1` | CI `success` | pass

## Historical Summary
- Keep compact summaries of older entries here when file compaction runs.
