# emirbelkahia.com

Source code for my personal website and CV — hosted on GitHub Pages.

📬 [linkedin.com/in/emirbelkahia](https://www.linkedin.com/in/emirbelkahia)
🌐 [emirbelkahia.com](https://emirbelkahia.com)

## Structure

| File | Role |
|---|---|
| `index.html` | Homepage |
| `cv.html` | Web CV (public, styled version) |
| `cv-ats.html` | ATS-friendly CV source — no contact details (bot-safe) |
| `cv.pdf` | PDF generated from `cv-ats.html` with email & phone injected at build time. Rebuild it whenever `cv-ats.html` changes |
| `assets/` | External CSS & JS. `terminal.js` / `terminal.css` load on demand |
| `favicon.ico` + `favicon/` | Icon set — 6 files, see CLAUDE.md before adding any |
| `robots.txt` | Crawl directives — pages open to all crawlers, `cv.pdf` excluded |
| `sitemap.xml` | URL discovery for crawlers — generated, do not hand-edit |
| `build-sitemap.sh` | Regenerates `sitemap.xml` with `lastmod` from git history |

## Generating the PDF

The PDF includes contact details (email, phone) but `cv-ats.html` does not, to avoid bot crawling.

```bash
# 1. Copy the example env file and fill in your details
cp .env.example .env

# 2. Generate the PDF
./generate-pdf.sh
```

The `.env` file is gitignored and will never be committed.

## Site checks

The site remains static HTML/CSS/JS. Node dependencies are only used for tests
and are excluded from GitHub Pages along with the test files.

With Node.js 22, Python 3 and Poppler (`pdftotext`) installed:

```bash
npm ci
npx playwright install chromium
npm test
```

If port 4173 is occupied, use `SITE_TEST_PORT=49173 npm test`.
On macOS, install Poppler with `brew install poppler`; on Ubuntu, use
`sudo apt-get install poppler-utils`.

GitHub Actions runs the same checks on pull requests and pushes to `main`:
12 viewport widths per page, accessibility, local links and icons, JSON-LD
identity consistency, sitemap XML, ATS/PDF text consistency, no-JavaScript
reading, and terminal loading failures and keyboard behavior. Tests block
external requests so they do not depend on Google Fonts or record analytics;
visually review typography with the real fonts before merging visual changes.

The PDF check compares text against the ATS source; it does not replace a
visual PDF review. CI does not rebuild the PDF or need the private `.env`.
