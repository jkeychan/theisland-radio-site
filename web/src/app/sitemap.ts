import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://theisland.radio.fm";
  return [
    { url: `${base}/`,           changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/playlists/`, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/contact/`,   changeFrequency: "monthly", priority: 0.5 },
  ];
}


