# Compiled Identity — Rahul Prasad

A project-first, mobile-friendly developer portfolio built with **Vite + vanilla HTML/CSS/JavaScript**.
The site is fully usable without JavaScript; JavaScript only adds the optional ball-to-code
intro animation and small interactions (theme toggle, copy-email, scroll reveals, hero particles).

## Quick start

```bash
npm install       # install Vite (only dependency)
npm run dev       # dev server with content rendering
npm test          # intro / reduced-motion behavior tests (Node, no browser)
npm run build     # production build into dist/
npm run preview   # serve the production build locally
npm run og        # regenerate public/og-image.png (1200x630)
```

## Editing your content — `content/site.json`

All personal content lives in one file. Edit it, then refresh (dev) or rebuild:

- `site` — name, role line, one-line pitch, email, GitHub, LinkedIn URLs.
- `site.resumeEnabled` — leave `false` until you add `public/resume.pdf`;
  set to `true` and the Resume buttons/links activate everywhere.
- `about.paragraphs` — your introduction.
- `skills` — grouped list; only add technologies you have actually used.
- `education` — degree, school, years, notes (replace the `[bracketed]` placeholders).
- `projects` — the case studies (see below).

The `[TODO]` strings and the `SAMPLE` badges are intentional honesty markers.
Replace or remove them before publishing — `sample: false` removes the badges
and the placeholder notes automatically.

### Adding a real project

1. Add an entry to `projects` in `content/site.json` with a unique `slug`,
   `"sample": false`, and every case-study field (problem, evidence, contribution,
   completed/planned features, limitations, decisions, challenge, results).
2. Copy `projects/sample-project/` to `projects/<your-slug>/` — it contains no
   project-specific text; everything renders from the JSON entry matched by folder name.
3. Run `npm run build`. Project folders are auto-discovered; no config changes needed.

### Enabling the resume

Drop your PDF at `public/resume.pdf`, set `site.resumeEnabled` to `true`, rebuild.

### Updating SEO URLs

Before deploying, set `site.canonical` and `seo.ogImage` in `content/site.json`
to your real domain (they currently point at `https://rahulpd1712.github.io/`).

## Deployment

The build uses a relative `base`, so `dist/` works on any host:

- **GitHub Pages**: publish the `dist/` folder (Actions or `gh-pages` branch).
  Works under `/username/repo/` without extra configuration.
- **Vercel**: framework preset *Vite*, build command `npm run build`,
  output directory `dist`.

Checklist after deploy: HTTPS loads, all nav/section links work, case-study
page loads, resume (when enabled) downloads, no console errors, mobile layout
has no horizontal scrolling, and the social preview renders (og-image).

## Project layout

```
content/site.json          all personal content (single source of truth)
build/render-content.js    renders JSON -> static HTML at build/dev time
build/make-og-image.mjs    zero-dependency OG image generator (npm run og)
projects/<slug>/           one case-study page per project (auto-discovered)
src/main.js                entry: styles + feature modules
src/styles/                base / layout / components / animation CSS
src/js/                    navigation, theme, copy-email, scroll-reveal,
                           particles, intro (ball-to-code signature animation)
test/intro.test.mjs        behavior tests (npm test)
public/                    favicon.svg, robots.txt, og-image.png, resume.pdf
```

## How the no-JavaScript guarantee works

`content/site.json` is compiled into plain HTML at build time — content is never
injected client-side. Interactive extras are opt-in via CSS gating: hiding rules
apply only under `html.js` / `html.reveal-ready`, classes that only JavaScript
adds. With JS disabled, the full page — nav, sections, links — renders normally.

The intro animation creates its overlay only at runtime; if JavaScript fails,
the static hero remains untouched. The animation plays once per browser tab
(`sessionStorage`), is skippable by click/tap or Escape without triggering
anything underneath, and never initializes under `prefers-reduced-motion`.

## Design tokens

Dark-first palette per the plan: background `#0B0D12`, surface `#141821`,
text `#F1F5F9`, muted `#A1AAB8`, accent `#38BDF8`, border `#283140`.
Light theme overrides ship in the same stylesheet. Motion: 150/200/400ms
durations, transform/opacity only, reduced-motion honored globally.
