import type { MetadataRoute } from "next";

export const dynamic = "force-static";
export const revalidate = 86400; // 1 day

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://theisland.radio.fm";
  const urls = ["/", "/playlists/", "/contact/"];
  return urls.map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly", priority: 0.7 }));
}


