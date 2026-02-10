The Island — WART 95.5 FM website built with Next.js and Tailwind CSS. Static-exported for GitHub Pages.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Key routes: `/`, `/playlists/`, `/playlists/archive/`, `/playlists/archive/all`, `/recordings/`, `/events/`, `/contact/`.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Development

### Running Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (requires dev server running)
npm run test:e2e
```

### Build and Export

```bash
npm run build
npx next export
```

Deployment via GitHub Actions automatically publishes `out/` to GitHub Pages when pushing to main branch.


## Weekly Playlist Updates

The site uses Google Sheets to manage weekly playlists. Each week, a new publicly readable Google Sheet is created with the playlist data.

### Google Sheet Format

The sheet must have these columns:
- `Title` - Song title
- `Artist` - Artist name
- `Album` - Album name (optional, shown in parentheses)
- `Duration (ms)` - Track duration in milliseconds (optional)

### CSV Export URL Format

The Google Sheet must be publicly readable and exported as CSV using this format:

```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv
```

**Example URL:**
```
https://docs.google.com/spreadsheets/d/1x1RHBr3OcxPwe6YSCdNCQMxDB9BF3tmvyKvgwif3vTc/export?format=csv
```

**Note:** The sheet changes each week, so you'll need to update the `NEXT_PUBLIC_TRACKS_CSV_URL` environment variable with the new week's sheet URL.

### Updating the Weekly Playlist

1. **Create or update Google Sheet** with the week's playlist
2. **Make sheet publicly readable**: Share → "Anyone with the link can view"
3. **Get CSV export URL**: Use format `https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv`
4. **Update GitHub variable** (via CLI):
   ```bash
   gh variable set NEXT_PUBLIC_TRACKS_CSV_URL --body "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv"
   ```
5. **Or via GitHub Web Interface**:
   - Go to **Settings** → **Secrets and variables** → **Actions** → **Variables** tab
   - Update `NEXT_PUBLIC_TRACKS_CSV_URL` with your new CSV URL
6. **Trigger rebuild** (if needed):
   ```bash
   git commit --allow-empty -m "Update current week playlist CSV"
   git push
   ```

The site will automatically fetch and display tracks from the CSV URL when `NEXT_PUBLIC_TRACKS_CSV_URL` is set. If the environment variable is not set, the site will fall back to local `src/data/*.ts` arrays.

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
