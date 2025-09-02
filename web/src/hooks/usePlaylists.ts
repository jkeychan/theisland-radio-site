"use client";

import { useEffect, useState } from "react";
import type { Playlist } from "@/types/content";
import { playlists as localPlaylists } from "@/data/playlists";
import { fetchPlaylistsFromCsv } from "@/lib/feeds";

export function usePlaylists(): { data: Playlist[]; loading: boolean } {
  const [data, setData] = useState<Playlist[]>(localPlaylists);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_PLAYLISTS_CSV_URL;
    if (!url) return; // stick with local data
    let cancelled = false;
    setLoading(true);
    fetchPlaylistsFromCsv(url)
      .then((remote) => {
        if (!cancelled && Array.isArray(remote) && remote.length > 0) {
          // sort desc by id (ISO date)
          remote.sort((a, b) => (a.id < b.id ? 1 : -1));
          setData(remote);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}



