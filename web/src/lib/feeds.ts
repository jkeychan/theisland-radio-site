import type { Playlist, Track } from "@/types/content";
import { parseCsv } from "./csv";

function parseTracksField(tracksField: string): Track[] {
  if (!tracksField) return [];
  // Allow newline- or semicolon-separated entries; format: "Artist - Title" optionally (Album)
  const lines = tracksField
    .split(/\r?\n|;/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return lines.map((line) => {
    const dashIdx = line.indexOf(" - ");
    if (dashIdx > -1) {
      const artist = line.slice(0, dashIdx).trim();
      const rest = line.slice(dashIdx + 3).trim();
      const albumMatch = rest.match(/^(.*)\s*\(([^)]+)\)\s*$/);
      if (albumMatch) {
        return { artist, title: albumMatch[1].trim(), album: albumMatch[2].trim() };
      }
      return { artist, title: rest };
    }
    return { artist: "", title: line };
  });
}

export async function fetchPlaylistsFromCsv(csvUrl: string): Promise<Playlist[]> {
  const res = await fetch(csvUrl, { cache: "no-store" });
  const text = await res.text();
  const rows = parseCsv(text);
  // Expected headers: id,title,description,archiveUrl,tracks
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    archiveUrl: r.archiveUrl || undefined,
    tracks: parseTracksField(r.tracks),
  }));
}




