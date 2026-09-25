/**
 * Playlist helpers used by island-show.js: build the playlists.ts entry,
 * archive.org URL and description, and write the entry into playlists.ts.
 */

const fs = require('fs');

// Escape string for use in JavaScript/TypeScript string literals
// Escapes backslashes first, then quotes to prevent injection
function escapeString(str) {
  return str
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/"/g, '\\"');   // Then escape double quotes
}

// Escape a string for use inside a RegExp
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Generate description for archive.org upload.
// Produces HTML with backlinks to theisland.radio.fm and wartfm.org,
// followed by the full pipe-delimited tracklist.
function generateDescription(records, playlistTitle) {
  const H2 = 'class="text-xl font-medium" style="font-family:\'Helvetica Neue\', Helvetica, Arial, sans-serif;font-weight:500;line-height:1.4;color:rgb(44,44,44);margin:0px;font-size:30px;background-color:rgb(255,255,255);border:0px solid;padding:0px;"';
  const LINK = 'style="background:transparent;color:rgb(75,100,255);"';

  const trackDivs = records
    .map(r => {
      const title  = (r.Title  || r.title  || '').trim();
      const artist = (r.Artist || r.artist || '').trim();
      const album  = (r.Album  || r.album  || '').trim();
      return `${title} | ${artist} | ${album}`;
    })
    .filter(l => l !== ' |  | ' && l !== '||')
    .map(l => `<div>${l}</div>`)
    .join('');

  return (
    `<h2 ${H2}><a href="https://theisland.radio.fm/" ${LINK} rel="ugc nofollow">The Island with Dub Tractor</a> on <a href="https://wartfm.org/" ${LINK} rel="ugc nofollow">WART-FM 95.5</a> </h2>` +
    `<h2 ${H2}>${playlistTitle} Playlist</h2>` +
    `<div><br /></div>` +
    `<div><div>Title | Artist | Album</div>${trackDivs}</div>`
  );
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

function updatePlaylistsTs(playlistObject, playlistId, playlistsFilePath) {
  if (!fs.existsSync(playlistsFilePath)) {
    throw new Error(`Playlists file not found: ${playlistsFilePath}`);
  }
  const content = fs.readFileSync(playlistsFilePath, 'utf8');

  // An entry for this show may already exist (e.g. a track was added to the
  // Spotify playlist after the first run today). Replace it in place instead
  // of skipping, so re-runs pick up tracklist changes.
  const entryRegex = new RegExp(
    `\\{\\s*\\n\\s*id: "${escapeRegExp(playlistId)}"[\\s\\S]*?\\n\\s*\\},`
  );
  const existingMatch = content.match(entryRegex);
  if (existingMatch) {
    const oldEntry = existingMatch[0];
    const newEntry = playlistObject.trim().replace(/,$/, '') + ',';
    if (oldEntry.replace(/\s+/g, ' ') === newEntry.replace(/\s+/g, ' ')) {
      return { skipped: true };
    }
    const updatedContent = content.replace(oldEntry, () => newEntry);
    fs.writeFileSync(playlistsFilePath, updatedContent);
    return { skipped: false };
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

module.exports = { generatePlaylistObject, generateArchiveUrl, generateDescription, formatDate, updatePlaylistsTs };
