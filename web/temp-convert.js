const https = require('https');

async function fetchCSV(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        // Check if we got HTML instead of CSV (redirect/access issue)
        if (data.includes('<HTML>') || data.includes('<html>')) {
          reject(new Error('Sheet access restricted. Please make the sheet public or use a different method.'));
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
    console.log('\n=== MANUAL FALLBACK ===');
    console.log('If the sheet is private, you can manually copy the CSV data:');
    console.log('1. Open your Google Sheet');
    console.log('2. Go to File > Download > Comma-separated values (.csv)');
    console.log('3. Copy the CSV content and paste it below:');
    console.log('4. Press Ctrl+D when done');
    console.log('\nPaste CSV data here:');
    
    // Read from stdin
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    let csvData = '';
    rl.on('line', (line) => {
      csvData += line + '\n';
    });
    
    rl.on('close', () => {
      try {
        const tracks = parseCSV(csvData);
        console.log(`\n// Add this to src/data/playlists.ts (at the beginning of the array):`);
        console.log(`{
  id: "${playlistId}",
  title: "${playlistTitle}",
  description: "${description}",
  tracks: [
${tracks.map(t => `    { artist: "${t.artist}", title: "${t.title}"${t.album ? `, album: "${t.album}"` : ''} }`).join(',\n')}
  ]
},`);
      } catch (parseError) {
        console.error('Error parsing CSV:', parseError.message);
      }
    });
  }
}

main();
