#!/usr/bin/env node
'use strict';

// ── Pure utility functions ────────────────────────────────────────────────────

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

// ── CLI only runs when executed directly ──────────────────────────────────────
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
