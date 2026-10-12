import { useEffect, useState } from 'react'
import { nav } from '../content.js'

// Fixed left-hand section list. Hidden while the hero or the footer is on
// screen (it would sit over the footer text); the current section is navy,
// the rest muted.
export default function Rail() {
  const [active, setActive] = useState(null)
  const [pastHero, setPastHero] = useState(false)
  const [atFooter, setAtFooter] = useState(false)
  const visible = pastHero && !atFooter

  useEffect(() => {
    const hero = document.getElementById('top')
    const heroObs = new IntersectionObserver(([e]) => setPastHero(e.intersectionRatio < 0.35), {
      threshold: [0, 0.35, 1],
    })
    if (hero) heroObs.observe(hero)

    // Hide once the footer reaches the rail's vertical band (mid-viewport).
    const footer = document.querySelector('.footer')
    const footerObs = new IntersectionObserver(([e]) => setAtFooter(e.isIntersecting), {
      rootMargin: '0px 0px -40% 0px',
      threshold: 0,
    })
    if (footer) footerObs.observe(footer)

    const sections = nav.map((n) => document.getElementById(n.id)).filter(Boolean)
    const obs = new IntersectionObserver(
      (entries) => {
        // Pick the entry nearest the upper third of the viewport.
        const vis = entries.filter((e) => e.isIntersecting)
        if (vis.length) {
          vis.sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))
          setActive(vis[0].target.id)
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 },
    )
    sections.forEach((s) => obs.observe(s))
    return () => {
      heroObs.disconnect()
      footerObs.disconnect()
      obs.disconnect()
    }
  }, [])

  return (
    <nav className={`rail${visible ? ' is-visible' : ''}`} aria-label="Sections">
      {nav.map((n) => (
        <a key={n.id} href={`#${n.id}`} className={active === n.id ? 'is-active' : ''}>
          {n.label}
        </a>
      ))}
    </nav>
  )
}
