"use client";

import { useEffect, useState } from "react";
import type { Playlist } from "@/types/content";
import { playlists as localPlaylists } from "@/data/playlists";
import { fetchPlaylistsFromCsv } from "@/lib/feeds";

export function usePlaylists(): { data: Playlist[]; loading: boolean; error: string | null } {
  const [data, setData] = useState<Playlist[]>(localPlaylists);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_PLAYLISTS_CSV_URL;
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPlaylistsFromCsv(url)
      .then((remote) => {
        if (!cancelled && Array.isArray(remote) && remote.length > 0) {
          remote.sort((a, b) => (a.id < b.id ? 1 : -1));
          setData(remote);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load playlists";
          console.error("Error fetching playlists:", err);
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
}



