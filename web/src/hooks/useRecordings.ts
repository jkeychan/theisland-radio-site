"use client";

import { useEffect, useState } from "react";
import type { Recording } from "@/types/content";
import { recordings as localRecordings } from "@/data/recordings";
import { fetchRecordingsFromCsv } from "@/lib/feeds";

export function useRecordings(): { data: Recording[]; loading: boolean } {
  const [data, setData] = useState<Recording[]>(localRecordings);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_RECORDINGS_CSV_URL;
    if (!url) return; // stay with local
    let cancelled = false;
    setLoading(true);
    fetchRecordingsFromCsv(url)
      .then((remote) => {
        if (!cancelled && Array.isArray(remote) && remote.length > 0) {
          remote.sort((a, b) => (a.date < b.date ? 1 : -1));
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



