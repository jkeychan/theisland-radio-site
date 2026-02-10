"use client";

import { useEffect, useState } from "react";
import type { Recording } from "@/types/content";
import { recordings as localRecordings } from "@/data/recordings";
import { fetchRecordingsFromCsv } from "@/lib/feeds";

export function useRecordings(): { data: Recording[]; loading: boolean; error: string | null } {
  const [data, setData] = useState<Recording[]>(localRecordings);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_RECORDINGS_CSV_URL;
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRecordingsFromCsv(url)
      .then((remote) => {
        if (!cancelled && Array.isArray(remote) && remote.length > 0) {
          remote.sort((a, b) => (a.date < b.date ? 1 : -1));
          setData(remote);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load recordings";
          console.error("Error fetching recordings:", err);
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



