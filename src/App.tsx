import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { generateObjects } from './data/orbitalObjects'
import { loadActiveTleObjects, refreshActiveTleObjects } from './data/tleSource'
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
import { isValidTleObject } from './utils/orbit'
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
  performance: 'balanced',
})

const formatNumber = (value: number) => value.toLocaleString('en-US')
const DATASET_LABELS: Record<FiltersState['dataset'], string> = {
  all: 'All cataloged objects',
  payloads: 'Satellites (payloads only)',
}

const formatAge = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h`
}

const getActiveFiltersCount = (filters: FiltersState) => {
  let count = 0
  if (filters.altitudeBand !== 'All') count += 1
  if (filters.constellations.size > 0) count += filters.constellations.size
  if (filters.regimes.size !== ALL_REGIMES.length) count += filters.regimes.size
  if (filters.types.size !== ALL_TYPES.length) count += filters.types.size
  if (filters.dataset !== 'all') count += 1
  if (filters.performance !== 'balanced') count += 1
  return count
}

const App = () => {
  const syntheticObjects = useMemo(() => generateObjects(58), [])
  const [tleObjects, setTleObjects] = useState<OrbitObject[]>([])
  const [tleStatus, setTleStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [tleMessage, setTleMessage] = useState<string | null>(null)
  const [invalidTleCount, setInvalidTleCount] = useState(0)
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
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [globeCommand, setGlobeCommand] = useState<'reset' | 'earth' | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [snapshotMode, setSnapshotMode] = useState<'globe' | 'full'>('globe')
  const [snapshotWatermark, setSnapshotWatermark] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const helpButtonRef = useRef<HTMLButtonElement | null>(null)
  const lastFocusRef = useRef<HTMLElement | null>(null)
  const [globeCanvas, setGlobeCanvas] = useState<HTMLCanvasElement | null>(null)

  const [pendingSelectedId, setPendingSelectedId] = useState<string | null>(null)

  useEffect(() => {
    const urlState = parseUrlState()
    if (urlState.filters) setFilters(urlState.filters)
    if (urlState.search) setSearchTerm(urlState.search)
    if (urlState.selectedId) setPendingSelectedId(urlState.selectedId)
    if (urlState.time) setTimeState(urlState.time)
    if (urlState.view) setViewState(urlState.view)
  }, [])

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
    const interval = window.setInterval(() => setNowTick(Date.now()), 5000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setTleStatus('loading')
      setTleMessage(null)
      try {
        const result = await loadActiveTleObjects()
        if (cancelled) return
        const invalidCount = result.objects.filter((object) => !isValidTleObject(object)).length
        setInvalidTleCount(invalidCount)
        setTleObjects(result.objects)
        setLastUpdated(result.fetchedAt)
        setTleStatus('ready')
      } catch {
        if (cancelled) return
        setTleStatus('error')
        setTleMessage('Live catalog unavailable. Using cached or demo data.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

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

  const baseObjects = useMemo(() => {
    if (filters.dataset === 'payloads') {
      if (tleObjects.length > 0) return tleObjects
      return syntheticObjects.filter((object) => object.type === 'Payload')
    }
    if (tleObjects.length > 0) {
      const nonPayloads = syntheticObjects.filter((object) => object.type !== 'Payload')
      return [...tleObjects, ...nonPayloads]
    }
    return syntheticObjects
  }, [filters.dataset, syntheticObjects, tleObjects])

  useEffect(() => {
    if (!pendingSelectedId || selected) return
    const match = baseObjects.find((object) => object.id === pendingSelectedId || object.noradId.toString() === pendingSelectedId)
    if (match) {
      setSelected(match)
      setFocusObject(match)
      setPendingSelectedId(null)
    }
  }, [baseObjects, pendingSelectedId, selected])

  const constellations = useMemo(() => {
    const set = new Set<string>()
    baseObjects.forEach((object) => {
      if (object.constellation) set.add(object.constellation)
    })
    return [...set].sort()
  }, [baseObjects])

  const filteredObjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return baseObjects.filter((object) => {
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
  }, [baseObjects, filters, searchTerm])

  const clustersEnabled = filteredObjects.length > 1500
  const cameraDistance = viewState?.distance ?? 3.2
  const zoomDensity = cameraDistance > 4.3 ? 3 : cameraDistance > 3.4 ? 2 : 1
  const performanceMultiplier = filters.performance === 'high' ? 0.7 : filters.performance === 'low' ? 2 : 1
  const densityStep = Math.max(
    1,
    Math.round((clustersEnabled ? zoomDensity * 2 : zoomDensity) * performanceMultiplier),
  )
  const pointSize = filters.performance === 'high' ? 0.024 : filters.performance === 'low' ? 0.017 : 0.022
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

  const hasFreshness = tleStatus === 'ready'
  const dataAgeSec = hasFreshness ? Math.max(0, Math.floor((nowTick - lastUpdated.getTime()) / 1000)) : 0
  const lastUpdatedLabel = hasFreshness
    ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : 'Unknown'
  const dataSourceLabel =
    tleStatus === 'ready'
      ? filters.dataset === 'payloads'
        ? 'CelesTrak active satellites (TLE)'
        : 'CelesTrak active satellites + synthetic non-payloads'
      : 'Synthetic demo catalog'
  const dataStatusLabel =
    tleStatus === 'loading'
      ? 'Fetching live TLE...'
      : tleStatus === 'error'
        ? 'Live fetch failed, using cached or demo data.'
        : 'Live catalog ready.'

  const coverage = useMemo(() => {
    const livePayloads = baseObjects.filter((object) => object.source === 'tle').length
    const syntheticObjects = baseObjects.filter((object) => object.source !== 'tle').length
    const payloads = baseObjects.filter((object) => object.type === 'Payload').length
    const nonPayloads = baseObjects.length - payloads
    const invalidTle = tleStatus === 'ready' ? invalidTleCount : 0
    return { livePayloads, syntheticObjects, payloads, nonPayloads, invalidTle }
  }, [baseObjects, invalidTleCount, tleStatus])

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

  const handleExport = async () => {
    if (isExporting) return
    setIsExporting(true)
    if (!globeCanvas) {
      showToast('Globe not ready yet.')
      setIsExporting(false)
      return
    }
    try {
      const stampWatermark = (canvas: HTMLCanvasElement) => {
        if (!snapshotWatermark) return canvas
        const ctx = canvas.getContext('2d')
        if (!ctx) return canvas
        const padding = 20
        const text = 'AstraView'
        ctx.save()
        ctx.font = '600 18px Space Grotesk, sans-serif'
        ctx.fillStyle = 'rgba(226, 232, 240, 0.75)'
        ctx.shadowColor = 'rgba(2, 6, 23, 0.6)'
        ctx.shadowBlur = 6
        const metrics = ctx.measureText(text)
        const x = canvas.width - metrics.width - padding
        const y = canvas.height - padding
        ctx.fillText(text, x, y)
        ctx.restore()
        return canvas
      }

      if (snapshotMode === 'globe') {
        const dataUrl = globeCanvas.toDataURL('image/png')
        const img = new Image()
        img.src = dataUrl
        await new Promise((resolve) => {
          img.onload = resolve
          img.onerror = resolve
        })
        const exportCanvas = document.createElement('canvas')
        exportCanvas.width = globeCanvas.width
        exportCanvas.height = globeCanvas.height
        const ctx = exportCanvas.getContext('2d')
        if (!ctx) {
          showToast('Snapshot failed. Try again.')
          setIsExporting(false)
          return
        }
        ctx.drawImage(img, 0, 0)
        stampWatermark(exportCanvas)
        const finalUrl = exportCanvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = finalUrl
        link.download = `astraview-${new Date().toISOString().slice(0, 10)}.png`
        link.click()
        showToast('Snapshot saved.')
      } else {
        const target = document.querySelector<HTMLElement>('.app')
        if (!target) {
          showToast('Snapshot target missing.')
          setIsExporting(false)
          return
        }
        const html2canvas = (await import('html2canvas')).default
        const canvas = await html2canvas(target, {
          useCORS: true,
          backgroundColor: '#05070f',
          scale: window.devicePixelRatio || 1,
          logging: false,
        })
        stampWatermark(canvas)
        const dataUrl = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `astraview-full-${new Date().toISOString().slice(0, 10)}.png`
        link.click()
        showToast('Full snapshot saved.')
      }
    } catch {
      showToast('Snapshot failed. Try again.')
    } finally {
      setIsExporting(false)
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

  const handleResetView = () => setGlobeCommand('reset')
  const handleFocusEarth = () => setGlobeCommand('earth')

  const handlePausePlay = () => {
    handleTimeToggle()
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        setShowShortcuts((prev) => !prev)
      }
      if (event.key === ' ') {
        event.preventDefault()
        handlePausePlay()
      }
      if (event.key.toLowerCase() === 'r') {
        handleResetView()
      }
      if (event.key.toLowerCase() === 'f') {
        handleFocusEarth()
      }
      if (event.key === '/') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setShowShortcuts(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handlePausePlay, handleResetView, handleFocusEarth])

  useEffect(() => {
    if (!showShortcuts) return
    lastFocusRef.current = document.activeElement as HTMLElement | null
    const card = document.querySelector<HTMLDivElement>('.shortcut-card')
    card?.focus()
  }, [showShortcuts])

  useEffect(() => {
    if (showShortcuts) return
    if (helpButtonRef.current) {
      helpButtonRef.current.focus()
      return
    }
    lastFocusRef.current?.focus?.()
  }, [showShortcuts])

  const handleRefreshData = async () => {
    if (!isOnline) {
      showToast('Offline. Connect to refresh live catalog.')
      return
    }
    setTleStatus('loading')
    setTleMessage(null)
    try {
      const result = await refreshActiveTleObjects()
      const invalidCount = result.objects.filter((object) => !isValidTleObject(object)).length
      setInvalidTleCount(invalidCount)
      setTleObjects(result.objects)
      setLastUpdated(result.fetchedAt)
      setTleStatus('ready')
      showToast(
        invalidCount > 0
          ? `Live catalog refreshed. ${invalidCount} TLEs skipped.`
          : 'Live catalog refreshed.',
      )
    } catch {
      setTleStatus('error')
      setTleMessage('Refresh failed. Using cached or demo data.')
      showToast('Refresh failed. Using cached data.')
    }
  }

  return (
    <div className="app">
      <div className={`toast ${toast ? 'show' : ''}`}>{toast ?? ''}</div>
      {showShortcuts && (
        <div className="shortcut-overlay" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
          <div className="shortcut-card" tabIndex={-1}>
            <div className="shortcut-header">
              <div className="shortcut-title">Keyboard Shortcuts</div>
              <button
                type="button"
                className="ghost"
                onClick={() => setShowShortcuts(false)}
                aria-label="Close shortcuts"
              >
                Close
              </button>
            </div>
            <div className="shortcut-list">
              <div className="shortcut-item">
                <span>Toggle shortcuts</span>
                <span className="shortcut-key">?</span>
              </div>
              <div className="shortcut-item">
                <span>Pause/Play</span>
                <span className="shortcut-key">Space</span>
              </div>
              <div className="shortcut-item">
                <span>Reset view</span>
                <span className="shortcut-key">R</span>
              </div>
              <div className="shortcut-item">
                <span>Focus Earth</span>
                <span className="shortcut-key">F</span>
              </div>
              <div className="shortcut-item">
                <span>Search</span>
                <span className="shortcut-key">/</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <header className="topbar">
        <div>
          <div className="brand">AstraView</div>
          <div className="subtitle">Real-Time Orbit Explorer</div>
        </div>
        <div className="search">
          <div className="search-field">
            <input
              ref={searchInputRef}
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
          <div className={`health ${tleStatus}`}>
            <span className="dot" />
            {tleStatus === 'loading'
              ? 'Loading live'
              : tleStatus === 'ready'
                ? isOnline
                  ? 'Live'
                  : 'Cached'
                : tleStatus === 'error'
                  ? 'Fallback'
                  : 'Idle'}
          </div>
          <div className="status-line">
            <span>Mode: {filters.dataset === 'payloads' ? 'Satellites' : 'All Objects'}</span>
            <span>Perf: {filters.performance}</span>
          </div>
          <button
            type="button"
            className="help-button"
            onClick={() => setShowShortcuts(true)}
            aria-label="Open keyboard shortcuts"
            ref={helpButtonRef}
          >
            ?
          </button>
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
            <div className="filter-group">
              <div className="filter-label">Performance</div>
              <div className="chips">
                {(['high', 'balanced', 'low'] as FiltersState['performance'][]).map((mode) => (
                  <button
                    key={mode}
                    className={`chip ${filters.performance === mode ? 'active' : ''}`}
                    onClick={() => setFilters((prev) => ({ ...prev, performance: mode }))}
                    type="button"
                  >
                    {mode === 'high' ? 'High detail' : mode === 'low' ? 'Low detail' : 'Balanced'}
                  </button>
                ))}
              </div>
            </div>
          </section>
          <section className="trust">
            <div className="section-title">Trust Panel</div>
            <div className="trust-item">
              <strong>Definitions</strong>
              <p>
                {DATASET_LABELS[filters.dataset]}.{' '}
                {filters.dataset === 'payloads'
                  ? 'Payloads use live TLE when available, with synthetic fallback if offline.'
                  : 'Payloads use live TLE when available; synthetic data fills non-payload categories.'}
              </p>
            </div>
            <div className="trust-item">
              <strong>Data Source</strong>
              <p>{dataSourceLabel}</p>
              <div className="trust-actions">
                <button
                  type="button"
                  onClick={handleRefreshData}
                  disabled={!isOnline || tleStatus === 'loading'}
                >
                  {tleStatus === 'loading' ? 'Refreshing...' : 'Refresh live data'}
                </button>
              </div>
              {tleMessage && <div className="trust-note">{tleMessage}</div>}
            </div>
            <div className="trust-item">
              <strong>Freshness</strong>
              <p>
                {isOnline ? 'Online.' : 'Offline mode. Using cached dataset.'} {dataStatusLabel}
                Last refreshed: {lastUpdatedLabel}
                {hasFreshness ? ` · Age: ${formatAge(dataAgeSec)}.` : '.'}
              </p>
            </div>
            <div className="trust-item">
              <strong>Data Coverage</strong>
              <p>
                Live payloads: {formatNumber(coverage.livePayloads)} · Synthetic objects:{' '}
                {formatNumber(coverage.syntheticObjects)}
              </p>
              <p>
                Payloads: {formatNumber(coverage.payloads)} · Non-payloads:{' '}
                {formatNumber(coverage.nonPayloads)}
              </p>
              {coverage.invalidTle > 0 && (
                <p className="trust-note">
                  {formatNumber(coverage.invalidTle)} TLE entries skipped due to propagation
                  errors.
                </p>
              )}
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
              pointSize={densityStep > 2 ? pointSize * 0.8 : densityStep > 1 ? pointSize * 0.9 : pointSize}
              externalCommand={globeCommand}
              onCommandHandled={() => setGlobeCommand(null)}
              onCanvasReady={setGlobeCanvas}
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
            <div className="view-controls">
              <button onClick={handleResetView} type="button">
                Reset View
              </button>
              <button className="ghost" onClick={handleFocusEarth} type="button">
                Focus Earth
              </button>
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
          <section className="legend">
            <div className="section-title">Legend</div>
            <div className="legend-group">
              <div className="legend-label">Object Type</div>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="dot payload" />
                  Payload
                </div>
                <div className="legend-item">
                  <span className="dot rocket" />
                  Rocket Body
                </div>
                <div className="legend-item">
                  <span className="dot debris" />
                  Debris
                </div>
              </div>
            </div>
            <div className="legend-group">
              <div className="legend-label">Data Source</div>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="dot live" />
                  Live TLE
                </div>
                <div className="legend-item">
                  <span className="dot synthetic" />
                  Synthetic
                </div>
              </div>
            </div>
          </section>
          <section className="share">
            <div className="section-title">Share View</div>
            <p>Copy a link that recreates your filters, camera, and selection.</p>
            <button onClick={shareLink} type="button">
              Copy permalink
            </button>
            <div className="snapshot-toggle">
              <span>Snapshot</span>
              <div className="chips">
                <button
                  type="button"
                  className={`chip ${snapshotMode === 'globe' ? 'active' : ''}`}
                  onClick={() => setSnapshotMode('globe')}
                >
                  Globe only
                </button>
                <button
                  type="button"
                  className={`chip ${snapshotMode === 'full' ? 'active' : ''}`}
                  onClick={() => setSnapshotMode('full')}
                >
                  Full UI
                </button>
              </div>
              <label className="watermark-toggle">
                <input
                  type="checkbox"
                  checked={snapshotWatermark}
                  onChange={(event) => setSnapshotWatermark(event.target.checked)}
                />
                Include watermark
              </label>
            </div>
            <button className="ghost" onClick={handleExport} type="button">
              {isExporting ? 'Exporting...' : 'Export PNG'}
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
