import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { hero, site } from '../content.js'

const GlassMark = lazy(() => import('../three/GlassMark.jsx'))

const base = import.meta.env.BASE_URL

// Scroll distance, as a fraction of the hero's height, over which the glass
// mark flies to the brand bar and turns flat.
const FLIGHT = 0.75
// The flat SVG in the brand bar fades in over this window of progress, under
// the arriving glass mark, so the swap at p = 1 is invisible.
const SVG_FADE = [0.82, 1]

const clamp01 = (v) => Math.min(1, Math.max(0, v))

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
  // Shared with the canvas; mutated per frame, never triggers renders.
  const motion = useRef({ p: 0, dock: { cx: 60, cy: 50, h: 46 } })

  useEffect(() => {
    setWebgl(supportsWebGL())
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const onMotion = (e) => setReducedMotion(e.matches)
    mq.addEventListener('change', onMotion)

    let wasDocked = null
    const measure = () => {
      const r = slotRef.current?.getBoundingClientRect()
      if (r) motion.current.dock = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, h: r.height }
    }
    const update = () => {
      const h = heroRef.current?.offsetHeight || window.innerHeight
      const p = clamp01(window.scrollY / (h * FLIGHT))
      motion.current.p = p
      if (slotRef.current) slotRef.current.style.opacity = clamp01((p - SVG_FADE[0]) / (SVG_FADE[1] - SVG_FADE[0]))
      // Hero copy leaves as the mark takes off, so it never scrolls under the brand bar.
      if (copyRef.current) copyRef.current.style.opacity = 1 - clamp01((p - 0.25) / 0.45)
      const isDocked = p >= 1
      if (isDocked !== wasDocked) {
        wasDocked = isDocked
        if (canvasRef.current) canvasRef.current.style.visibility = isDocked ? 'hidden' : 'visible'
        setDocked(isDocked)
      }
    }
    const onResize = () => {
      measure()
      update()
    }
    measure()
    update()
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
      <div className="brand">
        <a href="#top" className="brand__lockup">
          <img ref={slotRef} className="brand__mark" src={`${base}logo/senara-mark.svg`} alt="" style={{ opacity: webgl ? 0 : 1 }} />
          <span>{site.name}</span>
        </a>
        <span className="brand__meta">{site.location}</span>
      </div>

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
