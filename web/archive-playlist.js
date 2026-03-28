#!/usr/bin/env node

/**
 * Weekly Playlist Archival Script
 * 
 * This script automates the process of:
 * 1. Converting CSV playlist data to TypeScript playlist format
 * 2. Adding the playlist to playlists.ts
 * 3. Creating Archive.org-compatible pipe-delimited format
 *
 * Usage: node archive-playlist.js <input.csv> [--date YYYY-MM-DD]
 */

const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  NC: '\x1b[0m' // No Color
};

// Print colored output
const print = {
  status: (msg) => console.log(`${colors.BLUE}[INFO]${colors.NC} ${msg}`),
  success: (msg) => console.log(`${colors.GREEN}[SUCCESS]${colors.NC} ${msg}`),
  warning: (msg) => console.log(`${colors.YELLOW}[WARNING]${colors.NC} ${msg}`),
  error: (msg) => console.log(`${colors.RED}[ERROR]${colors.NC} ${msg}`)
};

// Simple CSV parser
function parseCsv(text) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(current);
      current = '';
      continue;
    }

    if (!inQuotes && char === '\n') {
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    if (!inQuotes && char === '\r') {
      continue;
    }

    current += char;
  }
  
  row.push(current);
  rows.push(row);

  if (rows.length === 0) return [];
  const headers = rows[0];
  const out = [];
  for (let r = 1; r < rows.length; r += 1) {
    const record = {};
    const cols = rows[r];
    headers.forEach((h, idx) => {
      record[h.trim()] = (cols[idx] ?? '').trim();
    });
    const hasValue = Object.values(record).some((v) => v !== '');
    if (hasValue) out.push(record);
  }
  return out;
}

// Escape string for use in JavaScript/TypeScript string literals
// Escapes backslashes first, then quotes to prevent injection
function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/"/g, '\\"');   // Then escape double quotes
}

// Generate description text from tracklist records
function generateDescription(records, playlistTitle) {
  const artists = [];
  for (const r of records) {
    const artist = (r.Artist || r.artist || '').split(',')[0].trim();
    if (artist && !artists.includes(artist)) artists.push(artist);
    if (artists.length >= 3) break;
  }
  const last = artists.pop();
  const artistPhrase = artists.length > 0
    ? `${artists.join(', ')}, and ${last}`
    : last || 'various artists';
  return `This is a broadcast from "The Island with Dub Tractor" on WART-FM 95.5, featuring a curated playlist from ${playlistTitle}. The show documents a reggae and dub music program that includes tracks spanning roots reggae, dub versions, and dancehall selections from artists including ${artistPhrase}, among others.`;
}

// Generate archive.org URL from a YYYY-MM-DD date string
function generateArchiveUrl(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  const month = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const day = date.getDate();
  const year = date.getFullYear();
  return `https://archive.org/details/the-island-with-dub-tractor-${month}-${day}-${year}`;
}

// Generate TypeScript playlist object
function generatePlaylistObject(records, playlistId, playlistTitle, archiveUrl) {
    const tracks = records.map(record => {
    const title = record.Title || record.title || '';
    const artist = record.Artist || record.artist || '';
    const album = record.Album || record.album || '';

    return `      { artist: "${escapeString(artist)}", title: "${escapeString(title)}", album: "${escapeString(album)}" }`;
  }).join(',\n');

  const archiveLine = archiveUrl ? `\n    archiveUrl: "${escapeString(archiveUrl)}",` : '';

  return `  {
    id: "${escapeString(playlistId)}",
    title: "${escapeString(playlistTitle)}",${archiveLine}
    description: "Dub Tractor's Island vibes with classic reggae, dub, and dancehall tracks",
    tracks: [
${tracks}
    ]
  },`;
}

// Format date for playlist title
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Extract date from filename patterns like "The Island September 26, 2025.csv"
function extractDateFromFilename(filename) {
  // Remove file extension
  const basename = path.basename(filename, path.extname(filename));
  
  // Pattern 1: "The Island September 26, 2025"
  const pattern1 = /The Island (\w+) (\d+),?\s*(\d{4})/i;
  const match1 = basename.match(pattern1);
  if (match1) {
    const [, month, day, year] = match1;
    const dateStr = `${year}-${monthToNumber(month)}-${day.padStart(2, '0')}`;
    return dateStr;
  }
  
  // Pattern 2: "The Island Sep 26, 2025" (abbreviated month)
  const pattern2 = /The Island (\w{3}) (\d+),?\s*(\d{4})/i;
  const match2 = basename.match(pattern2);
  if (match2) {
    const [, month, day, year] = match2;
    const dateStr = `${year}-${monthToNumber(month)}-${day.padStart(2, '0')}`;
    return dateStr;
  }
  
  // Pattern 3: Existing patterns from your files like "The Island October 3, 2025_archive.txt"
  const pattern3 = /(\w+) (\d+),?\s*(\d{4})/i;
  const match3 = basename.match(pattern3);
  if (match3) {
    const [, month, day, year] = match3;
    const dateStr = `${year}-${monthToNumber(month)}-${day.padStart(2, '0')}`;
    return dateStr;
  }
  
  return null;
}

