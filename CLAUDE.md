# emirbelkahia.github.io

Personal site hosted on GitHub Pages at emirbelkahia.com.

## Before doing anything

Always run `git pull` before reading or editing files — other Claude sessions may have pushed changes that aren't reflected in the local repo yet.

## Structure

- `index.html` — homepage (links + LinkedIn networking CTA + terminal easter egg)
- `cv.html` — web CV with download button
- `cv-ats.html` — ATS-friendly CV, no contact info, no tracking. Self-contained on purpose: it keeps its inline CSS because `generate-pdf.sh` renders it over `file://`. Do not externalize it.
- `cv.pdf` — generated PDF (see `generate-pdf.sh`)
- `assets/` — external CSS/JS: `index.css`, `cv.css`, `terminal.js`
- `robots.txt`, `sitemap.xml` — crawl directives and URL discovery
- `preview-anonymizer/` — temporary private preview page, no tracking needed. Already carries `noindex, nofollow` and is deliberately absent from the sitemap. Keep it that way.

## Machine-readable layer

The site is built to be cheap for agents and crawlers to read. When editing pages, keep this intact:

- **Keep CSS and JS external.** `index.html` and `cv.html` must stay mostly content. Do not inline styles or scripts back into them.
- **Keep the HTML semantic.** `main` / `nav` / `footer` / real headings, not `div` soup.
- **JSON-LD is the source of truth for identity.** `index.html` carries a schema.org `@graph` (`WebSite` + `ProfilePage` + `Person`, all under stable `@id`s anchored on `https://emirbelkahia.com/#person`). `cv.html` carries a `ProfilePage` whose `mainEntity` reuses that same `@id`, plus the full `worksFor` role history, `hasCredential` and `knowsAbout`.
- **When the CV changes, update the JSON-LD in the same commit.** Job titles, dates and employers are duplicated between the visible HTML and the JSON-LD. If they drift, the structured data starts lying to agents.
- **Every new public page needs** a `<link rel="canonical">`, an entry in `sitemap.xml` with its `lastmod`, and the GoatCounter snippet.

Not done yet (layer 2): `llms.txt`, `llms-full.txt`, markdown mirrors (`cv.md`), and the `.nojekyll` those require. Adding `.nojekyll` makes GitHub Pages serve every file statically, including `README.md` and `.env.example` — decide that deliberately when the time comes.

## Analytics

GoatCounter account: `emirbelkahia.goatcounter.com`

All public pages and CTAs must have `data-goatcounter-click` attributes. Current tracked events on `index.html`: `linkedin`, `cv`, `medium`, `n8n`, `github`, `connect-linkedin`. On `cv.html`: `download-cv`.

## Footer year

"made by Emir Belkahia, 2025" — this is the creation year, do not update it annually.
