import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { generateObjects } from './data/orbitalObjects'
import type {
  OrbitObject,
  FiltersState,
  OrbitRegime,
  OrbitType,
  AltitudeBand,
  ViewState,
  TimeState,
} from './types'
import { parseUrlState, serializeUrlState } from './utils/urlState'
import './App.css'

const Globe = lazy(() => import('./components/Globe'))

const ALL_REGIMES: OrbitRegime[] = ['LEO', 'MEO', 'GEO']
const ALL_TYPES: OrbitType[] = ['Payload', 'Rocket Body', 'Debris']
const ALTITUDE_BANDS: AltitudeBand[] = ['All', '<500km', '500-1200km', '1200-20000km', '20000km+']

const altitudeInBand = (altitude: number, band: AltitudeBand) => {
  switch (band) {
    case '<500km':
      return altitude < 500
    case '500-1200km':
      return altitude >= 500 && altitude < 1200
    case '1200-20000km':
      return altitude >= 1200 && altitude < 20000
    case '20000km+':
      return altitude >= 20000
    default:
      return true
  }
}

const defaultFilters = (): FiltersState => ({
  regimes: new Set(ALL_REGIMES),
  types: new Set(ALL_TYPES),
  constellations: new Set(),
  altitudeBand: 'All',
  dataset: 'all',
})

const formatNumber = (value: number) => value.toLocaleString('en-US')
const DATASET_LABELS: Record<FiltersState['dataset'], string> = {
  all: 'All cataloged objects',
  payloads: 'Satellites (payloads only)',
}

const getActiveFiltersCount = (filters: FiltersState) => {
  let count = 0
  if (filters.altitudeBand !== 'All') count += 1
  if (filters.constellations.size > 0) count += filters.constellations.size
  if (filters.regimes.size !== ALL_REGIMES.length) count += filters.regimes.size
  if (filters.types.size !== ALL_TYPES.length) count += filters.types.size
  if (filters.dataset !== 'all') count += 1
  return count
}

