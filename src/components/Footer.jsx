import { footer, site } from '../content.js'

const base = import.meta.env.BASE_URL

export default function Footer() {
  return (
    <footer className="footer">
      <div>
        <img className="footer__mark" src={`${base}logo/senara-mark.svg`} alt="" />
        <p>{footer.acknowledgement}</p>
      </div>
      <div id="sources">
        <ol className="footer__sources">
          {footer.sources.map((s) => (
            <li key={s.n}>
              <span>{s.n}</span>
              <span>
                {s.text}{' '}
                {s.url && (
                  <a href={s.url} target="_blank" rel="noreferrer">
                    Source
                  </a>
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="footer__legal">
        <span>
          © {new Date().getFullYear()} {site.name}
        </span>
        <span>{site.location}</span>
      </div>
    </footer>
  )
}
