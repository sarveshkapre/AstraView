# UX Notes

## Visual Direction
- Dark, cinematic canvas with cool blue accents and neon highlights.
- Serif brand mark for gravitas, sans-serif UI for clarity.
- Minimal chrome: panels are slim and glassy.
- Day/night terminator and city lights add depth even without textures.

## Interaction Model
- Orbit control: click-drag to rotate, scroll to zoom.
- Search and filters update instantly.
- Search dropdown supports keyboard navigation (up/down/enter) and closes on escape/outside click.
- Power search supports pasting comma/newline-separated NORAD ID lists.
- Hover = tooltip, click = selection + orbit path.
- Selection panel includes a ground track toggle for projected subsatellite path context.
- Watchlist pins let users pin/unpin objects and quickly re-select from a compact list.
- On small screens, Filters/Trust and Inspect/Share panels live in a compact drawer so the globe stays primary.
- Loading overlay appears briefly on startup to confirm activity.
- Time scrubber allows manual inspection of a fixed window.
- Default to paused time when `prefers-reduced-motion: reduce` is enabled (user can still press Play).
- Dataset toggle switches between payloads-only and all cataloged objects.
- Trust panel surfaces data source, status, and freshness age.
- Manual refresh button gives users control of live catalog updates.
- Data coverage section shows live vs synthetic counts.
- Data coverage section now includes filtered altitude spread (min/median/max).
- Skipped live-catalog entries surface as a small warning under coverage.
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
- Share link toast now includes current snapshot preset and scale.
- Permalink state now restores snapshot preset, scale, watermark, and mode.
- Permalink state now restores selected overlay toggles (including ground track).
- Reset snapshot button restores default export settings.
- Shortcut dialog closes on backdrop click and ignores unrelated shortcuts while open.
- Keyboard shortcuts include `E` for export PNG and `C` for copy PNG.
- Snapshot panel shows estimated output size and warns on high-memory captures.

## Accessibility & Clarity
- Keyboard focus styles on inputs and buttons.
- Motion can be paused via time controls.
- Friendly “WebGL required” fallback messaging when 3D initialization fails.
- Trust panel anchors definitions and limitations.

## Performance
- Density mode kicks in when object count is high.
- Orbit points are rendered as a single buffer for efficiency.

## Future Enhancements
- Dataset toggles for satellites vs all objects.
- Timeline scrubber.
- Map overlays for ground tracks.
