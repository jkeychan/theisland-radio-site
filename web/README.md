The Island — WART 95.5 FM website built with Next.js and Tailwind CSS. Static-exported for GitHub Pages.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Key routes: `/`, `/playlists/`, `/playlists/archive/`, `/playlists/archive/all`, `/recordings/`, `/events/`, `/contact/`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Build and Export

```bash
npm run build
npx next export
```

Deployment via GitHub Actions publishes `out/` to `gh-pages`.

## Data via Google Sheets (CSV)

Set the following env vars (in repo secrets or `.env.local` for local):

```bash

NEXT_PUBLIC_TRACKS_CSV_URL=https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=<TAB_GID>
```

### URL Format Examples:

**Recommended format** (cleaner CSV export):
```bash
NEXT_PUBLIC_TRACKS_CSV_URL=https://docs.google.com/spreadsheets/d/15PgCEAXbdRBukiUXpRh3BDP9jwER4mzJfKslA51ort4/export?format=csv&gid=0
```

**Alternative format** (also works):
```bash
NEXT_PUBLIC_TRACKS_CSV_URL=https://docs.google.com/spreadsheets/d/1vOa_wABqG7n3IXNoAb7uGfSzstaj_Q8A8YOmB4K7Cp0/gviz/tq?tqx=out:csv&gid=1654309709
```

### Notes:
- Replace `<SHEET_ID>` with your Google Sheet id
- The `/export?format=csv&gid=` format works better with Google Sheets table formatting
- Headers expected:
  - Playlists: `id,title,description,tracks` (tracks can be newline- or semicolon-separated lines like `Artist - Title (Album)`)


The site will prefer the remote CSV feeds when the env vars are set, and fall back to local `src/data/*.ts` arrays otherwise.

## Weekly Playlist Updates

### Quick Update Process (GitHub CLI)

1. **Create new Google Sheet** for the week
2. **Get CSV export URL**: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0`
3. **Update GitHub variable**:
   ```bash
   gh variable set NEXT_PUBLIC_TRACKS_CSV_URL --body "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv&gid=0"
   ```
4. **Trigger rebuild**:
   ```bash
   git commit --allow-empty -m "Update playlist"
   git push origin main
   ```

### Alternative: GitHub Web Interface

1. Go to **Settings** → **Secrets and variables** → **Actions** → **Variables** tab
2. Update `NEXT_PUBLIC_TRACKS_CSV_URL` with your new CSV URL
3. Push any commit to trigger rebuild

## Weekly Playlist Archival Workflow

**Important**: When updating to a new week's playlist, you need to archive the previous week's playlist data.

### Option 1: Automated Archive Script (Recommended)

Use the provided `archive-playlist.js` script to automatically handle the entire archival process:

#### Prerequisites
1. Download your current week's playlist CSV from Google Sheets
2. Save it locally (e.g., `october_3_2025.csv`)

#### Archive Process
```bash
# Navigate to the web directory
cd web

# Run the archive script (Node.js version)
node archive-playlist.js october_3_2025.csv
```

**What this script does:**
- ✅ Converts your CSV to TypeScript playlist format (`src/data/playlists.ts`)
- ✅ Creates Archive.org-compatible pipe-delimited text file
- ✅ Automatically backs up existing `playlists.ts`
- ✅ Inserts the new playlist at the top (most recent first)
- ✅ Handles proper escaping of quotes and special characters

#### Script Options
```bash
# Use custom date (if not archiving today's show)
node archive-playlist.js playlist.csv --date 2025-10-03
```

### Option 2: Manual Archive Process

If you prefer manual control or need custom formatting:

1. **Export CSV**: Download playlist CSV from Google Sheets
2. **Convert for Archive.org**: 
   ```bash
   node csv-to-archive-converter.js your-playlist.csv
   ```
3. **Manual Edit**: Add playlist data to `src/data/playlists.ts`

### After Archiving

#### 1. Review Changes
```bash
# Check what files were modified
git status

# Review the updated playlists.ts
git diff src/data/playlists.ts
```

#### 2. Upload to Archive.org
- Copy content from the generated `*_archive.txt` file
- Paste into your Archive.org item description
- The pipe-delimited format creates a nice tracklist table

#### 3. Commit Changes
```bash
git add .
git commit -m "Archive playlist October 15, 2025"
git push origin main
```

### Archive.org Integration Tips

- **File naming**: Archive files follow pattern `The Island MM DD, YYYY_archive.txt`
- **Description format**: Copy the pipe-delimited content directly into Archive.org descriptions
- **Metadata**: The format automatically creates a clean table: `Title | Artist | Album`

### CSV Format Requirements

Your CSV must have these columns (order doesn't matter):
- `Title` / `title`
- `Artist` / `artist` 
- `Album` / `album`

Optional columns are ignored.

**Example CSV:**
```csv
Title,Artist,Album,Time
"The Russians Are Coming",Val Bennett,"The Bunny 'Striker' Lee Story",03:45
Marcus Garvey,Burning Spear,Harder Than The Best,04:12
```

### Troubleshooting

**Script fails to run?**
```bash
# Make sure you have Node.js installed
node --version

# Run from web directory
cd web
node archive-playlist.js your-file.csv
```

**Playlist already exists?**
- The script will warn you and update the existing entry
- Check the backup files if you need to restore

**CSV parsing issues?**
- Ensure your CSV uses standard quotes escaping (`""` for quotes inside fields)
- Check that headers match: Title, Artist, Album (case-insensitive)

## Deploy on GitHub Pages

The site is configured for static export and deployment to GitHub Pages.
