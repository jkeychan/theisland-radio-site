/**
 * @jest-environment node
 */
'use strict';
const fs   = require('fs');
const os   = require('os');
const path = require('path');

const { updatePlaylistsTs } = require('../../archive-playlist.js');

describe('updatePlaylistsTs', () => {
  let tmpFile;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `playlists-test-${Date.now()}.ts`);
    fs.writeFileSync(tmpFile,
      `import type { Playlist } from "@/types/content";\n\nexport const playlists: Playlist[] = [\n];`
    );
  });

  afterEach(() => { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); });

  it('prepends a new playlist entry and returns skipped:false', () => {
    const obj = `  {\n    id: "2026-03-27",\n    title: "March 27, 2026",\n    tracks: []\n  },`;
    const result = updatePlaylistsTs(obj, '2026-03-27', tmpFile);
    expect(result.skipped).toBe(false);
    expect(fs.readFileSync(tmpFile, 'utf8')).toContain('id: "2026-03-27"');
  });

  it('returns skipped:true when playlist id already exists', () => {
    const content = `import type { Playlist } from "@/types/content";\n\nexport const playlists: Playlist[] = [\n  {\n    id: "2026-03-27",\n    title: "March 27, 2026",\n    tracks: []\n  },\n];`;
    fs.writeFileSync(tmpFile, content);
    const obj = `  {\n    id: "2026-03-27",\n    title: "March 27, 2026",\n    tracks: []\n  },`;
    const result = updatePlaylistsTs(obj, '2026-03-27', tmpFile);
    expect(result.skipped).toBe(true);
  });
});

const {
  parseDateFromFolderName,
  buildId3Title,
  buildArchiveOrgTitle,
  buildOutputMp3Name,
  parseExportifyCsv,
  findWartFiles,
} = require('../../island-show.js');

describe('parseDateFromFolderName', () => {
  it('parses a standard folder name', () => {
    expect(parseDateFromFolderName('The Island March 27 2026')).toBe('2026-03-27');
  });
  it('handles single-digit day', () => {
    expect(parseDateFromFolderName('The Island January 2 2026')).toBe('2026-01-02');
  });
  it('handles zero-padded day in folder name', () => {
    expect(parseDateFromFolderName('The Island October 03 2025')).toBe('2025-10-03');
  });
  it('handles the "Feburary" typo', () => {
    expect(parseDateFromFolderName('The Island Feburary 6 2026')).toBe('2026-02-06');
  });
  it('returns null for unrecognized format', () => {
    expect(parseDateFromFolderName('some other folder')).toBeNull();
  });
});

describe('buildId3Title', () => {
  it('formats without comma and without zero-padding', () => {
    expect(buildId3Title('2026-03-27')).toBe('The Island with Dub Tractor - March 27 2026');
  });
  it('does not zero-pad single-digit days', () => {
    expect(buildId3Title('2025-10-03')).toBe('The Island with Dub Tractor - October 3 2025');
  });
});

describe('buildArchiveOrgTitle', () => {
  it('formats with comma after day', () => {
    expect(buildArchiveOrgTitle('2026-03-27')).toBe('The Island with Dub Tractor - March 27, 2026');
  });
});

describe('buildOutputMp3Name', () => {
  it('appends .mp3 to the id3 title', () => {
    expect(buildOutputMp3Name('2026-03-27')).toBe('The Island with Dub Tractor - March 27 2026.mp3');
  });
});

describe('parseExportifyCsv', () => {
  it('extracts title, artist, album from exportify columns', () => {
    const csv = `Track URI,Track Name,Album Name,Artist Name(s),Release Date\nuri1,"Revelation Rockers","Raw Dubs, Vol. 1","Channel One",2025\n`;
    const result = parseExportifyCsv(csv);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ title: 'Revelation Rockers', artist: 'Channel One', album: 'Raw Dubs, Vol. 1' });
  });
  it('replaces semicolons with comma-space in artist names', () => {
    const csv = `Track URI,Track Name,Album Name,Artist Name(s),Release Date\nuri1,"Song","Album","Artist One;Artist Two",2025\n`;
    expect(parseExportifyCsv(csv)[0].artist).toBe('Artist One, Artist Two');
  });
  it('strips UTF-8 BOM', () => {
    const csv = `\uFEFFTrack URI,Track Name,Album Name,Artist Name(s),Release Date\nuri1,"Song","Album","Artist",2025\n`;
    expect(parseExportifyCsv(csv)).toHaveLength(1);
  });
  it('skips empty rows', () => {
    const csv = `Track URI,Track Name,Album Name,Artist Name(s),Release Date\n,,,,\n`;
    expect(parseExportifyCsv(csv)).toHaveLength(0);
  });
  it('throws if not an exportify CSV', () => {
    const csv = `Title,Artist,Album\nSong,Artist,Album\n`;
    expect(() => parseExportifyCsv(csv)).toThrow('Not an exportify CSV');
  });
});

describe('findWartFiles', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wart-test-')); });
  afterEach(() => { fs.rmSync(tmpDir, { recursive: true }); });

  it('finds a file matching YYMMDD prefix', () => {
    fs.writeFileSync(path.join(tmpDir, '260327_0161.mp3'), '');
    expect(findWartFiles('2026-03-27', tmpDir)).toEqual(['260327_0161.mp3']);
  });
  it('returns empty array when no match', () => {
    expect(findWartFiles('2026-03-27', tmpDir)).toEqual([]);
  });
  it('returns all matches when multiple files match the same date', () => {
    fs.writeFileSync(path.join(tmpDir, '260327_0161.mp3'), '');
    fs.writeFileSync(path.join(tmpDir, '260327_0162.mp3'), '');
    expect(findWartFiles('2026-03-27', tmpDir)).toHaveLength(2);
  });
  it('does not match a different date', () => {
    fs.writeFileSync(path.join(tmpDir, '260313_0142.mp3'), '');
    expect(findWartFiles('2026-03-27', tmpDir)).toHaveLength(0);
  });
});
