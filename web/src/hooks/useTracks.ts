"use client";

import { useEffect, useState } from "react";
import type { Track } from "@/types/content";
import { parseCsv } from "@/lib/csv";

export const useTracks = (): { data: Track[]; loading: boolean } => {
  const [data, setData] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_TRACKS_CSV_URL;
    console.log("CSV URL:", url); // Debug: check if URL is set
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    fetch(url, { cache: "no-store" })
      .then((r) => r.text())
      .then((text) => {
        console.log("Raw CSV text:", text.substring(0, 200)); // Debug: show first 200 chars
        return parseCsv(text);
      })
      .then((rows) => {
        if (cancelled) return;
        console.log("Parsed CSV rows:", rows.slice(0, 3)); // Debug: show first 3 rows
        // Expected headers: Title, Artist, Album, Time (case-insensitive)
        const normalized = rows.map((r) => {
          // Try common header names
          const title = r.Title || r.Name || r.Song || "";
          const artist = r.Artist || r.Artists || "";
          const album = r.Album || r.Record || r.Release || "";
          const time = r.Time || r.Duration || "";
          return { title, artist, album: album || undefined, time: time || undefined } as Track;
        }).filter((t) => t.title || t.artist);
        console.log("Normalized tracks:", normalized.slice(0, 3)); // Debug: show first 3 tracks
        setData(normalized);
      })
      .catch((error) => {
        console.error("Error fetching tracks:", error);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
};


