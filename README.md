# emirbelkahia.com

Source code for my personal website and CV, hosted on GitHub Pages.

- 🌐 [emirbelkahia.com](https://emirbelkahia.com)
- 📄 [Web CV](https://emirbelkahia.com/cv.html)
- 📬 [LinkedIn](https://www.linkedin.com/in/emirbelkahia)

## Philosophy

I like systems that are carefully crafted and minimal. My UX background
probably has something to do with it. Less is more, as long as less works
reliably and fulfils its purpose.

This site is deliberately lean, as if the planet were running out of RAM.
*(September 2026 joke. Let's see how well it ages.)*

Digression over.

The site is designed to make my work and experience easy to find, read and
share. It uses static HTML, CSS and a small amount of JavaScript, with no
framework or runtime dependency in the visitor's browser. Function comes first;
polish is added where it makes the experience clearer or more enjoyable.

## One system, three CVs

The site produces three representations of the same experience:

- The [web CV](https://emirbelkahia.com/cv.html) is designed for humans, who are
  still users of the internet until further notice.
- [`cv.md`](https://emirbelkahia.com/cv.md) gives AI agents a clean text version,
  since they are also users of the internet until further notice.
- The [ATS-friendly CV](https://emirbelkahia.com/cv-ats.html) remains readable by
  humans while giving recruiting software a predictable, machine-readable
  document. The PDF is rendered from this version.

Maintaining all three by hand would invite content drift. This is where my
system-builder instinct kicks in: `content/cv.json` is the single source of
truth, and one Python build system generates every format, the structured data,
discovery files, sitemap and branded short links. An update propagates
everywhere, while automated checks catch stale output. Content drifting out of
date is a mundane but very real problem on the web.

The generated pages are semantic, responsive and tested for accessibility.
GitHub Pages serves the resulting static files directly.

## The agentic layer

I have considered exposing the site through WebMCP. The idea is still early and
the site does not yet have a useful interaction that would justify the extra
surface area. If the agentic web evolves in that direction, I may revisit it.
Until then, the Markdown CV handles the practical reading use case with much
less machinery.

## Local development

```bash
python3 build-site.py
npm ci
npm test
```

Build rules, PDF generation and test prerequisites are documented in
[`DEVELOPMENT.md`](DEVELOPMENT.md).
