export type Track = {
  artist: string;
  title: string;
  album?: string;
  links?: {
    spotify?: string;
    appleMusic?: string;
    youtube?: string;
  };
};

export type Playlist = {
  id: string; // ISO date string like 2025-01-10
  title: string;
  description?: string;
  tracks: Track[];
};

export type Recording = {
  id: string; // slug
  title: string;
  date: string; // ISO date
  audioUrl: string;
  downloadUrl?: string;
  description?: string;
};

export type EventItem = {
  id: string;
  title: string;
  date: string; // ISO date or range
  venue?: string;
  location?: string;
  url?: string;
  description?: string;
};

