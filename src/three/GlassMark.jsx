import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js'

// The hero object: the three shapes of the Senara mark (navy arch, terracotta
// cradle, terracotta disc) in 3D, styled to match brand/linkedin-banner.svg:
// diagonal brand gradients, a white sheen along the top-left edges, a domed
// disc with a soft highlight, and a soft drop shadow. A custom unlit shader
// reproduces the banner's exact colour stops, so no lights or environment.
//
// The canvas is a fixed, transparent, full-viewport layer. Everything is a
// function of eased scroll progress p:
//   p = 0  mark floating in the hero, tilting toward the cursor
//   p = 1  shrunk and parked exactly over the flat mark in the brand bar,
//          shading scrubbed to the flat brand colours
// On load each piece also drifts in from an offset and settles. The banner's
// ripples and blooms are a DOM layer behind the page text (Hero.jsx), which
// this component positions on the disc each frame.

const SVG_WIDTH = 202 // viewBox of senara-mark.svg is 202 x 240
const SVG_HEIGHT = 240
const MARK_URL = `${import.meta.env.BASE_URL}logo/senara-mark.svg`
const DISC = { cx: 142.79, cy: 148.14, r: 36.42 }

// Banner gradient stops (sRGB, interpolated in sRGB like SVG).
const rgb = (hex) => new THREE.Vector3(...[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255))
const PIECES = [
  {
    // archG: x1 0 y1 0 → x2 1 y2 1
    stops: ['#5b6b86', '#2d3d56', '#243247'], mid: 0.55, start: [0, 0], dir: [1, 1],
    flat: '#243247', from: [-95, 80, -40], rot: [0.5, -0.8, 0.3], delay: 0.0, z: 0,
  },
  {
    // terraG: x1 .1 y1 0 → x2 .9 y2 1
    stops: ['#eba783', '#d27448', '#b9572f'], mid: 0.5, start: [0.1, 0], dir: [0.8, 1],
    flat: '#c6643b', from: [85, -75, 25], rot: [-0.6, 0.7, -0.4], delay: 0.18, z: 26,
  },
  {
    // discG: radial, centre (.36, .32), r .75
    stops: ['#f6c3a5', '#dd8358', '#bd5a31'], mid: 0.45, start: [0, 0], dir: [1, 1],
    flat: '#c6643b', from: [40, 105, 65], rot: [0.9, 0.2, 0.8], delay: 0.36, z: 52,
  },
]

// Hero rest pose: close to the banner's front-on view, with just enough angle
// that the extrusion reads as 3D.
const REST = { x: -0.06, y: 0.16 }

// Idle drift: layered, out-of-phase sines so the motion never visibly loops.
// DRIFT_AMOUNT scales all of it (1 = the full ranges below; 0 = still).
const DRIFT_AMOUNT = 0.45
// Rotation in radians; per-piece drift in SVG units (crescent and head bob a
// little on their own, the arch is the anchor).
const wave = (t, a) => a.reduce((sum, [amp, freq, phase]) => sum + amp * Math.sin(t * freq + phase), 0)
const DRIFT = {
  rotX: [[0.09, 0.37, 0], [0.03, 0.91, 1.3]],
  rotY: [[0.15, 0.29, 0.7], [0.04, 0.73, 2.1]],
  rotZ: [[0.045, 0.23, 0.4], [0.015, 0.61, 2.7]],
  posX: [[0.009, 0.31, 1.1]], // fraction of viewport width
  posY: [[0.016, 0.5, 0], [0.005, 1.13, 0.9]], // fraction of viewport height
  pieces: [
    null,
    { x: [[3, 0.6, 0.3]], y: [[2.5, 0.5, 1.7]], z: [[4, 0.4, 0.9]] },
    { x: [[4, 0.8, 1.0]], y: [[3.5, 0.7, 0.2]], z: [[6, 0.55, 2.4]] },
  ],
}

// Shading → flat brand colours over this window of p; then the crisp SVG fades
// in underneath and the WebGL layer fades out over it. No hard swap.
const MATERIAL_FADE = [0.68, 0.94]
const SVG_FADE = [0.76, 0.92]
const LAYER_FADE = [0.86, 1]
// Ripples and blooms leave early, before the mark crosses the headline.
const RIPPLE_FADE = [0.02, 0.35]

// The mark eases toward the scroll position instead of being locked to it.
// iOS Safari draws WebGL at 60 Hz while ProMotion scrolls the page at 120 Hz;
// a hard lock makes the mark visibly step against the text. Higher = tighter.
const FOLLOW = 10

// Phones and tablets: no hover or a coarse pointer. No pointer tilt there, and
// slightly lighter geometry on small screens.
const TOUCH =
  typeof window !== 'undefined' && window.matchMedia('(hover: none), (pointer: coarse)').matches
