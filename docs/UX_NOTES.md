# UX Notes

## Visual Direction
- Dark, cinematic canvas with cool blue accents and neon highlights.
- Serif brand mark for gravitas, sans-serif UI for clarity.
- Minimal chrome: panels are slim and glassy.
- Day/night terminator and city lights add depth even without textures.

## Interaction Model
- Orbit control: click-drag to rotate, scroll to zoom.
- Search and filters update instantly.
- Hover = tooltip, click = selection + orbit path.
- Loading overlay appears briefly on startup to confirm activity.
- Time scrubber allows manual inspection of a fixed window.
- Dataset toggle switches between payloads-only and all cataloged objects.
- Trust panel surfaces data source, status, and freshness age.
- Manual refresh button gives users control of live catalog updates.
- Data coverage section shows live vs synthetic counts.
- Skipped TLE entries surface as a small warning under coverage.
- Data health badge shows live/cache/fallback state at a glance.
- Legend clarifies color encodings for type and source.
- Performance toggle lets users trade detail for speed.

## Accessibility & Clarity
- Keyboard focus styles on inputs and buttons.
- Motion can be paused via time controls.
- Trust panel anchors definitions and limitations.

## Performance
- Density mode kicks in when object count is high.
- Orbit points are rendered as a single buffer for efficiency.

## Future Enhancements
- Dataset toggles for satellites vs all objects.
- Timeline scrubber.
- Map overlays for ground tracks.
