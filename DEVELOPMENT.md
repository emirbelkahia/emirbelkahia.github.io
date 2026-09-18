# Development guide

This document covers local maintenance of emirbelkahia.com. The public-facing
overview lives in `README.md`.

## Sources and generated files

Edit `content/cv.json` for content, `content/redirects.json` for branded short
links and `templates/` for HTML layout. Do not edit generated HTML, Markdown or
`llms.txt` directly. The same source also builds the homepage and CV JSON-LD,
keeping shared facts consistent.

| Path | Role |
|---|---|
| `content/cv.json` | Public identity, roles, skills, projects and links |
| `content/redirects.json` | Short route to existing link-key mappings; no destination URLs are duplicated |
| `templates/` | HTML layouts and styling hooks |
| `build-site.py` | Generator for public text formats and the optional PDF build |
| `index.html` | Generated homepage |
| `cv.html` | Generated styled web CV |
| `cv-ats.html` | Generated ATS-friendly CV without private contact details |
| `cv.md` | Generated public Markdown CV using the expanded ATS wording |
| `llms.txt` | Generated short map to the CV and public profiles |
| `cv.pdf` | PDF generated from the ATS HTML with private contacts injected at build time |
| `assets/` | CSS and JavaScript; terminal assets load on demand |
| `sitemap.xml` | Generated URL discovery file; do not edit it by hand |
| `<route>/index.html` | Generated noindex pages for branded short links |

## Public text build

Python 3.9 or newer is enough to generate the public text outputs:

```bash
python3 build-site.py
python3 build-site.py --check
```

The first command regenerates `index.html`, `cv.html`, `cv-ats.html`, `cv.md`,
`llms.txt`, `sitemap.xml` and the branded short-link pages. It also removes a
deleted route's old page when that page still carries the generator marker. The
second command reports stale, missing or obsolete outputs without writing
anything.

Roles are ordered newest first and the current role has `end: null`. Dates use
`YYYY-MM`, and employers refer to entries in `companies`. Strings are shared by
default. Explicit `web` and `ats` values preserve intentional editorial
differences between the concise web CV and expanded formats. A bullet with
`web: null` appears only in expanded formats.

`profile.summary` is the visible first-person summary. `profile.description` is
the third-person sentence used for metadata and JSON-LD. Content fields are
plain text rather than raw HTML.

## PDF build

The complete build requires Google Chrome and an ignored local `.env` file:

```bash
cp .env.example .env
python3 build-site.py --pdf
```

Fill the local `.env` with the contact values expected by the example file. The
PDF build injects them into a temporary HTML file and removes that file on exit.
Public text generation does not read `.env`.

The resulting PDF is publicly downloadable. Its `robots.txt` exclusion requests
that crawlers skip it, which is not access control. If `qpdf` is installed, the
build compresses the PDF without changing its content. `generate-pdf.sh` remains
available for a PDF-only build and refuses to run when public text outputs are
stale.

Rebuild and commit the PDF whenever ATS content or layout changes. Commit source
changes and generated outputs together.

## Site checks

The complete test suite requires Node.js 22, Python 3, Chromium and Poppler's
`pdftotext`:

```bash
npm ci
npx playwright install chromium
npm run check:build
npm test
```

Install Poppler with `brew install poppler` on macOS or
`sudo apt-get install poppler-utils` on Ubuntu. If port 4173 is already in use,
run the browser tests with another local port:

```bash
SITE_TEST_PORT=49173 npm test
```

The `pretest` hook runs `check:build` before Playwright. GitHub Actions performs
the same checks on pull requests and pushes to `main`, covering generated-file
freshness, generator regressions, Markdown discovery, responsive layouts,
accessibility, local links and icons, structured identity data, sitemap XML,
ATS/PDF text consistency, no-JavaScript reading, and terminal failure and
keyboard behaviour.

Browser tests block third-party requests so they do not depend on external fonts
or record analytics. Review typography with the real fonts before merging visual
changes. The automated PDF check compares text with the ATS source and does not
replace a visual PDF review. CI does not rebuild the PDF or require `.env`.