const COMPACT = TOUCH || (typeof window !== 'undefined' && window.innerWidth < 900)
const DETAIL = COMPACT ? { curve: 40, bevel: 5, sphere: [56, 40] } : { curve: 64, bevel: 8, sphere: [96, 64] }
const BEVEL = 6 // bevelSize in SVG units; the outline grows by this much

const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp01 = (v) => Math.min(1, Math.max(0, v))
const range = (v, [a, b]) => clamp01((v - a) / (b - a))

const vertexShader = /* glsl */ `
  varying vec3 vObjPos;
  varying vec3 vObjN;
  varying vec3 vViewN;
  void main() {
    vObjPos = position;
    vObjN = normal;
    vViewN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Mode 0: extruded piece. Linear gradient across the piece's bounding box
// (SVG objectBoundingBox semantics), white sheen on the outer bevel that is
// strongest top-left, slightly darker side walls.
// Mode 1: the sphere. Shaded from its view-space normal so it reads as a ball
// from any angle: the banner's radial stops anchored on an upper-left light,
// limb darkening toward the silhouette, a broad sheen plus a tight specular
// highlight, and a thin rim light along the upper-left edge.
const fragmentShader = /* glsl */ `
  uniform vec3 uC0;
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform float uMid;
  uniform vec2 uMin;
  uniform vec2 uSize;
  uniform vec2 uStart;
  uniform vec2 uDir;
  uniform int uMode;
  uniform float uLive;
  uniform vec3 uFlat;
  uniform float uFlatten;
  varying vec3 vObjPos;
  varying vec3 vObjN;
  varying vec3 vViewN;

  vec3 grad(float t) {
    t = clamp(t, 0.0, 1.0);
    return t < uMid ? mix(uC0, uC1, t / uMid) : mix(uC1, uC2, (t - uMid) / (1.0 - uMid));
  }
  // Banner "sheen": white .85 at 0, .15 at .35, 0 at 1 (top-left to bottom-right).
  float sheen(float t) {
    return t < 0.35 ? mix(0.85, 0.15, t / 0.35) : mix(0.15, 0.0, (t - 0.35) / 0.65);
  }

  void main() {
    vec2 uv = (vObjPos.xy - uMin) / uSize; // SVG y-down: (0,0) is top-left
    float tDiag = clamp((uv.x + uv.y) * 0.5, 0.0, 1.0);
    vec3 col;

    if (uMode == 0) {
      col = grad(dot(uv - uStart, uDir) / dot(uDir, uDir));
      float edge = 1.0 - abs(normalize(vObjN).z); // 0 front face, 1 side wall
      col *= mix(1.0, 0.82, smoothstep(0.8, 1.0, edge));
      float band = smoothstep(0.45, 0.75, edge) * (1.0 - smoothstep(0.8, 0.97, edge));
      col = mix(col, vec3(1.0), band * sheen(tDiag) * 0.9 * uLive);
    } else {
      vec3 n = normalize(vViewN);
      col = grad(length(n.xy - vec2(-0.32, 0.38)) / 1.45);
      col *= mix(1.0, 0.78, pow(1.0 - clamp(n.z, 0.0, 1.0), 2.0));
      vec3 L = normalize(vec3(-0.45, 0.55, 0.75));
      vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
      float nh = max(dot(n, H), 0.0);
      col = mix(col, vec3(1.0), (pow(nh, 8.0) * 0.14 + pow(nh, 70.0) * 0.6) * uLive);
      float upperLeft = clamp(dot(normalize(n.xy + 1e-4), normalize(vec2(-1.0, 1.0))), 0.0, 1.0);
      float rim = smoothstep(0.45, 0.12, n.z) * upperLeft;
      col = mix(col, vec3(1.0), rim * 0.35 * uLive);
    }

    gl_FragColor = vec4(mix(col, uFlat, uFlatten), 1.0);
  }
