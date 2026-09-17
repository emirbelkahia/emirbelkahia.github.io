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
- **Every new public page needs** a `<link rel="canonical">`, a `<meta name="description">`, the GoatCounter snippet, and a line in `build-sitemap.sh`.
- **`footer` must not be nested inside `main`.** A `footer` inside `main`/`article`/`section`/`aside`/`nav` loses its `contentinfo` landmark. On `index.html` the styled card is a `div.container`; `main` and `footer` are siblings inside it.

## robots.txt and the sitemap

- **`robots.txt` has exactly one `User-agent: *` group, on purpose.** Per RFC 9309 a crawler obeys only the single most specific matching group and never merges it with `*`. A named group repeating `Allow: /` would silently shadow every `Disallow`, so named groups are only worth adding when their rules genuinely differ.
- **`cv.pdf` is excluded from both `robots.txt` and the sitemap.** It embeds email and phone (see README.md) while the web CV omits them. Listing it would hand that pair to search indexes and AI training corpora, which is the opposite of the intent. Do not add it back.
- **`CLAUDE.md` and `README.md` are served publicly** by GitHub Pages at `emirbelkahia.com/CLAUDE.md` and `/README.md`, verified live (HTTP 200, `text/markdown`). Jekyll copies front-matter-less `.md` files verbatim; it only drops dotfiles, which is why `.env.example` 404s. Both are `Disallow`ed in `robots.txt` since they are agent instructions and build docs, not site content.
- **Regenerate the sitemap with `./build-sitemap.sh`** after changing a listed page. It reads each `lastmod` from `git log`, so a hand-edited sitemap will drift and start lying about freshness. `changefreq` and `priority` are deliberately absent: Google ignores both.

Not done yet (layer 2): `llms.txt`, `llms-full.txt`, markdown mirrors (`cv.md`), and `.nojekyll`. Note that `.nojekyll` is *not* what would expose the `.md` files, since they are already served. What it would newly expose is `.env.example` and other dotfiles, so weigh that when the time comes.

## Open question

`preview-anonymizer/` carries `noindex, nofollow` and is absent from the sitemap, but `noindex` only governs search-result inclusion: it does not stop an AI crawler from fetching and ingesting the page. Nothing links to it, so today it is protected by obscurity alone. Either delete it if it has served its purpose, or add `Disallow: /preview-anonymizer/` accepting that this publishes the path. Ask Emir rather than deciding this unilaterally.

## Analytics

GoatCounter account: `emirbelkahia.goatcounter.com`

All public pages and CTAs must have `data-goatcounter-click` attributes. Current tracked events on `index.html`: `linkedin`, `cv`, `medium`, `n8n`, `github`, `connect-linkedin`. On `cv.html`: `download-cv`.

## Footer year

"made by Emir Belkahia, 2025" — this is the creation year, do not update it annually.
