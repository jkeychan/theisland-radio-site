# island-record Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `island-record`, a CLI tool that records every track from a Spotify playlist as individual FLAC files via BlackHole 2ch, for use in djay Pro pre-show prep.

**Architecture:** A new `web/spotify-api.js` module extracts the Spotify auth/fetch helpers already in `island-show.js`; `island-show.js` imports from it unchanged in behavior; `web/island-record.js` imports the same module and drives a record loop: fetch playlist → discover BlackHole device index → for each track, play via AppleScript, pre-roll sleep, seek back to 0, record with ffmpeg to `.tmp`, rename to `.flac`.

**Tech Stack:** Node.js 25 (built-in `node:test` for tests), `ffmpeg` (avfoundation input, FLAC output), `osascript` (AppleScript Spotify control), Spotify Web API (existing PKCE auth).

---

## File Map

| Path | Action | Responsibility |
|------|--------|---------------|
| `web/spotify-api.js` | **Create** | Spotify auth, token cache, playlist/track fetch |
| `web/island-show.js` | **Modify** | Remove inline Spotify helpers, require spotify-api.js |
| `web/island-record.js` | **Create** | CLI, pure utilities, recording orchestrator |
| `web/island-record.test.js` | **Create** | Tests for pure utility functions (node:test) |
| `/Users/jeff/bin/island-record` | **Create symlink** | Matches existing island-show pattern |

---

## Task 1: Create `web/spotify-api.js`

Extract the Spotify helpers from `island-show.js` (lines 209–393) into a standalone module, add `uri` and `duration_ms` to the track records returned by `fetchSpotifyTracks`, and add a new `fetchPlaylistName` function.

**Files:**
- Create: `web/spotify-api.js`

- [ ] **Step 1: Create the file**

```javascript
// web/spotify-api.js
'use strict';

const fs   = require('fs');
const path = require('path');

const DB_DIR     = '/Users/jeff/Documents/Code/Git-Managed/theisland/db';
const TOKEN_CACHE = path.join(DB_DIR, 'spotify_tokens.json');

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
        title:       t.name,
        artist:      (t.artists || []).map(a => a.name).join(', '),
        album:       (t.album && t.album.name) || '',
        uri:         t.uri,
        duration_ms: t.duration_ms || 0,
      });
    }
    url = data.next || null;
  }
  return records;
}

async function fetchPlaylistName(playlistId, token) {
  const res = await httpsGet(
    `https://api.spotify.com/v1/playlists/${playlistId}?fields=name`,
    { 'Authorization': `Bearer ${token}` },
  );
  if (res.status !== 200) throw new Error(`Spotify API ${res.status}: ${res.body}`);
  return JSON.parse(res.body).name;
}

module.exports = {
  extractPlaylistId,
  readSpotifyConfig,
  getUserToken,
  fetchSpotifyTracks,
  fetchPlaylistName,
};
```

- [ ] **Step 2: Verify the module loads without errors**

```bash
node -e "const s = require('./web/spotify-api.js'); console.log(Object.keys(s).join(', '))"
```

Expected output:
```
extractPlaylistId, readSpotifyConfig, getUserToken, fetchSpotifyTracks, fetchPlaylistName
```

- [ ] **Step 3: Commit**

```bash
git add web/spotify-api.js
git commit -m "feat: extract Spotify helpers into spotify-api.js, add uri/duration_ms/fetchPlaylistName"
```

---

## Task 2: Update `web/island-show.js`

Replace the inline Spotify helpers (lines 209–393) with a single `require('./spotify-api.js')` call.

**Files:**
- Modify: `web/island-show.js:209-393`

- [ ] **Step 1: Replace the Spotify helpers block**

Delete lines 209–393 (the `// ─── Spotify helpers` section through `fetchSpotifyTracks`) and replace with:

```javascript
// ─── Spotify helpers ──────────────────────────────────────────────────────────

const {
  extractPlaylistId, readSpotifyConfig, getUserToken, fetchSpotifyTracks,
} = require('./spotify-api.js');
```

- [ ] **Step 2: Verify island-show still works**

```bash
node web/island-show.js --help
```

Expected: the full help text prints with no errors.

- [ ] **Step 3: Commit**

```bash
git add web/island-show.js
git commit -m "refactor: island-show imports Spotify helpers from spotify-api.js"
```

