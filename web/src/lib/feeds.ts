import type { Playlist, Recording, Track } from "@/types/content";
import { parseCsv } from "./csv";

function parseTracksField(tracksField: string): Track[] {
  if (!tracksField) return [];
  // Allow newline- or semicolon-separated entries; format: "Artist - Title" optionally (Album)
  const lines = tracksField
    .split(/\r?\n|;/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return lines.map((line) => {
    // Try to split on dash
    const dashIdx = line.indexOf(" - ");
    if (dashIdx > -1) {
      const artist = line.slice(0, dashIdx).trim();
      const rest = line.slice(dashIdx + 3).trim();
      // Optional album in parentheses at end
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
  // Expected headers: id,title,description,tracks
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    tracks: parseTracksField(r.tracks),
  }));
}

export async function fetchRecordingsFromCsv(csvUrl: string): Promise<Recording[]> {
  const res = await fetch(csvUrl, { cache: "no-store" });
  const text = await res.text();
  const rows = parseCsv(text);
  // Expected headers: id,title,date,audioUrl,downloadUrl,description
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    date: r.date,
    audioUrl: r.audioUrl,
    downloadUrl: r.downloadUrl || r.audioUrl,
    description: r.description,
  }));
}



