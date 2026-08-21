#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const WEB_DIR         = '/Users/jeff/Documents/Code/Git-Managed/theisland/web';
const PLAYLISTS_FILE  = path.join(WEB_DIR, 'src', 'data', 'playlists.ts');
const OUTPUT_FILE     = path.join(WEB_DIR, 'public', 'podcast.xml');

const SITE_URL     = 'https://theisland.radio.fm';
const FEED_URL     = `${SITE_URL}/podcast.xml`;
const IMAGE_URL    = `${SITE_URL}/images/podcast-cover.png`;
const OWNER_EMAIL  = 'dubtractor@theisland.radio.fm';
const SHOW_SUMMARY = 'Weekly dub, reggae, and dancehall selections on WART-FM 95.5 community radio — Madison County, NC. Hosted by Dub Tractor.';

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function secondsToHms(totalSeconds) {
  const s   = Math.round(totalSeconds);
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n, i) => (i === 0 ? String(n) : String(n).padStart(2, '0'))).join(':');
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchItemAudioOnce(identifier) {
  const res = await fetch(`https://archive.org/metadata/${identifier}`);
  if (!res.ok) throw new Error(`metadata fetch failed: ${res.status}`);
  const data = await res.json();
  const mp3 = (data.files || []).find(f => f.format === 'VBR MP3');
  if (!mp3) throw new Error('no VBR MP3 file found (item may still be processing)');
  return {
    filename: mp3.name,
    size:     mp3.size,
    duration: parseFloat(mp3.length || '0'),
    date:     data.metadata.date, // YYYY-MM-DD
  };
}

const RETRY_DELAYS_MS = [1000, 2000, 4000];

async function fetchItemAudio(identifier) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchItemAudioOnce(identifier);
    } catch (e) {
      if (attempt >= RETRY_DELAYS_MS.length) throw e;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

function buildItemXml(playlist, identifier, audio) {
  const trackLines = playlist.tracks.map(t => `${t.artist} - ${t.title}${t.album ? ` (${t.album})` : ''}`);
  const bodyText    = [playlist.description, '', 'Tracklist:', ...trackLines].join('\n');
  const enclosureUrl = `https://archive.org/download/${identifier}/${encodeURIComponent(audio.filename)}`;
  const pubDate       = new Date(`${audio.date}T12:00:00Z`).toUTCString();

  return `    <item>
      <title>${escapeXml(playlist.title)}</title>
      <link>${escapeXml(playlist.archiveUrl)}</link>
      <guid isPermaLink="false">${escapeXml(identifier)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${bodyText}]]></description>
      <content:encoded><![CDATA[${bodyText}]]></content:encoded>
      <enclosure url="${escapeXml(enclosureUrl)}" length="${audio.size}" type="audio/mpeg"/>
      <itunes:title>${escapeXml(playlist.title)}</itunes:title>
      <itunes:summary>${escapeXml(playlist.description)}</itunes:summary>
      <itunes:duration>${secondsToHms(audio.duration)}</itunes:duration>
      <itunes:explicit>true</itunes:explicit>
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:image href="${escapeXml(IMAGE_URL)}"/>
    </item>`;
}

async function main() {
  const mod = await import(`file://${PLAYLISTS_FILE}`);
  const playlists = mod.playlists.filter(p => p.archiveUrl);

  console.log(`Building podcast feed for ${playlists.length} episodes...`);

  const items = [];
  for (const p of playlists) {
    const identifier = p.archiveUrl.split('/').pop();
    try {
      const audio = await fetchItemAudio(identifier);
      items.push(buildItemXml(p, identifier, audio));
      console.log(`  ok:   ${identifier}`);
    } catch (e) {
      console.warn(`  skip: ${identifier} (${e.message})`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Island with Dub Tractor</title>
    <link>${SITE_URL}</link>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <description>${escapeXml(SHOW_SUMMARY)}</description>
    <itunes:summary>${escapeXml(SHOW_SUMMARY)}</itunes:summary>
    <itunes:author>Dub Tractor</itunes:author>
    <itunes:owner>
      <itunes:name>Dub Tractor</itunes:name>
      <itunes:email>${OWNER_EMAIL}</itunes:email>
    </itunes:owner>
    <itunes:image href="${IMAGE_URL}"/>
    <image>
      <url>${IMAGE_URL}</url>
      <title>The Island with Dub Tractor</title>
      <link>${SITE_URL}</link>
    </image>
    <itunes:category text="Music"/>
    <itunes:explicit>true</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <generator>generate-podcast-feed.js</generator>
${items.join('\n')}
  </channel>
</rss>
`;

  fs.writeFileSync(OUTPUT_FILE, xml);
  console.log(`Wrote ${items.length} episodes to ${OUTPUT_FILE}`);
}

if (require.main === module) {
  main().catch(e => { console.error(`generate-podcast-feed: ${e.message}`); process.exit(1); });
}

module.exports = { escapeXml, secondsToHms };
