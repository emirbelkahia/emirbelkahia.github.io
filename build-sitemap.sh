#!/bin/bash
# Regenerate sitemap.xml with lastmod taken from each file's last commit date.
# Run this after changing any listed page, so lastmod never drifts.
#
# cv.pdf is deliberately NOT listed: it embeds contact details (see README.md)
# and is excluded in robots.txt.
set -e
cd "$(dirname "$0")"

PAGES=(index.html cv.html)
LOCS=("https://emirbelkahia.com/" "https://emirbelkahia.com/cv.html")

{
  echo '<?xml version="1.0" encoding="UTF-8"?>'
  echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  for i in "${!PAGES[@]}"; do
    DATE=$(git log -1 --format=%cs -- "${PAGES[$i]}")
    [ -z "$DATE" ] && DATE=$(date +%F)
    echo "  <url>"
    echo "    <loc>${LOCS[$i]}</loc>"
    echo "    <lastmod>${DATE}</lastmod>"
    echo "  </url>"
  done
  echo '</urlset>'
} > sitemap.xml

echo "sitemap.xml regenerated:"
grep -E '<loc>|<lastmod>' sitemap.xml | sed 's/^/  /'
