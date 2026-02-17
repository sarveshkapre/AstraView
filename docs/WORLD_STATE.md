# World State Snapshot (2026-02-17)

This note captures a live catalog snapshot used to guide AstraView roadmap decisions.

## Source and Method

- Source: CelesTrak Current Data GP endpoint (`gp.php`) in OMM JSON mode.
- Checked at: `2026-02-17T04:26:02Z`.
- Method: direct endpoint queries for groups currently supported by AstraView.

## Observed Catalog Sizes

| Group | Objects |
| --- | ---: |
| ACTIVE | 14,379 |
| STARLINK | 9,551 |
| ONEWEB | 651 |
| QIANFAN | 108 |
| KUIPER | 179 |
| STATIONS | 34 |
| GPS-OPS | 32 |
| IRIDIUM | 29 |
| WEATHER | 70 |

## Product Implications

- LEO broadband constellations dominate object volume; density-mode behavior must stay default-safe.
- Newer constellation catalogs (`QIANFAN`, `KUIPER`) are active and worth first-class support.
- Niche catalogs (`WEATHER`, `GPS-OPS`, `STATIONS`) remain low-count and are ideal for educational presets.
- Trust UX should keep emphasizing freshness, source mode (live/cache/stale), and parser fallback behavior.

## Next Iterations

- Add optional per-group object-count preview in the catalog picker.
- Add lightweight onboarding presets for "Broadband LEO", "Navigation", and "Weather + GEO".
- Keep permalink compatibility as new groups are added (short-key + full-name fallback).
