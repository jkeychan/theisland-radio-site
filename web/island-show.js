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
  const d     = new Date(dateStr + 'T12:00:00Z');
  const month = d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const day   = d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' });
  const year  = d.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'UTC' });
  return `The Island with Dub Tractor - ${month} ${day} ${year}`;
}

/**
 * Build the archive.org item title (has comma after day).
 * e.g. "2026-03-27" → "The Island with Dub Tractor - March 27, 2026"
 */
function buildArchiveOrgTitle(dateStr) {
  const d     = new Date(dateStr + 'T12:00:00Z');
  const month = d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  const day   = d.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' });
  const year  = d.toLocaleDateString('en-US', { year: 'numeric', timeZone: 'UTC' });
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
  const lines = clean.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
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
  if (scored.length > 1 && scored[0].cols === scored[1].cols) {
    return { ambiguous: scored.map(s => s.file) };
  }
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
  const detected = opts.csv || detectCsv(cwd);
  if (!detected) {
    print.error('No CSV found in current directory. Use --csv <file>.');
    process.exit(1);
  }
  if (detected && typeof detected === 'object' && detected.ambiguous) {
    print.error('Multiple CSVs with the same column count — cannot auto-detect:');
    detected.ambiguous.forEach(f => console.log(`  ${f}`));
    print.error('Use --csv <file> to specify which one.');
    process.exit(1);
  }
  const csvFile = detected;
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

  const outputMp3Name   = buildOutputMp3Name(playlistDate);
  const outputMp3Path   = path.join(ARCHIVES, outputMp3Name);
  const id3Title        = buildId3Title(playlistDate);
  const year            = playlistDate.split('-')[0];
  const playlistTitle   = formatDate(playlistDate);
  const archiveUrl      = generateArchiveUrl(playlistDate);
  const archiveOrgTitle = buildArchiveOrgTitle(playlistDate);
  const description     = generateDescription(records, playlistTitle);

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
      const ffmpegArgs = [];
      if (opts.forceMp3) ffmpegArgs.push('-y');
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

    if (!fs.existsSync(outputMp3Path)) {
      print.error(`MP3 not found: ${outputMp3Path}`);
      print.error('Run without --no-mp3 to process it first, or use --no-upload to skip uploading.');
      process.exit(1);
    }

    const archiveTxtPath = path.join(cwd, `The Island ${playlistTitle}_archive.txt`);
    const identifier     = archiveUrl.split('/').pop();
    const uploadFiles = [outputMp3Path];
    if (fs.existsSync(archiveTxtPath)) {
      uploadFiles.push(archiveTxtPath);
    } else {
      print.warning(`Archive txt not found — uploading MP3 only. Run without --no-website to include the tracklist.`);
    }
    const iaArgs = [
      'upload', identifier,
      ...uploadFiles,
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