---

## Task 3: Write tests for pure utility functions

Create the test file first. Tests use Node's built-in `node:test` runner (no external framework needed).

**Files:**
- Create: `web/island-record.test.js`

- [ ] **Step 1: Create the test file**

```javascript
// web/island-record.test.js
'use strict';

const { test } = require('node:test');
const assert   = require('node:assert/strict');

const {
  sanitizeFilename,
  padTrackNumber,
  parseBlackholeDeviceIndex,
} = require('./island-record.js');

// ── sanitizeFilename ──────────────────────────────────────────────────────────

test('sanitizeFilename: replaces forward slash', () => {
  assert.equal(sanitizeFilename('AC/DC'), 'AC-DC');
});

test('sanitizeFilename: replaces colon', () => {
  assert.equal(sanitizeFilename('Title: Subtitle'), 'Title- Subtitle');
});

test('sanitizeFilename: replaces question mark', () => {
  assert.equal(sanitizeFilename('What?'), 'What-');
});

test('sanitizeFilename: replaces asterisk', () => {
  assert.equal(sanitizeFilename('Track*'), 'Track-');
});

test('sanitizeFilename: replaces double quote', () => {
  assert.equal(sanitizeFilename('"Title"'), '-Title-');
});

test('sanitizeFilename: trims surrounding whitespace', () => {
  assert.equal(sanitizeFilename('  title  '), 'title');
});

test('sanitizeFilename: collapses multiple spaces', () => {
  assert.equal(sanitizeFilename('a  b'), 'a b');
});

test('sanitizeFilename: leaves normal names untouched', () => {
  assert.equal(sanitizeFilename('Dub Tractor - Roots'), 'Dub Tractor - Roots');
});

// ── padTrackNumber ────────────────────────────────────────────────────────────

test('padTrackNumber: 2-digit padding for totals under 100', () => {
  assert.equal(padTrackNumber(1, 24), '01');
  assert.equal(padTrackNumber(9, 24), '09');
  assert.equal(padTrackNumber(24, 24), '24');
});

test('padTrackNumber: 3-digit padding for totals 100 and over', () => {
  assert.equal(padTrackNumber(1, 100), '001');
  assert.equal(padTrackNumber(99, 150), '099');
  assert.equal(padTrackNumber(100, 100), '100');
});

test('padTrackNumber: exact boundary — 99 tracks uses 2 digits', () => {
  assert.equal(padTrackNumber(99, 99), '99');
});

// ── parseBlackholeDeviceIndex ─────────────────────────────────────────────────

const SAMPLE_FFMPEG_OUTPUT = `
ffmpeg version 7.1 Copyright (c) 2000-2024 the FFmpeg developers
AVFoundation video devices:
[AVFoundation indev @ 0x600003904000] [0] FaceTime HD Camera
[AVFoundation indev @ 0x600003904000] [1] Capture screen 0
AVFoundation audio devices:
[AVFoundation indev @ 0x600003904000] [0] BlackHole 2ch
[AVFoundation indev @ 0x600003904000] [1] Built-in Microphone
[AVFoundation indev @ 0x600003904000] [2] MacBook Pro Speakers
`;

test('parseBlackholeDeviceIndex: finds BlackHole 2ch at index 0', () => {
  assert.equal(parseBlackholeDeviceIndex(SAMPLE_FFMPEG_OUTPUT, 'BlackHole 2ch'), 0);
});

test('parseBlackholeDeviceIndex: finds other device by name', () => {
  assert.equal(parseBlackholeDeviceIndex(SAMPLE_FFMPEG_OUTPUT, 'Built-in Microphone'), 1);
});

test('parseBlackholeDeviceIndex: returns null when device not found', () => {
  assert.equal(parseBlackholeDeviceIndex(SAMPLE_FFMPEG_OUTPUT, 'NonExistent Device'), null);
});

test('parseBlackholeDeviceIndex: does not match video devices with same index', () => {
  // Video section has [0] FaceTime HD Camera — should not match an audio-section search
  assert.equal(parseBlackholeDeviceIndex(SAMPLE_FFMPEG_OUTPUT, 'FaceTime HD Camera'), null);
});
```

- [ ] **Step 2: Run the tests — expect them to fail with "module not found"**

