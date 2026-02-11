import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { OrbitObject, ViewState } from '../types'
import { buildOrbitPath, positionForObject } from '../utils/orbit'

const createStars = () => {
  const geometry = new THREE.BufferGeometry()
  const starCount = 1200
  const positions = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i += 1) {
    const radius = 6 + Math.random() * 12
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.cos(phi)
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    size: 0.02,
    color: new THREE.Color('#d9f1ff'),
    opacity: 0.9,
    transparent: true,
  })
  return new THREE.Points(geometry, material)
}

const createLatLong = () => {
  const group = new THREE.Group()
  const material = new THREE.LineBasicMaterial({ color: new THREE.Color('#1f2c44'), transparent: true, opacity: 0.6 })
  for (let lat = -60; lat <= 60; lat += 30) {
    const radius = Math.cos((lat * Math.PI) / 180)
    const y = Math.sin((lat * Math.PI) / 180)
    const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0)
    const points = curve
      .getPoints(64)
      .map((point: THREE.Vector2) => new THREE.Vector3(point.x, y, point.y))
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    group.add(new THREE.Line(geometry, material))
  }
  for (let lon = 0; lon < 180; lon += 30) {
    const curve = new THREE.EllipseCurve(0, 0, 1, 1, 0, Math.PI * 2, false, 0)
    const points = curve.getPoints(128).map((point: THREE.Vector2) => {
      const theta = (lon * Math.PI) / 180
      return new THREE.Vector3(
        point.x * Math.cos(theta),
        point.y,
        point.x * Math.sin(theta),
      )
    })
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    group.add(new THREE.Line(geometry, material))
  }
  return group
}

const getColor = (object: OrbitObject) => {
  if (object.type === 'Payload') return new THREE.Color('#4ade80')
  if (object.type === 'Rocket Body') return new THREE.Color('#fbbf24')
  return new THREE.Color('#fb7185')
}

type GlobeProps = {
  objects: OrbitObject[]
  timeSeconds: number
  animateTime?: boolean
  timeSpeed?: number
  selectedId?: string | null
  onHover: (object: OrbitObject | null, screen: { x: number; y: number } | null) => void
  onSelect: (object: OrbitObject | null) => void
  onViewChange?: (view: ViewState) => void
  focusObject?: OrbitObject | null
  initialView?: ViewState
  pointSize?: number
  showGroundTrack?: boolean
  externalCommand?: 'reset' | 'earth' | null
  onCommandHandled?: () => void
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
  onInitError?: (message: string) => void
}

