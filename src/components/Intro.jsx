import { useEffect, useRef, useState } from 'react'
import { site } from '../content.js'

// Load-in: the company name blurs into focus, large and centred, holds for a
// beat, then glides and shrinks onto the real wordmark in the brand bar (a
// FLIP onto `targetRef`). When it lands the real wordmark takes over and
// `onDone` releases the rest of the hero (3D mark, headline, ripples).
//
// Whether it plays at all is decided before React loads, by the inline script
// in index.html, which adds `is-intro` to <html> (once per session; never for
// reduced motion, deep links or a restored scroll position). Without that
// class this renders nothing and releases the hero immediately.

const KEY = 'senara-intro'
const DURATION = 2200 // ms: blur-in ~0.9 s, hold ~0.3 s, glide ~1 s
const RELEASE_AT = 0.8 // fraction of DURATION: the hero starts while the name is still gliding

export const introPending = () =>
  typeof document !== 'undefined' && document.documentElement.classList.contains('is-intro')

export default function Intro({ targetRef, onDone }) {
  const ref = useRef(null)
  const [active, setActive] = useState(introPending)

  useEffect(() => {
    if (!active) {
      onDone()
      return
    }
    let anim = null
    let finished = false
    let cancelled = false // unmounted (incl. React StrictMode's dev re-mount)
    let released = false
    let releaseTimer = 0

    // Hand the page over: content reveals and the 3D mark flies in.
    const release = () => {
      if (released || cancelled) return
      released = true
      root.classList.remove('is-hold')
      onDone()
    }
    const root = document.documentElement

    const done = () => {
      if (finished || cancelled) return
      finished = true
      release()
      root.classList.remove('is-intro') // the real wordmark takes over
      try {
        sessionStorage.setItem(KEY, '1')
      } catch {
        /* private mode: the intro may simply play again next visit */
      }
      // The real wordmark is now visible underneath at the same spot; fade the
      // stand-in off it rather than cutting.
      const el = ref.current
      if (el) {
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }).finished.then(
          () => setActive(false),
          () => setActive(false),
        )
      } else {
        setActive(false)
      }
    }

    // Any attempt to use the page skips straight to the end.
    const skip = () => (anim ? anim.finish() : done())
    const opts = { passive: true, once: true }
    window.addEventListener('wheel', skip, opts)
    window.addEventListener('touchstart', skip, opts)
    window.addEventListener('keydown', skip, { once: true })
    window.addEventListener('scroll', skip, opts)

    const run = async () => {
      // Measure with the real font, or the landing spot is wrong.
      try {
        await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))])
      } catch {
        /* fall through with whatever font is available */
      }
      const el = ref.current
      const target = targetRef.current
      if (cancelled) return
      if (finished || !el || !target || window.scrollY > 4) return done()

      const r = target.getBoundingClientRect()
      const fs = parseFloat(getComputedStyle(target).fontSize)
      // Big: about 62% of the viewport width, within sensible bounds.
      const s = Math.min(5.5, Math.max(1.8, (window.innerWidth * 0.62) / r.width))
      el.style.left = `${r.left}px`
      el.style.top = `${r.top}px`
      el.style.fontSize = `${fs * s}px`
      const w = el.offsetWidth
      const h = el.offsetHeight
      const tx = window.innerWidth / 2 - w / 2 - r.left
      const ty = window.innerHeight / 2 - h / 2 - r.top
      const centred = (k) => `translate(${tx + (w * (1 - k)) / 2}px, ${ty + (h * (1 - k)) / 2}px) scale(${k})`

      anim = el.animate(
        [
          { offset: 0, transform: centred(0.96), filter: 'blur(22px)', opacity: 0, easing: 'cubic-bezier(0.2, 0.65, 0.2, 1)' },
          { offset: 0.42, transform: centred(1), filter: 'blur(0px)', opacity: 1, easing: 'linear' },
          { offset: 0.55, transform: centred(1), filter: 'blur(0px)', opacity: 1, easing: 'cubic-bezier(0.75, 0, 0.2, 1)' },
          { offset: 1, transform: `translate(0px, 0px) scale(${1 / s})`, filter: 'blur(0px)', opacity: 1 },
        ],
        { duration: DURATION, fill: 'forwards' },
      )
      anim.finished.then(done, done)
      releaseTimer = setTimeout(release, DURATION * RELEASE_AT)
    }
    run()

    return () => {
      cancelled = true
      clearTimeout(releaseTimer)
      anim?.cancel()
      window.removeEventListener('wheel', skip)
      window.removeEventListener('touchstart', skip)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('scroll', skip)
    }
    // Runs once per mount by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!active) return null
  return (
    <div ref={ref} className="intro-name" aria-hidden="true">
      {site.name}
    </div>
  )
}
