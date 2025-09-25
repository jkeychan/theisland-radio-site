#!/bin/bash

# Simple script to convert Google Sheets CSV to playlist format
# Usage: ./add-playlist.sh "CSV_URL" "PLAYLIST_ID" "PLAYLIST_TITLE" "DESCRIPTION"

CSV_URL="$1"
PLAYLIST_ID="$2"
PLAYLIST_TITLE="$3"
DESCRIPTION="$4"

if [ -z "$CSV_URL" ] || [ -z "$PLAYLIST_ID" ] || [ -z "$PLAYLIST_TITLE" ]; then
    echo "Usage: ./add-playlist.sh \"CSV_URL\" \"PLAYLIST_ID\" \"PLAYLIST_TITLE\" \"DESCRIPTION\""
    echo "Example: ./add-playlist.sh \"https://docs.google.com/spreadsheets/d/1rbh5p0X0u-DU9UkCIr9TuQT64Q95_zL2xTBofs5jne4/export?format=csv&gid=0\" \"2025-09-19\" \"September 19, 2025\" \"Dub Tractor's Island vibes\""
    exit 1
fi

echo "Converting playlist: $PLAYLIST_TITLE"
echo "CSV URL: $CSV_URL"

# Create a temporary Node.js script
cat > temp-convert.js << 'EOF'
const https = require('https');

async function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const tracks = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line === ',,,' || line.includes('Duration (in minutes):')) continue;
    
    // Simple CSV parsing
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
    
    if (fields.length >= 3 && fields[0] && fields[1]) {
      tracks.push({
        title: fields[0],
        artist: fields[1],
        album: fields[2] || ''
      });
    }
  }
  
  return tracks;
}

async function main() {
  const args = process.argv.slice(2);
  const [csvUrl, playlistId, playlistTitle, description = ''] = args;
  
  try {
    const csvData = await fetchCSV(csvUrl);
    const tracks = parseCSV(csvData);
    
    console.log(`// Add this to src/data/playlists.ts (at the beginning of the array):`);
    console.log(`{
  id: "${playlistId}",
  title: "${playlistTitle}",
  description: "${description}",
  tracks: [
${tracks.map(t => `    { artist: "${t.artist}", title: "${t.title}"${t.album ? `, album: "${t.album}"` : ''} }`).join(',\n')}
  ]
},`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
EOF

# Run the conversion
node temp-convert.js "$CSV_URL" "$PLAYLIST_ID" "$PLAYLIST_TITLE" "$DESCRIPTION"

# Clean up
rm temp-convert.js

echo ""
echo "Copy the output above and paste it at the beginning of the playlists array in src/data/playlists.ts"
echo "Then commit and push to update the archive!"
