# emirbelkahia.com

Source code for my personal website and CV — hosted on GitHub Pages.

📬 [linkedin.com/in/emirbelkahia](https://www.linkedin.com/in/emirbelkahia)
🌐 [emirbelkahia.com](https://emirbelkahia.com)

## Structure

| File | Role |
|---|---|
| `content/cv.json` | Shared public content: identity, roles, skills, projects and links |
| `templates/` | HTML layout and styling hooks, with simple placeholders |
| `build-site.py` | Standard-library Python generator for all text formats; optional PDF build |
| `index.html` | Generated homepage |
| `cv.html` | Generated web CV (public, styled version) |
| `cv-ats.html` | Generated ATS-friendly CV; no private contact details |
| `cv.md` | Generated public Markdown CV, using the expanded ATS wording |
| `llms.txt` | Generated short map to the CV and public profiles |
| `cv.pdf` | PDF generated from `cv-ats.html` with email & phone injected at build time. Rebuild it whenever `cv-ats.html` changes |
| `assets/` | External CSS & JS. `terminal.js` / `terminal.css` load on demand |
| `favicon.ico` + `favicon/` | Icon set — 6 files, see CLAUDE.md before adding any |
| `robots.txt` | Crawl directives — pages open to all crawlers, `cv.pdf` excluded |
| `sitemap.xml` | URL discovery for crawlers — generated, do not hand-edit |
| `build-sitemap.sh` | Regenerates `sitemap.xml` with `lastmod` from git history |

## Editing and building

Edit `content/cv.json` for content and `templates/` for HTML layout. Do not edit
the generated HTML, Markdown or `llms.txt` directly. The same source also builds
the homepage and CV JSON-LD, so shared facts stay consistent.

Python 3.9+ is enough to generate the public text outputs, with no dependencies:

```bash
python3 build-site.py          # index.html, cv.html, cv-ats.html, cv.md, llms.txt
python3 build-site.py --check  # report stale/missing text outputs; write nothing
```

Roles are ordered newest first; the first role is current (`end: null`). Dates
use `YYYY-MM`, and employers refer to entries in `companies`. Strings are shared
by default. Where the existing web CV uses shorter wording, explicit
`{"web": "short version", "ats": "expanded version"}` values preserve that choice.
A bullet with `web: null` appears only in the expanded formats. Markdown uses
the expanded ATS wording. These content fields are plain text, not raw HTML.

To build **all formats, including the PDF**, install Google Chrome (the script
uses its macOS application path), configure the ignored `.env`, then run:

```bash
cp .env.example .env           # first time only; fill in email and phone
python3 build-site.py --pdf
```

The PDF is rendered from the generated ATS HTML. Email and phone are injected
only into a temporary HTML file, which is removed on exit. Public text generation
does not read `.env`. The PDF remains publicly downloadable; `robots.txt` requests
that crawlers skip it, which is not access control. Optional `qpdf` compresses it
without changing its content. Rebuild and commit the PDF with ATS content or
layout changes. `./generate-pdf.sh` remains available but refuses stale text
outputs; `--pdf` regenerates those first.

Commit source changes and generated outputs together. For changes to listed
HTML pages, run `./build-sitemap.sh` after committing them: its dates come from
git history. `cv.md` and `llms.txt` are discovered through links in the HTML head;
`llms.txt` links to `cv.md`. These files add no browser JavaScript or runtime.
The existing HTML pages remain the canonical sitemap entries.

## Site checks

The site remains static HTML/CSS/JS. Node dependencies are only used for tests
and are excluded from GitHub Pages along with the test files.

With Node.js 22, Python 3 and Poppler (`pdftotext`) installed:

```bash
npm ci
npx playwright install chromium
npm run check:build
npm test
```

If port 4173 is occupied, use `SITE_TEST_PORT=49173 npm test`.
On macOS, install Poppler with `brew install poppler`; on Ubuntu, use
`sudo apt-get install poppler-utils`.

`npm test` first runs `check:build` through its pretest hook. GitHub Actions runs
the same checks on pull requests and pushes to `main`:
generated-file freshness, generator regression tests, Markdown discovery,
12 viewport widths per page, accessibility, local links and icons, JSON-LD
identity consistency, sitemap XML, ATS/PDF text consistency, no-JavaScript
reading, and terminal loading failures and keyboard behavior. Tests block
external requests so they do not depend on Google Fonts or record analytics;
visually review typography with the real fonts before merging visual changes.

The PDF check compares text against the ATS source; it does not replace a
visual PDF review. CI does not rebuild the PDF or need the private `.env`.