```bash
node --test web/island-record.test.js 2>&1 | head -5
```

Expected: Error — `Cannot find module './island-record.js'`

- [ ] **Step 3: Commit the test file**

```bash
git add web/island-record.test.js
git commit -m "test: add island-record pure utility tests"
```

---

## Task 4: Implement pure utility functions in `web/island-record.js`

Create the file with just the three tested pure functions plus `formatDuration`. Run the tests after.

**Files:**
- Create: `web/island-record.js`

- [ ] **Step 1: Create the file with the pure utility functions**

```javascript
#!/usr/bin/env node
// web/island-record.js
'use strict';

// ── Pure utility functions (tested) ───────────────────────────────────────────

function sanitizeFilename(str) {
  return str.replace(/[/:"?*<>|\\]/g, '-').replace(/\s+/g, ' ').trim();
}

function padTrackNumber(n, total) {
  const width = total >= 100 ? 3 : 2;
  return String(n).padStart(width, '0');
}

function parseBlackholeDeviceIndex(ffmpegStderr, deviceName) {
  const lines = ffmpegStderr.split('\n');
  let inAudio = false;
  for (const line of lines) {
    if (line.includes('AVFoundation audio devices')) { inAudio = true; continue; }
    if (!inAudio) continue;
    const m = line.match(/\[(\d+)\] (.+)$/);
    if (m && m[2].trim() === deviceName) return parseInt(m[1], 10);
  }
  return null;
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min      = Math.floor(totalSec / 60);
  const sec      = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

module.exports = { sanitizeFilename, padTrackNumber, parseBlackholeDeviceIndex, formatDuration };
```

- [ ] **Step 2: Run the tests — expect all to pass**

```bash
node --test web/island-record.test.js
```

Expected output (all green):
```
✔ sanitizeFilename: replaces forward slash (...)
✔ sanitizeFilename: replaces colon (...)
... (15 tests total)
ℹ tests 15
ℹ pass 15
ℹ fail 0
```

- [ ] **Step 3: Commit**

```bash
git add web/island-record.js
git commit -m "feat: add island-record pure utility functions with passing tests"
```

---

## Task 5: Complete `web/island-record.js` — CLI, BlackHole discovery, recording loop

Add the remaining implementation to island-record.js. The `module.exports` block stays at the top for tests; the CLI/main code runs only when executed directly.

**Files:**
- Modify: `web/island-record.js`

- [ ] **Step 1: Add all remaining code after the `module.exports` line**

Replace the current `module.exports` line and everything after it with the full implementation:

```javascript
module.exports = { sanitizeFilename, padTrackNumber, parseBlackholeDeviceIndex, formatDuration };

// ── The rest only runs when invoked as a CLI ───────────────────────────────────
if (require.main !== module) return;

const fs   = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const {
  readSpotifyConfig, getUserToken, fetchSpotifyTracks,
  extractPlaylistId, fetchPlaylistName,
} = require('./spotify-api.js');

const C = { RED:'\x1b[31m', GREEN:'\x1b[32m', YELLOW:'\x1b[33m', BLUE:'\x1b[34m', NC:'\x1b[0m' };
const print = {
  status:  (m) => console.log(`${C.BLUE}[INFO]${C.NC} ${m}`),
  success: (m) => console.log(`${C.GREEN}[SUCCESS]${C.NC} ${m}`),
  warning: (m) => console.log(`${C.YELLOW}[WARNING]${C.NC} ${m}`),
  error:   (m) => console.error(`${C.RED}[ERROR]${C.NC} ${m}`),
};

function printHelp() {
  console.log(`island-record — record a Spotify playlist as individual FLAC files

USAGE
  island-record --spotify-url <url> [options]

OPTIONS
  --spotify-url <url>   Spotify playlist URL or ID (required)
  --output-dir <path>   Base output directory (default: ~/Music/Island Recordings)
  --pre-roll <ms>       Delay after play before recording starts (default: 1500)
  --post-roll <ms>      Extra buffer added to track duration (default: 500)
  --device <name>       BlackHole device name (default: BlackHole 2ch)
  --no-skip             Re-record tracks whose .flac file already exists
  -h, --help            Show this help and exit

OUTPUT
  {output-dir}/{playlist-name}/
    01 Artist - Title.flac
    02 Artist - Title.flac
    ...

