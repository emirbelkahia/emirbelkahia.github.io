#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
SOURCE_HTML="$SCRIPT_DIR/cv-ats.html"
TEMP_HTML="$SCRIPT_DIR/_cv-ats-pdf.html"
OUTPUT_PDF="$SCRIPT_DIR/cv.pdf"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found. Copy .env.example to .env and fill in your details."
  exit 1
fi

source "$ENV_FILE"

if [ -z "$CV_EMAIL" ] || [ -z "$CV_PHONE" ]; then
  echo "Error: CV_EMAIL and CV_PHONE must be set in .env"
  exit 1
fi

python3 -c "
with open('$SOURCE_HTML', 'r') as f:
    html = f.read()

html = html.replace(
    '<em>Email &amp; phone available on PDF version.</em> |\n        <a href=\"https://www.linkedin.com/in/emirbelkahia\" target=\"_blank\">linkedin.com/in/emirbelkahia</a>',
    '$CV_EMAIL | $CV_PHONE | <a href=\"https://www.linkedin.com/in/emirbelkahia\" target=\"_blank\">linkedin.com/in/emirbelkahia</a>'
)

with open('$TEMP_HTML', 'w') as f:
    f.write(html)
"

"$CHROME" --headless=new --no-sandbox \
  --print-to-pdf="$OUTPUT_PDF" \
  --print-to-pdf-no-header \
  --no-pdf-header-footer \
  "file://$TEMP_HTML" 2>/dev/null

rm "$TEMP_HTML"

echo "Done: cv.pdf generated."
