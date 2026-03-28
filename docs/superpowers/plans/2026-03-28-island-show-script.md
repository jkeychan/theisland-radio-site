# island-show: Post-Show Automation Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single `island-show` CLI command that automates the complete Friday post-show workflow: parse raw exportify CSV, process the WART MP3 with ffmpeg (ID3 tags + cover art + optional trim), update `playlists.ts`, and upload to archive.org.

**Architecture:** `web/island-show.js` is the top-level orchestrator. Pure utility functions (date parsing, CSV parsing, path generation) live in the same file and are exported for testability. `archive-playlist.js` is refactored to export a standalone `updatePlaylistsTs` function that `island-show.js` calls directly. The script is symlinked to `~/bin/island-show` for global access from any show folder.

**Tech Stack:** Node.js (CommonJS), ffmpeg (via `execFileSync`), `ia` CLI (via `execFileSync`), Jest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `web/island-show.js` | Create | Orchestrator + exported utility functions |
| `web/archive-playlist.js` | Modify | Extract + export `updatePlaylistsTs` |
| `web/src/__tests__/island-show.test.js` | Create | Tests for all exported utility functions |
| `~/bin/island-show` | Create (symlink) | Global CLI access |

---

### Task 1: Export `updatePlaylistsTs` from `archive-playlist.js`

**Files:**
- Modify: `web/archive-playlist.js`
- Create: `web/src/__tests__/island-show.test.js`

- [ ] **Step 1: Write the failing test**

Create `web/src/__tests__/island-show.test.js`:

```js
/**
 * @jest-environment node
 */
'use strict';
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const { updatePlaylistsTs } = require('../../archive-playlist.js');

describe('updatePlaylistsTs', () => {
  let tmpFile;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `playlists-test-${Date.now()}.ts`);
    fs.writeFileSync(tmpFile,
      `import type { Playlist } from "@/types/content";\n\nexport const playlists: Playlist[] = [\n];`
    );
  });

  afterEach(() => { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); });

  it('prepends a new playlist entry and returns skipped:false', () => {
    const obj = `  {\n    id: "2026-03-27",\n    title: "March 27, 2026",\n    tracks: []\n  },`;
    const result = updatePlaylistsTs(obj, '2026-03-27', tmpFile);
    expect(result.skipped).toBe(false);
    expect(fs.readFileSync(tmpFile, 'utf8')).toContain('id: "2026-03-27"');
  });

  it('returns skipped:true when playlist id already exists', () => {
    const content = `import type { Playlist } from "@/types/content";\n\nexport const playlists: Playlist[] = [\n  {\n    id: "2026-03-27",\n    title: "March 27, 2026",\n    tracks: []\n  },\n];`;
    fs.writeFileSync(tmpFile, content);
    const obj = `  {\n    id: "2026-03-27",\n    title: "March 27, 2026",\n    tracks: []\n  },`;
    const result = updatePlaylistsTs(obj, '2026-03-27', tmpFile);
    expect(result.skipped).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/jeff/Documents/Code/Git-Managed/theisland/web && npx jest --testPathPattern='island-show' --no-coverage 2>&1 | tail -15
```

Expected: FAIL — `updatePlaylistsTs is not a function`

- [ ] **Step 3: Add `updatePlaylistsTs` to `archive-playlist.js`**

Add this function immediately before `main()` in `web/archive-playlist.js`:

```js
function updatePlaylistsTs(playlistObject, playlistId, playlistsFilePath) {
  if (!fs.existsSync(playlistsFilePath)) {
    throw new Error(`Playlists file not found: ${playlistsFilePath}`);
  }
  const content = fs.readFileSync(playlistsFilePath, 'utf8');
  if (content.includes(`id: "${playlistId}"`)) {
    return { skipped: true };
  }
  const exportRegex = /export const playlists: Playlist\[\] = \[([\s\S]*?)\];/;
  const match = content.match(exportRegex);
  if (!match) throw new Error('Could not find export const playlists in file');
  let existingContent = match[1].trim();
  if (existingContent) {
    existingContent = existingContent.endsWith(',') ? existingContent : existingContent + ',';
    existingContent = existingContent + '\n';
  }
  const newContent = `import type { Playlist } from "@/types/content";\n\nexport const playlists: Playlist[] = [\n${playlistObject}\n${existingContent}];`;
  fs.writeFileSync(playlistsFilePath, newContent);
  return { skipped: false };
}
```

