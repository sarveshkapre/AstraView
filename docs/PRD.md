# PRD - AstraView (Real-Time Orbit Explorer)

## Product
A web app that shows satellites (and optionally all tracked orbital objects) moving around Earth on an interactive 3D globe. Users can search, filter, inspect objects, and share a link to an exact view.

## Target Users
- Space-curious users
- Enthusiasts
- Educators
- Journalists and analysts

## Problem
Existing orbit visualizations are either too technical, too slow, or too shallow. Users can’t quickly answer: how many objects are there, what kinds, where are they, what is this specific object, and how do I share the view.

## Goals (MVP)
- Instant delight: globe loads and objects are visibly moving quickly after opening the site.
- Fast exploration: search/filters apply immediately with no lag.
- Explainable + trustworthy: clear definitions of what’s counted and visible data freshness.

## Non-goals (MVP)
- Mission-grade precision, collision avoidance, operational tracking, or guarantees.

## MVP User Journeys
1. Explore: user lands, rotates/zooms, sees counts and breakdowns, quickly understands density and regimes.
2. Find: user searches an object/constellation, selects a result, sees it highlighted and can focus camera.
3. Inspect: user clicks an object to open details and see its orbit path and basic metadata.
4. Share: user copies a link that recreates the same view (camera + filters + selection).
5. Understand: user opens “About/Definitions” to understand inclusions/exclusions and freshness.

## MVP Features
- Globe visualization with objects moving and a time control (pause/play + now).
- Counts + breakdowns by orbit regime (LEO/MEO/GEO) and object type.
- Search: name + ID exact match; keyword search for constellation/operator when available.
- Filters: regime, type, constellation presets (if available), coarse altitude band.
- Object interaction: hover tooltip; click opens detail panel with highlight + focus + orbit path.
- Shareable permalinks: encode camera, time mode, filters, selected object.
- Trust panel: definitions, what is included, freshness indicator, limitations disclaimer.

## UX Requirements
- Minimal chrome; globe is the product.
- Immediate feedback; no apply buttons.
- Progressive detail: simplified/density view when zoomed out, individual objects when zoomed in.
- Controls are discoverable and consistent (Search top; Filters left; Details right).
- Accessible basics: keyboard focus for search, readable contrast, motion can be paused.

## Quality Requirements
- Smooth interaction during zoom/rotate/filter.
- Graceful degradation: if too many objects, simplify automatically instead of freezing.
- Clear loading states and cached fallback if data can’t refresh.

## Success Metrics
- Activation: % of sessions performing a meaningful action within 60 seconds.
- Engagement: time on site, objects inspected per session, filter usage rate.
- Share rate: % of sessions generating permalinks.
- Quality: client performance stability and low error rate.

## Key Risks
- Confusion about “how many satellites” (definitions vary). Mitigation: explicit dataset toggle + breakdowns.
- Data staleness/accuracy expectations. Mitigation: show freshness clearly + limitations.
- Performance at scale. Mitigation: progressive detail + density defaults.

## Acceptance Criteria (MVP)
- On first load, user sees the globe and moving objects and can rotate/zoom successfully.
- Counts and breakdowns are visible and update correctly when filters change.
- Search returns results and selecting one focuses/highlights the object.
- Clicking an object opens a detail panel and shows an orbit path for that object.
- A copied link recreates the same view (filters + camera + selection).
- Definitions/freshness panel exists and is easy to find.
