# emirbelkahia.github.io

Personal site hosted on GitHub Pages at emirbelkahia.com.

## Before doing anything

Always run `git pull` before reading or editing files — other Claude sessions may have pushed changes that aren't reflected in the local repo yet.

## Structure

- `content/cv.json` — source of truth for public CV content and identity
- `templates/` — layout for the three generated HTML pages
- `build-site.py` — generates HTML, JSON-LD, `cv.md`, `llms.txt` and `sitemap.xml`; `--pdf` also builds the PDF
- `cv.md`, `llms.txt` — generated public Markdown CV and short discovery map

- `index.html` — homepage (links + LinkedIn networking CTA + terminal easter egg)
- `cv.html` — web CV with download button
- `cv-ats.html` — ATS-friendly CV, no contact info, no tracking. Self-contained on purpose: it keeps its inline CSS because `generate-pdf.sh` renders it over `file://`. Do not externalize it.
- `cv.pdf` — generated PDF (see `generate-pdf.sh`)
- `assets/` — external CSS/JS: `index.css`, `cv.css`, plus `terminal.js` / `terminal.css` which are fetched on demand
- `favicon.ico` at the repo root, plus `favicon/` — see below
- `robots.txt` — crawl directives; `sitemap.xml` — URL discovery, generated

## Machine-readable layer

The site is built to be cheap for agents and crawlers to read. When editing pages, keep this intact:

- **Keep CSS and JS external.** `index.html` and `cv.html` must stay mostly content. Do not inline styles or scripts back into them.
- **The terminal easter egg is loaded on demand.** A small inline listener in `index.html` loads `assets/terminal.css` first, then `assets/terminal.js` and calls `window.__openTerminal()`. Either resource can fail and be retried on the next trigger; do not open an unstyled overlay. The script injects a native `<dialog>` for keyboard focus containment and exposes `window.__openTerminal`. Secret-word detection stays in the inline loader so reopening works.
- **Keep the HTML semantic.** `main` / `nav` / `footer` / real headings, not `div` soup.
- **`content/cv.json` is the source of truth for identity; JSON-LD is generated.** `index.html` carries a schema.org `@graph` (`WebSite` + `ProfilePage` + `Person`, all under stable `@id`s anchored on `https://emirbelkahia.com/#person`). `cv.html` carries a `ProfilePage` whose `mainEntity` reuses that same `@id`, plus the full `worksFor` role history, `hasCredential` and `knowsAbout`.
- **Edit content or templates, then regenerate.** Run `python3 build-site.py --pdf` when CV content or ATS layout changes, and commit generated outputs with their sources. Never hand-edit `index.html`, `cv.html`, `cv-ats.html`, `cv.md` or `llms.txt`. Explicit `web`/`ats` content variants preserve existing editorial differences; shared facts occur once in the JSON source.
- **Every new public page needs** a `<link rel="canonical">`, a `<meta name="description">`, the GoatCounter snippet, and an entry in the `sitemap()` page list in `build-site.py`.
- **`footer` must not be nested inside `main`.** A `footer` inside `main`/`article`/`section`/`aside`/`nav` loses its `contentinfo` landmark. On `index.html` the styled card is a `div.container`; `main` and `footer` are siblings inside it.

## Assets and the PDF

- **`profile-pic.jpeg` is 400x400 and must stay that way.** It is displayed at 160px on both pages, so 400 covers a 2x screen with headroom and falls 17% short of a 3x one, which is invisible on a circular avatar. It was 800x800 at 120 KB, which was **92% of the homepage payload** — more than the HTML, the CSS and every icon combined. Do not commit a bigger one.
- **Regenerate `cv.pdf` with `python3 build-site.py --pdf` in the same commit as any ATS content or layout change.** CI compares PDF text with the generated ATS HTML, but visual PDF review is still required. `generate-pdf.sh` refuses stale public text and injects private contacts at the `PDF_CONTACT` marker. Keep that marker in the ATS template.
- `generate-pdf.sh` **parses** `.env` instead of sourcing it. `source` word-splits an unquoted value containing spaces, so a phone number broke the script outright. Do not switch it back to `source`.
- The script runs a **lossless `qpdf` pass** at the end if qpdf is installed, worth about 20%: Chrome emits many small uncompressed objects and qpdf repacks them into compressed object streams without touching the image or the text. It is skipped with a note if qpdf is missing, so the build never fails on it.

## Icons

Six files, and it should stay six. The set was a 27-file generator dump until it was cut down; do not paste another one in.

