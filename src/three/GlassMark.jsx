import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshTransmissionMaterial, useFBO } from '@react-three/drei'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

// The hero object: the three shapes of the Senara mark (navy arch, terracotta
// cradle, terracotta disc) extruded into thick refractive glass.
//
// The canvas is a fixed, transparent, full-viewport layer. Everything is a
// function of `motion.p`, the scroll progress Hero.jsx writes each frame:
//   p = 0  glass mark floating in the hero, tilting toward the cursor
//   p = 1  shrunk and parked exactly over the flat mark in the brand bar,
//          material scrubbed from glass to flat brand colour
// On load each piece also drifts in from an offset and settles.

const SVG_HEIGHT = 240 // viewBox of senara-mark.svg is 202 x 240
const MARK_URL = `${import.meta.env.BASE_URL}logo/senara-mark.svg`
const CREAM = '#fdf6e7'

// Per-piece entrance offsets (SVG units), rotations, delays, glass tint and
// flat brand colour. `z` lifts the cradle and disc in front of the arch so the
// pieces layer like the flat logo instead of intersecting.
const PIECES = [
  { from: [-95, 80, -40], rot: [0.5, -0.8, 0.3], delay: 0.0, tint: '#b9c3d4', atten: '#243247', dist: 0.22, flat: '#243247', z: 0 },
  { from: [85, -75, 25], rot: [-0.6, 0.7, -0.4], delay: 0.18, tint: '#edb08f', atten: '#b85a33', dist: 0.3, flat: '#c6643b', z: 26 },
  { from: [40, 105, 65], rot: [0.9, 0.2, 0.8], delay: 0.36, tint: '#edb08f', atten: '#b85a33', dist: 0.3, flat: '#c6643b', z: 52 },
]

// Hero rest pose: a slight three-quarter view so bevels catch light.
const REST = { x: -0.12, y: 0.3 }

// Glass → flat happens in this window of p; the flat SVG fades in over the
// last stretch so the hand-off is invisible.
const MATERIAL_FADE = [0.68, 0.94]
// Crossfade at the dock: the crisp flat SVG fades in underneath first, then
// the (lower-resolution) WebGL layer fades out over it. No hard swap.
const SVG_FADE = [0.76, 0.92]
const LAYER_FADE = [0.86, 1]

// The mark eases toward the scroll position instead of being locked to it.
// iOS Safari draws WebGL at 60 Hz while ProMotion scrolls the page at 120 Hz;
// a hard lock makes the mark visibly step against the text. Higher = tighter.
const FOLLOW = 10

// Phones and tablets: no hover, coarse pointer, or a narrow screen. They get a
// lighter render (fewer pixels, samples and vertices) and no pointer tilt.
const TOUCH =
  typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches
const COMPACT = TOUCH || (typeof window !== 'undefined' && window.innerWidth < 900)
const QUALITY = COMPACT
  ? { dpr: 1, buffer: 256, samples: 3, curve: 28, bevel: 4, aberration: 0.03, blur: 0.1 }
  : { dpr: 1.25, buffer: 512, samples: 4, curve: 56, bevel: 8, aberration: 0.06, blur: 0.2 }

const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const range = (v, [a, b]) => clamp01((v - a) / (b - a))

function useMarkGeometries() {
  const [geos, setGeos] = useState(null)
  useEffect(() => {
    let cancelled = false
    new SVGLoader().load(MARK_URL, (data) => {
      if (cancelled) return
      const markBox = new THREE.Box3()
      const centers = []
      const built = data.paths.map((path) => {
        const shapes = path.toShapes(true)
        const b = new THREE.Box3()
        shapes.forEach((s) => s.getPoints(24).forEach((p) => b.expandByPoint(new THREE.Vector3(p.x, p.y, 0))))
        centers.push(b.getCenter(new THREE.Vector3()))
        markBox.union(b)
        const geo = new THREE.ExtrudeGeometry(shapes, {
          depth: 40,
          bevelEnabled: true,
          bevelThickness: 10,
          bevelSize: 8,
          bevelSegments: QUALITY.bevel,
          curveSegments: QUALITY.curve,
        })
        geo.center()
        return geo
      })
      // Re-centre each piece on the whole mark so the composition is kept, and
      // push the front pieces toward the camera (the group is flipped about X,
      // so -z here ends up facing the viewer).
      const markCenter = markBox.getCenter(new THREE.Vector3())
      built.forEach((g, i) => g.translate(centers[i].x - markCenter.x, centers[i].y - markCenter.y, -PIECES[i].z))
      setGeos(built)
    })
    return () => {
      cancelled = true
    }
  }, [])
  return geos
}