Add `updatePlaylistsTs` to the `module.exports` line at the bottom:

```js
module.exports = { parseCsv, generatePlaylistObject, generateArchiveUrl, generateDescription, formatDate, updatePlaylistsTs };
```

- [ ] **Step 4: Refactor `main()` to call `updatePlaylistsTs`**

In `main()` inside the `try` block, replace the inline update block (the `fs.copyFileSync` backup, `fs.readFileSync`, `content.includes` check, `exportRegex` match, `fs.writeFileSync` sequence) with:

```js
print.status('Backing up current playlists.ts...');
const backupDate = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
fs.copyFileSync(playlistsFile, `${playlistsFile}.backup.${backupDate}`);

print.status('Generating updated playlists.ts...');
const updateResult = updatePlaylistsTs(playlistObject, playlistId, playlistsFile);
if (updateResult.skipped) {
  print.warning(`Playlist with ID '${playlistId}' already exists in playlists.ts — skipping to avoid duplicate.`);
  print.warning('Delete the existing entry first if you want to replace it.');
  process.exit(0);
}
print.success(`Successfully updated playlists.ts with new playlist: ${playlistTitle}`);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd /Users/jeff/Documents/Code/Git-Managed/theisland/web && npx jest --testPathPattern='island-show' --no-coverage 2>&1 | tail -15
```

Expected: PASS — 2 tests

- [ ] **Step 6: Commit**

```bash
cd /Users/jeff/Documents/Code/Git-Managed/theisland && git add web/archive-playlist.js web/src/__tests__/island-show.test.js && git commit -m "refactor: export updatePlaylistsTs from archive-playlist.js"
```

---

### Task 2: Utility functions with tests

**Files:**
- Create: `web/island-show.js` (utility functions + exports only — no `main()` yet)
- Modify: `web/src/__tests__/island-show.test.js` (add utility tests)

- [ ] **Step 1: Add utility function tests to `island-show.test.js`**

Append to `web/src/__tests__/island-show.test.js` (after the `updatePlaylistsTs` describe block):

