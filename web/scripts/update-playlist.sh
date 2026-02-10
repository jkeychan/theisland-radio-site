#!/bin/bash

# Streamlined weekly playlist update script
# Usage: ./scripts/update-playlist.sh "CSV_URL" "PLAYLIST_ID" "PLAYLIST_TITLE" "DESCRIPTION"
#
# Example:
# ./scripts/update-playlist.sh "https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0" "2025-11-21" "November 21, 2025" "Dub Tractor's Island vibes"

set -e  # Exit on error

CSV_URL="$1"
PLAYLIST_ID="$2"
PLAYLIST_TITLE="$3"
DESCRIPTION="${4:-Dub Tractor's Island vibes}"

if [ -z "$CSV_URL" ] || [ -z "$PLAYLIST_ID" ] || [ -z "$PLAYLIST_TITLE" ]; then
    echo "❌ Error: Missing required arguments"
    echo ""
    echo "Usage: ./scripts/update-playlist.sh \"CSV_URL\" \"PLAYLIST_ID\" \"PLAYLIST_TITLE\" [DESCRIPTION]"
    echo ""
    echo "Example:"
    echo "  ./scripts/update-playlist.sh \\"
    echo "    \"https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0\" \\"
    echo "    \"2025-11-21\" \\"
    echo "    \"November 21, 2025\" \\"
    echo "    \"Dub Tractor's Island vibes\""
    exit 1
fi

echo "🎵 Updating playlist: $PLAYLIST_TITLE"
echo "📅 Playlist ID: $PLAYLIST_ID"
echo "📊 CSV URL: $CSV_URL"
echo ""

# Validate CSV URL format
if [[ ! "$CSV_URL" =~ ^https://docs\.google\.com/spreadsheets/ ]]; then
    echo "⚠️  Warning: CSV URL doesn't look like a Google Sheets URL"
fi

# Validate playlist ID format (should be YYYY-MM-DD)
if [[ ! "$PLAYLIST_ID" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    echo "⚠️  Warning: Playlist ID should be in YYYY-MM-DD format"
fi

# Run validation script
echo "🔍 Validating CSV..."
node scripts/validate-playlist.js "$CSV_URL" || {
    echo "❌ CSV validation failed"
    exit 1
}

# Create temporary conversion script
TEMP_SCRIPT=$(mktemp)
cat > "$TEMP_SCRIPT" << 'NODE_SCRIPT'
const https = require('https');
const http = require('http');

async function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (data.includes('<HTML>') || data.includes('<html>')) {
          reject(new Error('Sheet access restricted. Please make the sheet public or check the URL.'));
        } else {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const tracks = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === ',,,' || line.includes('Duration (in minutes):')) continue;
    
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    
    if (fields.length >= 2 && fields[0] && fields[1]) {
      tracks.push({
        title: fields[0] || '',
        artist: fields[1] || '',
        album: fields[2] || ''
      });
    }
  }
  
  return tracks;
}

function escapeString(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

async function main() {
  const args = process.argv.slice(2);
  const [csvUrl, playlistId, playlistTitle, description = 'Dub Tractor\'s Island vibes'] = args;
  
  try {
    console.log('📥 Fetching CSV from Google Sheets...');
    const csvData = await fetchCSV(csvUrl);
    const tracks = parseCSV(csvData);
    
    if (tracks.length === 0) {
      console.error('❌ Error: No tracks found in CSV');
      process.exit(1);
    }
    
    console.log(`✅ Found ${tracks.length} tracks`);
    console.log('');
    console.log('// Add this to src/data/playlists.ts (at the beginning of the array):');
    console.log('');
    console.log(`{`);
    console.log(`  id: "${playlistId}",`);
    console.log(`  title: "${escapeString(playlistTitle)}",`);
    console.log(`  description: "${escapeString(description)}",`);
    console.log(`  tracks: [`);
    tracks.forEach((t, i) => {
      const comma = i < tracks.length - 1 ? ',' : '';
      const artist = escapeString(t.artist);
      const title = escapeString(t.title);
      const album = t.album ? `, album: "${escapeString(t.album)}"` : '';
      console.log(`    { artist: "${artist}", title: "${title}"${album} }${comma}`);
    });
    console.log(`  ]`);
    console.log(`},`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('  1. Make sure your Google Sheet is set to "Anyone with the link can view"');
    console.log('  2. Check that the CSV export URL is correct');
    console.log('  3. Verify the sheet has Title, Artist, and Album columns');
    process.exit(1);
  }
}

main();
NODE_SCRIPT

# Run the conversion
node "$TEMP_SCRIPT" "$CSV_URL" "$PLAYLIST_ID" "$PLAYLIST_TITLE" "$DESCRIPTION"

# Clean up
rm "$TEMP_SCRIPT"

echo "✅ Conversion complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Copy the output above"
echo "  2. Paste it at the beginning of src/data/playlists.ts"
echo "  3. Review the changes: git diff src/data/playlists.ts"
echo "  4. Commit: git add src/data/playlists.ts && git commit"
echo "  5. Push: git push"

