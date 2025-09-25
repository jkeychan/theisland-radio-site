#!/usr/bin/env python3

import requests
import csv
import sys
import io


def fetch_csv_with_user_agent(url):
    """Fetch CSV with proper user agent to avoid Google Sheets blocking"""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        print(f"Error fetching CSV: {e}")
        return None


def parse_csv_to_playlist(csv_text, playlist_id, playlist_title, description):
    """Convert CSV text to playlist format"""
    tracks = []

    # Parse CSV
    csv_reader = csv.reader(io.StringIO(csv_text))
    rows = list(csv_reader)

    if not rows:
        return None

    # Skip header row
    for row in rows[1:]:
        if len(row) >= 3 and row[0].strip() and row[1].strip():
            # Skip empty rows and duration rows
            if row[0].strip() == '' or 'Duration' in row[0]:
                continue

            tracks.append({
                'title': row[0].strip(),
                'artist': row[1].strip(),
                'album': row[2].strip() if len(row) > 2 else ''
            })

    return {
        'id': playlist_id,
        'title': playlist_title,
        'description': description,
        'tracks': tracks
    }


def generate_typescript(playlist):
    """Generate TypeScript code for the playlist"""
    tracks_ts = []
    for track in playlist['tracks']:
        album_part = f', album: "{track["album"]}"' if track['album'] else ''
        tracks_ts.append(
            f'    {{ artist: "{track["artist"]}", title: "{track["title"]}"{album_part} }}')

    return f"""{{
  id: "{playlist['id']}",
  title: "{playlist['title']}",
  description: "{playlist['description']}",
  tracks: [
{',\n'.join(tracks_ts)}
  ]
}}"""


def main():
    if len(sys.argv) < 4:
        print(
            "Usage: python3 convert-playlist.py <CSV_URL> <PLAYLIST_ID> <PLAYLIST_TITLE> [DESCRIPTION]")
        print("Example: python3 convert-playlist.py 'https://docs.google.com/spreadsheets/d/15PgCEAXbdRBukiUXpRh3BDP9jwER4mzJfKslA51ort4/export?format=csv&gid=0' '2025-09-26' 'September 26, 2025' 'Dub Tractor\\'s Island vibes'")
        sys.exit(1)

    csv_url = sys.argv[1]
    playlist_id = sys.argv[2]
    playlist_title = sys.argv[3]
    description = sys.argv[4] if len(sys.argv) > 4 else ''

    print(f"Fetching CSV from: {csv_url}")
    csv_text = fetch_csv_with_user_agent(csv_url)

    if not csv_text:
        print("Failed to fetch CSV data")
        sys.exit(1)

    playlist = parse_csv_to_playlist(
        csv_text, playlist_id, playlist_title, description)

    if not playlist:
        print("Failed to parse CSV data")
        sys.exit(1)

    print(f"Found {len(playlist['tracks'])} tracks")
    print("\n// Copy this to src/data/playlists.ts (at the beginning of the array):")
    print(generate_typescript(playlist))
    print(",")


if __name__ == "__main__":
    main()