// Hero pose: how far right the mark sits (0 on tall viewports, 1 on wide) and
// how big it is. Size is capped by both viewport height and width, so on a
// phone it fits comfortably above the headline instead of overflowing.
const SVG_WIDTH = 202
function heroPose(viewport) {
  const aspect = viewport.width / viewport.height
  const wide = clamp01((aspect - 0.9) / 0.5)
  const maxH = viewport.height * (0.62 - 0.3 * (1 - wide)) // 62% wide, 32% tall
  const maxW = viewport.width * (0.4 + 0.12 * (1 - wide)) // 40% wide, 52% tall
  return {
    x: viewport.width * 0.21 * wide,
    y: viewport.height * 0.15 * (1 - wide),
    scale: Math.min(maxH / SVG_HEIGHT, maxW / SVG_WIDTH),
  }
}

function Scene({ motion, reducedMotion }) {
  const geos = useMarkGeometries()
  const rig = useRef()
  const backdrop = useRef()
  const pieces = useRef([])
  const materials = useRef([])
  const start = useRef(null)
  const { viewport, size, camera } = useThree()
  const hero = useMemo(() => heroPose(viewport), [viewport])

  // One shared transmission buffer for all three pieces. Left to itself,
  // MeshTransmissionMaterial re-renders the scene once per mesh per frame.
  const buffer = useFBO(QUALITY.buffer, QUALITY.buffer, { type: THREE.HalfFloatType })
  // The backdrop and camera never move, so the refraction source only needs
  // rendering when the viewport changes, not every frame.
  const bufferDirty = useRef(true)
  useEffect(() => {
    bufferDirty.current = true
  }, [viewport.width, viewport.height])

  // Scratch objects, allocated once.
  const tmp = useMemo(
    () => ({
      qRest: new THREE.Quaternion(),
      qDock: new THREE.Quaternion(),
      euler: new THREE.Euler(),
      aim: new THREE.Object3D(),
      color: new THREE.Color(),
      tints: PIECES.map((p) => new THREE.Color(p.tint)),
      flats: PIECES.map((p) => new THREE.Color(p.flat)),
      black: new THREE.Color('#000000'),
    }),
    [],
  )

  useFrame((state, delta) => {
    if (!rig.current) return
    const t = state.clock.getElapsedTime()
    if (start.current === null) start.current = t
    const elapsed = t - start.current

    // Scroll progress, read on the render frame, then eased (frame-rate
    // independent) so motion stays continuous at whatever rate frames land.
    const m = motion.current
    const target = m.flight > 0 ? clamp01(window.scrollY / m.flight) : m.p
    if (!m.ready || reducedMotion) m.smooth = target
    else m.smooth = THREE.MathUtils.damp(m.smooth, target, FOLLOW, Math.min(delta, 1 / 30))
    if (Math.abs(m.smooth - target) < 0.0005) m.smooth = target
    m.ready = true
    const p = m.smooth

    // Hand-off: the flat mark fades in under the arriving glass, then takes over.
    if (m.slot) m.slot.style.opacity = range(p, SVG_FADE)
    if (m.layer) m.layer.style.opacity = 1 - range(p, LAYER_FADE)
    if (p >= 1 && target >= 1) m.onDock?.()
    const e = easeInOutCubic(p)
    const live = 1 - e // how much "hero" behaviour is still in play

    // Settle on load: whole mark eases from a strong tilt to its rest pose.
    const settle = reducedMotion ? 1 : easeOutExpo(clamp01(elapsed / 2.4))

    // --- pose: hero -------------------------------------------------------
    const tilt = reducedMotion || TOUCH ? 0 : 1
    const px = state.pointer.x * tilt
    const py = state.pointer.y * tilt
    const float = reducedMotion ? 0 : 1
    const heroRotX = (1 - settle) * 0.9 + REST.x - py * 0.2 + Math.sin(t * 0.45) * 0.03 * float
    const heroRotY = (1 - settle) * -1.3 + REST.y + px * 0.3 + Math.cos(t * 0.35) * 0.03 * float
    const heroX = hero.x
    const heroY = hero.y + Math.sin(t * 0.6) * 0.003 * viewport.height * float

    // --- pose: dock (brand-bar mark slot, measured in CSS px by Hero.jsx) --
    const d = motion.current.dock
    const dockX = (d.cx / size.width - 0.5) * viewport.width
    const dockY = (0.5 - d.cy / size.height) * viewport.height
    // Extrusion bevels add ~8 units each side, so scale slightly under the SVG.
    const dockScale = ((d.h / size.height) * viewport.height * 0.93) / SVG_HEIGHT

    // --- blend ------------------------------------------------------------
    // Straight-line lerp with a gentle upward arc so the mark lifts out of
    // the headline rather than cutting through it.
    const arc = Math.sin(Math.PI * e) * viewport.height * 0.12
    rig.current.position.set(
      THREE.MathUtils.lerp(heroX, dockX, e),
      THREE.MathUtils.lerp(heroY, dockY, e) + arc,
      0,
    )
    rig.current.scale.setScalar(THREE.MathUtils.lerp(hero.scale, dockScale, e))

    tmp.qRest.setFromEuler(tmp.euler.set(heroRotX * live, heroRotY * live, 0))
    // Face the camera at the dock so the off-axis perspective reads flat.
    tmp.aim.position.copy(rig.current.position)
    tmp.aim.lookAt(camera.position)
    tmp.qDock.copy(tmp.aim.quaternion)
    rig.current.quaternion.slerpQuaternions(tmp.qRest, tmp.qDock, e)

    // Entrance drift, suppressed once the mark is on its way to the dock.
    pieces.current.forEach((m, i) => {
      if (!m) return
      const pc = PIECES[i]
      const k = reducedMotion ? 1 : easeOutExpo(clamp01((elapsed - pc.delay) / 2.0))
      const off = (1 - k) * live
      m.position.set(pc.from[0] * off, pc.from[1] * off, pc.from[2] * off)
      m.rotation.set(pc.rot[0] * off, pc.rot[1] * off, pc.rot[2] * off)
      m.scale.setScalar(1 - 0.4 * off)
    })

    // Material: glass → unlit flat brand colour.
    const f = range(p, MATERIAL_FADE)
    materials.current.forEach((mat, i) => {
      if (!mat) return
      mat.uniforms._transmission.value = 1 - f
      mat.roughness = 0.05 + 0.9 * f
      mat.clearcoat = 1 - f
      mat.iridescence = 0.25 * (1 - f)
      mat.envMapIntensity = 1.2 * (1 - f)
      // With no lights and envMapIntensity → 0, `color` stops contributing
      // and the unlit emissive brand colour is all that remains.
      mat.color.lerpColors(tmp.tints[i], tmp.flats[i], f)
      mat.emissive.lerpColors(tmp.black, tmp.flats[i], f)
    })

    // Refraction source: backdrop only, rendered into the shared buffer when
    // the viewport changes. The main pass draws just the glass, transparently.
    if (backdrop.current && bufferDirty.current) {
      bufferDirty.current = false
      backdrop.current.visible = true
      rig.current.visible = false
      // Clear to opaque cream, not the canvas's transparent black: the glass
      // samples this buffer wherever it travels, including past the backdrop
      // plane's edges on the way to the dock.
      state.gl.getClearColor(tmp.color)
      const alpha = state.gl.getClearAlpha()
      state.gl.setRenderTarget(buffer)
      state.gl.setClearColor(CREAM, 1)
      state.gl.clear()
      state.gl.render(state.scene, state.camera)
      state.gl.setRenderTarget(null)
      state.gl.setClearColor(tmp.color, alpha)
      backdrop.current.visible = false
      rig.current.visible = true
    }
  })

  // Soft brand-coloured blooms on cream: what the glass bends. Never drawn
  // directly, only into the refraction buffer.
  const texture = useMemo(() => {
    const sz = 1024
    const c = document.createElement('canvas')
    c.width = c.height = sz
    const ctx = c.getContext('2d')
    ctx.fillStyle = CREAM
    ctx.fillRect(0, 0, sz, sz)
    const bloom = (x, y, r, color) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, color)
      g.addColorStop(1, 'rgba(253,246,231,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, sz, sz)
    }
    bloom(sz * 0.62, sz * 0.42, sz * 0.42, 'rgba(198,100,59,0.55)')
    bloom(sz * 0.38, sz * 0.66, sz * 0.4, 'rgba(36,50,71,0.45)')
    bloom(sz * 0.55, sz * 0.55, sz * 0.18, 'rgba(255,255,255,0.7)')
    const tx = new THREE.CanvasTexture(c)
    tx.colorSpace = THREE.SRGBColorSpace
    return tx
  }, [])

  if (!geos) return null

  return (
    <>
      <mesh ref={backdrop} position={[hero.x, hero.y, -2.5]} scale={[viewport.height * 1.3, viewport.height * 1.3, 1]} visible={false}>
        <planeGeometry />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* The rig is animated; the inner group flips the SVG (y-down) upright. */}
      <group ref={rig}>
        <group rotation={[Math.PI, 0, 0]}>
          {geos.map((geo, i) => (
            <mesh key={i} ref={(el) => (pieces.current[i] = el)} geometry={geo}>
              <MeshTransmissionMaterial
                ref={(el) => (materials.current[i] = el)}
                buffer={buffer.texture}
                transmission={1}
                thickness={1.4}
                roughness={0.05}
                ior={1.5}
                chromaticAberration={QUALITY.aberration}
                anisotropicBlur={QUALITY.blur}
                distortion={0.25}
                distortionScale={0.4}
                temporalDistortion={0.08}
                color={PIECES[i].tint}
                attenuationColor={PIECES[i].atten}
                attenuationDistance={PIECES[i].dist}
                clearcoat={1}
                clearcoatRoughness={0.05}
                iridescence={0.25}
                iridescenceIOR={1.3}
                iridescenceThicknessRange={[120, 420]}
                envMapIntensity={1.2}
                samples={QUALITY.samples}
              />
            </mesh>
          ))}
        </group>
      </group>
    </>
  )
}