- `favicon.ico` **at the repo root**, because every browser requests `/favicon.ico` on its own. It used to live in `favicon/`, so every visit produced a 404.
- `favicon/favicon-32x32.png` — declared tab icon
- `favicon/apple-touch-icon.png` — 180x180, iOS home screen. One size covers every current device.
- `favicon/icon-192.png` and `favicon/icon-512.png` — the two sizes `manifest.json` declares. 512 is the one that matters for installability and it was missing.
- `favicon/manifest.json`

Rules:

- **Four icon/manifest `<link>` tags on `index.html`, three on `cv.html`.** Anything beyond that is targeting devices that no longer exist.
- **PNGs are encoded as 8-bit greyscale**, since the mark is white on `#18181b`. RGBA costs 3-4x for no visible gain: `icon-512.png` went from 108 KB to 25 KB that way. If you regenerate one, re-encode it.
- **`theme-color` is per page** and must match that page's real background: `#0e0e0e` on `index.html` (dark card), `#f8f9fa` on `cv.html` (light). It drives the mobile URL bar, so a wrong value is visible.
- **`theme-color` in the HTML and `theme_color` in `manifest.json` must agree.** They said `#ffffff` and `#000000` on a `#0e0e0e` site.
- Dropped on purpose: all `ms-icon-*` and `browserconfig.xml` (Windows 8 tiles, and the file was orphaned with three 404 paths), eight of nine `apple-icon-*` sizes (iOS 6/7 era), `apple-icon-precomposed.png`, and five redundant `android-icon-*`. Five files were byte-identical duplicates of others.
- There is **no SVG favicon**, deliberately. The mark is a custom-font monogram; an SVG using `<text>` would render with whatever font the visitor has. Adding one means tracing the glyphs as paths.

## robots.txt and the sitemap

- **`robots.txt` has exactly one `User-agent: *` group, on purpose.** Per RFC 9309 a crawler obeys only the single most specific matching group and never merges it with `*`. A named group repeating `Allow: /` would silently shadow every `Disallow`, so named groups are only worth adding when their rules genuinely differ.
- **`cv.pdf` is excluded from both `robots.txt` and the sitemap.** It embeds email and phone (see `DEVELOPMENT.md`) while the web CV omits them. Listing it would hand that pair to search indexes and AI training corpora, which is the opposite of the intent. Do not add it back.
- **Maintenance documentation is excluded from GitHub Pages.** Keep `README.md`, `DEVELOPMENT.md` and `CLAUDE.md` in `_config.yml`; they belong in the public source repository, not on the published site. `cv.md` remains public by design as the agent-friendly CV.
- **`sitemap.xml` is generated by `build-site.py`, so there is no separate step to forget.** It is in the same `outputs` dict as the HTML, which means `--check` fails the build when it is stale, exactly like a hand-edited `cv.md`. Do not hand-edit it and do not reintroduce a standalone script.
- **`lastmod` is carried forward from the committed sitemap and bumped only for a page whose rendered text changed.** It deliberately does not come from `git log`: a git date shifts the moment the build is committed, so `--check` would fail on every pull request, and a depth-1 CI checkout reports the same date for every file anyway. The current rule also keeps the value honest, since it tracks content changes rather than commit noise.
- `changefreq` and `priority` are deliberately absent: Google ignores both.

`llms.txt` and `cv.md` are generated from the shared public source. A separate `llms-full.txt` is not generated: the full CV already lives in `cv.md`. `.nojekyll` is not planned: front-matter-less Markdown is already served without it, and adding it would newly expose `.env.example` and other dotfiles while disabling the `_config.yml` excludes that keep the test tooling out of the published site.

## Verification

- Run `npm run check:build` and `npm test` before merging site changes; setup and prerequisites are in `DEVELOPMENT.md`.
- Keep the CV fluid, with the single-column layout through 940px. Cover both sides of breakpoints, including the previously missed 769–939px range.
- Respect reduced motion and maintain WCAG AA text contrast on both light and dark backgrounds.
- The test suite runs with third-party requests stubbed. Also inspect visual changes with real fonts locally.
- `_config.yml` excludes test tooling, content sources, templates and the generator from the published site. Keep that list current when adding tooling. No Node runtime or browser-test dependency belongs in the visitor payload.


## Analytics

GoatCounter account: `emirbelkahia.goatcounter.com`

All public pages and CTAs must have `data-goatcounter-click` attributes. Current tracked events on `index.html`: `linkedin`, `cv`, `medium`, `n8n`, `github`, `connect-linkedin`. On `cv.html`: `download-cv`.

## Footer year

"made by Emir Belkahia, 2025" — this is the creation year, do not update it annually.
