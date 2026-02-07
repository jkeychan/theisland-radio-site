#!/usr/bin/env node

/**
 * CSV to Archive.org Pipe-Delimited Converter
 * 
 * Converts CSV playlist data to pipe-delimited format for Archive.org descriptions
 * Usage: node csv-to-archive-converter.js input.csv
 * 
 * Expected CSV format:
 * Title,Artist,Album,Time
 * Song Title,Artist Name,Album Name,03:45
 */

const fs = require('fs');
const path = require('path');

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

    if (!inQuotes && (char === ',')) {
      row.push(current);
      current = '';
      continue;
    }

    if (!inQuotes && (char === '\n')) {
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    if (!inQuotes && char === '\r') {
      // ignore CR
      continue;
    }

    current += char;
  }
  // flush
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
    // skip empty rows
    const hasValue = Object.values(record).some((v) => v !== '');
    if (hasValue) out.push(record);
  }
  return out;
}

function convertToPipeDelimited(csvData) {
  const records = parseCsv(csvData);
  
  if (records.length === 0) {
    console.log('No data found in CSV');
    return '';
  }

  // Add header row
  const headerRow = 'Title | Artist | Album';
  
  // Convert to pipe-delimited format
  // Support multiple header naming conventions (Spotify/Apple export vs generic)
  const pipeDelimitedLines = records.map(record => {
    const title = record.Title || record.title || record['Track Name'] || '';
    const artist = record.Artist || record.artist || record['Artist Name(s)'] || '';
    const album = record.Album || record.album || record['Album Name'] || '';
    
    // Format: Title | Artist | Album
    return `${title} | ${artist} | ${album}`;
  });

  return [headerRow, ...pipeDelimitedLines].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node csv-to-archive-converter.js <input.csv>');
    console.log('');
    console.log('This script converts CSV playlist data to pipe-delimited format');
    console.log('suitable for Archive.org descriptions.');
    console.log('');
    console.log('Expected CSV format:');
    console.log('Title,Artist,Album,Time');
    console.log('Song Title,Artist Name,Album Name,03:45');
    process.exit(1);
  }

  const inputFile = args[0];
  
  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File "${inputFile}" not found`);
    process.exit(1);
  }

  try {
    const csvContent = fs.readFileSync(inputFile, 'utf8');
    const pipeDelimitedOutput = convertToPipeDelimited(csvContent);
    
    console.log('Converted playlist data (pipe-delimited format):');
    console.log('================================================');
    console.log(pipeDelimitedOutput);
    console.log('================================================');
    console.log('');
    console.log('Copy the above text and paste it into your Archive.org description.');
    
    // Also save to a file for convenience
    const outputFile = inputFile.replace(/\.csv$/i, '_archive.txt');
    fs.writeFileSync(outputFile, pipeDelimitedOutput);
    console.log(`Also saved to: ${outputFile}`);
    
  } catch (error) {
    console.error('Error processing file:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseCsv, convertToPipeDelimited };