export default function GlassMark({ motion, reducedMotion = false, active = true }) {
  // R3F sizes the renderer from react-use-measure, whose ResizeObserver fires
  // once on mount and drops that reading if its own "mounted" flag (set in a
  // passive effect) is not yet true. After this lazily-loaded chunk mounts,
  // passive effects run after paint, so the reading is lost and the canvas
  // stays at its 300x150 default — reliably in production builds. The hook
  // also listens for window resize, and a parent effect runs after the child
  // Canvas's effects, so a synthetic resize from here re-measures safely.
  useEffect(() => {
    const kick = () => window.dispatchEvent(new Event('resize'))
    kick()
    const t = setTimeout(kick, 150)
    return () => clearTimeout(t)
  }, [])

  return (
    <Canvas
      frameloop={active ? 'always' : 'never'} // idle once docked as the flat mark
      // Measure the container synchronously. The default 50 ms debounce let the
      // first measurement be dropped on load, leaving the canvas at 300x150.
      resize={{ scroll: false, debounce: 0 }}
      flat // no tone mapping: flat colours land exactly on brand values
      dpr={[1, QUALITY.dpr]} // transmission cost scales with pixels
      camera={{ position: [0, 0, 7], fov: 32 }}
      gl={{ antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      // The canvas ignores pointer events so the page stays usable; read the
      // cursor from the document instead.
      eventSource={document.body}
      eventPrefix="client"
    >
      <Scene motion={motion} reducedMotion={reducedMotion} />
      <Environment resolution={128} frames={1}>
        {/* Cream dome so reflections never go black at grazing angles. */}
        <mesh scale={60}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#ece2d0" side={THREE.BackSide} />
        </mesh>
        {/* Studio-style softboxes: cream key, cool fill, warm rim, white top. */}
        <Lightformer form="rect" intensity={6} color="#fff7e8" position={[4, 3, 5]} scale={[5, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.5} color="#d9e2f2" position={[-6, 1, 3]} scale={[2, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3} color="#f3c9b3" position={[0, -5, 4]} scale={[8, 1.5, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={4} color="#ffffff" position={[0, 6, 2]} scale={[4, 4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1} color="#ffffff" position={[0, 0, -8]} scale={[12, 12, 1]} />
      </Environment>
    </Canvas>
  )
}
