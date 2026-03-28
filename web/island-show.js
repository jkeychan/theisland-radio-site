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
