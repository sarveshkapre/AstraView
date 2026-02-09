import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { generateObjects } from './data/orbitalObjects'
import { loadTleObjects, refreshTleObjects, TLE_CATALOG_GROUPS } from './data/tleSource'
import type {
  OrbitObject,
  FiltersState,
  OrbitRegime,
  OrbitType,
  AltitudeBand,
  ViewState,
  TimeState,
  SnapshotPreset,
  TleCatalogGroup,
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
  catalogGroup: 'active',
})

const formatNumber = (value: number) => value.toLocaleString('en-US')
type TleSourceMode = 'network' | 'cache' | 'stale-cache' | 'fallback'

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
  if (filters.catalogGroup !== 'active') count += 1
  return count
}

const App = () => {
  const syntheticObjects = useMemo(() => generateObjects(58), [])
  const [tleObjects, setTleObjects] = useState<OrbitObject[]>([])
  const [tleStatus, setTleStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [tleSourceMode, setTleSourceMode] = useState<TleSourceMode>('fallback')
  const [tleMessage, setTleMessage] = useState<string | null>(null)
  const [invalidTleCount, setInvalidTleCount] = useState(0)
  const [tleGroupLoaded, setTleGroupLoaded] = useState<TleCatalogGroup>('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchActiveIndex, setSearchActiveIndex] = useState(-1)
  const [filters, setFilters] = useState<FiltersState>(() => defaultFilters())
  const [selected, setSelected] = useState<OrbitObject | null>(null)
  const [hovered, setHovered] = useState<OrbitObject | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null)
  const [timeState, setTimeState] = useState<TimeState>({ mode: 'live', speed: 1 })
  const [timeSeconds, setTimeSeconds] = useState(0)
  const timeSecondsRef = useRef(0)
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
  const [snapshotPreset, setSnapshotPreset] = useState<SnapshotPreset>('custom')
  const [exportScale, setExportScale] = useState<1 | 2>(1)
  const [inspectedCount, setInspectedCount] = useState(0)
  const [shareCount, setShareCount] = useState(0)
  const [snapshotCount, setSnapshotCount] = useState(0)
  const sessionStartMsRef = useRef(Date.now())
  const [firstActionAtMs, setFirstActionAtMs] = useState<number | null>(null)
  const searchRootRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const helpButtonRef = useRef<HTMLButtonElement | null>(null)
  const lastFocusRef = useRef<HTMLElement | null>(null)
  const mobileLastFocusRef = useRef<HTMLElement | null>(null)
  const [globeCanvas, setGlobeCanvas] = useState<HTMLCanvasElement | null>(null)
  const [globeInitError, setGlobeInitError] = useState<string | null>(null)
  const [globeKey, setGlobeKey] = useState(0)
  const inspectedIdsRef = useRef(new Set<string>())

  const [pendingSelectedId, setPendingSelectedId] = useState<string | null>(null)

  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== 'undefined' && 'matchMedia' in window
      ? window.matchMedia('(max-width: 860px)').matches
      : false,
  )
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'filters' | 'inspect'>('none')
  const mobileCloseRef = useRef<HTMLButtonElement | null>(null)

  const recordMeaningfulAction = useCallback(() => {
    setFirstActionAtMs((prev) => prev ?? Date.now())
  }, [])

  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement | null) => {
    setGlobeCanvas(canvas)
    if (canvas) setGlobeInitError(null)
  }, [])

  useEffect(() => {
    const urlState = parseUrlState()
    if (urlState.filters) setFilters(urlState.filters)
    if (urlState.search) setSearchTerm(urlState.search)
    if (urlState.selectedId) setPendingSelectedId(urlState.selectedId)
    if (urlState.time) {
      setTimeState(urlState.time)
    } else if (typeof window !== 'undefined' && 'matchMedia' in window) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setTimeState({ mode: 'paused', pausedAtSec: 0, speed: 1 })
      }
    }
    if (urlState.view) setViewState(urlState.view)
    if (urlState.snapshot) {
      setSnapshotMode(urlState.snapshot.mode)
      setSnapshotWatermark(urlState.snapshot.watermark)
      setSnapshotPreset(urlState.snapshot.preset)
      setExportScale(urlState.snapshot.scale)
    }
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
    if (typeof window === 'undefined' || !('matchMedia' in window)) return
    const query = window.matchMedia('(max-width: 860px)')
    const handleChange = (event: MediaQueryListEvent) => setIsCompact(event.matches)
    setIsCompact(query.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (!isCompact) {
      setMobileDrawer('none')
    }
  }, [isCompact])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (mobileDrawer === 'none') {
      document.body.style.overflow = ''
      mobileLastFocusRef.current?.focus?.()
      mobileLastFocusRef.current = null
      return
    }
    mobileLastFocusRef.current = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => mobileCloseRef.current?.focus(), 0)
    return () => window.clearTimeout(timer)
  }, [mobileDrawer])

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 5000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    timeSecondsRef.current = timeSeconds
  }, [timeSeconds])

  useEffect(() => {
    if (searchTerm.trim()) return
    setIsSearchOpen(false)
    setSearchActiveIndex(-1)
  }, [searchTerm])

  useEffect(
    () => () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setTleStatus('loading')
      setTleMessage(null)
      try {
        const result = await loadTleObjects(filters.catalogGroup, { allowNetwork: isOnline })
        if (cancelled) return
        const invalidCount = result.objects.filter((object) => !isValidTleObject(object)).length
        setInvalidTleCount(invalidCount)
        setTleObjects(result.objects)
        setLastUpdated(result.fetchedAt)
        setTleSourceMode(result.source)
        setTleGroupLoaded(result.group)
        setTleStatus('ready')
        if (result.source === 'stale-cache') {
          setTleMessage('Live fetch failed. Showing stale cached catalog.')
        }
      } catch {
        if (cancelled) return
        setTleStatus('error')
        setTleSourceMode('fallback')
        setTleMessage('Live catalog unavailable. Using cached or demo data.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [filters.catalogGroup, isOnline])

  useEffect(() => {
    if (timeState.mode !== 'live') {
      setTimeSeconds(timeState.pausedAtSec ?? 0)
      return
    }

    let frame = 0
    let last = performance.now()
    const speed = timeState.speed ?? 1

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        last = now
        return
      }

      const dt = Math.min(0.25, (now - last) / 1000)
      last = now
      setTimeSeconds((prev) => prev + dt * speed)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [timeState.mode, timeState.pausedAtSec, timeState.speed])

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
      if (!inspectedIdsRef.current.has(match.id)) {
        inspectedIdsRef.current.add(match.id)
        setInspectedCount(inspectedIdsRef.current.size)
      }
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
    serializeUrlState({
      filters,
      selectedId: selected?.id,
      search: searchTerm,
      view: viewState,
      time: timeState,
      snapshot: {
        mode: snapshotMode,
        watermark: snapshotWatermark,
        preset: snapshotPreset,
        scale: exportScale,
      },
    })
  }, [
    exportScale,
    filters,
    searchTerm,
    selected,
    snapshotMode,
    snapshotPreset,
    snapshotWatermark,
    viewState,
    timeState,
  ])

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

  useEffect(() => {
    if (searchActiveIndex < 0) return
    if (searchActiveIndex < searchResults.length) return
    setSearchActiveIndex(searchResults.length > 0 ? searchResults.length - 1 : -1)
  }, [searchActiveIndex, searchResults.length])

  useEffect(() => {
    if (!isSearchOpen) return
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (!searchRootRef.current) return
      if (searchRootRef.current.contains(target)) return
      setIsSearchOpen(false)
      setSearchActiveIndex(-1)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isSearchOpen])

  const hasFreshness = tleStatus === 'ready'
  const dataAgeSec = hasFreshness ? Math.max(0, Math.floor((nowTick - lastUpdated.getTime()) / 1000)) : 0
  const lastUpdatedLabel = hasFreshness
    ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : 'Unknown'
  const loadedGroupLabel =
    TLE_CATALOG_GROUPS.find((entry) => entry.key === tleGroupLoaded)?.label ?? 'Active'
  const hasLivePayloads = tleObjects.length > 0
  const sourcePrefix =
    tleSourceMode === 'network'
      ? `CelesTrak ${loadedGroupLabel} (live)`
      : tleSourceMode === 'cache'
        ? `CelesTrak ${loadedGroupLabel} (cached)`
        : tleSourceMode === 'stale-cache'
          ? `CelesTrak ${loadedGroupLabel} (stale cache)`
          : 'Synthetic demo catalog'
  const dataSourceLabel =
    hasLivePayloads
      ? filters.dataset === 'payloads'
        ? `${sourcePrefix}${tleStatus === 'loading' ? ' (updating...)' : ''}`
        : `${sourcePrefix} + synthetic non-payloads${tleStatus === 'loading' ? ' (updating...)' : ''}`
      : 'Synthetic demo catalog'
  const dataStatusLabel =
    tleStatus === 'loading'
      ? 'Fetching live TLE...'
      : tleStatus === 'error'
        ? 'Live fetch failed, using cached or demo data.'
        : tleSourceMode === 'network'
          ? 'Live catalog ready.'
          : tleSourceMode === 'cache'
            ? 'Fresh cache loaded.'
            : tleSourceMode === 'stale-cache'
              ? 'Stale cache loaded after live fetch failure.'
              : 'Demo catalog ready.'
  const healthLabel =
    tleStatus === 'loading'
      ? 'Loading live'
      : tleStatus === 'error'
        ? 'Fallback'
        : tleStatus === 'ready'
          ? tleSourceMode === 'network'
            ? 'Live'
            : 'Cached'
          : 'Idle'

  const coverage = useMemo(() => {
    const livePayloads = baseObjects.filter((object) => object.source === 'tle').length
    const syntheticObjects = baseObjects.filter((object) => object.source !== 'tle').length
    const payloads = baseObjects.filter((object) => object.type === 'Payload').length
    const nonPayloads = baseObjects.length - payloads
    const invalidTle = tleStatus === 'ready' ? invalidTleCount : 0
    return { livePayloads, syntheticObjects, payloads, nonPayloads, invalidTle }
  }, [baseObjects, invalidTleCount, tleStatus])

  const recordInspection = useCallback((object: OrbitObject) => {
    if (inspectedIdsRef.current.has(object.id)) return
    inspectedIdsRef.current.add(object.id)
    setInspectedCount(inspectedIdsRef.current.size)
  }, [])

  const handleSelect = (object: OrbitObject | null) => {
    if (object) {
      recordMeaningfulAction()
      recordInspection(object)
    }
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
    recordMeaningfulAction()
    setFilters((prev) => ({ ...prev, altitudeBand: band }))
  }

  const handleConstellationToggle = (constellation: string) => {
    recordMeaningfulAction()
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
    recordMeaningfulAction()
    setFilters((prev) => ({
      ...prev,
      dataset,
      types: dataset === 'payloads' ? new Set<OrbitType>(['Payload']) : new Set(ALL_TYPES),
    }))
  }

  const handleResetFilters = () => {
    recordMeaningfulAction()
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
    recordMeaningfulAction()
    try {
      await navigator.clipboard.writeText(window.location.href)
      const presetLabel =
        snapshotPreset === 'custom'
          ? 'Custom'
          : snapshotPreset === 'presentation'
            ? 'Presentation'
            : snapshotPreset === 'social'
              ? 'Social'
              : 'Report'
      setShareCount((prev) => prev + 1)
      showToast(`Share link copied · Snapshot: ${presetLabel}, ${exportScale}x.`)
    } catch {
      showToast('Copy failed. Use your browser menu to copy the URL.')
    }
  }

  const applyPreset = (preset: 'presentation' | 'social' | 'report') => {
    setSnapshotPreset(preset)
    if (preset === 'presentation') {
      setSnapshotMode('globe')
      setSnapshotWatermark(true)
    }
    if (preset === 'social') {
      setSnapshotMode('full')
      setSnapshotWatermark(true)
    }
    if (preset === 'report') {
      setSnapshotMode('globe')
      setSnapshotWatermark(false)
    }
  }

  const handleSnapshotModeChange = (mode: 'globe' | 'full') => {
    setSnapshotMode(mode)
    setSnapshotPreset('custom')
  }

  const handleSnapshotWatermarkChange = (checked: boolean) => {
    setSnapshotWatermark(checked)
    setSnapshotPreset('custom')
  }

  const handleExportScaleChange = (value: number) => {
    setExportScale(value === 2 ? 2 : 1)
    setSnapshotPreset('custom')
  }

  const resetSnapshotSettings = () => {
    setSnapshotPreset('custom')
    setSnapshotMode('globe')
    setSnapshotWatermark(true)
    setExportScale(1)
  }

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

  const handleExport = async () => {
    if (isExporting) return
    recordMeaningfulAction()
    setIsExporting(true)
    if (!globeCanvas) {
      showToast('Globe not ready yet.')
      setIsExporting(false)
      return
    }
    try {
      if (snapshotMode === 'globe') {
        const dataUrl = globeCanvas.toDataURL('image/png')
        const img = new Image()
        img.src = dataUrl
        await new Promise((resolve) => {
          img.onload = resolve
          img.onerror = resolve
        })
        const exportCanvas = document.createElement('canvas')
        exportCanvas.width = Math.round(globeCanvas.width * exportScale)
        exportCanvas.height = Math.round(globeCanvas.height * exportScale)
        const ctx = exportCanvas.getContext('2d')
        if (!ctx) {
          showToast('Snapshot failed. Try again.')
          setIsExporting(false)
          return
        }
        ctx.drawImage(img, 0, 0, exportCanvas.width, exportCanvas.height)
        stampWatermark(exportCanvas)
        const finalUrl = exportCanvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = finalUrl
        link.download = `astraview-${new Date().toISOString().slice(0, 10)}.png`
        link.click()
        setSnapshotCount((prev) => prev + 1)
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
          scale: exportScale * (window.devicePixelRatio || 1),
          logging: false,
        })
        stampWatermark(canvas)
        const dataUrl = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = dataUrl
        link.download = `astraview-full-${new Date().toISOString().slice(0, 10)}.png`
        link.click()
        setSnapshotCount((prev) => prev + 1)
        showToast('Full snapshot saved.')
      }
    } catch {
      showToast('Snapshot failed. Try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopySnapshot = async () => {
    if (isExporting) return
    recordMeaningfulAction()
    if (!globeCanvas) {
      showToast('Globe not ready yet.')
      return
    }
    if (!navigator.clipboard || !('write' in navigator.clipboard)) {
      showToast('Clipboard images not supported in this browser.')
      return
    }
    setIsExporting(true)
    try {
      let canvas: HTMLCanvasElement
      if (snapshotMode === 'globe') {
        canvas = document.createElement('canvas')
        canvas.width = Math.round(globeCanvas.width * exportScale)
        canvas.height = Math.round(globeCanvas.height * exportScale)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('No canvas context')
        ctx.drawImage(globeCanvas, 0, 0, canvas.width, canvas.height)
      } else {
        const target = document.querySelector<HTMLElement>('.app')
        if (!target) throw new Error('Snapshot target missing')
        const html2canvas = (await import('html2canvas')).default
        canvas = await html2canvas(target, {
          useCORS: true,
          backgroundColor: '#05070f',
          scale: exportScale * (window.devicePixelRatio || 1),
          logging: false,
        })
      }
      stampWatermark(canvas)
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((result) => resolve(result), 'image/png'),
      )
      if (!blob) throw new Error('No blob')
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setSnapshotCount((prev) => prev + 1)
      showToast('Snapshot copied to clipboard.')
    } catch {
      showToast('Copy failed. Try export instead.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleTimeToggle = useCallback(() => {
    recordMeaningfulAction()
    setTimeState((prev) => {
      if (prev.mode === 'live') {
        const nextPaused = Math.min(timeSecondsRef.current, 6000)
        return { mode: 'paused', pausedAtSec: nextPaused, speed: prev.speed ?? 1 }
      }
      return { mode: 'live', speed: prev.speed ?? 1 }
    })
  }, [recordMeaningfulAction])

  const handleNow = () => {
    recordMeaningfulAction()
    setTimeState((prev) => ({ mode: 'live', speed: prev.speed ?? 1 }))
  }

  const handleScrub = (value: number) => {
    recordMeaningfulAction()
    setTimeState((prev) => ({ mode: 'paused', pausedAtSec: value, speed: prev.speed ?? 1 }))
  }

  const handleSpeedChange = (value: number) => {
    recordMeaningfulAction()
    setTimeState((prev) => ({ ...prev, speed: value }))
  }

  const handleHover = (object: OrbitObject | null, screen: { x: number; y: number } | null) => {
    setHovered(object)
    setHoverPosition(screen)
  }

  const handleSearchSelect = (object: OrbitObject) => {
    recordMeaningfulAction()
    recordInspection(object)
    setSelected(object)
    setFocusObject(object)
    setIsSearchOpen(false)
    setSearchActiveIndex(-1)
  }

  const handleResetView = useCallback(() => {
    recordMeaningfulAction()
    setGlobeCommand('reset')
  }, [recordMeaningfulAction])
  const handleFocusEarth = useCallback(() => {
    recordMeaningfulAction()
    setGlobeCommand('earth')
  }, [recordMeaningfulAction])
  const handlePausePlay = useCallback(() => {
    handleTimeToggle()
  }, [handleTimeToggle])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }
      if (mobileDrawer !== 'none') {
        if (event.key === 'Escape') {
          setMobileDrawer('none')
        }
        return
      }
      if (showShortcuts) {
        if (event.key === 'Escape') {
          setShowShortcuts(false)
        }
        return
      }
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        setShowShortcuts((prev) => !prev)
        return
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
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleFocusEarth, handlePausePlay, handleResetView, mobileDrawer, showShortcuts])

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
    recordMeaningfulAction()
    if (!isOnline) {
      showToast('Offline. Connect to refresh live catalog.')
      return
    }
    setTleStatus('loading')
    setTleMessage(null)
    try {
      const result = await refreshTleObjects(filters.catalogGroup)
      const invalidCount = result.objects.filter((object) => !isValidTleObject(object)).length
      setInvalidTleCount(invalidCount)
      setTleObjects(result.objects)
      setLastUpdated(result.fetchedAt)
      setTleSourceMode(result.source)
      setTleGroupLoaded(result.group)
      setTleStatus('ready')
      if (result.source === 'stale-cache') {
        setTleMessage('Refresh failed. Showing stale cached catalog.')
        showToast('Live refresh failed. Showing stale cached data.')
      } else {
        showToast(
          invalidCount > 0
            ? `Live catalog refreshed. ${invalidCount} TLEs skipped.`
            : 'Live catalog refreshed.',
        )
      }
    } catch {
      setTleStatus('error')
      setTleSourceMode('fallback')
      setTleMessage('Refresh failed. Using cached or demo data.')
      showToast('Refresh failed. Using cached data.')
    }
  }

  return (
    <div
      className={`app ${isCompact ? 'compact' : ''} ${
        mobileDrawer === 'filters' ? 'drawer-filters' : mobileDrawer === 'inspect' ? 'drawer-inspect' : ''
      }`}
    >
      <div className={`toast ${toast ? 'show' : ''}`}>{toast ?? ''}</div>
      {showShortcuts && (
        <div
          className="shortcut-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowShortcuts(false)
            }
          }}
        >
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
          <div
            className="search-field"
            ref={searchRootRef}
            onBlurCapture={(event) => {
              const next = event.relatedTarget as Node | null
              if (!next) {
                setIsSearchOpen(false)
                setSearchActiveIndex(-1)
                return
              }
              if (searchRootRef.current?.contains(next)) return
              setIsSearchOpen(false)
              setSearchActiveIndex(-1)
            }}
          >
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search satellites, NORAD ID, constellation"
              value={searchTerm}
              onChange={(event) => {
                const next = event.target.value
                if (next.trim()) recordMeaningfulAction()
                setSearchTerm(next)
                setIsSearchOpen(Boolean(next.trim()))
              }}
              onFocus={() => {
                if (!searchTerm.trim()) return
                setIsSearchOpen(true)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  if (isSearchOpen) {
                    event.preventDefault()
                    setIsSearchOpen(false)
                    setSearchActiveIndex(-1)
                  }
                  return
                }
                if (event.key === 'ArrowDown') {
                  if (!searchTerm.trim() || searchResults.length === 0) return
                  event.preventDefault()
                  setIsSearchOpen(true)
                  setSearchActiveIndex((prev) => {
                    if (prev < 0) return 0
                    return Math.min(searchResults.length - 1, prev + 1)
                  })
                  return
                }
                if (event.key === 'ArrowUp') {
                  if (!searchTerm.trim() || searchResults.length === 0) return
                  event.preventDefault()
                  setIsSearchOpen(true)
                  setSearchActiveIndex((prev) => {
                    if (prev < 0) return searchResults.length - 1
                    return Math.max(0, prev - 1)
                  })
                  return
                }
                if (event.key === 'Enter') {
                  if (!isSearchOpen) return
                  if (searchActiveIndex < 0) return
                  const selectedResult = searchResults[searchActiveIndex]
                  if (!selectedResult) return
                  event.preventDefault()
                  handleSearchSelect(selectedResult)
                }
              }}
              role="combobox"
              aria-expanded={
                isSearchOpen &&
                (searchResults.length > 0 || (Boolean(searchTerm.trim()) && filteredObjects.length === 0))
              }
              aria-controls={isSearchOpen ? 'search-listbox' : undefined}
              aria-autocomplete="list"
              aria-activedescendant={
                searchActiveIndex >= 0 && searchResults[searchActiveIndex]
                  ? `search-option-${searchResults[searchActiveIndex].id}`
                  : undefined
              }
              aria-label="Search satellites"
            />
            {isSearchOpen && searchResults.length > 0 && (
              <div className="search-results">
                <div className="search-meta">
                  Top matches · {formatNumber(filteredObjects.length)} total
                </div>
                <div className="search-list" id="search-listbox" role="listbox">
                  {searchResults.map((object, index) => (
                    <div
                      key={object.id}
                      id={`search-option-${object.id}`}
                      role="option"
                      aria-selected={index === searchActiveIndex}
                      className={`search-item ${index === searchActiveIndex ? 'active' : ''}`}
                      onMouseEnter={() => setSearchActiveIndex(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSearchSelect(object)}
                    >
                      <span>{object.name}</span>
                      <span className="search-item-meta">
                        NORAD {object.noradId} · {object.regime} · {object.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {isSearchOpen && searchTerm.trim() && filteredObjects.length === 0 && (
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
            {healthLabel}
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
          {isCompact && (
            <div className="mobile-panel-header">
              <div className="mobile-panel-title">Filters & Trust</div>
              <button
                type="button"
                className="ghost"
                onClick={() => setMobileDrawer('none')}
                ref={mobileDrawer === 'filters' ? mobileCloseRef : undefined}
              >
                Close
              </button>
            </div>
          )}
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
                    onClick={() => {
                      recordMeaningfulAction()
                      setFilters((prev) => ({
                        ...prev,
                        regimes: toggleFilter(prev.regimes, regime, ALL_REGIMES),
                      }))
                    }}
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
                    onClick={() => {
                      recordMeaningfulAction()
                      setFilters((prev) => ({
                        ...prev,
                        types: toggleFilter(prev.types, type, ALL_TYPES),
                      }))
                    }}
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
                    onClick={() => {
                      recordMeaningfulAction()
                      setFilters((prev) => ({ ...prev, performance: mode }))
                    }}
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
                <label className="trust-row" htmlFor="catalog-group">
                  <span>Catalog</span>
                  <select
                    id="catalog-group"
                    value={filters.catalogGroup}
                    onChange={(event) => {
                      const next = event.target.value as TleCatalogGroup
                      recordMeaningfulAction()
                      setFilters((prev) => ({ ...prev, catalogGroup: next }))
                      showToast(
                        `Catalog: ${TLE_CATALOG_GROUPS.find((entry) => entry.key === next)?.label ?? 'Active'}`,
                      )
                    }}
                    disabled={tleStatus === 'loading'}
                  >
                    {TLE_CATALOG_GROUPS.map((entry) => (
                      <option key={entry.key} value={entry.key}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
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
              key={globeKey}
              objects={displayObjects}
              timeSeconds={timeSeconds}
              animateTime={timeState.mode === 'live'}
              selectedId={selected?.id}
              onHover={handleHover}
              onSelect={handleSelect}
              onViewChange={(view) => setViewState(view)}
              focusObject={focusObject}
              initialView={viewState}
              pointSize={densityStep > 2 ? pointSize * 0.8 : densityStep > 1 ? pointSize * 0.9 : pointSize}
              externalCommand={globeCommand}
              onCommandHandled={() => setGlobeCommand(null)}
              onCanvasReady={handleCanvasReady}
              onInitError={(message) => setGlobeInitError(message)}
            />
          </Suspense>
          {globeInitError && (
            <div className="globe-fallback" role="alert">
              <div className="globe-fallback-title">3D globe unavailable</div>
              <div className="globe-fallback-body">
                WebGL is required to render AstraView. {globeInitError}
              </div>
              <div className="globe-fallback-body">
                Try enabling hardware acceleration, updating your browser, or switching browsers.
              </div>
              <div className="globe-fallback-actions">
                <a href="https://get.webgl.org/" target="_blank" rel="noreferrer">
                  Test WebGL
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setGlobeInitError(null)
                    setGlobeKey((prev) => prev + 1)
                  }}
                >
                  Retry
                </button>
                <button type="button" className="ghost" onClick={() => window.location.reload()}>
                  Reload
                </button>
              </div>
            </div>
          )}
          {isLoading && !globeInitError && (
            <div className="loading">
              <div className="loading-title">Initializing live orbits</div>
              <div className="loading-subtitle">Rendering globe and motion paths...</div>
            </div>
          )}
          {!globeInitError && hovered && hoverPosition && (
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
          {!globeInitError && (
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
          )}
        </section>

        <aside className="panel right">
          {isCompact && (
            <div className="mobile-panel-header">
              <div className="mobile-panel-title">Inspect & Share</div>
              <button
                type="button"
                className="ghost"
                onClick={() => setMobileDrawer('none')}
                ref={mobileDrawer === 'inspect' ? mobileCloseRef : undefined}
              >
                Close
              </button>
            </div>
          )}
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
            <p>Copy a link that recreates your filters, camera, selection, and snapshot settings.</p>
            <button onClick={shareLink} type="button" disabled={isExporting}>
              Copy permalink
            </button>
            <div className="snapshot-toggle">
              <span>Snapshot</span>
              <div className="preset-row">
                <label htmlFor="snapshot-preset">Preset</label>
                <select
                  id="snapshot-preset"
                  value={snapshotPreset}
                  onChange={(event) => {
                    const value = event.target.value as typeof snapshotPreset
                    if (value === 'custom') {
                      setSnapshotPreset('custom')
                    } else {
                      applyPreset(value)
                    }
                  }}
                  disabled={isExporting}
                >
                  <option value="custom">Custom</option>
                  <option value="presentation">Presentation</option>
                  <option value="social">Social</option>
                  <option value="report">Report</option>
                </select>
              </div>
              <div className="preset-hint">
                Presentation: globe + watermark · Social: full UI + watermark · Report: globe only
              </div>
              <div className="preset-row">
                <label htmlFor="snapshot-scale">Scale</label>
                <div className="scale-row">
                  <select
                    id="snapshot-scale"
                    value={exportScale}
                    onChange={(event) => handleExportScaleChange(Number(event.target.value))}
                    disabled={isExporting}
                  >
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                  </select>
                  <span className="scale-tip" title="2x captures are sharper but may be slower on large screens.">
                    i
                  </span>
                </div>
              </div>
              <div className="chips">
                <button
                  type="button"
                  className={`chip ${snapshotMode === 'globe' ? 'active' : ''}`}
                  onClick={() => handleSnapshotModeChange('globe')}
                  disabled={isExporting}
                >
                  Globe only
                </button>
                <button
                  type="button"
                  className={`chip ${snapshotMode === 'full' ? 'active' : ''}`}
                  onClick={() => handleSnapshotModeChange('full')}
                  disabled={isExporting}
                >
                  Full UI
                </button>
              </div>
              <label className="watermark-toggle">
                <input
                  type="checkbox"
                  checked={snapshotWatermark}
                  onChange={(event) => handleSnapshotWatermarkChange(event.target.checked)}
                  disabled={isExporting}
                />
                Include watermark
              </label>
              <button
                type="button"
                className="ghost"
                onClick={resetSnapshotSettings}
                disabled={isExporting}
              >
                Reset snapshot
              </button>
            </div>
            <button className="ghost" onClick={handleExport} type="button" disabled={isExporting}>
              {isExporting ? 'Exporting...' : 'Export PNG'}
            </button>
            <button className="ghost" onClick={handleCopySnapshot} type="button" disabled={isExporting}>
              Copy PNG
            </button>
            {isExporting && <div className="export-status">Export in progress...</div>}
          </section>
          <section className="summary">
            <div className="section-title">Session Signals</div>
            <ul>
              <li>
                Time to first action:{' '}
                {firstActionAtMs
                  ? `${Math.max(0, Math.floor((firstActionAtMs - sessionStartMsRef.current) / 1000))}s`
                  : 'Pending'}
              </li>
              <li>Objects inspected: {inspectedCount}</li>
              <li>Share links copied: {shareCount}</li>
              <li>Snapshots saved/copied: {snapshotCount}</li>
              <li>Filters active: {getActiveFiltersCount(filters)}</li>
            </ul>
          </section>
        </aside>
      </main>

      {isCompact && (
        <>
          <div className="mobile-dock" role="navigation" aria-label="Panels">
            <button
              type="button"
              className={`dock-button ${mobileDrawer === 'filters' ? 'active' : ''}`}
              onClick={() => setMobileDrawer((prev) => (prev === 'filters' ? 'none' : 'filters'))}
            >
              Filters
              {getActiveFiltersCount(filters) > 0 && (
                <span className="dock-badge">{getActiveFiltersCount(filters)}</span>
              )}
            </button>
            <button
              type="button"
              className={`dock-button ${mobileDrawer === 'inspect' ? 'active' : ''}`}
              onClick={() => setMobileDrawer((prev) => (prev === 'inspect' ? 'none' : 'inspect'))}
            >
              Inspect
              {selected && <span className="dock-badge">1</span>}
            </button>
          </div>
          {mobileDrawer !== 'none' && (
            <div
              className="mobile-drawer-overlay"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setMobileDrawer('none')
                }
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

export default App
