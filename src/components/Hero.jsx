import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { hero, site } from '../content.js'
import Intro from './Intro.jsx'

const GlassMark = lazy(() => import('../three/GlassMark.jsx'))

const base = import.meta.env.BASE_URL

// Scroll distance, as a fraction of the hero's height, over which the glass
// mark flies to the brand bar and turns flat.
const FLIGHT = 0.75
// The flat SVG in the brand bar fades in over this window of progress, under
// the arriving glass mark, so the swap at p = 1 is invisible.
const SVG_FADE = [0.76, 0.92] // keep in step with GlassMark.jsx

const clamp01 = (v) => Math.min(1, Math.max(0, v))

// The banner's ripples, in units of the disc radius (see brand/linkedin-banner.svg,
// where the disc radius is 53.6px). Widths scale with the disc, as in the banner.
const BANNER_DISC_PX = 53.6
const RIPPLES = [1.9, 2.55, 3.25, 4.0, 4.8, 5.65, 6.55, 7.5, 8.5, 9.6].map((r, i) => ({
  r,
  width: Math.max(0.6, 1.4 - i * 0.12) / BANNER_DISC_PX,
  opacity: 0.3 * 0.8 ** i,
}))

// Ripples + soft blooms, as in the banner. A fixed DOM layer behind the hero
// text; GlassMark centres it on the 3D disc and fades it out on scroll.
function Ripples({ innerRef }) {
  return (
    <svg ref={innerRef} className="ripples" viewBox="-12 -12 24 24" aria-hidden="true">
      <defs>
        <radialGradient id="rippleBloomT">
          <stop offset="0" stopColor="#e8a17d" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fdf6e7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rippleBloomN">
          <stop offset="0" stopColor="#8d9ab0" stopOpacity="0.3" />
          <stop offset="1" stopColor="#fdf6e7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="-4.2" cy="1.75" r="9.5" fill="url(#rippleBloomN)" />
      <circle r="11" fill="url(#rippleBloomT)" />
      {RIPPLES.map((c) => (
        <circle
          key={c.r}
          r={c.r}
          fill="none"
          stroke="#c6643b"
          strokeWidth={c.width}
          strokeOpacity={c.opacity}
        />
      ))}
    </svg>
  )
}

function supportsWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function Hero() {
  const [webgl, setWebgl] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [docked, setDocked] = useState(false)
  const heroRef = useRef(null)
  const slotRef = useRef(null) // the flat mark in the brand bar
  const canvasRef = useRef(null)
  const copyRef = useRef(null)
  const ripplesRef = useRef(null)
  const brandRef = useRef(null)
  const nameRef = useRef(null) // the brand-bar wordmark the intro lands on
  // Shared with the canvas; mutated per frame, never triggers renders.
  // `flight` is the scroll distance (px) of the whole fly-to-dock transition.
  // The canvas eases its own progress toward the scroll position and owns the
  // hand-off to the flat mark (`slot`, `onDock`) once it has actually arrived.
  // `go` is set when the intro has landed; the 3D mark waits for it.
  const motion = useRef({ p: 0, flight: 0, dock: { cx: 60, cy: 50, h: 46 }, slot: null, onDock: null, ready: false, go: false })

  useEffect(() => {
    setWebgl(supportsWebGL())
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onMotion = (e) => setReducedMotion(e.matches)
    mq.addEventListener('change', onMotion)

    let wasDocked = false
    const setLayer = (isDocked) => {
      if (isDocked === wasDocked) return
      wasDocked = isDocked
      if (canvasRef.current) canvasRef.current.style.visibility = isDocked ? 'hidden' : 'visible'
      if (isDocked && slotRef.current) slotRef.current.style.opacity = 1
      setDocked(isDocked)
    }
    motion.current.slot = slotRef.current
    motion.current.layer = canvasRef.current
    motion.current.ripples = ripplesRef.current
    motion.current.onDock = () => setLayer(true)
    const measure = () => {
      const r = slotRef.current?.getBoundingClientRect()
      if (r) motion.current.dock = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, h: r.height }
      // Free space for the hero mark on phones: brand bar bottom to headline
      // top, in px from the top of the page (i.e. at scroll 0).
      const bar = brandRef.current?.getBoundingClientRect()
      const copy = copyRef.current?.getBoundingClientRect()
      if (bar && copy) {
        const top = bar.bottom
        const bottom = copy.top + window.scrollY
        const prev = motion.current.space
        if (!prev || Math.abs(prev.top - top) > 0.5 || Math.abs(prev.bottom - bottom) > 0.5) {
          motion.current.space = { top, bottom } // new object: GlassMark re-derives its pose
        }
      }
    }
    const update = () => {
      const h = heroRef.current?.offsetHeight || window.innerHeight
      motion.current.flight = h * FLIGHT
      const p = clamp01(window.scrollY / motion.current.flight)
      motion.current.p = p
      // Until the 3D chunk is running, the flat mark tracks scroll directly.
      if (!motion.current.ready && slotRef.current) {
        slotRef.current.style.opacity = clamp01((p - SVG_FADE[0]) / (SVG_FADE[1] - SVG_FADE[0]))
      }
      // Hero copy is page content: it fades with the raw scroll position.
      if (copyRef.current) copyRef.current.style.opacity = 1 - clamp01((p - 0.25) / 0.45)
      // Brand bar stays clear over the hero (ripples run under it) and turns
      // solid cream once page text can scroll beneath it.
      brandRef.current?.classList.toggle('is-solid', p > 0.4)
      // Leaving the dock is immediate; arriving is signalled by the canvas.
      if (p < 1) setLayer(false)
    }
    const onResize = () => {
      measure()
      update()
    }
    measure()
    update()
    // The headline's height depends on the web font; re-measure once it's in.
    document.fonts?.ready.then(onResize)
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      mq.removeEventListener('change', onMotion)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <>
      {/* Fixed brand bar. The mark slot is where the glass mark lands. */}
      <div className="brand" ref={brandRef}>
        <a href="#top" className="brand__lockup">
          <img ref={slotRef} className="brand__mark" src={`${base}logo/senara-mark.svg`} alt="" style={{ opacity: webgl ? 0 : 1 }} />
          <span ref={nameRef}>{site.name}</span>
        </a>
        <span className="brand__meta">{site.location}</span>
      </div>

      <Intro targetRef={nameRef} onDone={() => (motion.current.go = true)} />

      {webgl && <Ripples innerRef={ripplesRef} />}

      {webgl && (
        <div ref={canvasRef} className="glass-layer" aria-hidden="true">
          <Suspense fallback={null}>
            <GlassMark motion={motion} reducedMotion={reducedMotion} active={!docked} />
          </Suspense>
        </div>
      )}

      <header className="hero" id="top" ref={heroRef}>
        {!webgl && <img className="hero__fallback" src={`${base}logo/senara-mark.svg`} alt="" />}

        <div className="hero__copy" ref={copyRef}>
          <h1 className="hero__headline">
            <span className="reveal reveal--1" style={{ display: 'block' }}>
              {hero.headline[0]}
            </span>
            <span className="reveal reveal--2" style={{ display: 'block' }}>
              <em>{hero.headline[1]}</em>
            </span>
          </h1>
          <p className="hero__sub reveal reveal--3">{hero.sub}</p>
        </div>

        <a className="hero__scroll reveal reveal--3" href="#ethos">
          Scroll
        </a>
      </header>
    </>
  )
}
