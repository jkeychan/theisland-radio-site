#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Fixed paths ─────────────────────────────────────────────────────────────
const WEB_DIR        = '/Users/jeff/Documents/Code/Git-Managed/theisland/web';
const DB_DIR         = '/Users/jeff/Documents/Code/Git-Managed/theisland/db';
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
    csv: null, spotifyUrl: null, wart: null, trimStart: null, trimEnd: null,
    mp3Only: false, noMp3: false, noWebsite: false, noUpload: false, noDb: false, forceMp3: false,
  };
  for (let i = 0; i < argv.length; i++) {
    if      (argv[i] === '--csv'          && argv[i+1]) opts.csv        = argv[++i];
    else if (argv[i] === '--spotify-url'  && argv[i+1]) opts.spotifyUrl = argv[++i];
    else if (argv[i] === '--wart'         && argv[i+1]) opts.wart       = argv[++i];
    else if (argv[i] === '--trim-start'   && argv[i+1]) opts.trimStart  = argv[++i];
    else if (argv[i] === '--trim-end'     && argv[i+1]) opts.trimEnd    = argv[++i];
    else if (argv[i] === '--mp3-only')    opts.mp3Only   = true;
    else if (argv[i] === '--no-mp3')      opts.noMp3     = true;
    else if (argv[i] === '--no-website')  opts.noWebsite = true;
    else if (argv[i] === '--no-upload')   opts.noUpload  = true;
    else if (argv[i] === '--no-db')       opts.noDb      = true;
    else if (argv[i] === '--force-mp3')   opts.forceMp3  = true;
  }
  return opts;
}

// ─── Spotify helpers ──────────────────────────────────────────────────────────

function extractPlaylistId(urlOrId) {
  const m = urlOrId.match(/playlist\/([A-Za-z0-9]+)/);
  return m ? m[1] : urlOrId;
}

function readSpotifyConfig() {
  const tomlPath = path.join(DB_DIR, 'config.toml');
  if (!fs.existsSync(tomlPath)) return null;
  const text = fs.readFileSync(tomlPath, 'utf8');
  const id     = (text.match(/client_id\s*=\s*"([^"]+)"/)     || [])[1];
  const secret = (text.match(/client_secret\s*=\s*"([^"]+)"/) || [])[1];
  return (id && secret) ? { clientId: id, clientSecret: secret } : null;
}

function httpsPost(url, headers, body) {
  const https = require('https');
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers },
      (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d })); },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsGet(url, headers) {
  const https = require('https');
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: 'GET', headers },
      (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d })); },
    );
    req.on('error', reject);
    req.end();
  });
}

const TOKEN_CACHE = path.join(DB_DIR, 'spotify_tokens.json');

function readTokenCache() {
  if (!fs.existsSync(TOKEN_CACHE)) return null;
  try { return JSON.parse(fs.readFileSync(TOKEN_CACHE, 'utf8')); }
  catch { return null; }
}

function writeTokenCache(data) {
  fs.writeFileSync(TOKEN_CACHE, JSON.stringify(data, null, 2));
}

function generatePKCE() {
  const crypto    = require('crypto');
  const verifier  = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

async function refreshAccessToken(config, refreshToken) {
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: refreshToken,
    client_id:     config.clientId,
  }).toString();
  const res  = await httpsPost(
    'https://accounts.spotify.com/api/token',
    { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body,
  );
  const data = JSON.parse(res.body);
  if (!data.access_token) throw new Error(`Token refresh failed: ${res.body}`);
  return data;
}

