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
