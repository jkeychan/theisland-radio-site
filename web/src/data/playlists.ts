import type { Playlist } from "@/types/content";

export const playlists: Playlist[] = [
  {
    id: "2025-01-10",
    title: "Reggae Roots & Rocksteady",
    description: "Foundation tunes and timeless riddims.",
    tracks: [
      { artist: "Bob Marley", title: "Stir It Up" },
      { artist: "Toots & The Maytals", title: "54-46 That's My Number" },
      { artist: "The Paragons", title: "The Tide Is High" },
    ],
  },
  {
    id: "2024-12-20",
    title: "Holiday Ska Special",
    tracks: [
      { artist: "The Skatalites", title: "Guns of Navarone" },
      { artist: "Desmond Dekker", title: "Israelites" },
    ],
  },
  {
    id: "2024-12-13",
    title: "Dub Explorations",
    tracks: [
      { artist: "King Tubby", title: "Dub You Can Feel" },
      { artist: "Scientist", title: "Beam Down" },
    ],
  },
];

