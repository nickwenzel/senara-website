import { contact, ethos, mission, site, team } from '../content.js'

export function Ethos() {
  return (
    <section className="section" id="ethos">
      <h2 className="section__heading">{ethos.heading}</h2>
      {ethos.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      <blockquote className="quote">
        <p>“{ethos.quote.text}”</p>
        <cite>{ethos.quote.attribution}</cite>
      </blockquote>
      <p>{ethos.closing}</p>
    </section>
  )
}

export function Mission() {
  return (
    <section className="section" id="mission">
      <h2 className="section__heading">{mission.heading}</h2>
      <p className="section__lede">{mission.lede}</p>
      <ul className="stats">
        {mission.stats.map((s) => (
          <li key={s.value}>
            <span className="stats__value">
              {s.value}
              <sup>
                <a href="#sources" aria-label={`Source ${s.note}`}>
                  {s.note}
                </a>
              </sup>
            </span>
            <span className="stats__label">{s.label}</span>
          </li>
        ))}
      </ul>
      <p>{mission.now}</p>
      <h3 className="subhead">{mission.valuesHeading}</h3>
      <ul className="values">
        {mission.values.map((v) => (
          <li key={v.name}>
            <span className="values__name">{v.name}</span>
            <span>{v.gloss}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Team() {
  return (
    <section className="section" id="team">
      <h2 className="section__heading">{team.heading}</h2>
      <p>{team.intro}</p>
      <ul className="people">
        {team.members.map((m) => (
          <li key={m.name}>
            <span className="people__name">{m.name}</span>
            <span className="people__line">{m.line}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Contact() {
  return (
    <section className="section" id="contact">
      <h2 className="section__heading">{contact.heading}</h2>
      <p>{contact.text}</p>
      <div className="contact__links">
        <a href={`mailto:${site.email}`}>{site.email}</a>
        <br />
        <a href={site.linkedin} target="_blank" rel="noreferrer">
          LinkedIn
        </a>
        <span>{site.location}</span>
      </div>
    </section>
  )
}
