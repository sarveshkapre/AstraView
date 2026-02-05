# AstraView

Real-Time Orbit Explorer. AstraView is a one-page web app that visualizes satellites and cataloged orbital objects moving in real time around a 3D Earth. It is designed for space-curious users, educators, and analysts who want immediate answers to “what’s in orbit right now?” without orbital mechanics expertise.

## Product Summary

AstraView delivers instant orbital context via an interactive globe, live-motion objects, fast search + filters, and shareable permalinks that recreate camera, time, and selection. It balances clarity and trust with a dedicated definitions/freshness panel and graceful performance fallbacks.

## MVP Features

- 3D globe visualization with live motion and time controls (pause/play + now).
- Counts and breakdowns by orbit regime (LEO/MEO/GEO) and object type.
- Search by name, NORAD ID, constellation, or operator keyword.
- Filters for regime, object type, constellation, and altitude bands.
- Dataset toggle for payloads-only vs all cataloged objects.
- Hover tooltips and click-to-inspect detail panel with orbit path.
- Orbit trail history and slow Earth rotation for motion context.
- Day/night terminator glow and shader-based night lights.
- Earth day/night textures and normal mapping for surface detail.
- Cloud layer and atmospheric limb glow for depth.
- Live TLE ingestion (CelesTrak active satellites) with caching and offline fallback.
- Manual refresh control for the live catalog.
- Data coverage stats for live vs synthetic objects.
- Live/cache/fallback health badge in the header.
- Visual legend for type and data source.
- Performance toggle for detail vs speed.
- View controls for resetting camera or focusing Earth.
- Keyboard shortcuts overlay (`?`) for quick help.
- Help icon to open the shortcut overlay.
- Header status line for dataset mode and performance.
- Export PNG snapshots of the current view.
- Snapshot mode toggle for globe-only vs full UI exports.
- Snapshot watermark toggle for branded exports.
- Shareable permalinks that encode camera, filters, time mode, and selection.
- Trust panel with definitions, freshness, and limitations.
- Zoom-aware density mode with offline-safe cached dataset indicator.

## Tech Stack

- Vite + React + TypeScript
- Three.js for the 3D globe

## Getting Started

```bash
npm install
npm run dev
```

## Repository Docs

Context and product documentation lives in `docs/`:

- `docs/PRD.md`
- `docs/PRODUCT_BRIEF.md`
- `docs/UX_NOTES.md`
- `docs/TECHNICAL_NOTES.md`

## Changelog

See `CHANGELOG.md`.
