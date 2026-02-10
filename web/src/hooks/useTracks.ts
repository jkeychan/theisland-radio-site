"use client";

import { useEffect, useState } from "react";
import type { Track } from "@/types/content";
import { parseCsv } from "@/lib/csv";

export const useTracks = (): { data: Track[]; loading: boolean; error: string | null } => {
  const [data, setData] = useState<Track[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_TRACKS_CSV_URL;
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url, { cache: "no-store" })
      .then((r) => r.text())
      .then((text) => parseCsv(text))
      .then((rows) => {
        if (cancelled) return;
        const normalized = rows
          .map((r) => {
            const title = r.Title || r.Name || r.Song || "";
            const artist = r.Artist || r.Artists || "";
            const album = r.Album || r.Record || r.Release || "";
            return { title, artist, album: album || undefined } as Track;
          })
          .filter((t) => t.title || t.artist);
        setData(normalized);
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load tracks";
          console.error("Error fetching tracks:", err);
          setError(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
};