PREREQUISITES
  - Spotify app running and logged in
  - Spotify audio output set to BlackHole 2ch before running
  - ffmpeg in PATH with avfoundation support
  - macOS microphone permission granted to Terminal (System Settings → Privacy)
  - Spotify API credentials in db/config.toml
`);
}

function parseArgs(argv) {
  const opts = {
    spotifyUrl: null,
    outputDir:  path.join(process.env.HOME, 'Music', 'Island Recordings'),
    preRoll:    1500,
    postRoll:   500,
    device:     'BlackHole 2ch',
    noSkip:     false,
  };
  for (let i = 0; i < argv.length; i++) {
    if      (argv[i] === '--spotify-url' && argv[i+1]) opts.spotifyUrl = argv[++i];
    else if (argv[i] === '--output-dir'  && argv[i+1]) opts.outputDir  = argv[++i];
    else if (argv[i] === '--pre-roll'    && argv[i+1]) opts.preRoll    = parseInt(argv[++i], 10);
    else if (argv[i] === '--post-roll'   && argv[i+1]) opts.postRoll   = parseInt(argv[++i], 10);
    else if (argv[i] === '--device'      && argv[i+1]) opts.device     = argv[++i];
    else if (argv[i] === '--no-skip')                  opts.noSkip     = true;
  }
  return opts;
}

function discoverBlackholeIndex(deviceName) {
  const result = spawnSync(
    'ffmpeg', ['-f', 'avfoundation', '-list_devices', 'true', '-i', ''],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const index = parseBlackholeDeviceIndex(result.stderr, deviceName);
  if (index === null) {
    print.error(`Audio device not found: "${deviceName}"`);
    print.error('Available audio devices:');
    let inAudio = false;
    for (const line of result.stderr.split('\n')) {
      if (line.includes('AVFoundation audio devices')) { inAudio = true; continue; }
      if (inAudio && line.match(/\[(\d+)\]/)) console.log(' ', line.trim());
    }
    process.exit(1);
  }
  return index;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function recordTrack({ uri, durationMs, outputPath, deviceIndex, preRoll, postRoll, metadata }) {
  const tmpPath = outputPath + '.tmp';

  // Tell Spotify to play this specific track
  execFileSync('osascript', ['-e', `tell application "Spotify" to play track "${uri}"`]);

  // Wait for Spotify to load and buffer before seeking
  await sleep(preRoll);

  // Seek back to position 0 to capture the full track (pre-roll consumed some of it)
  execFileSync('osascript', ['-e', 'tell application "Spotify" to set player position to 0']);
  await sleep(200);

  // Record via ffmpeg: avfoundation input → FLAC with Vorbis comments
  const durationSecs = String((durationMs + postRoll) / 1000);
  execFileSync('ffmpeg', [
    '-y',
    '-f', 'avfoundation', '-i', `:${deviceIndex}`,
    '-t', durationSecs,
    '-c:a', 'flac',
    '-metadata', `TITLE=${metadata.title}`,
    '-metadata', `ARTIST=${metadata.artist}`,
    '-metadata', `ALBUM=${metadata.album}`,
    '-metadata', `TRACKNUMBER=${metadata.trackNumber}`,
    tmpPath,
  ], { stdio: 'inherit' });

  fs.renameSync(tmpPath, outputPath);
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const opts = parseArgs(process.argv.slice(2));

  if (!opts.spotifyUrl) {
    print.error('--spotify-url is required');
    printHelp();
    process.exit(1);
  }

  // Discover BlackHole device index before anything else
  print.status(`Looking for audio device: ${opts.device}`);
  const deviceIndex = discoverBlackholeIndex(opts.device);
  print.status(`Found "${opts.device}" at avfoundation index ${deviceIndex}`);

  // Spotify auth
  const DB_DIR = '/Users/jeff/Documents/Code/Git-Managed/theisland/db';
  const config = readSpotifyConfig();
  if (!config) {
    print.error(`Spotify credentials not found in ${path.join(DB_DIR, 'config.toml')}`);
    process.exit(1);
  }
  const token = await getUserToken(config);

  // Fetch playlist name and tracks in parallel
  const playlistId = extractPlaylistId(opts.spotifyUrl);
  const [playlistName, tracks] = await Promise.all([
    fetchPlaylistName(playlistId, token),
    fetchSpotifyTracks(playlistId, token),
  ]);

  if (tracks.length === 0) {
    print.error('No tracks found in playlist');
    process.exit(1);
  }

  print.status(`Playlist: ${playlistName} (${tracks.length} tracks)`);

  // Create output directory
  const outDir = path.join(opts.outputDir, sanitizeFilename(playlistName));
  fs.mkdirSync(outDir, { recursive: true });
  print.status(`Output:   ${outDir}`);
  print.status(`Pre-roll: ${opts.preRoll}ms  Post-roll: ${opts.postRoll}ms`);
  console.log('');

  // Recording loop
  let recorded = 0;
  let skipped  = 0;

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const n       = i + 1;
    const pad     = padTrackNumber(n, tracks.length);
    const base    = `${pad} ${sanitizeFilename(track.artist)} - ${sanitizeFilename(track.title)}.flac`;
    const outPath = path.join(outDir, base);

    if (!opts.noSkip && fs.existsSync(outPath)) {
      print.status(`[${n}/${tracks.length}] Skipping (exists): ${base}`);
      skipped++;
      continue;
    }

    print.status(`[${n}/${tracks.length}] Recording: ${track.artist} - ${track.title} (${formatDuration(track.duration_ms)})`);

    await recordTrack({
      uri:         track.uri,
      durationMs:  track.duration_ms,
      outputPath:  outPath,
      deviceIndex,
      preRoll:     opts.preRoll,
      postRoll:    opts.postRoll,
      metadata: {
        title:       track.title,
        artist:      track.artist,
        album:       track.album,
        trackNumber: String(n),
      },
    });

    recorded++;
    print.success(`[${n}/${tracks.length}] Saved: ${base}`);
  }

  console.log('');
  console.log('==================================================');
  print.success('DONE');
  console.log('==================================================');
  console.log(`  Recorded: ${recorded}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Output:   ${outDir}`);
  console.log('');
}

main().catch(e => { print.error(e.message); process.exit(1); });
```

