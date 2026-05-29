# island-record: Spotify Playlist → FLAC Recording Automation

**Date:** 2026-05-29  
**Status:** Approved

## Overview

`island-record` is a CLI tool for unattended batch recording of individual Spotify tracks to FLAC files for use in djay Pro pre-show prep. It fetches a Spotify playlist, plays each track through the Mac Spotify app (routed via BlackHole 2ch), and captures each track as a separate FLAC file with full Vorbis comment metadata.

## Files

| File | Action | Purpose |
|------|--------|---------|
| `web/spotify-api.js` | Create | Shared Spotify auth/fetch helpers extracted from island-show |
| `web/island-show.js` | Minor edit | Replace inline Spotify helpers with `require('./spotify-api.js')` |
| `web/island-record.js` | Create | Recording orchestrator |
| `/Users/jeff/bin/island-record` | Create symlink | Matches existing island-show pattern |

## spotify-api.js

Extracted from island-show's existing implementation. Exports:

- `readSpotifyConfig()` — reads `db/config.toml` for client_id / client_secret
- `getUserToken(config)` — PKCE flow with token caching to `db/spotify_tokens.json`
- `extractPlaylistId(urlOrId)` — parses playlist ID from URL or returns raw ID
- `fetchSpotifyTracks(playlistId, token)` — fetches all tracks; returns `{ title, artist, album, uri, duration_ms }` per track (adds `uri` and `duration_ms` to existing fields)
- `fetchPlaylistName(playlistId, token)` — new; returns the playlist's display name for the output folder

`island-show.js` updated to `require('./spotify-api.js')` instead of inlining these functions. Behavior unchanged.

## island-record.js: Recording Loop

For each track in playlist order:

1. **Sanitize filename** — replace `/`, `:`, `?`, `*`, `"` with `-`, trim whitespace → `{zero-padded-n} {artist} - {title}.flac` (e.g. `01 Dub Tractor - Roots.flac`); track number zero-padded to width of total track count (2 digits for ≤99 tracks, 3 for 100+)
2. **Skip if final file exists** — unless `--no-skip` passed; allows resume after interruption
3. **AppleScript** — `tell application "Spotify" to play track "{uri}"`
4. **Pre-roll sleep** — default 1500ms; lets Spotify buffer and audio stabilize in BlackHole before recording starts
5. **ffmpeg capture** — records for `duration_ms / 1000 + post_roll_seconds`; encodes directly to a `.tmp` file:
   ```
   ffmpeg -f avfoundation -i ":{blackhole_index}" \
     -t {duration_s} -c:a flac \
     -metadata TITLE="..." \
     -metadata ARTIST="..." \
     -metadata ALBUM="..." \
     -metadata TRACKNUMBER="{n}" \
     {artist} - {title}.flac.tmp
   ```
6. **Rename on success** — `.tmp` → `.flac`; interrupted recordings leave a `.tmp` and will be retried on next run
7. **Progress** — `[3/24] Recording: Artist - Title (3:42)...`

**BlackHole device index** is discovered once at startup by parsing `ffmpeg -f avfoundation -list_devices true -i ""` output. Script exits with a clear error if BlackHole 2ch is not found.

## CLI Interface

```
island-record --spotify-url <url> [options]

Required:
  --spotify-url <url>   Spotify playlist URL or ID

Options:
  --output-dir <path>   Base output directory (default: ~/Music/Island Recordings)
  --pre-roll <ms>       Delay after play command before recording starts (default: 1500)
  --post-roll <ms>      Extra recording buffer added to track duration (default: 500)
  --device <name>       BlackHole device name to look for (default: BlackHole 2ch)
  --no-skip             Re-record tracks whose .flac file already exists
  -h, --help            Show this help and exit
```

## Output Structure

```
~/Music/Island Recordings/
  The Island May 29 2026/          ← Spotify playlist display name
    01 Artist - Track Title.flac
    02 Artist - Track Title.flac
    ...
```

## Vorbis Comments

Per track: `TITLE`, `ARTIST`, `ALBUM`, `TRACKNUMBER`.

## Prerequisites (user responsibility)

- Spotify Mac app running and logged in
- BlackHole 2ch installed; Spotify's audio output set to BlackHole 2ch (or a multi-output device containing it) before running
- `ffmpeg` available in PATH (already present in this environment)
- Spotify API credentials in `db/config.toml`
