# AstraView

Real-Time Orbit Explorer. AstraView is a one-page web app that visualizes satellites and cataloged orbital objects moving in real time around a 3D Earth. It is designed for space-curious users, educators, and analysts who want immediate answers to “what’s in orbit right now?” without orbital mechanics expertise.

## Product Summary

AstraView delivers instant orbital context via an interactive globe, live-motion objects, fast search + filters, and shareable permalinks that recreate camera, time, and selection. It balances clarity and trust with a dedicated definitions/freshness panel and graceful performance fallbacks.

## MVP Features

- 3D globe visualization with live motion and time controls (pause/play + now).
- Counts and breakdowns by orbit regime (LEO/MEO/GEO) and object type.
- Search by name, NORAD ID, constellation, or operator keyword.
- Filters for regime, object type, constellation, and altitude bands.
- Hover tooltips and click-to-inspect detail panel with orbit path.
- Orbit trail history and slow Earth rotation for motion context.
- Day/night terminator glow and shader-based night lights.
- Earth day/night textures and normal mapping for surface detail.
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
