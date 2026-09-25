// web/spotify-api.js
'use strict';

const fs   = require('fs');
const path = require('path');

const DB_DIR      = path.join(__dirname, '..', 'db');
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

async function spotifyGet(url, token) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Spotify API ${res.status}: ${await res.text()}`);
  return res.json();
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
  });
  const res  = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', body });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);
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
  });
  const res  = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', body });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Code exchange failed: ${JSON.stringify(data)}`);
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
    const data = await spotifyGet(url, token);
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
  return (await spotifyGet(`https://api.spotify.com/v1/playlists/${playlistId}?fields=name`, token)).name;
}

function extractTrackId(urlOrId) {
  const m = urlOrId.match(/track\/([A-Za-z0-9]+)/);
  return m ? m[1] : urlOrId;
}

async function fetchTrack(trackId, token) {
  const t = await spotifyGet(`https://api.spotify.com/v1/tracks/${trackId}`, token);
  return {
    title:       t.name,
    artist:      (t.artists || []).map(a => a.name).join(', '),
    album:       (t.album && t.album.name) || '',
    uri:         t.uri,
    duration_ms: t.duration_ms || 0,
  };
}

module.exports = {
  extractPlaylistId,
  extractTrackId,
  readSpotifyConfig,
  getUserToken,
  fetchSpotifyTracks,
  fetchPlaylistName,
  fetchTrack,
};
