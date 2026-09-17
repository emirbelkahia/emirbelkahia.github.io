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
| `cv.pdf` | PDF generated from `cv-ats.html` with email & phone injected at build time |
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