```js
const {
  parseDateFromFolderName,
  buildId3Title,
  buildArchiveOrgTitle,
  buildOutputMp3Name,
  parseExportifyCsv,
  findWartFiles,
} = require('../../../island-show.js');

describe('parseDateFromFolderName', () => {
  it('parses a standard folder name', () => {
    expect(parseDateFromFolderName('The Island March 27 2026')).toBe('2026-03-27');
  });
  it('handles single-digit day', () => {
    expect(parseDateFromFolderName('The Island January 2 2026')).toBe('2026-01-02');
  });
  it('handles zero-padded day in folder name', () => {
    expect(parseDateFromFolderName('The Island October 03 2025')).toBe('2025-10-03');
  });
  it('handles the "Feburary" typo', () => {
    expect(parseDateFromFolderName('The Island Feburary 6 2026')).toBe('2026-02-06');
  });
  it('returns null for unrecognized format', () => {
    expect(parseDateFromFolderName('some other folder')).toBeNull();
  });
});

describe('buildId3Title', () => {
  it('formats without comma and without zero-padding', () => {
    expect(buildId3Title('2026-03-27')).toBe('The Island with Dub Tractor - March 27 2026');
  });
  it('does not zero-pad single-digit days', () => {
    expect(buildId3Title('2025-10-03')).toBe('The Island with Dub Tractor - October 3 2025');
  });
});

describe('buildArchiveOrgTitle', () => {
  it('formats with comma after day', () => {
    expect(buildArchiveOrgTitle('2026-03-27')).toBe('The Island with Dub Tractor - March 27, 2026');
  });
});

describe('buildOutputMp3Name', () => {
  it('appends .mp3 to the id3 title', () => {
    expect(buildOutputMp3Name('2026-03-27')).toBe('The Island with Dub Tractor - March 27 2026.mp3');
  });
});

describe('parseExportifyCsv', () => {
  it('extracts title, artist, album from exportify columns', () => {
    const csv = `Track URI,Track Name,Album Name,Artist Name(s),Release Date\nuri1,"Revelation Rockers","Raw Dubs, Vol. 1","Channel One",2025\n`;
    const result = parseExportifyCsv(csv);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ title: 'Revelation Rockers', artist: 'Channel One', album: 'Raw Dubs, Vol. 1' });
  });
  it('replaces semicolons with comma-space in artist names', () => {
    const csv = `Track URI,Track Name,Album Name,Artist Name(s),Release Date\nuri1,"Song","Album","Artist One;Artist Two",2025\n`;
    expect(parseExportifyCsv(csv)[0].artist).toBe('Artist One, Artist Two');
  });
  it('strips UTF-8 BOM', () => {
    const csv = `\uFEFFTrack URI,Track Name,Album Name,Artist Name(s),Release Date\nuri1,"Song","Album","Artist",2025\n`;
    expect(parseExportifyCsv(csv)).toHaveLength(1);
  });
  it('skips empty rows', () => {
    const csv = `Track URI,Track Name,Album Name,Artist Name(s),Release Date\n,,,,\n`;
    expect(parseExportifyCsv(csv)).toHaveLength(0);
  });
  it('throws if not an exportify CSV', () => {
    const csv = `Title,Artist,Album\nSong,Artist,Album\n`;
    expect(() => parseExportifyCsv(csv)).toThrow('Not an exportify CSV');
  });
});

describe('findWartFiles', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wart-test-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true }); });

  it('finds a file matching YYMMDD prefix', () => {
    fs.writeFileSync(path.join(tmpDir, '260327_0161.mp3'), '');
    expect(findWartFiles('2026-03-27', tmpDir)).toEqual(['260327_0161.mp3']);
  });
  it('returns empty array when no match', () => {
    expect(findWartFiles('2026-03-27', tmpDir)).toEqual([]);
  });
  it('returns all matches when multiple files match the same date', () => {
    fs.writeFileSync(path.join(tmpDir, '260327_0161.mp3'), '');
    fs.writeFileSync(path.join(tmpDir, '260327_0162.mp3'), '');
    expect(findWartFiles('2026-03-27', tmpDir)).toHaveLength(2);
  });
  it('does not match a different date', () => {
    fs.writeFileSync(path.join(tmpDir, '260313_0142.mp3'), '');
    expect(findWartFiles('2026-03-27', tmpDir)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/jeff/Documents/Code/Git-Managed/theisland/web && npx jest --testPathPattern='island-show' --no-coverage 2>&1 | tail -15
```

Expected: FAIL — `Cannot find module '../../../island-show.js'`

- [ ] **Step 3: Create `web/island-show.js` with utility functions**