async function runPKCEFlow(config) {
  const http   = require('http');
  const { verifier, challenge } = generatePKCE();
  const state  = require('crypto').randomBytes(8).toString('hex');
  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             config.clientId,
    scope:                 'playlist-read-private playlist-read-collaborative',
    redirect_uri:          'http://127.0.0.1:8888/callback',
    state,
    code_challenge_method: 'S256',
    code_challenge:        challenge,
  });
  const authUrl = `https://accounts.spotify.com/authorize?${params}`;

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1:8888');
      if (url.pathname !== '/callback') { res.writeHead(404); res.end(); return; }

      const gotState = url.searchParams.get('state');
      const gotCode  = url.searchParams.get('code');
      const authErr  = url.searchParams.get('error');

      const html = (msg) => `<html><body style="font-family:sans-serif;padding:2em"><h2>${msg}</h2><p>You can close this tab.</p></body></html>`;

      if (authErr) {
        res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html('Authorization failed'));
        server.close(); reject(new Error(`Spotify auth error: ${authErr}`)); return;
      }
      if (gotState !== state) {
        res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html('State mismatch — try again'));
        server.close(); reject(new Error('State mismatch')); return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(html('Authorized! Fetching playlist...'));
      server.close(); resolve(gotCode);
    });

    server.on('error', (e) => reject(new Error(`Could not start local server on :8888 — ${e.message}`)));
    server.listen(8888, '127.0.0.1', () => {
      console.log('\n[AUTH] Opening Spotify login in browser — approve access, then return here.\n');
      require('child_process').execFile('open', [authUrl]);
    });
  });

  const body = new URLSearchParams({
    grant_type:    'authorization_code',
    code,
    redirect_uri:  'http://127.0.0.1:8888/callback',
    client_id:     config.clientId,
    code_verifier: verifier,
  }).toString();
  const res  = await httpsPost(
    'https://accounts.spotify.com/api/token',
    { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    body,
  );
  const data = JSON.parse(res.body);
  if (!data.access_token) throw new Error(`Code exchange failed: ${res.body}`);
  return data;
}

async function getUserToken(config) {
  const cache = readTokenCache();
  if (cache && cache.access_token && cache.expires_at > Date.now() + 60_000) {
    return cache.access_token;
  }
  if (cache && cache.refresh_token) {
    try {
      const data = await refreshAccessToken(config, cache.refresh_token);
      writeTokenCache({
        access_token:  data.access_token,
        refresh_token: data.refresh_token || cache.refresh_token,
        expires_at:    Date.now() + (data.expires_in * 1000),
      });
      return data.access_token;
    } catch { /* fall through to full PKCE flow */ }
  }
  const data = await runPKCEFlow(config);
  writeTokenCache({
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    expires_at:    Date.now() + (data.expires_in * 1000),
  });
  return data.access_token;
}

