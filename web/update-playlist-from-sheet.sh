#!/bin/bash

# One-shot playlist update from Google Sheet URL
# Usage: ./update-playlist-from-sheet.sh "GOOGLE_SHEET_URL" [--date YYYY-MM-DD]
#
# Accepts any Google Sheets URL, e.g.:
#   https://docs.google.com/spreadsheets/d/1IO8H4JYfvW_cw0cDV2tSV2VH57XCo9kPh9dmN6fV_kE/edit?gid=517217887#gid=517217887
#
# Options:
#   --date YYYY-MM-DD   Playlist date (default: today)
#   --no-push          Skip gh variable, commit, and push (for testing)

set -e

# Run from script's directory (web/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

SHEET_URL="$1"
shift || true
PLAYLIST_DATE=""
SKIP_PUSH=false

# Parse optional args
while [[ $# -gt 0 ]]; do
  case $1 in
    --date)
      PLAYLIST_DATE="$2"
      shift 2
      ;;
    --no-push)
      SKIP_PUSH=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ -z "$SHEET_URL" ]; then
  echo "Usage: ./update-playlist-from-sheet.sh \"GOOGLE_SHEET_URL\" [--date YYYY-MM-DD] [--no-push]"
  echo ""
  echo "Example:"
  echo "  ./update-playlist-from-sheet.sh \"https://docs.google.com/spreadsheets/d/1IO8H4JYfvW_cw0cDV2tSV2VH57XCo9kPh9dmN6fV_kE/edit?gid=517217887\""
  echo "  ./update-playlist-from-sheet.sh \"https://docs.google.com/spreadsheets/d/1abc123/edit\" --date 2026-02-13"
  exit 1
fi

# Extract spreadsheet ID (handles /d/ID/edit or /d/ID/...)
SPREADSHEET_ID=$(echo "$SHEET_URL" | sed -n 's|.*/d/\([a-zA-Z0-9_-]*\).*|\1|p' | head -1)
if [ -z "$SPREADSHEET_ID" ]; then
  echo "Error: Could not extract spreadsheet ID from URL"
  echo "URL: $SHEET_URL"
  exit 1
fi

# Extract gid (default 0 for first sheet)
GID=$(echo "$SHEET_URL" | sed -n 's/.*[?&#]gid=\([0-9]*\).*/\1/p' | head -1)
GID="${GID:-0}"

# Build export URL
EXPORT_URL="https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${GID}"

echo "📋 Spreadsheet ID: $SPREADSHEET_ID"
echo "📄 Export URL: $EXPORT_URL"
echo ""

# Default date to today if not provided
if [ -z "$PLAYLIST_DATE" ]; then
  PLAYLIST_DATE=$(date +%Y-%m-%d)
fi

# Human-readable title (e.g. "February 13, 2026")
PLAYLIST_TITLE=$(date -j -f "%Y-%m-%d" "$PLAYLIST_DATE" "+%B %-d, %Y" 2>/dev/null || date -d "$PLAYLIST_DATE" "+%B %-d, %Y" 2>/dev/null)
if [ -z "$PLAYLIST_TITLE" ]; then
  PLAYLIST_TITLE="$PLAYLIST_DATE"
fi

CSV_FILENAME="${PLAYLIST_TITLE}.csv"

# 1. Download CSV
echo "⬇️  Downloading CSV..."
curl -sL "$EXPORT_URL" -o "$CSV_FILENAME"
if ! head -1 "$CSV_FILENAME" | grep -qi "title\|artist"; then
  echo "Error: Downloaded file doesn't look like a playlist CSV. Check sheet is public (Anyone with link can view)."
  rm -f "$CSV_FILENAME"
  exit 1
fi

# 2. Run archive-playlist.js (updates playlists.ts + generates Archive.org pipe-delimited file)
echo "📝 Updating playlists.ts and generating Archive.org format..."
node archive-playlist.js "$CSV_FILENAME" --date "$PLAYLIST_DATE"

# 2b. Ensure Archive.org pipe-delimited file exists and report its path
ARCHIVE_FILENAME="The Island ${PLAYLIST_TITLE}_archive.txt"
ARCHIVE_PATH="${SCRIPT_DIR}/${ARCHIVE_FILENAME}"
if [ -f "$ARCHIVE_PATH" ]; then
  echo ""
  echo "📋 Archive.org playlist ready: $ARCHIVE_PATH"
  echo "   Copy the contents to paste into your Archive.org item description."
else
  echo "⚠️  Expected Archive.org file not found: $ARCHIVE_PATH"
fi

if [ "$SKIP_PUSH" = true ]; then
  echo ""
  echo "✅ Done (--no-push: skipped gh variable, commit, and push)"
  exit 0
fi

# 3. Set GitHub variable
echo ""
echo "🔧 Setting NEXT_PUBLIC_TRACKS_CSV_URL..."
gh variable set NEXT_PUBLIC_TRACKS_CSV_URL --body "$EXPORT_URL"

# 4. Commit and push (from repo root, since gh is repo-scoped)
REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

echo ""
echo "📤 Committing and pushing..."
if git diff --quiet web/src/data/playlists.ts 2>/dev/null; then
  echo "No changes to commit (playlist may already exist)."
else
  git add web/src/data/playlists.ts
  git commit -m "Archive playlist $PLAYLIST_TITLE" --no-verify
  git push origin main
fi

echo ""
echo "✅ All done! Deploy will pick up the new playlist automatically."
if [ -f "$ARCHIVE_PATH" ]; then
  echo "📋 For Archive.org: $ARCHIVE_PATH"
fi