// Convert month name to month number
function monthToNumber(monthName) {
  const monthMap = {
    'january': '01', 'jan': '01',
    'february': '02', 'feb': '02',
    'march': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'may': '05',
    'june': '06', 'jun': '06',
    'july': '07', 'jul': '07',
    'august': '08', 'aug': '08',
    'september': '09', 'sep': '09',
    'october': '10', 'oct': '10',
    'november': '11', 'nov': '11',
    'december': '12', 'dec': '12'
  };
  
  return monthMap[monthName.toLowerCase()] || '01';
}

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

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    print.error('Usage: node archive-playlist.js <input.csv> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --date YYYY-MM-DD     Override auto-detected date');
    console.log('  --archive-url URL     Override auto-generated archive.org URL slug');
    console.log('  --mp3 <file>          Path to the MP3 recording (for upload command)');
    console.log('  --upload              Run ia upload automatically (requires --mp3 and `ia` CLI)');
    console.log('');
    console.log('This script archives a CSV playlist by:');
    console.log('1. Converting CSV to TypeScript playlist format and updating playlists.ts');
    console.log('2. Creating Archive.org-compatible pipe-delimited tracklist');
    console.log('3. Auto-generating the archive.org description from the tracklist');
    console.log('4. Printing (or running) a ready `ia upload` command with all metadata');
    console.log('');
    console.log('The archive.org URL and description are auto-generated from the date and tracklist.');
    console.log('Pass --upload with --mp3 to upload directly (install ia: uv tool install internetarchive).');
    console.log('');
    console.log('Example:');
    console.log('node archive-playlist.js "The Island March 27, 2026.csv" --mp3 "March 27 2026.mp3" --upload');
    process.exit(1);
  }

  let inputFile = '';
  let customDate = '';
  let customArchiveUrl = '';
  let mp3File = '';
  let doUpload = false;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' && i + 1 < args.length) {
      customDate = args[i + 1];
      i++;
    } else if (args[i] === '--archive-url' && i + 1 < args.length) {
      customArchiveUrl = args[i + 1];
      i++;
    } else if (args[i] === '--mp3' && i + 1 < args.length) {
      mp3File = args[i + 1];
      i++;
    } else if (args[i] === '--upload') {
      doUpload = true;
    } else if (!inputFile && !args[i].startsWith('--')) {
      inputFile = args[i];
    }
  }

  if (!inputFile) {
    print.error('No input CSV file provided');
    process.exit(1);
  }

  // Determine playlist date
  let playlistDate;
  if (customDate) {
    playlistDate = customDate;
  } else {
    // Try to extract date from filename first
    const extractedDate = extractDateFromFilename(inputFile);
    playlistDate = extractedDate || new Date().toISOString().split('T')[0];
    
    if (!extractedDate) {
      print.warning(`Could not extract date from filename "${inputFile}"`);
      print.warning(`Using today's date: ${playlistDate}`);
      print.warning(`Use --date YYYY-MM-DD to override if incorrect`);
    } else {
      print.status(`Extracted date from filename: ${extractedDate}`);
    }
  }
  
  const playlistId = playlistDate;
  const playlistTitle = formatDate(playlistDate);
  const archiveUrl = customArchiveUrl || generateArchiveUrl(playlistDate);

  print.status(`Processing playlist for date: ${playlistDate}`);
  print.status(`Playlist title: ${playlistTitle}`);
  if (customArchiveUrl) {
    print.status(`Archive.org URL (custom): ${archiveUrl}`);
  } else {
    print.status(`Archive.org URL (auto-generated): ${archiveUrl}`);
    print.warning('Use --archive-url URL to override if archive.org used a different slug')
  }

  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    print.error(`Input file '${inputFile}' not found`);
    process.exit(1);
  }

  const scriptDir = __dirname;
  const playlistsFile = path.join(scriptDir, 'src', 'data', 'playlists.ts');

  // Create temporary working directory
  const tempDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'playlist-archive-'));

  try {
    // Convert CSV to pipe-delimited format (for Archive.org)
    print.status('Converting CSV to pipe-delimited format for Archive.org...');
    const csvContent = fs.readFileSync(inputFile, 'utf8');
    const records = parseCsv(csvContent);

    if (records.length === 0) {
      print.error('No data found in CSV');
      process.exit(1);
    }

    // Use existing converter logic
    const { convertToPipeDelimited } = require('./csv-to-archive-converter.js');
    const pipeDelimitedOutput = convertToPipeDelimited(csvContent);

    // Generate Archive.org filename
    const archiveBaseFilename = playlistTitle.charAt(0).toUpperCase() + playlistTitle.slice(1);
    const archiveFilename = `The Island ${archiveBaseFilename}_archive.txt`;
    const archiveOutput = path.join(scriptDir, archiveFilename);

    fs.writeFileSync(archiveOutput, pipeDelimitedOutput);
    print.success(`Archive.org format saved to: ${archiveFilename}`);

    // Generate TypeScript playlist object
    print.success('Generated TypeScript playlist object');

    // Create new playlist object
    const playlistObject = generatePlaylistObject(records, playlistId, playlistTitle, archiveUrl);

    // Process playlists.ts file
    if (!fs.existsSync(playlistsFile)) {
      print.error(`Playlists file not found: ${playlistsFile}`);
      process.exit(1);
    }

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

    // Build archive.org upload args
    const description = generateDescription(records, playlistTitle);
    const identifier = archiveUrl.split('/').pop();
    const iaTitle = `The Island with Dub Tractor - ${playlistTitle}`;
    const iaMetadataArgs = [
      '--metadata=mediatype:audio',
      `--metadata=title:${iaTitle}`,
      `--metadata=description:${description}`,
      '--metadata=subject:wartfm',
      '--metadata=subject:dub',
      '--metadata=subject:reggae',
      '--metadata=subject:community radio',
      `--metadata=date:${playlistDate}`,
      '--metadata=collection:opensource_audio',
    ];

    // Print the equivalent shell command for reference
    const mp3Display = mp3File ? `"${mp3File}"` : '<recording.mp3>';
    const iaCmdDisplay = [
      `ia upload ${identifier}`,
      `  ${mp3Display}`,
      `  "${archiveFilename}"`,
      ...iaMetadataArgs.map(a => `  "${a}"`),
    ].join(' \\\n');

    // Summary
    console.log('');
    console.log('==================================================');
    print.success('PLAYLIST ARCHIVE COMPLETE!');
    console.log('==================================================');
    console.log('');
    print.status('Files updated:');
    console.log(`  ${path.basename(playlistsFile)} (TypeScript playlist data)`);
    console.log(`  ${archiveFilename} (Archive.org pipe-delimited tracklist)`);
    console.log('');
    print.status('Auto-generated description:');
    console.log(`  ${description}`);
    console.log('');
    print.status('Archive.org upload command:');
    console.log('');
    console.log(iaCmdDisplay);
    console.log('');

    if (doUpload) {
      if (!mp3File) {
        print.error('--upload requires --mp3 <file>');
      } else if (!fs.existsSync(mp3File)) {
        print.error(`MP3 file not found: ${mp3File}`);
      } else {
        const { execFileSync } = require('child_process');
        try {
          execFileSync('ia', ['upload', identifier, mp3File, archiveOutput, ...iaMetadataArgs], { stdio: 'inherit' });
          print.success('Upload complete!');
        } catch (uploadErr) {
          if (uploadErr.code === 'ENOENT') {
            print.error('`ia` not found. Install and configure it first:');
            console.log('  uv tool install internetarchive');
            console.log('  ia configure');
          } else {
            throw uploadErr;
          }
        }
      }
    } else if (mp3File) {
      print.status('Run with --upload to execute the command above automatically.');
    } else {
      print.status('Add --mp3 <file> --upload to upload automatically via `ia`.');
    }

    console.log('');
    print.status('Commit your changes:');
    console.log(`  git add . && git commit -m "Archive playlist ${playlistTitle}"`);
    console.log('  git push origin main');
    console.log('');

  } catch (error) {
    print.error(`Error processing file: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseCsv, generatePlaylistObject, generateArchiveUrl, generateDescription, formatDate, updatePlaylistsTs };
