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
- View controls allow quick reset or refocus on Earth.
- Keyboard shortcut overlay (`?`) improves discoverability.
- Help icon opens the shortcut overlay for mouse users.
- Shortcut overlay is focusable and includes aria labels.
- Focus returns to the Help icon when the dialog closes.
- Header status line shows dataset mode and performance setting.
- Export PNG button provides shareable snapshots.
- Snapshot toggle lets users export globe-only or full UI.
- Watermark toggle allows branded or clean exports.
- Snapshot presets provide one-click export configurations.
- Export scale option supports 1x or 2x outputs.
- Scale tooltip warns about slower exports at higher resolution.
- Exporting state disables controls and shows progress text.
- Copy PNG option enables quick clipboard sharing when supported.
- Preset hint text clarifies export behaviors.

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