const Globe = ({
  objects,
  timeSeconds,
  animateTime = true,
  timeSpeed = 1,
  selectedId,
  onHover,
  onSelect,
  onViewChange,
  focusObject,
  initialView,
  pointSize = 0.02,
  showGroundTrack = false,
  externalCommand,
  onCommandHandled,
  onCanvasReady,
  onInitError,
}: GlobeProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const earthGroupRef = useRef<THREE.Group | null>(null)
  const nightMaterialRef = useRef<THREE.ShaderMaterial | null>(null)
  const terminatorMaterialRef = useRef<THREE.ShaderMaterial | null>(null)
  const cloudsRef = useRef<THREE.Mesh | null>(null)
  const atmosphereRef = useRef<THREE.Mesh | null>(null)
  const pointsRef = useRef<THREE.Points | null>(null)
  const geometryRef = useRef<THREE.BufferGeometry | null>(null)
  const objectsRef = useRef<OrbitObject[]>([])
  const hoverRef = useRef<OrbitObject | null>(null)
  const timeRef = useRef<number>(timeSeconds)
  const timeSpeedRef = useRef<number>(timeSpeed)
  const timeBaseSecRef = useRef<number>(timeSeconds)
  const timeBaseMsRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0)
  const animateTimeRef = useRef<boolean>(animateTime)
  const lastVisualTimeRef = useRef<number>(Number.NaN)
  const orbitLineRef = useRef<THREE.Line | null>(null)
  const trailLineRef = useRef<THREE.Line | null>(null)
  const groundTrackLineRef = useRef<THREE.Line | null>(null)
  const selectedMarkerRef = useRef<THREE.Mesh | null>(null)
  const hoverMarkerRef = useRef<THREE.Mesh | null>(null)
  const updateTimeRef = useRef<number>(0)
  const lastGroundTrackUpdateTimeRef = useRef<number>(Number.NaN)
  const selectedIdRef = useRef<string | null | undefined>(selectedId)
  const lastSelectedIdRef = useRef<string | null | undefined>(selectedId)

  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const pointer = useMemo(() => new THREE.Vector2(), [])
  const onHoverRef = useRef(onHover)
  const onSelectRef = useRef(onSelect)
  const onViewChangeRef = useRef(onViewChange)
  const onCanvasReadyRef = useRef(onCanvasReady)
  const onInitErrorRef = useRef(onInitError)
  const appliedInitialViewRef = useRef(false)

  useEffect(() => {
    onHoverRef.current = onHover
  }, [onHover])

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    onViewChangeRef.current = onViewChange
  }, [onViewChange])

  useEffect(() => {
    onCanvasReadyRef.current = onCanvasReady
  }, [onCanvasReady])

  useEffect(() => {
    onInitErrorRef.current = onInitError
  }, [onInitError])

  useEffect(() => {
    timeRef.current = timeSeconds
    timeBaseSecRef.current = timeSeconds
    timeBaseMsRef.current = typeof performance !== 'undefined' ? performance.now() : 0
  }, [timeSeconds])

  useEffect(() => {
    timeSpeedRef.current = timeSpeed
  }, [timeSpeed])

  useEffect(() => {
    animateTimeRef.current = animateTime
  }, [animateTime])

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  useEffect(() => {
    if (!initialView) return
    if (appliedInitialViewRef.current) return
    if (!cameraRef.current || !controlsRef.current) return
    cameraRef.current.position.set(...initialView.camera)
    controlsRef.current.target.set(...initialView.target)
    controlsRef.current.update()
    appliedInitialViewRef.current = true
  }, [initialView])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer | null = null
    try {
      const probe = document.createElement('canvas')
      const gl = probe.getContext('webgl2') || probe.getContext('webgl')
      if (!gl) {
        throw new Error('WebGL is not available in this browser.')
      }

      const scene = new THREE.Scene()
      scene.fog = new THREE.Fog('#05070f', 6, 16)

      const camera = new THREE.PerspectiveCamera(
        55,
        container.clientWidth / container.clientHeight,
        0.1,
        100,
      )
      camera.position.set(0, 1.6, 3.4)

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      container.appendChild(renderer.domElement)
      onCanvasReadyRef.current?.(renderer.domElement)

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.08
      controls.minDistance = 1.6
      controls.maxDistance = 6
      controls.enablePan = false

      const ambient = new THREE.AmbientLight('#8bb8ff', 0.35)
      const key = new THREE.DirectionalLight('#fef9c3', 1.15)
      key.position.set(5, 2.4, 1.8)
      const rim = new THREE.DirectionalLight('#4fd1c5', 0.6)
      rim.position.set(-4, -2, -1)

      const textureLoader = new THREE.TextureLoader()
      const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
      const dayMap = textureLoader.load('/textures/earth_day_2048.jpg')
      dayMap.colorSpace = THREE.SRGBColorSpace
      dayMap.anisotropy = maxAnisotropy
      const nightMap = textureLoader.load('/textures/earth_night_2048.png')
      nightMap.colorSpace = THREE.SRGBColorSpace
      nightMap.anisotropy = maxAnisotropy
      const normalMap = textureLoader.load('/textures/earth_normal_2048.jpg')
      normalMap.anisotropy = maxAnisotropy
      const cloudsMap = textureLoader.load('/textures/earth_clouds_1024.png')
      cloudsMap.colorSpace = THREE.SRGBColorSpace
      cloudsMap.anisotropy = maxAnisotropy

      const earthGeometry = new THREE.SphereGeometry(1, 64, 64)
      const earthMaterial = new THREE.MeshStandardMaterial({
        color: '#102747',
        map: dayMap,
        normalMap,
        normalScale: new THREE.Vector2(0.35, 0.35),
        emissive: '#0b1b2c',
        metalness: 0.05,
        roughness: 0.85,
      })
      const earth = new THREE.Mesh(earthGeometry, earthMaterial)

    const atmosphereGeometry = new THREE.SphereGeometry(1.05, 64, 64)
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color('#67e8f9') },
        intensity: { value: 0.75 },
        falloff: { value: 2.3 },
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        void main() {
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        uniform vec3 glowColor;
        uniform float intensity;
        uniform float falloff;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float glow = pow(1.0 - dot(normalize(vWorldNormal), viewDir), falloff);
          gl_FragColor = vec4(glowColor, glow * intensity);
        }
      `,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
    })
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial)

    const cloudsGeometry = new THREE.SphereGeometry(1.012, 64, 64)
    const cloudsMaterial = new THREE.MeshStandardMaterial({
      map: cloudsMap,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    })
    const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial)

    const stars = createStars()
    const grid = createLatLong()

    const nightMaterial = new THREE.ShaderMaterial({
      uniforms: {
        lightDir: { value: new THREE.Vector3(1, 0, 0) },
        intensity: { value: 1.1 },
        nightMap: { value: nightMap },
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec2 vUv;
        void main() {
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * vec4((modelMatrix * vec4(position, 1.0)).xyz, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldNormal;
        varying vec2 vUv;
        uniform vec3 lightDir;
        uniform float intensity;
        uniform sampler2D nightMap;

        void main() {
          vec3 normal = normalize(vWorldNormal);
          float nDotL = dot(normal, normalize(lightDir));
          float nightMask = smoothstep(0.05, -0.25, nDotL);
          vec3 nightColor = texture2D(nightMap, vUv).rgb;
          float city = max(max(nightColor.r, nightColor.g), nightColor.b);
          city = smoothstep(0.25, 0.95, city);
          vec3 color = nightColor * city * nightMask * intensity;
          gl_FragColor = vec4(color, nightMask * city);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const terminatorMaterial = new THREE.ShaderMaterial({
      uniforms: {
        lightDir: { value: new THREE.Vector3(1, 0, 0) },
        glowColor: { value: new THREE.Color('#38bdf8') },
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        void main() {
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vWorldNormal;
        uniform vec3 lightDir;
        uniform vec3 glowColor;
        void main() {
          vec3 normal = normalize(vWorldNormal);
          float nDotL = dot(normal, normalize(lightDir));
          float band = smoothstep(-0.02, 0.02, nDotL) * smoothstep(0.18, -0.02, nDotL);
          gl_FragColor = vec4(glowColor, band * 0.6);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const nightSphere = new THREE.Mesh(new THREE.SphereGeometry(1.005, 64, 64), nightMaterial)
    const terminatorSphere = new THREE.Mesh(new THREE.SphereGeometry(1.02, 64, 64), terminatorMaterial)

    const earthGroup = new THREE.Group()
    earthGroup.add(earth, nightSphere, terminatorSphere, clouds, atmosphere, grid)

    const hoverMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#f8fafc' }),
    )
    hoverMarker.visible = false

    const selectedMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#38bdf8' }),
    )
    selectedMarker.visible = false

      scene.add(stars, earthGroup, ambient, key, rim, hoverMarker, selectedMarker)

      sceneRef.current = scene
      cameraRef.current = camera
      rendererRef.current = renderer
      controlsRef.current = controls
      earthGroupRef.current = earthGroup
      nightMaterialRef.current = nightMaterial
      terminatorMaterialRef.current = terminatorMaterial
      cloudsRef.current = clouds
      atmosphereRef.current = atmosphere
      hoverMarkerRef.current = hoverMarker
      selectedMarkerRef.current = selectedMarker

      const handleResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return
        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight
      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(width, height)
    }

    const handlePointerMove = (event: MouseEvent) => {
      if (!rendererRef.current || !cameraRef.current || !pointsRef.current) return
      const rect = rendererRef.current.domElement.getBoundingClientRect()
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(pointer, cameraRef.current)
      raycaster.params.Points.threshold = 0.03
      const intersects = raycaster.intersectObject(pointsRef.current)
      if (intersects.length > 0) {
        const index = intersects[0].index ?? 0
        const object = objectsRef.current[index]
        if (object && hoverRef.current?.id !== object.id) {
          hoverRef.current = object
          onHoverRef.current(object, { x: event.clientX, y: event.clientY })
        }
        if (hoverMarkerRef.current && object) {
          const position = positionForObject(object, timeRef.current)
          if (position) {
            hoverMarkerRef.current.position.copy(position)
            hoverMarkerRef.current.visible = true
          } else {
            hoverMarkerRef.current.visible = false
          }
        }
        rendererRef.current.domElement.style.cursor = 'pointer'
      } else {
        hoverRef.current = null
        onHoverRef.current(null, null)
        if (hoverMarkerRef.current) hoverMarkerRef.current.visible = false
        rendererRef.current.domElement.style.cursor = 'grab'
      }
    }

    const handleClick = () => {
      if (hoverRef.current) {
        onSelectRef.current(hoverRef.current)
      }
    }

    const handleControls = () => {
      if (!cameraRef.current || !controlsRef.current) return
      const cameraPos: [number, number, number] = [
        cameraRef.current.position.x,
        cameraRef.current.position.y,
        cameraRef.current.position.z,
      ]
      const target: [number, number, number] = [
        controlsRef.current.target.x,
        controlsRef.current.target.y,
        controlsRef.current.target.z,
      ]
      const distance = cameraRef.current.position.distanceTo(controlsRef.current.target)
      onViewChangeRef.current?.({ camera: cameraPos, target, distance })
    }

      renderer.domElement.addEventListener('mousemove', handlePointerMove)
      renderer.domElement.addEventListener('click', handleClick)
      controls.addEventListener('change', handleControls)

    let frameId = 0
    const animate = () => {
      frameId = requestAnimationFrame(animate)
      if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !controlsRef.current) return

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }

      const now = performance.now()
      const shouldUpdate = now - updateTimeRef.current > 80
      const timeValue = animateTimeRef.current
        ? timeBaseSecRef.current + ((now - timeBaseMsRef.current) / 1000) * timeSpeedRef.current
        : timeRef.current
      const timeChanged = timeValue !== lastVisualTimeRef.current
      const shouldAdvanceTime = animateTimeRef.current || timeChanged

      if (geometryRef.current && shouldUpdate && shouldAdvanceTime) {
        updateTimeRef.current = now
        const positions = geometryRef.current.attributes.position.array as Float32Array
        objectsRef.current.forEach((object, index) => {
          const position = positionForObject(object, timeValue)
          if (!position) return
          const offset = index * 3
          positions[offset] = position.x
          positions[offset + 1] = position.y
          positions[offset + 2] = position.z
        })
        geometryRef.current.attributes.position.needsUpdate = true
        lastVisualTimeRef.current = timeValue
      }

      if (shouldAdvanceTime) {
        if (earthGroupRef.current) {
          earthGroupRef.current.rotation.y = timeValue * 0.03
        }
        if (cloudsRef.current) {
          cloudsRef.current.rotation.y = timeValue * 0.035
        }
        if (atmosphereRef.current) {
          atmosphereRef.current.rotation.y = timeValue * 0.01
        }
      }

      if (nightMaterialRef.current) {
        nightMaterialRef.current.uniforms.lightDir.value.copy(key.position).normalize()
      }
      if (terminatorMaterialRef.current) {
        terminatorMaterialRef.current.uniforms.lightDir.value.copy(key.position).normalize()
      }

      const selectedIdValue = selectedIdRef.current
      const selectedChanged = selectedIdValue !== lastSelectedIdRef.current
      if (selectedChanged) lastSelectedIdRef.current = selectedIdValue

      if (selectedMarkerRef.current && selectedIdValue && (shouldAdvanceTime || selectedChanged)) {
        const selectedObject = objectsRef.current.find((object) => object.id === selectedIdValue)
        if (selectedObject) {
          const position = positionForObject(selectedObject, timeValue)
          if (position) {
            selectedMarkerRef.current.position.copy(position)
            selectedMarkerRef.current.visible = true
          } else {
            selectedMarkerRef.current.visible = false
          }
        } else {
          selectedMarkerRef.current.visible = false
        }
      } else if (selectedMarkerRef.current && !selectedIdValue && selectedMarkerRef.current.visible) {
        selectedMarkerRef.current.visible = false
      }

      if (trailLineRef.current && selectedIdValue && shouldUpdate && shouldAdvanceTime) {
        const selectedObject = objectsRef.current.find((object) => object.id === selectedIdValue)
        if (selectedObject) {
          const positions = trailLineRef.current.geometry.attributes.position.array as Float32Array
          const segments = positions.length / 3
          const trailSeconds = 1800
          for (let i = 0; i < segments; i += 1) {
            const t = timeValue - (trailSeconds * (segments - 1 - i)) / (segments - 1)
            const pos = positionForObject(selectedObject, t)
            if (!pos) continue
            const offset = i * 3
            positions[offset] = pos.x
            positions[offset + 1] = pos.y
            positions[offset + 2] = pos.z
          }
          trailLineRef.current.geometry.attributes.position.needsUpdate = true
        }
      }

      if (groundTrackLineRef.current && selectedIdValue && shouldUpdate && shouldAdvanceTime) {
        const shouldRefreshTrack =
          selectedChanged ||
          Number.isNaN(lastGroundTrackUpdateTimeRef.current) ||
          Math.abs(timeValue - lastGroundTrackUpdateTimeRef.current) >= 8
        if (shouldRefreshTrack) {
          const selectedObject = objectsRef.current.find((object) => object.id === selectedIdValue)
          if (selectedObject) {
            const positions =
              groundTrackLineRef.current.geometry.attributes.position.array as Float32Array
            const segments = positions.length / 3 - 1
            const orbitalPeriodSec = selectedObject.satrec?.no
              ? ((2 * Math.PI) / selectedObject.satrec.no) * 60
              : Math.max(60, selectedObject.periodMin * 60)
            const trackWindowSec = Math.max(1800, orbitalPeriodSec)
            for (let i = 0; i <= segments; i += 1) {
              const t = timeValue - trackWindowSec * 0.5 + (trackWindowSec * i) / segments
              const groundPoint = positionForObject(selectedObject, t)
              if (!groundPoint) continue
              groundPoint.normalize().multiplyScalar(1.003)
              const offset = i * 3
              positions[offset] = groundPoint.x
              positions[offset + 1] = groundPoint.y
              positions[offset + 2] = groundPoint.z
            }
            groundTrackLineRef.current.geometry.attributes.position.needsUpdate = true
            lastGroundTrackUpdateTimeRef.current = timeValue
          }
        }
      }

      controlsRef.current.update()
      rendererRef.current.render(sceneRef.current, cameraRef.current)
    }

      animate()

      window.addEventListener('resize', handleResize)

      return () => {
        window.removeEventListener('resize', handleResize)
        renderer?.domElement.removeEventListener('mousemove', handlePointerMove)
        renderer?.domElement.removeEventListener('click', handleClick)
        controls.removeEventListener('change', handleControls)
        cancelAnimationFrame(frameId)
        renderer?.dispose()
        if (renderer?.domElement.parentElement === container) {
          container.removeChild(renderer.domElement)
        }
        onCanvasReadyRef.current?.(null)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'WebGL initialization failed.'
      onInitErrorRef.current?.(message)
      onCanvasReadyRef.current?.(null)
      if (renderer) {
        if (renderer.domElement.parentElement === container) {
          container.removeChild(renderer.domElement)
        }
        renderer.dispose()
      }
      return
    }
  }, [pointer, raycaster])

  useEffect(() => {
    objectsRef.current = objects

    if (!sceneRef.current) return
    if (pointsRef.current) {
      sceneRef.current.remove(pointsRef.current)
      pointsRef.current.geometry.dispose()
      ;(pointsRef.current.material as THREE.Material).dispose()
    }

    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(objects.length * 3)
    const colors = new Float32Array(objects.length * 3)

    objects.forEach((object, index) => {
      const offset = index * 3
      const position = positionForObject(object, timeRef.current)
      positions[offset] = position ? position.x : 0
      positions[offset + 1] = position ? position.y : 0
      positions[offset + 2] = position ? position.z : 0
      const color = getColor(object)
      colors[offset] = color.r
      colors[offset + 1] = color.g
      colors[offset + 2] = color.b
    })

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometryRef.current = geometry

    const material = new THREE.PointsMaterial({
      size: pointSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    })

    const points = new THREE.Points(geometry, material)
    pointsRef.current = points
    sceneRef.current.add(points)
  }, [objects, pointSize])

  useEffect(() => {
    if (!sceneRef.current) return
    if (orbitLineRef.current) {
      sceneRef.current.remove(orbitLineRef.current)
      orbitLineRef.current.geometry.dispose()
      ;(orbitLineRef.current.material as THREE.Material).dispose()
    }

    if (trailLineRef.current) {
      sceneRef.current.remove(trailLineRef.current)
      trailLineRef.current.geometry.dispose()
      ;(trailLineRef.current.material as THREE.Material).dispose()
      trailLineRef.current = null
    }

    if (!selectedId) return
    const selectedObject = objectsRef.current.find((object) => object.id === selectedId)
    if (!selectedObject) return
    const points = buildOrbitPath(selectedObject, 180)
    if (points.length < 2) return
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.7 })
    const line = new THREE.LineLoop(geometry, material)
    orbitLineRef.current = line
    sceneRef.current.add(line)

    const trailSegments = 90
    const trailPositions = new Float32Array(trailSegments * 3)
    const trailGeometry = new THREE.BufferGeometry()
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3))
    const trailMaterial = new THREE.LineBasicMaterial({ color: '#fbbf24', transparent: true, opacity: 0.45 })
    const trailLine = new THREE.Line(trailGeometry, trailMaterial)
    trailLineRef.current = trailLine
    sceneRef.current.add(trailLine)
  }, [selectedId])

  useEffect(() => {
    if (!sceneRef.current) return
    if (groundTrackLineRef.current) {
      sceneRef.current.remove(groundTrackLineRef.current)
      groundTrackLineRef.current.geometry.dispose()
      ;(groundTrackLineRef.current.material as THREE.Material).dispose()
      groundTrackLineRef.current = null
    }

    lastGroundTrackUpdateTimeRef.current = Number.NaN
    if (!showGroundTrack || !selectedId) return

    const segments = 180
    const positions = new Float32Array((segments + 1) * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.LineBasicMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0.55,
    })
    const line = new THREE.Line(geometry, material)
    groundTrackLineRef.current = line
    sceneRef.current.add(line)
  }, [selectedId, showGroundTrack])

  useEffect(() => {
    if (!focusObject || !cameraRef.current || !controlsRef.current) return
    const target = positionForObject(focusObject, timeRef.current)
    if (!target) return
    const camera = cameraRef.current
    const controls = controlsRef.current
    const direction = camera.position.clone().sub(controls.target).normalize()
    const distance = camera.position.distanceTo(controls.target)
    controls.target.copy(target)
    camera.position.copy(target.clone().add(direction.multiplyScalar(distance)))
    controls.update()
  }, [focusObject])

  useEffect(() => {
    if (!externalCommand || !cameraRef.current || !controlsRef.current) return
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (externalCommand === 'reset') {
      camera.position.set(0, 1.6, 3.4)
      controls.target.set(0, 0, 0)
      controls.update()
    }
    if (externalCommand === 'earth') {
      const target = new THREE.Vector3(0, 0, 0)
      const direction = camera.position.clone().sub(controls.target).normalize()
      const distance = camera.position.distanceTo(controls.target)
      controls.target.copy(target)
      camera.position.copy(target.clone().add(direction.multiplyScalar(distance)))
      controls.update()
    }
    onCommandHandled?.()
  }, [externalCommand, onCommandHandled])

  return <div className="globe" ref={containerRef} />
}

export default Globe
