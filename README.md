# Senara Medical — senaramed.com

Single-page company site. Vite + React, with a three.js (react-three-fiber) liquid-glass
rendering of the Senara mark as the landing screen.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
```

## Where things live

| File | Purpose |
|---|---|
| `src/content.js` | **All copy.** Headline, ethos, mission, stats, team bios, contact, footer. Edit words here. |
| `src/styles.css` | Palette, type scale, layout. Instrument Serif (display) + Instrument Sans (body) from Google Fonts. |
| `src/three/GlassMark.jsx` | The hero: `senara-mark.svg` extruded into bevelled glass (`MeshTransmissionMaterial`). Eases in on load, tilts toward the cursor, and on scroll flies into the brand bar and turns flat. |
| `src/components/` | `Hero`, `Rail` (fixed left section list), `Sections`, `Footer`. |
| `public/logo/`, `public/favicon.*` | From the Senara Medical logo kit. |

## Before launch

- `src/content.js` — create the `hello@senaramed.com` mailbox/alias in Google Workspace,
  confirm the LinkedIn URL (`site`), and replace the three `footer.sources` entries with
  real references.
- Confirm team one-liners and spelling of employer names.

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and publishes to
GitHub Pages. The custom domain `senaramed.com` is set in **Settings → Pages**
(Actions deployments ignore a `CNAME` file). DNS lives at Squarespace Domains:

| Host | Type | Value |
|---|---|---|
| `@` | A | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| `@` | AAAA | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| `www` | CNAME | `nickwenzel.github.io` |

Leave the Google Workspace MX/TXT records alone — they carry email.

Brand colours: Arch Navy `#243247` · Cradle Terracotta `#C6643B` · Cream `#FDF6E7`.
