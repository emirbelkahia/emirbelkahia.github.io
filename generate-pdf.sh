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

# Parse .env rather than sourcing it. `source` word-splits an unquoted value
# containing spaces, so a phone number like "+33 6 12 34 56 78" made bash try
# to run part of it as a command. Parsing keeps the value whole either way, and
# tolerates surrounding quotes if they are present.
read_env() {
  sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" "$ENV_FILE" \
    | head -1 | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

CV_EMAIL=$(read_env CV_EMAIL)
CV_PHONE=$(read_env CV_PHONE)

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

# Chrome emits a lot of small uncompressed objects. qpdf repacks them into
# compressed object streams, which is lossless: it does not touch the embedded
# image or the text. Worth about 20%. Skipped cleanly if qpdf is not installed.
if command -v qpdf >/dev/null 2>&1; then
  BEFORE=$(wc -c < "$OUTPUT_PDF" | tr -d ' ')
  qpdf --object-streams=generate --compress-streams=y --recompress-flate \
       --compression-level=9 "$OUTPUT_PDF" "$OUTPUT_PDF.opt" \
    && mv "$OUTPUT_PDF.opt" "$OUTPUT_PDF"
  AFTER=$(wc -c < "$OUTPUT_PDF" | tr -d ' ')
  echo "Compressed with qpdf: $BEFORE -> $AFTER bytes."
else
  echo "Note: qpdf not found, skipping compression (brew install qpdf)."
fi

echo "Done: cv.pdf generated."
