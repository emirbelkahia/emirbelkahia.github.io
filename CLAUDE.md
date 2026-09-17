# emirbelkahia.github.io

Personal site hosted on GitHub Pages at emirbelkahia.com.

## Before doing anything

Always run `git pull` before reading or editing files — other Claude sessions may have pushed changes that aren't reflected in the local repo yet.

## Structure

- `index.html` — homepage (links + LinkedIn networking CTA + terminal easter egg)
- `cv.html` — web CV with download button
- `cv-ats.html` — ATS-friendly CV, no contact info, no tracking. Self-contained on purpose: it keeps its inline CSS because `generate-pdf.sh` renders it over `file://`. Do not externalize it.
- `cv.pdf` — generated PDF (see `generate-pdf.sh`)
- `assets/` — external CSS/JS: `index.css`, `cv.css`, plus `terminal.js` / `terminal.css` which are fetched on demand
- `favicon.ico` at the repo root, plus `favicon/` — see below
- `robots.txt`, `sitemap.xml` — crawl directives and URL discovery

## Machine-readable layer

The site is built to be cheap for agents and crawlers to read. When editing pages, keep this intact:

- **Keep CSS and JS external.** `index.html` and `cv.html` must stay mostly content. Do not inline styles or scripts back into them.
- **The terminal easter egg is loaded on demand.** `index.html` carries only a ~20-line inline listener; it fetches `assets/terminal.js` and `assets/terminal.css` on the first match of the secret word, then calls `window.__openTerminal()`. The overlay markup is injected by the script, so the page ships no inert easter-egg DOM. If you touch this: the script must keep exposing `window.__openTerminal`, and the secret word must stay out of it (the inline loader owns detection, or opening breaks after a close).
- **Keep the HTML semantic.** `main` / `nav` / `footer` / real headings, not `div` soup.
- **JSON-LD is the source of truth for identity.** `index.html` carries a schema.org `@graph` (`WebSite` + `ProfilePage` + `Person`, all under stable `@id`s anchored on `https://emirbelkahia.com/#person`). `cv.html` carries a `ProfilePage` whose `mainEntity` reuses that same `@id`, plus the full `worksFor` role history, `hasCredential` and `knowsAbout`.
- **When the CV changes, update the JSON-LD in the same commit.** Job titles, dates and employers are duplicated between the visible HTML and the JSON-LD. If they drift, the structured data starts lying to agents.
- **Every new public page needs** a `<link rel="canonical">`, a `<meta name="description">`, the GoatCounter snippet, and a line in `build-sitemap.sh`.
- **`footer` must not be nested inside `main`.** A `footer` inside `main`/`article`/`section`/`aside`/`nav` loses its `contentinfo` landmark. On `index.html` the styled card is a `div.container`; `main` and `footer` are siblings inside it.

## Icons

Six files, and it should stay six. The set was a 27-file generator dump until it was cut down; do not paste another one in.

- `favicon.ico` **at the repo root**, because every browser requests `/favicon.ico` on its own. It used to live in `favicon/`, so every visit produced a 404.
- `favicon/favicon-32x32.png` — declared tab icon
- `favicon/apple-touch-icon.png` — 180x180, iOS home screen. One size covers every current device.
- `favicon/icon-192.png` and `favicon/icon-512.png` — the two sizes `manifest.json` declares. 512 is the one that matters for installability and it was missing.
- `favicon/manifest.json`

Rules:

- **Four `<link>` tags on `index.html`, three on `cv.html`.** Anything beyond that is targeting devices that no longer exist.
- **PNGs are encoded as 8-bit greyscale**, since the mark is white on `#18181b`. RGBA costs 3-4x for no visible gain: `icon-512.png` went from 108 KB to 25 KB that way. If you regenerate one, re-encode it.
- **`theme-color` is per page** and must match that page's real background: `#0e0e0e` on `index.html` (dark card), `#f8f9fa` on `cv.html` (light). It drives the mobile URL bar, so a wrong value is visible.
- **`theme-color` in the HTML and `theme_color` in `manifest.json` must agree.** They said `#ffffff` and `#000000` on a `#0e0e0e` site.
- Dropped on purpose: all `ms-icon-*` and `browserconfig.xml` (Windows 8 tiles, and the file was orphaned with three 404 paths), eight of nine `apple-icon-*` sizes (iOS 6/7 era), `apple-icon-precomposed.png`, and five redundant `android-icon-*`. Five files were byte-identical duplicates of others.
- There is **no SVG favicon**, deliberately. The mark is a custom-font monogram; an SVG using `<text>` would render with whatever font the visitor has. Adding one means tracing the glyphs as paths.

## robots.txt and the sitemap

- **`robots.txt` has exactly one `User-agent: *` group, on purpose.** Per RFC 9309 a crawler obeys only the single most specific matching group and never merges it with `*`. A named group repeating `Allow: /` would silently shadow every `Disallow`, so named groups are only worth adding when their rules genuinely differ.
- **`cv.pdf` is excluded from both `robots.txt` and the sitemap.** It embeds email and phone (see README.md) while the web CV omits them. Listing it would hand that pair to search indexes and AI training corpora, which is the opposite of the intent. Do not add it back.
- **`CLAUDE.md` and `README.md` are served publicly** by GitHub Pages at `emirbelkahia.com/CLAUDE.md` and `/README.md`, verified live (HTTP 200, `text/markdown`). Jekyll copies front-matter-less `.md` files verbatim; it only drops dotfiles, which is why `.env.example` 404s. Both are `Disallow`ed in `robots.txt` since they are agent instructions and build docs, not site content.
- **Regenerate the sitemap with `./build-sitemap.sh`** after changing a listed page. It reads each `lastmod` from `git log`, so a hand-edited sitemap will drift and start lying about freshness. `changefreq` and `priority` are deliberately absent: Google ignores both.

Not done yet (layer 2): `llms.txt`, `llms-full.txt`, markdown mirrors (`cv.md`), and `.nojekyll`. Note that `.nojekyll` is *not* what would expose the `.md` files, since they are already served. What it would newly expose is `.env.example` and other dotfiles, so weigh that when the time comes.


## Analytics

GoatCounter account: `emirbelkahia.goatcounter.com`

All public pages and CTAs must have `data-goatcounter-click` attributes. Current tracked events on `index.html`: `linkedin`, `cv`, `medium`, `n8n`, `github`, `connect-linkedin`. On `cv.html`: `download-cv`.

## Footer year

"made by Emir Belkahia, 2025" — this is the creation year, do not update it annually.
