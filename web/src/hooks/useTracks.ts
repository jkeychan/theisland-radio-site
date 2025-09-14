"use client";

import { useEffect, useState } from "react";
import type { Track } from "@/types/content";
import { parseCsv } from "@/lib/csv";

export const useTracks = (): { data: Track[]; loading: boolean } => {
  const [data, setData] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_TRACKS_CSV_URL;
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    fetch(url, { cache: "no-store" })
      .then((r) => r.text())
      .then((text) => parseCsv(text))
      .then((rows) => {
        if (cancelled) return;
        // Expected headers: Title, Artist, Album (case-insensitive)
        const normalized = rows.map((r) => {
          // Try common header names
          const title = r.Title || r.Name || r.Song || "";
          const artist = r.Artist || r.Artists || "";
          const album = r.Album || r.Record || r.Release || "";
          return { title, artist, album: album || undefined } as Track;
        }).filter((t) => t.title || t.artist);
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


