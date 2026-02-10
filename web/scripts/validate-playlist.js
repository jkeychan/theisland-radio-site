#!/usr/bin/env node

/**
 * CSV Playlist Validation Script
 * Validates Google Sheets CSV format for playlist updates
 * 
 * Usage: node scripts/validate-playlist.js "CSV_URL"
 */

const https = require('https');
const http = require('http');

async function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (data.includes('<HTML>') || data.includes('<html>')) {
          reject(new Error('Sheet access restricted. Please make the sheet public.'));
        } else {
          resolve(data);
        }
      });
    });
    
    request.on('error', (err) => {
      reject(new Error(`Network error: ${err.message}`));
    });
    
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }
  
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  // Check for required columns (case-insensitive)
  const hasTitle = headers.some(h => h === 'title' || h === 'name' || h === 'song');
  const hasArtist = headers.some(h => h === 'artist' || h === 'artists');
  
  if (!hasTitle || !hasArtist) {
    throw new Error(`Missing required columns. Found: ${headers.join(', ')}. Need: Title, Artist`);
  }
  
  const tracks = [];
  let emptyRows = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === ',,,' || line.match(/^,+$/)) {
      emptyRows++;
      continue;
    }
    
    // Skip metadata rows
    if (line.includes('Duration (in minutes):') || line.includes('Total:')) {
      continue;
    }
    
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (inQuotes && line[j + 1] === '"') {
          current += '"';
          j++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    
    // Map fields to columns
    const titleIndex = headers.findIndex(h => h === 'title' || h === 'name' || h === 'song');
    const artistIndex = headers.findIndex(h => h === 'artist' || h === 'artists');
    const albumIndex = headers.findIndex(h => h === 'album' || h === 'record' || h === 'release');
    
    const title = fields[titleIndex] || '';
    const artist = fields[artistIndex] || '';
    const album = albumIndex >= 0 ? (fields[albumIndex] || '') : '';
    
    if (title || artist) {
      tracks.push({ title, artist, album });
    }
  }
  
  return { tracks, headers, emptyRows };
}

async function main() {
  const csvUrl = process.argv[2];
  
  if (!csvUrl) {
    console.error('❌ Error: CSV URL required');
    console.log('');
    console.log('Usage: node scripts/validate-playlist.js "CSV_URL"');
    process.exit(1);
  }
  
  try {
    console.log('🔍 Validating CSV playlist...');
    console.log(`📊 URL: ${csvUrl}`);
    console.log('');
    
    const csvData = await fetchCSV(csvUrl);
    const { tracks, headers, emptyRows } = parseCSV(csvData);
    
    console.log('✅ CSV validation passed!');
    console.log('');
    console.log(`📋 Headers found: ${headers.join(', ')}`);
    console.log(`🎵 Tracks found: ${tracks.length}`);
    if (emptyRows > 0) {
      console.log(`⚠️  Empty rows skipped: ${emptyRows}`);
    }
    console.log('');
    
    if (tracks.length === 0) {
      console.error('❌ Error: No valid tracks found in CSV');
      process.exit(1);
    }
    
    // Show sample tracks
    console.log('📝 Sample tracks (first 3):');
    tracks.slice(0, 3).forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.artist} - ${t.title}${t.album ? ` (${t.album})` : ''}`);
    });
    if (tracks.length > 3) {
      console.log(`   ... and ${tracks.length - 3} more`);
    }
    console.log('');
    
    // Check for common issues
    const issues = [];
    if (tracks.length < 5) {
      issues.push('⚠️  Warning: Very few tracks found. Is this correct?');
    }
    
    const missingArtists = tracks.filter(t => !t.artist).length;
    if (missingArtists > 0) {
      issues.push(`⚠️  Warning: ${missingArtists} tracks missing artist name`);
    }
    
    const missingTitles = tracks.filter(t => !t.title).length;
    if (missingTitles > 0) {
      issues.push(`⚠️  Warning: ${missingTitles} tracks missing title`);
    }
    
    if (issues.length > 0) {
      console.log('⚠️  Issues found:');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
    }
    
    console.log('✅ Validation complete! Ready to convert.');
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('  1. Make sure your Google Sheet is set to "Anyone with the link can view"');
    console.log('  2. Check that the CSV export URL is correct');
    console.log('  3. Verify the sheet has Title, Artist, and Album columns');
    console.log('  4. Try downloading the CSV manually to verify format');
    process.exit(1);
  }
}

main();