async function fetchSpotifyTracks(playlistId, token) {
  const records = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=100`;
  while (url) {
    const res = await httpsGet(url, { 'Authorization': `Bearer ${token}` });
    if (res.status !== 200) throw new Error(`Spotify API ${res.status}: ${res.body}`);
    const data = JSON.parse(res.body);
    for (const item of data.items) {
      const t = item && item.item;
      if (!t || !t.name || t.type !== 'track') continue;
      records.push({
        title:  t.name,
        artist: (t.artists || []).map(a => a.name).join(', '),
        album:  (t.album && t.album.name) || '',
      });
    }
    url = data.next || null;
  }
  return records;
}

// ─── CSV auto-detection ───────────────────────────────────────────────────────

function detectCsv(cwd) {
  const csvs = fs.readdirSync(cwd).filter(f => f.endsWith('.csv'));
  if (csvs.length === 0) return null;
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

// Read track records from an _archive.txt file written by a previous playlist run.
// Used in --mp3-only mode to generate the archive.org description.
function readRecordsFromArchiveTxt(cwd) {
  const file = fs.readdirSync(cwd).find(f => f.endsWith('_archive.txt'));
  if (!file) return [];
  return fs.readFileSync(path.join(cwd, file), 'utf8')
    .split('\n').slice(1)           // skip "Title | Artist | Album" header
    .map(l => l.trim()).filter(Boolean)
    .map(l => { const [title, artist, album] = l.split(' | '); return { title: title || '', artist: artist || '', album: album || '' }; });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { execFileSync } = require('child_process');
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

  // ── Get track records ─────────────────────────────────────────────────────────
  // Three modes:
  //   --spotify-url  fetch from Spotify (skips MP3 + upload)
  //   --mp3-only     read from _archive.txt if present (skips website + DB)
  //   default        detect/parse a CSV in the current directory

  let records = [];
  let csvPath = null;   // set when source is CSV (used for DB exportify-show import)
  let dbSource = 'playlists-ts'; // default; set to 'exportify-show' for CSV source

  if (opts.mp3Only) {
    // Recording-only run — playlist data already in playlists.ts from a previous run
    opts.noWebsite = true;
    opts.noDb      = true;
    records = readRecordsFromArchiveTxt(cwd);
    if (records.length > 0) {
      print.status(`Loaded ${records.length} tracks from archive.txt for description`);
    } else {
      print.warning('No archive.txt found — description will be generic');
    }

  } else if (opts.spotifyUrl) {
    // Spotify playlist run — skip MP3 processing and upload (no recording yet)
    opts.noMp3    = true;
    opts.noUpload = true;
    const playlistId = extractPlaylistId(opts.spotifyUrl);
    const config = readSpotifyConfig();
    if (!config) {
      print.error(`Spotify credentials not found in ${path.join(DB_DIR, 'config.toml')}`);
      process.exit(1);
    }
    print.status(`Fetching Spotify playlist: ${playlistId}`);
    try {
      const token = await getUserToken(config);
      records = await fetchSpotifyTracks(playlistId, token);
    } catch (e) {
      print.error(`Spotify fetch failed: ${e.message}`);
      process.exit(1);
    }
    if (records.length === 0) {
      print.error('No tracks found in Spotify playlist.');
      process.exit(1);
    }
    print.status(`Fetched ${records.length} tracks from Spotify`);
    dbSource = 'playlists-ts'; // DB updated via playlists.ts after website step

  } else {
    // CSV mode (exportify auto-detect or --csv)
    const detected = opts.csv || detectCsv(cwd);
    if (!detected) {
      print.error('No playlist source. Use --spotify-url <url>, --csv <file>, or --mp3-only.');
      process.exit(1);
    }
    if (typeof detected === 'object' && detected.ambiguous) {
      print.error('Multiple CSVs with the same column count — cannot auto-detect:');
      detected.ambiguous.forEach(f => console.log(`  ${f}`));
      print.error('Use --csv <file> to specify which one.');
      process.exit(1);
    }
    const csvFile = detected;
    csvPath = path.isAbsolute(csvFile) ? csvFile : path.join(cwd, csvFile);
    if (!fs.existsSync(csvPath)) {
      print.error(`CSV not found: ${csvPath}`);
      process.exit(1);
    }
    try {
      records = parseExportifyCsv(fs.readFileSync(csvPath, 'utf8'));
    } catch (e) {
      print.error(`CSV parse error: ${e.message}`);
      process.exit(1);
    }
    if (records.length === 0) {
      print.error('No tracks found in CSV.');
      process.exit(1);
    }
    print.status(`CSV: ${csvFile} (${records.length} tracks)`);
    dbSource = 'exportify-show';
  }

  // ── Derived values ────────────────────────────────────────────────────────────
  const outputMp3Name   = buildOutputMp3Name(playlistDate);
  const outputMp3Path   = path.join(ARCHIVES, outputMp3Name);
  const id3Title        = buildId3Title(playlistDate);
  const year            = playlistDate.split('-')[0];
  const playlistTitle   = formatDate(playlistDate);
  const archiveUrl      = generateArchiveUrl(playlistDate);
  const archiveOrgTitle = buildArchiveOrgTitle(playlistDate);
  const description     = generateDescription(records, playlistTitle);

  // ── Step 1: Process MP3 ───────────────────────────────────────────────────────
  let mp3Status = 'skipped (--no-mp3)';

  if (!opts.noMp3) {
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
      print.warning('Output MP3 already exists — skipping ffmpeg step.');
      print.warning(`  ${outputMp3Name}`);
      print.warning('Use --force-mp3 to overwrite.');
      mp3Status = 'skipped (already exists)';
    } else {
      print.status(`Processing: ${wartBasename} → ${outputMp3Name}`);
      const ffmpegArgs = [];
      if (opts.forceMp3)  ffmpegArgs.push('-y');
      if (opts.trimStart) ffmpegArgs.push('-ss', opts.trimStart);
      if (opts.trimEnd)   ffmpegArgs.push('-to', opts.trimEnd);
      ffmpegArgs.push(
        '-i', wartPath, '-i', LOGO,
        '-map', '0:0', '-map', '1:0',
        '-c', 'copy', '-id3v2_version', '3',
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
    fs.writeFileSync(archiveTxtPath, ['Title | Artist | Album',
      ...records.map(r => `${r.title} | ${r.artist} | ${r.album}`),
    ].join('\n'));
    print.status(`Wrote ${archiveTxtName}`);

    const playlistObject = generatePlaylistObject(records, playlistDate, playlistTitle, archiveUrl);
    const result = updatePlaylistsTs(playlistObject, playlistDate, PLAYLISTS_FILE);
    websiteStatus = result.skipped ? 'skipped (already in playlists.ts)' : 'playlists.ts updated';
  }

  // ── Step 3: Upload to archive.org ─────────────────────────────────────────────
  let uploadStatus = 'skipped (--no-upload)';

  if (!opts.noUpload) {
    try { execFileSync('ia', ['--version'], { stdio: 'ignore' }); } catch {
      print.error('`ia` not found. Install with: uv tool install internetarchive && ia configure');
      process.exit(1);
    }
    if (!fs.existsSync(outputMp3Path)) {
      print.error(`MP3 not found: ${outputMp3Path}`);
      print.error('Run --mp3-only (or without --no-mp3) to process it first.');
      process.exit(1);
    }
    const archiveTxtPath = path.join(cwd, `The Island ${playlistTitle}_archive.txt`);
    const identifier     = archiveUrl.split('/').pop();
    const uploadFiles    = [outputMp3Path];
    if (fs.existsSync(archiveTxtPath)) {
      uploadFiles.push(archiveTxtPath);
    } else {
      print.warning('archive.txt not found — skipping playlist text upload.');
    }
    if (fs.existsSync(LOGO)) {
      uploadFiles.push(LOGO);
    } else {
      print.warning(`Logo not found — skipping: ${LOGO}`);
    }
    const iaArgs = [
      'upload', identifier, ...uploadFiles,
      '--metadata=mediatype:audio',
      `--metadata=title:${archiveOrgTitle}`,
      `--metadata=description:${description}`,
      '--metadata=subject:wartfm', '--metadata=subject:dub',
      '--metadata=subject:reggae', '--metadata=subject:community radio',
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

  // ── Step 4: Update database ───────────────────────────────────────────────────
  let dbStatus = 'skipped (--no-db)';

  if (!opts.noDb) {
    const islandCli = path.join(DB_DIR, 'island');
    let dbArgs;
    if (dbSource === 'exportify-show') {
      dbArgs = [
        'shows', 'import', '--source', 'exportify-show',
        '--file', csvPath, '--show-id', playlistDate, '--archive-url', archiveUrl,
      ];
    } else {
      // playlists-ts: DB reads from the already-updated playlists.ts
      dbArgs = ['shows', 'import', '--source', 'playlists-ts', '--file', PLAYLISTS_FILE];
    }
    print.status(`Updating database (${dbSource}): show ${playlistDate}`);
    try {
      execFileSync(islandCli, dbArgs, { stdio: 'inherit' });
      dbStatus = `show ${playlistDate} imported`;
    } catch (e) {
      print.error(`Database update failed: ${e.message}`);
      dbStatus = 'FAILED';
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('');
  console.log('==================================================');
  print.success('DONE');
  console.log('==================================================');
  console.log(`  MP3:      ${mp3Status}`);
  console.log(`  Website:  ${websiteStatus}`);
  console.log(`  Upload:   ${uploadStatus}`);
  console.log(`  Database: ${dbStatus}`);
  if (websiteStatus === 'playlists.ts updated') {
    console.log('');
    print.status('Commit your changes:');
    console.log(`  git -C "${WEB_DIR}" add . && git -C "${WEB_DIR}" commit -m "Archive playlist ${playlistTitle}"`);
    console.log(`  git -C "${WEB_DIR}" pull --rebase origin main && git -C "${WEB_DIR}" push origin main`);
  }
  console.log('');
}

if (require.main === module) {
  main().catch(e => { console.error(`${C.RED}[ERROR]${C.NC} ${e.message}`); process.exit(1); });
}