- [ ] **Step 2: Run the tests — still expect all 15 to pass**

```bash
node --test web/island-record.test.js
```

Expected:
```
ℹ tests 15
ℹ pass 15
ℹ fail 0
```

- [ ] **Step 3: Verify --help works**

```bash
node web/island-record.js --help
```

Expected: the full help text prints with no errors.

- [ ] **Step 4: Verify missing --spotify-url gives a clear error**

```bash
node web/island-record.js 2>&1
```

Expected:
```
[ERROR] --spotify-url is required
```

- [ ] **Step 5: Commit**

```bash
git add web/island-record.js
git commit -m "feat: implement island-record CLI and recording orchestrator"
```

---

## Task 6: Create symlink and smoke test

**Files:**
- Create: `/Users/jeff/bin/island-record` (symlink)

- [ ] **Step 1: Create the symlink**

```bash
ln -s /Users/jeff/Documents/Code/Git-Managed/theisland/web/island-record.js /Users/jeff/bin/island-record
chmod +x /Users/jeff/Documents/Code/Git-Managed/theisland/web/island-record.js
```

- [ ] **Step 2: Verify the symlink works**

```bash
island-record --help
```

Expected: full help text, no errors.

- [ ] **Step 3: Dry-run device discovery (Spotify app does not need to be running)**

```bash
island-record --spotify-url https://open.spotify.com/playlist/0blGW5hIWlUkLDm5t0Jzdp 2>&1 | head -5
```

Expected: either `[INFO] Found "BlackHole 2ch" at avfoundation index N` (if BlackHole is installed and visible to ffmpeg), or a clear error listing available audio devices if it's not found.

- [ ] **Step 4: No git commit needed**

The symlink lives in `~/bin` and is not tracked by git. All file changes were committed in earlier tasks.

---

## macOS Prerequisites Checklist

Before the first real recording run:

- [ ] Open **System Settings → Privacy & Security → Microphone** and grant access to Terminal (or whichever terminal emulator you use). ffmpeg needs this to read from BlackHole.
- [ ] In the Spotify app, go to **Settings → Audio Quality** and set the output device to **BlackHole 2ch** (or the multi-output device that includes it).
- [ ] Confirm BlackHole 2ch is visible to ffmpeg: `island-record --help` and then run the device discovery step above.