const App = () => {
  const [objects] = useState(() => generateObjects(58))
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<FiltersState>(() => defaultFilters())
  const [selected, setSelected] = useState<OrbitObject | null>(null)
  const [hovered, setHovered] = useState<OrbitObject | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)
  const [timeState, setTimeState] = useState<TimeState>({ mode: 'live', speed: 1 })
  const [timeSeconds, setTimeSeconds] = useState(0)
  const [viewState, setViewState] = useState<ViewState | undefined>(undefined)
  const [focusObject, setFocusObject] = useState<OrbitObject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date())
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)

  useEffect(() => {
    const urlState = parseUrlState()
    if (urlState.filters) setFilters(urlState.filters)
    if (urlState.search) setSearchTerm(urlState.search)
    if (urlState.selectedId) {
      const match = objects.find((object) => object.id === urlState.selectedId)
      if (match) {
        setSelected(match)
        setFocusObject(match)
      }
    }
    if (urlState.time) setTimeState(urlState.time)
    if (urlState.view) setViewState(urlState.view)
  }, [objects])

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 700)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  useEffect(() => {
    if (!isOnline) return undefined
    const interval = window.setInterval(() => setLastUpdated(new Date()), 5000)
    return () => window.clearInterval(interval)
  }, [isOnline])

  useEffect(() => {
    let frame = 0
    let start = performance.now()
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const elapsed = (now - start) / 1000
      const speed = timeState.speed ?? 1
      if (timeState.mode === 'live') {
        setTimeSeconds(elapsed * speed)
      } else if (timeState.pausedAtSec !== undefined) {
        setTimeSeconds(timeState.pausedAtSec)
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [timeState])

  const constellations = useMemo(() => {
    const set = new Set<string>()
    objects.forEach((object) => {
      if (object.constellation) set.add(object.constellation)
    })
    return [...set].sort()
  }, [objects])

  const filteredObjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return objects.filter((object) => {
      if (filters.dataset === 'payloads' && object.type !== 'Payload') return false
      if (filters.regimes.size && !filters.regimes.has(object.regime)) return false
      if (filters.types.size && !filters.types.has(object.type)) return false
      if (filters.constellations.size && object.constellation && !filters.constellations.has(object.constellation)) {
        return false
      }
      if (filters.constellations.size && !object.constellation) return false
      if (!altitudeInBand(object.altitudeKm, filters.altitudeBand)) return false
      if (query) {
        const name = object.name.toLowerCase()
        const id = object.noradId.toString()
        if (name === query || id === query) return true
        const target = `${name} ${object.constellation ?? ''} ${object.operator ?? ''}`.toLowerCase()
        if (!target.includes(query)) return false
      }
      return true
    })
  }, [filters, objects, searchTerm])

  const clustersEnabled = filteredObjects.length > 1500
  const cameraDistance = viewState?.distance ?? 3.2
  const zoomDensity = cameraDistance > 4.3 ? 3 : cameraDistance > 3.4 ? 2 : 1
  const densityStep = Math.max(1, clustersEnabled ? zoomDensity * 2 : zoomDensity)
  const displayObjects = useMemo(() => {
    let list =
      densityStep === 1 ? filteredObjects : filteredObjects.filter((_, index) => index % densityStep === 0)
    if (selected && !list.some((object) => object.id === selected.id)) {
      list = [selected, ...list]
    }
    return list
  }, [densityStep, filteredObjects, selected])

  const breakdown = useMemo(() => {
    const counts = {
      LEO: 0,
      MEO: 0,
      GEO: 0,
      Payload: 0,
      'Rocket Body': 0,
      Debris: 0,
    }
    filteredObjects.forEach((object) => {
      counts[object.regime] += 1
      counts[object.type] += 1
    })
    return counts
  }, [filteredObjects])

  useEffect(() => {
    if (selected && !filteredObjects.some((object) => object.id === selected.id)) {
      setSelected(null)
      setFocusObject(null)
    }
  }, [filteredObjects, selected])

  useEffect(() => {
    if (selected && !filteredObjects.some((object) => object.id === selected.id)) {
      setSelected(null)
      setFocusObject(null)
    }
  }, [filteredObjects, selected])

  useEffect(() => {
    serializeUrlState({
      filters,
      selectedId: selected?.id,
      search: searchTerm,
      view: viewState,
      time: timeState,
    })
  }, [filters, searchTerm, selected, viewState, timeState])

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return []
    const exact = filteredObjects.filter(
      (object) =>
        object.name.toLowerCase() === query || object.noradId.toString() === query,
    )
    const remainder = filteredObjects.filter(
      (object) =>
        object.name.toLowerCase() !== query && object.noradId.toString() !== query,
    )
    return [...exact, ...remainder].slice(0, 6)
  }, [filteredObjects, searchTerm])

  const handleSelect = (object: OrbitObject | null) => {
    setSelected(object)
    setFocusObject(object)
  }

  const handleClearSelection = () => {
    setSelected(null)
    setFocusObject(null)
  }

  const toggleFilter = <T extends string>(set: Set<T>, value: T, allValues: T[]): Set<T> => {
    const next = new Set(set)
    if (next.has(value)) {
      next.delete(value)
      if (next.size === 0) {
        allValues.forEach((item) => next.add(item))
      }
    } else {
      if (next.size === allValues.length) {
        next.clear()
      }
      next.add(value)
    }
    return next
  }

  const handleAltitudeChange = (band: AltitudeBand) => {
    setFilters((prev) => ({ ...prev, altitudeBand: band }))
  }

  const handleConstellationToggle = (constellation: string) => {
    setFilters((prev) => {
      const next = new Set(prev.constellations)
      if (next.has(constellation)) {
        next.delete(constellation)
      } else {
        next.add(constellation)
      }
      return { ...prev, constellations: next }
    })
  }

  const handleDatasetChange = (dataset: FiltersState['dataset']) => {
    setFilters((prev) => ({
      ...prev,
      dataset,
      types: dataset === 'payloads' ? new Set<OrbitType>(['Payload']) : new Set(ALL_TYPES),
    }))
  }

  const handleResetFilters = () => {
    setFilters(defaultFilters())
    setSearchTerm('')
  }

  const showToast = (message: string) => {
    setToast(message)
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200)
  }

  const shareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      showToast('Share link copied to clipboard.')
    } catch (error) {
      showToast('Copy failed. Use your browser menu to copy the URL.')
    }
  }

  const handleTimeToggle = () => {
    setTimeState((prev) => {
      if (prev.mode === 'live') {
        const nextPaused = Math.min(timeSeconds, 6000)
        return { mode: 'paused', pausedAtSec: nextPaused, speed: prev.speed ?? 1 }
      }
      return { mode: 'live', speed: prev.speed ?? 1 }
    })
  }

  const handleNow = () => {
    setTimeState((prev) => ({ mode: 'live', speed: prev.speed ?? 1 }))
  }

  const handleScrub = (value: number) => {
    setTimeState((prev) => ({ mode: 'paused', pausedAtSec: value, speed: prev.speed ?? 1 }))
  }

  const handleSpeedChange = (value: number) => {
    setTimeState((prev) => ({ ...prev, speed: value }))
  }

  const handleHover = (object: OrbitObject | null, screen: { x: number; y: number } | null) => {
    setHovered(object)
    setHoverPosition(screen)
  }

  const handleSearchSelect = (object: OrbitObject) => {
    setSelected(object)
    setFocusObject(object)
  }

  return (
    <div className="app">
      <div className={`toast ${toast ? 'show' : ''}`}>{toast ?? ''}</div>
      <header className="topbar">
        <div>
          <div className="brand">AstraView</div>
          <div className="subtitle">Real-Time Orbit Explorer</div>
        </div>
        <div className="search">
          <div className="search-field">
            <input
              type="text"
              placeholder="Search satellites, NORAD ID, constellation"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search satellites"
            />
            {searchResults.length > 0 && (
              <div className="search-results">
                <div className="search-meta">
                  Top matches · {formatNumber(filteredObjects.length)} total
                </div>
                <div className="search-list">
                  {searchResults.map((object) => (
                    <button
                      key={object.id}
                      className="search-item"
                      type="button"
                      onClick={() => handleSearchSelect(object)}
                    >
                      <span>{object.name}</span>
                      <span className="search-item-meta">
                        {object.regime} · {object.type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {searchTerm.trim() && filteredObjects.length === 0 && (
              <div className="search-results">
                <div className="search-meta">No matches. Try a different keyword.</div>
              </div>
            )}
          </div>
          <button className="ghost" onClick={handleResetFilters} type="button">
            Reset
          </button>
        </div>
        <div className="meta">
          <div className="counts">
            <span>{formatNumber(filteredObjects.length)} objects</span>
            <span>LEO {formatNumber(breakdown.LEO)}</span>
            <span>MEO {formatNumber(breakdown.MEO)}</span>
            <span>GEO {formatNumber(breakdown.GEO)}</span>
          </div>
          <div className="counts">
            <span>Payload {formatNumber(breakdown.Payload)}</span>
            <span>Rocket Body {formatNumber(breakdown['Rocket Body'])}</span>
            <span>Debris {formatNumber(breakdown.Debris)}</span>
          </div>
        </div>
      </header>

      <main className="layout">
        <aside className="panel left">
          <section>
            <div className="section-title">Filters</div>
            <div className="filter-group">
              <div className="filter-label">Dataset</div>
              <div className="chips">
                {(['all', 'payloads'] as FiltersState['dataset'][]).map((dataset) => (
                  <button
                    key={dataset}
                    className={`chip ${filters.dataset === dataset ? 'active' : ''}`}
                    onClick={() => handleDatasetChange(dataset)}
                    type="button"
                  >
                    {dataset === 'all' ? 'All Objects' : 'Satellites Only'}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <div className="filter-label">Orbit Regime</div>
              <div className="chips">
                {ALL_REGIMES.map((regime) => (
                  <button
                    key={regime}
                    className={`chip ${filters.regimes.has(regime) ? 'active' : ''}`}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        regimes: toggleFilter(prev.regimes, regime, ALL_REGIMES),
                      }))
                    }
                    type="button"
                  >
                    {regime}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <div className="filter-label">Object Type</div>
              <div className="chips">
                {ALL_TYPES.map((type) => (
                  <button
                    key={type}
                    className={`chip ${filters.types.has(type) ? 'active' : ''}`}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        types: toggleFilter(prev.types, type, ALL_TYPES),
                      }))
                    }
                    disabled={filters.dataset === 'payloads' && type !== 'Payload'}
                    type="button"
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <div className="filter-label">Altitude Band</div>
              <div className="chips">
                {ALTITUDE_BANDS.map((band) => (
                  <button
                    key={band}
                    className={`chip ${filters.altitudeBand === band ? 'active' : ''}`}
                    onClick={() => handleAltitudeChange(band)}
                    type="button"
                  >
                    {band}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <div className="filter-label">Constellations</div>
              <div className="constellations">
                {constellations.map((name) => (
                  <button
                    key={name}
                    className={`chip ${filters.constellations.has(name) ? 'active' : ''}`}
                    onClick={() => handleConstellationToggle(name)}
                    type="button"
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="hint">Tip: click a constellation twice to clear.</div>
            </div>
          </section>
          <section className="trust">
            <div className="section-title">Trust Panel</div>
            <div className="trust-item">
              <strong>Definitions</strong>
              <p>
                {DATASET_LABELS[filters.dataset]}. Demo data is synthetic but structured to reflect
                typical orbital regimes.
              </p>
            </div>
            <div className="trust-item">
              <strong>Freshness</strong>
              <p>
                {isOnline ? 'Live feed active.' : 'Offline mode. Using cached dataset.'} Last
                refreshed:{' '}
                {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.
                Refresh cadence: every 5 seconds.
              </p>
            </div>
            <div className="trust-item">
              <strong>Limitations</strong>
              <p>Positions are illustrative only. Not for operational tracking or collision risk.</p>
            </div>
          </section>
        </aside>

        <section className="globe-stage">
          <Suspense
            fallback={
              <div className="loading">
                <div className="loading-title">Loading 3D engine</div>
                <div className="loading-subtitle">Preparing orbital renderers...</div>
              </div>
            }
          >
            <Globe
              objects={displayObjects}
              timeSeconds={timeSeconds}
              selectedId={selected?.id}
              onHover={handleHover}
              onSelect={handleSelect}
              onViewChange={(view) => setViewState(view)}
              focusObject={focusObject}
              initialView={viewState}
              pointSize={densityStep > 2 ? 0.016 : densityStep > 1 ? 0.018 : 0.022}
            />
          </Suspense>
          {isLoading && (
            <div className="loading">
              <div className="loading-title">Initializing live orbits</div>
              <div className="loading-subtitle">Rendering globe and motion paths...</div>
            </div>
          )}
          {hovered && hoverPosition && (
            <div
              className="tooltip"
              style={{ left: hoverPosition.x + 12, top: hoverPosition.y + 12 }}
            >
              <div className="tooltip-title">{hovered.name}</div>
              <div className="tooltip-meta">
                {hovered.regime} · {hovered.type} · {hovered.altitudeKm} km
              </div>
            </div>
          )}
          <div className="globe-overlay">
            <div className="time-controls">
              <button onClick={handleTimeToggle} type="button">
                {timeState.mode === 'live' ? 'Pause' : 'Play'}
              </button>
              <button className="ghost" onClick={handleNow} type="button">
                Now
              </button>
              <div className="timestamp">
                Mode: {timeState.mode === 'live' ? 'Live' : 'Paused'} · t+{timeSeconds.toFixed(0)}s
              </div>
            </div>
            <div className="time-scrub">
              <div className="scrub-label">Scrub (0-100 min)</div>
              <input
                type="range"
                min={0}
                max={6000}
                step={10}
                value={Math.min(timeSeconds, 6000)}
                onChange={(event) => handleScrub(Number(event.target.value))}
                disabled={timeState.mode === 'live'}
                aria-label="Scrub orbit time"
              />
              <div className="scrub-label">Speed</div>
              <div className="speed-buttons">
                {[0.5, 1, 2, 5].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    className={`chip ${timeState.speed === speed ? 'active' : ''}`}
                    onClick={() => handleSpeedChange(speed)}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
            <div className="cluster-hint">
              {densityStep > 1
                ? `Density mode: showing 1 of ${densityStep} objects`
                : 'Full object mode.'}
            </div>
          </div>
        </section>

        <aside className="panel right">
          <section>
            <div className="section-title">Selection</div>
            {selected ? (
              <div className="detail">
                <div className="detail-title">{selected.name}</div>
                <div className="detail-row">
                  <span>Regime</span>
                  <span>{selected.regime}</span>
                </div>
                <div className="detail-row">
                  <span>Type</span>
                  <span>{selected.type}</span>
                </div>
                <div className="detail-row">
                  <span>Altitude</span>
                  <span>{selected.altitudeKm} km</span>
                </div>
                <div className="detail-row">
                  <span>NORAD</span>
                  <span>{selected.noradId}</span>
                </div>
                <div className="detail-row">
                  <span>Inclination</span>
                  <span>{selected.inclinationDeg}°</span>
                </div>
                <div className="detail-row">
                  <span>Operator</span>
                  <span>{selected.operator ?? '—'}</span>
                </div>
                <div className="detail-row">
                  <span>Launch</span>
                  <span>{selected.launchDate ?? '—'}</span>
                </div>
                <div className="detail-row">
                  <span>Country</span>
                  <span>{selected.country ?? '—'}</span>
                </div>
                <div className="detail-actions">
                  <button onClick={() => setFocusObject(selected)} type="button">
                    Focus
                  </button>
                  <button className="ghost" onClick={handleClearSelection} type="button">
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">Click an object to inspect details.</div>
            )}
          </section>
          <section className="share">
            <div className="section-title">Share View</div>
            <p>Copy a link that recreates your filters, camera, and selection.</p>
            <button onClick={shareLink} type="button">
              Copy permalink
            </button>
          </section>
          <section className="summary">
            <div className="section-title">Session Signals</div>
            <ul>
              <li>Meaningful action time: {searchTerm || selected ? 'Active' : 'Awaiting'}</li>
              <li>Objects inspected: {selected ? 1 : 0}</li>
              <li>Filters active: {getActiveFiltersCount(filters)}</li>
            </ul>
          </section>
        </aside>
      </main>
    </div>
  )
}

export default App