`

function useMark() {
  const [mark, setMark] = useState(null)
  useEffect(() => {
    let cancelled = false
    new SVGLoader().load(MARK_URL, (data) => {
      if (cancelled) return
      const markBox = new THREE.Box3()
      const shapesPer = data.paths.map((path) => path.toShapes(true))
      shapesPer.forEach((shapes) =>
        shapes.forEach((s) => s.getPoints(24).forEach((p) => markBox.expandByPoint(new THREE.Vector3(p.x, p.y, 0)))),
      )
      const center = markBox.getCenter(new THREE.Vector3())
      const geos = shapesPer.map((shapes, i) => {
        let geo
        if (i === 2) {
          // The disc (the "head") is a full sphere, shaded like a lit ball.
          geo = new THREE.SphereGeometry(DISC.r, ...DETAIL.sphere)
          geo.translate(DISC.cx - center.x, DISC.cy - center.y, -PIECES[i].z)
        } else {
          geo = new THREE.ExtrudeGeometry(shapes, {
            depth: 40,
            bevelEnabled: true,
            bevelThickness: 8,
            bevelSize: BEVEL,
            bevelSegments: DETAIL.bevel,
            curveSegments: DETAIL.curve,
          })
          geo.translate(-center.x, -center.y, -20 - PIECES[i].z)
        }
        geo.computeBoundingBox()
        return geo
      })
      setMark({ geos, center, paths: data.paths })
    })
    return () => {
      cancelled = true
    }
  }, [])
  return mark
}

// Soft drop shadow, as in the banner: arch + cradle silhouette, offset (6, 10),
// blurred, navy at 18%. Uses shadowBlur (canvas `filter` is not universal).
function useShadowTexture(mark) {
  return useMemo(() => {
    if (!mark) return null
    const pad = 40
    const px = 3 // texture pixels per SVG unit
    const c = document.createElement('canvas')
    c.width = (SVG_WIDTH + pad * 2) * px
    c.height = (SVG_HEIGHT + pad * 2) * px
    const ctx = c.getContext('2d')
    const far = 10000
    ctx.shadowColor = '#243247'
    ctx.shadowBlur = 18 * px
    ctx.shadowOffsetX = far
    ctx.translate(pad * px - far, pad * px)
    ctx.scale(px, px)
    // Fill far off-canvas so only the shadow lands on it.
    mark.paths.slice(0, 2).forEach((path) => {
      const d = path.userData?.node?.getAttribute('d')
      if (d) ctx.fill(new Path2D(d))
    })
    const tx = new THREE.CanvasTexture(c)
    tx.colorSpace = THREE.SRGBColorSpace
    tx.flipY = false // the plane lives in the y-flipped mark group
    return { tx, pad }
  }, [mark])
}

// Hero pose: how far right the mark sits (0 on tall viewports, 1 on wide) and
// how big it is. Size is capped by both viewport height and width, so on a
// phone it fits comfortably above the headline instead of overflowing.
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
  const mark = useMark()
  const shadow = useShadowTexture(mark)
  const rig = useRef()
  const shadowMesh = useRef()
  const pieces = useRef([])
  const start = useRef(null)
  const { viewport, size, camera } = useThree()
  const hero = useMemo(() => heroPose(viewport), [viewport])

  const materials = useMemo(() => {
    if (!mark) return null
    return PIECES.map((pc, i) => {
      const bb = mark.geos[i].boundingBox
      return new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uC0: { value: rgb(pc.stops[0]) },
          uC1: { value: rgb(pc.stops[1]) },
          uC2: { value: rgb(pc.stops[2]) },
          uMid: { value: pc.mid },
          uMin: { value: new THREE.Vector2(bb.min.x, bb.min.y) },
          uSize: { value: new THREE.Vector2(bb.max.x - bb.min.x, bb.max.y - bb.min.y) },
          uStart: { value: new THREE.Vector2(...pc.start) },
          uDir: { value: new THREE.Vector2(...pc.dir) },
          uMode: { value: i === 2 ? 1 : 0 },
          uLive: { value: 1 },
          uFlat: { value: rgb(pc.flat) },
          uFlatten: { value: 0 },
        },
      })
    })
  }, [mark])

  // Scratch objects, allocated once.
  const tmp = useMemo(
    () => ({
      qRest: new THREE.Quaternion(),
      qDock: new THREE.Quaternion(),
      euler: new THREE.Euler(),
      aim: new THREE.Object3D(),
      v: new THREE.Vector3(),
    }),
    [],
  )

  useFrame((state, delta) => {
    if (!rig.current || !materials) return
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

    // Hand-off: the flat mark fades in under the arriving 3D one, then takes over.
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
    const float = reducedMotion ? 0 : DRIFT_AMOUNT
    const heroRotX = (1 - settle) * 0.9 + REST.x - py * 0.2 + wave(t, DRIFT.rotX) * float
    const heroRotY = (1 - settle) * -1.3 + REST.y + px * 0.3 + wave(t, DRIFT.rotY) * float
    const heroRotZ = wave(t, DRIFT.rotZ) * float
    const heroX = hero.x + wave(t, DRIFT.posX) * viewport.width * float
    const heroY = hero.y + wave(t, DRIFT.posY) * viewport.height * float

    // --- pose: dock (brand-bar mark slot, measured in CSS px by Hero.jsx) --
    const d = m.dock
    const dockX = (d.cx / size.width - 0.5) * viewport.width
    const dockY = (0.5 - d.cy / size.height) * viewport.height
    // Bevels grow the outline by BEVEL units each side; scale under the SVG.
    const dockScale = ((d.h / size.height) * viewport.height * (SVG_HEIGHT / (SVG_HEIGHT + 2 * BEVEL))) / SVG_HEIGHT

    // --- blend ------------------------------------------------------------
    // Straight-line lerp with a gentle upward arc so the mark lifts out of
    // the headline rather than cutting through it.
    const arc = Math.sin(Math.PI * e) * viewport.height * 0.12
    rig.current.position.set(
      THREE.MathUtils.lerp(heroX, dockX, e),
      THREE.MathUtils.lerp(heroY, dockY, e) + arc,
      0,
    )
    const scale = THREE.MathUtils.lerp(hero.scale, dockScale, e)
    rig.current.scale.setScalar(scale)

    tmp.qRest.setFromEuler(tmp.euler.set(heroRotX * live, heroRotY * live, heroRotZ * live))
    // Face the camera at the dock so the off-axis perspective reads flat.
    tmp.aim.position.copy(rig.current.position)
    tmp.aim.lookAt(camera.position)
    tmp.qDock.copy(tmp.aim.quaternion)
    rig.current.quaternion.slerpQuaternions(tmp.qRest, tmp.qDock, e)

    // Entrance drift, suppressed once the mark is on its way to the dock.
    pieces.current.forEach((mesh, i) => {
      if (!mesh) return
      const pc = PIECES[i]
      const k = reducedMotion ? 1 : easeOutExpo(clamp01((elapsed - pc.delay) / 2.0))
      const off = (1 - k) * live
      const dr = DRIFT.pieces[i]
      const bob = live * float
      mesh.position.set(
        pc.from[0] * off + (dr ? wave(t, dr.x) * bob : 0),
        pc.from[1] * off + (dr ? wave(t, dr.y) * bob : 0),
        pc.from[2] * off + (dr ? wave(t, dr.z) * bob : 0),
      )
      mesh.rotation.set(pc.rot[0] * off, pc.rot[1] * off, pc.rot[2] * off)
      mesh.scale.setScalar(1 - 0.4 * off)
    })

    // Shading → flat brand colours on the way into the dock.
    const f = range(p, MATERIAL_FADE)
    materials.forEach((mat) => {
      mat.uniforms.uFlatten.value = f
      mat.uniforms.uLive.value = 1 - f
    })
    if (shadowMesh.current) shadowMesh.current.material.opacity = 0.18 * settle * (1 - f)

    // Ripples + blooms (DOM, behind the text): centred on the disc.
    if (m.ripples) {
      const fade = (1 - range(p, RIPPLE_FADE)) * settle
      m.ripples.style.opacity = fade.toFixed(3)
      if (fade > 0 && pieces.current[2]) {
        const disc = pieces.current[2]
        disc.updateWorldMatrix(true, false)
        tmp.v.set(DISC.cx - mark.center.x, DISC.cy - mark.center.y, -PIECES[2].z).applyMatrix4(disc.matrixWorld)
        tmp.v.project(camera)
        const sx = (tmp.v.x * 0.5 + 0.5) * size.width
        const sy = (0.5 - tmp.v.y * 0.5) * size.height
        const rPx = DISC.r * scale * (size.height / viewport.height)
        m.ripples.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) scale(${(rPx / 10).toFixed(4)})`
      }
    }
  })

  if (!mark || !materials) return null

  const { pad } = shadow
  return (
    // The rig is animated; the inner group flips the SVG (y-down) upright.
    <group ref={rig}>
      <group rotation={[Math.PI, 0, 0]}>
        <mesh
          ref={shadowMesh}
          // Canvas covers [-pad, W + pad] x [-pad, H + pad] in SVG units, offset (6, 10).
          position={[SVG_WIDTH / 2 + 6 - mark.center.x, SVG_HEIGHT / 2 + 10 - mark.center.y, 40]}
          renderOrder={-1}
        >
          <planeGeometry args={[SVG_WIDTH + pad * 2, SVG_HEIGHT + pad * 2]} />
          <meshBasicMaterial map={shadow.tx} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
        {mark.geos.map((geo, i) => (
          <mesh key={i} ref={(el) => (pieces.current[i] = el)} geometry={geo} material={materials[i]} />
        ))}
      </group>
    </group>
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
      flat // no tone mapping: shader colours land exactly on brand values
      dpr={[1, 2]} // the unlit shader is cheap, so render crisply
      camera={{ position: [0, 0, 7], fov: 32 }}
      gl={{ antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      // The canvas ignores pointer events so the page stays usable; read the
      // cursor from the document instead.
      eventSource={document.body}
      eventPrefix="client"
    >
      <Scene motion={motion} reducedMotion={reducedMotion} />
    </Canvas>
  )
}
