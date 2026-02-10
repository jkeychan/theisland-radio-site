#!/usr/bin/env python3

import csv
import sys
import io


def convert_csv_file_to_playlist(csv_file_path, playlist_id, playlist_title, description):
    """Convert local CSV file to playlist format"""
    tracks = []

    try:
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.reader(file)
            rows = list(csv_reader)
    except FileNotFoundError:
        print(f"Error: File '{csv_file_path}' not found")
        return None
    except Exception as e:
        print(f"Error reading file: {e}")
        return None

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

    newline = '\n'
    tracks_str = (',' + newline).join(tracks_ts)
    return f"""{{
  id: "{playlist['id']}",
  title: "{playlist['title']}",
  description: "{playlist['description']}",
  tracks: [
{tracks_str}
  ]
}}"""


def main():
    if len(sys.argv) < 4:
        print(
            "Usage: python3 convert-local-csv.py <CSV_FILE> <PLAYLIST_ID> <PLAYLIST_TITLE> [DESCRIPTION]")
        print("Example: python3 convert-local-csv.py 'September 26, 2025 - Sheet1.csv' '2025-09-26' 'September 26, 2025' 'Dub Tractor\\'s Island vibes'")
        sys.exit(1)

    csv_file = sys.argv[1]
    playlist_id = sys.argv[2]
    playlist_title = sys.argv[3]
    description = sys.argv[4] if len(sys.argv) > 4 else ''

    print(f"Converting CSV file: {csv_file}")
    playlist = convert_csv_file_to_playlist(
        csv_file, playlist_id, playlist_title, description)

    if not playlist:
        print("Failed to parse CSV file")
        sys.exit(1)

    print(f"Found {len(playlist['tracks'])} tracks")
    print("\n// Copy this to src/data/playlists.ts (at the beginning of the array):")
    print(generate_typescript(playlist))
    print(",")


if __name__ == "__main__":
    main()