```js
#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Fixed paths ─────────────────────────────────────────────────────────────
const WEB_DIR        = '/Users/jeff/Documents/Code/Git-Managed/theisland/web';
const ARCHIVES       = '/Users/jeff/Documents/The Island/SHOW ARCHIVES';
const WART_DIR       = '/Users/jeff/Documents/The Island/SHOW ARCHIVES/downloaded from WART';
const LOGO           = '/Users/jeff/Documents/The Island/SHOW ARCHIVES/dub-tractor-theisland-logo.png';
const PLAYLISTS_FILE = path.join(WEB_DIR, 'src', 'data', 'playlists.ts');

// ─── Month map (includes known folder-name typos) ─────────────────────────────
const MONTH_MAP = {
  january: '01', february: '02', feburary: '02', march: '03',
  april: '04', may: '05', june: '06', july: '07',
  august: '08', september: '09', october: '10', november: '11', december: '12',
};

// ─── Utility functions ────────────────────────────────────────────────────────

/**
 * Parse a date string from a show folder name.
 * e.g. "The Island March 27 2026" → "2026-03-27"
 * Returns null if the folder name doesn't match the expected pattern.
 */
function parseDateFromFolderName(name) {
  const m = name.match(/The Island (\w+) (\d{1,2}) (\d{4})$/);
  if (!m) return null;
  const [, monthStr, day, year] = m;
  const month = MONTH_MAP[monthStr.toLowerCase()];
  if (!month) return null;
  return `${year}-${month}-${day.padStart(2, '0')}`;
}

/**
 * Build the ID3 title tag and output filename base.
 * e.g. "2026-03-27" → "The Island with Dub Tractor - March 27 2026"
 * No comma, no zero-padding on day.
 */
function buildId3Title(dateStr) {
  const d     = new Date(dateStr + 'T12:00:00');
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const day   = d.getDate();
  const year  = d.getFullYear();
  return `The Island with Dub Tractor - ${month} ${day} ${year}`;
}

/**
 * Build the archive.org item title (has comma after day).
 * e.g. "2026-03-27" → "The Island with Dub Tractor - March 27, 2026"
 */
function buildArchiveOrgTitle(dateStr) {
  const d     = new Date(dateStr + 'T12:00:00');
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const day   = d.getDate();
  const year  = d.getFullYear();
  return `The Island with Dub Tractor - ${month} ${day}, ${year}`;
}

/**
 * Build the output MP3 filename.
 * e.g. "2026-03-27" → "The Island with Dub Tractor - March 27 2026.mp3"
 */
function buildOutputMp3Name(dateStr) {
  return buildId3Title(dateStr) + '.mp3';
}

/**
 * Parse a raw exportify CSV into track records.
 * Handles UTF-8 BOM, extracts Track Name / Artist Name(s) / Album Name,
 * and replaces semicolons in artist names with ", ".
 * Throws if the file is not an exportify CSV.
 */
function parseExportifyCsv(text) {
  const clean = text.replace(/^\uFEFF/, '');
  const lines = clean.split('\n');
  if (lines.length === 0) return [];

  const headers   = parseCsvRow(lines[0]);
  const titleIdx  = headers.indexOf('Track Name');
  const artistIdx = headers.indexOf('Artist Name(s)');
  const albumIdx  = headers.indexOf('Album Name');

  if (titleIdx === -1 || artistIdx === -1) {
    throw new Error('Not an exportify CSV: missing "Track Name" or "Artist Name(s)" columns');
  }

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols   = parseCsvRow(line);
    const title  = (cols[titleIdx]  || '').trim();
    const artist = (cols[artistIdx] || '').replace(/;/g, ', ').trim();
    const album  = albumIdx !== -1 ? (cols[albumIdx] || '').trim() : '';
    if (!title && !artist) continue;
    records.push({ title, artist, album });
  }
  return records;
}

function parseCsvRow(line) {
  const fields = [];
  let current  = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Find WART recording files matching a given show date.
 * WART files are named YYMMDD_NNNN.mp3.
 * Returns array of matching filenames (may be empty or multiple).
 */
function findWartFiles(dateStr, wartDir) {
  const [year, month, day] = dateStr.split('-');
  const prefix = `${year.slice(2)}${month}${day}`;
  return fs.readdirSync(wartDir)
    .filter(f => f.startsWith(prefix) && f.endsWith('.mp3'))
    .sort();
}

module.exports = {
  parseDateFromFolderName, buildId3Title, buildArchiveOrgTitle,
  buildOutputMp3Name, parseExportifyCsv, findWartFiles,
  ARCHIVES, WART_DIR, LOGO, PLAYLISTS_FILE,
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/jeff/Documents/Code/Git-Managed/theisland/web && npx jest --testPathPattern='island-show' --no-coverage 2>&1 | tail -20
```

