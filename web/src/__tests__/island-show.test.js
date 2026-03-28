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