Expected: All tests pass (both `updatePlaylistsTs` tests from Task 1 and all utility tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/jeff/Documents/Code/Git-Managed/theisland && git add web/island-show.js web/src/__tests__/island-show.test.js && git commit -m "feat: add island-show utility functions with tests"
```

---

### Task 3: `main()` orchestrator

**Files:**
- Modify: `web/island-show.js` (append `main()` after `module.exports`)

No new tests — `main()` is thin orchestration between already-tested utilities and external processes (`ffmpeg`, `ia`).

- [ ] **Step 1: Append `main()` to `web/island-show.js`**

Add the following after the existing `module.exports` line:

```js
// ─── Colours & printer ────────────────────────────────────────────────────────
const C = { RED:'\x1b[31m', GREEN:'\x1b[32m', YELLOW:'\x1b[33m', BLUE:'\x1b[34m', NC:'\x1b[0m' };
const print = {
  status:  (m) => console.log(`${C.BLUE}[INFO]${C.NC} ${m}`),
  success: (m) => console.log(`${C.GREEN}[SUCCESS]${C.NC} ${m}`),
  warning: (m) => console.log(`${C.YELLOW}[WARNING]${C.NC} ${m}`),
  error:   (m) => console.error(`${C.RED}[ERROR]${C.NC} ${m}`),
};

function parseArgs(argv) {
  const opts = {
    csv: null, wart: null, trimStart: null, trimEnd: null,
    noMp3: false, noWebsite: false, noUpload: false, forceMp3: false,
  };
  for (let i = 0; i < argv.length; i++) {
    if      (argv[i] === '--csv'         && argv[i+1]) opts.csv       = argv[++i];
    else if (argv[i] === '--wart'        && argv[i+1]) opts.wart      = argv[++i];
    else if (argv[i] === '--trim-start'  && argv[i+1]) opts.trimStart = argv[++i];
    else if (argv[i] === '--trim-end'    && argv[i+1]) opts.trimEnd   = argv[++i];
    else if (argv[i] === '--no-mp3')     opts.noMp3     = true;
    else if (argv[i] === '--no-website') opts.noWebsite = true;
    else if (argv[i] === '--no-upload')  opts.noUpload  = true;
    else if (argv[i] === '--force-mp3')  opts.forceMp3  = true;
  }
  return opts;
}

function detectCsv(cwd) {
  const csvs = fs.readdirSync(cwd).filter(f => f.endsWith('.csv'));
  if (csvs.length === 0) return null;
  // Pick the exportify CSV: identifiable by having the most columns
  const scored = csvs.map(f => {
    try {
      const firstLine = fs.readFileSync(path.join(cwd, f), 'utf8').replace(/^\uFEFF/, '').split('\n')[0];
      return { file: f, cols: firstLine.split(',').length };
    } catch { return { file: f, cols: 0 }; }
  });
  scored.sort((a, b) => b.cols - a.cols);
  return scored[0].file;
}

function main() {
  const { execFileSync }   = require('child_process');
  const {
    generatePlaylistObject, generateArchiveUrl, generateDescription,
    formatDate, updatePlaylistsTs,
  } = require('./archive-playlist.js');

  const opts       = parseArgs(process.argv.slice(2));
  const cwd        = process.cwd();
  const folderName = path.basename(cwd);

  // ── Detect date ──────────────────────────────────────────────────────────────
  const playlistDate = parseDateFromFolderName(folderName);
  if (!playlistDate) {
    print.error(`Cannot parse date from folder name: "${folderName}"`);
    print.error('Expected format: "The Island March 27 2026"');
    process.exit(1);
  }
  print.status(`Show date: ${playlistDate}`);

  // ── Detect and parse CSV ─────────────────────────────────────────────────────
  const csvFile = opts.csv || detectCsv(cwd);
  if (!csvFile) {
    print.error('No CSV found in current directory. Use --csv <file>.');
    process.exit(1);
  }
  const csvPath = path.isAbsolute(csvFile) ? csvFile : path.join(cwd, csvFile);
  if (!fs.existsSync(csvPath)) {
    print.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }
  const csvText = fs.readFileSync(csvPath, 'utf8');
  let records;
  try {
    records = parseExportifyCsv(csvText);
  } catch (e) {
    print.error(`CSV parse error: ${e.message}`);
    process.exit(1);
  }
  if (records.length === 0) {
    print.error('No tracks found in CSV.');
    process.exit(1);
  }
  print.status(`CSV: ${csvFile} (${records.length} tracks)`);

  const outputMp3Name = buildOutputMp3Name(playlistDate);
  const outputMp3Path = path.join(ARCHIVES, outputMp3Name);
  const id3Title      = buildId3Title(playlistDate);
  const year          = playlistDate.split('-')[0];
  const playlistTitle = formatDate(playlistDate);
  const archiveUrl    = generateArchiveUrl(playlistDate);
  const archiveOrgTitle = buildArchiveOrgTitle(playlistDate);
  const description   = generateDescription(records, playlistTitle);

  // ── Step 1: Process MP3 ──────────────────────────────────────────────────────
  let mp3Status = 'skipped (--no-mp3)';

  if (!opts.noMp3) {
    // Detect WART file
    let wartBasename = opts.wart;
    if (!wartBasename) {
      const matches = findWartFiles(playlistDate, WART_DIR);
      if (matches.length === 0) {
        print.error(`No WART recording found for ${playlistDate} in:`);
        print.error(`  ${WART_DIR}`);
        print.error('Use --wart <filename> to specify it.');
        process.exit(1);
      }
      if (matches.length > 1) {
        print.error(`Multiple WART recordings found for ${playlistDate}:`);
        matches.forEach(f => console.log(`  ${f}`));
        print.error('Use --wart <filename> to specify which one.');
        process.exit(1);
      }
      wartBasename = matches[0];
    }
    const wartPath = path.isAbsolute(wartBasename) ? wartBasename : path.join(WART_DIR, wartBasename);
    if (!fs.existsSync(wartPath)) {
      print.error(`WART file not found: ${wartPath}`);
      process.exit(1);
    }

    if (fs.existsSync(outputMp3Path) && !opts.forceMp3) {
      print.warning(`Output MP3 already exists — skipping ffmpeg step.`);
      print.warning(`  ${outputMp3Name}`);
      print.warning('Use --force-mp3 to overwrite.');
      mp3Status = 'skipped (already exists)';
    } else {
      print.status(`Processing: ${wartBasename} → ${outputMp3Name}`);
      const ffmpegArgs = ['-y'];  // -y first to overwrite without prompting when --force-mp3
      if (!opts.forceMp3) ffmpegArgs.splice(0, 1);  // remove -y if not forcing
      if (opts.trimStart) ffmpegArgs.push('-ss', opts.trimStart);
      if (opts.trimEnd)   ffmpegArgs.push('-to', opts.trimEnd);
      ffmpegArgs.push(
        '-i', wartPath,
        '-i', LOGO,
        '-map', '0:0',
        '-map', '1:0',
        '-c', 'copy',
        '-id3v2_version', '3',
        '-metadata:s:v', 'title=Album cover',
        '-metadata:s:v', 'comment=Cover (front)',
        '-metadata', `title=${id3Title}`,
        '-metadata', 'artist=Dub Tractor',
        '-metadata', 'album=The Island',
        '-metadata', `date=${year}`,
        '-metadata', 'track=1',
        '-metadata', 'genre=Dub Reggae',
        outputMp3Path,
      );
      try {
        execFileSync('ffmpeg', ffmpegArgs, { stdio: 'inherit' });
        mp3Status = outputMp3Name;
      } catch (e) {
        print.error(`ffmpeg failed: ${e.message}`);
        process.exit(1);
      }
    }
  }

  // ── Step 2: Update website ────────────────────────────────────────────────────
  let websiteStatus = 'skipped (--no-website)';

  if (!opts.noWebsite) {
    const archiveTxtName = `The Island ${playlistTitle}_archive.txt`;
    const archiveTxtPath = path.join(cwd, archiveTxtName);
    const pipeDelimited  = ['Title | Artist | Album',
      ...records.map(r => `${r.title} | ${r.artist} | ${r.album}`)
    ].join('\n');
    fs.writeFileSync(archiveTxtPath, pipeDelimited);
    print.status(`Wrote ${archiveTxtName}`);

    const playlistObject = generatePlaylistObject(records, playlistDate, playlistTitle, archiveUrl);
    const result = updatePlaylistsTs(playlistObject, playlistDate, PLAYLISTS_FILE);
    websiteStatus = result.skipped ? 'skipped (already in playlists.ts)' : 'playlists.ts updated';
  }

  // ── Step 3: Upload to archive.org ─────────────────────────────────────────────
  let uploadStatus = 'skipped (--no-upload)';

  if (!opts.noUpload) {
    try {
      execFileSync('ia', ['--version'], { stdio: 'ignore' });
    } catch {
      print.error('`ia` not found. Install and configure it:');
      console.log('  uv tool install internetarchive');
      console.log('  ia configure');
      process.exit(1);
    }

    const archiveTxtPath = path.join(cwd, `The Island ${playlistTitle}_archive.txt`);
    const identifier     = archiveUrl.split('/').pop();
    const iaArgs = [
      'upload', identifier,
      outputMp3Path,
      archiveTxtPath,
      '--metadata=mediatype:audio',
      `--metadata=title:${archiveOrgTitle}`,
      `--metadata=description:${description}`,
      '--metadata=subject:wartfm',
      '--metadata=subject:dub',
      '--metadata=subject:reggae',
      '--metadata=subject:community radio',
      `--metadata=date:${playlistDate}`,
      '--metadata=collection:opensource_audio',
    ];
    print.status(`Uploading: ${identifier}`);
    try {
      execFileSync('ia', iaArgs, { stdio: 'inherit' });
      uploadStatus = archiveUrl;
    } catch (e) {
      print.error(`Upload failed: ${e.message}`);
      process.exit(1);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('');
  console.log('==================================================');
  print.success('DONE');
  console.log('==================================================');
  console.log(`  MP3:     ${mp3Status}`);
  console.log(`  Website: ${websiteStatus}`);
  console.log(`  Upload:  ${uploadStatus}`);
  if (websiteStatus === 'playlists.ts updated') {
    console.log('');
    print.status('Commit your changes:');
    console.log(`  git -C "${WEB_DIR}" add . && git -C "${WEB_DIR}" commit -m "Archive playlist ${playlistTitle}"`);
    console.log(`  git -C "${WEB_DIR}" push origin main`);
  }
  console.log('');
}

if (require.main === module) {
  main();
}
```

- [ ] **Step 2: Verify no syntax errors**

```bash
node /Users/jeff/Documents/Code/Git-Managed/theisland/web/island-show.js --no-mp3 --no-website --no-upload 2>&1
```

Expected: `[ERROR] Cannot parse date from folder name` (ran from the wrong dir) — NOT a syntax error.

- [ ] **Step 3: Run full test suite**

```bash
cd /Users/jeff/Documents/Code/Git-Managed/theisland/web && npx jest --no-coverage 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/jeff/Documents/Code/Git-Managed/theisland && git add web/island-show.js && git commit -m "feat: add island-show main orchestrator"
```

---

### Task 4: Symlink, permissions, and smoke test

**Files:**
- Create: `~/bin/island-show` (symlink)

- [ ] **Step 1: Make the script executable**

```bash
chmod +x /Users/jeff/Documents/Code/Git-Managed/theisland/web/island-show.js
```

- [ ] **Step 2: Create the symlink**

```bash
ln -sf /Users/jeff/Documents/Code/Git-Managed/theisland/web/island-show.js ~/bin/island-show
```

- [ ] **Step 3: Verify global access**

```bash
island-show --no-mp3 --no-website --no-upload 2>&1 | head -3
```

Expected: `[ERROR] Cannot parse date from folder name: "<your current dir>"` — NOT `command not found`.

- [ ] **Step 4: Smoke test from a real show folder (website step only)**

```bash
cd "/Users/jeff/Documents/The Island/The Island March 13 2026" && island-show --no-mp3 --no-upload 2>&1
```

Expected: Either `skipped (already in playlists.ts)` (if March 13 is already there) or successful `playlists.ts updated` — no crash.

- [ ] **Step 5: Final commit**

```bash
cd /Users/jeff/Documents/Code/Git-Managed/theisland && git add web/island-show.js && git commit -m "feat: make island-show executable and add global symlink"
```

---

## Self-Review

**Spec coverage:**
- ✅ Single `island-show` command from show folder
- ✅ Date auto-detected from folder name (with typo handling)
- ✅ Exportify CSV auto-detected and parsed (semicolon replacement, column extraction)
- ✅ WART file auto-detected by `YYMMDD_` prefix
- ✅ All fixed paths as constants at top of file
- ✅ ffmpeg: trim flags, cover art embed, exact ID3 tags matching existing files
- ✅ Output MP3 to `SHOW ARCHIVES/` with correct filename format
- ✅ playlists.ts updated via `updatePlaylistsTs`
- ✅ `_archive.txt` written to show folder (cwd)
- ✅ `ia upload` with all correct metadata fields
- ✅ Skip flags: `--no-mp3`, `--no-website`, `--no-upload`, `--force-mp3`
- ✅ Error handling: no CSV, no WART, multiple WART, output exists, `ia` missing
- ✅ Summary output
- ✅ Symlinked to `~/bin`
