#!/usr/bin/env python3

import requests
import csv
import sys
import io
import os
import re
from pathlib import Path


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


def extract_date_from_filename(filename):
    """Extract date from filename like 'November 21, 2025.csv'"""
    # Remove .csv extension
    name = Path(filename).stem
    # Try to extract date pattern
    match = re.search(r'(\w+)\s+(\d+),\s+(\d{4})', name)
    if match:
        month, day, year = match.groups()
        # Convert month name to number
        months = {
            'January': '01', 'February': '02', 'March': '03', 'April': '04',
            'May': '05', 'June': '06', 'July': '07', 'August': '08',
            'September': '09', 'October': '10', 'November': '11', 'December': '12'
        }
        month_num = months.get(month, '01')
        playlist_id = f"{year}-{month_num}-{day.zfill(2)}"
        playlist_title = name
        return playlist_id, playlist_title
    return None, None


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 convert-playlist.py <CSV_URL_OR_FILE> [PLAYLIST_ID] [PLAYLIST_TITLE] [DESCRIPTION]")
        print("  If only CSV file provided, ID and title will be extracted from filename")
        print("Example (URL): python3 convert-playlist.py 'https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0' '2025-09-26' 'September 26, 2025' 'Dub Tractor\\'s Island vibes'")
        print("Example (local file): python3 convert-playlist.py 'November 21, 2025.csv'")
        sys.exit(1)

    csv_input = sys.argv[1]
    
    # Determine if it's a URL or local file
    is_url = csv_input.startswith('http://') or csv_input.startswith('https://')
    
    if is_url:
        # URL mode - requires all arguments
        if len(sys.argv) < 4:
            print("Error: URL mode requires PLAYLIST_ID and PLAYLIST_TITLE")
            print("Usage: python3 convert-playlist.py <CSV_URL> <PLAYLIST_ID> <PLAYLIST_TITLE> [DESCRIPTION]")
            sys.exit(1)
        playlist_id = sys.argv[2]
        playlist_title = sys.argv[3]
        description = sys.argv[4] if len(sys.argv) > 4 else ''
        
        print(f"Fetching CSV from: {csv_input}")
        csv_text = fetch_csv_with_user_agent(csv_input)
        
        if not csv_text:
            print("Failed to fetch CSV data")
            sys.exit(1)
    else:
        # Local file mode
        if not os.path.exists(csv_input):
            print(f"Error: File '{csv_input}' not found")
            sys.exit(1)
        
        # Auto-extract ID and title from filename if not provided
        if len(sys.argv) >= 4:
            playlist_id = sys.argv[2]
            playlist_title = sys.argv[3]
            description = sys.argv[4] if len(sys.argv) > 4 else ''
        else:
            auto_id, auto_title = extract_date_from_filename(csv_input)
            if auto_id and auto_title:
                playlist_id = auto_id
                playlist_title = auto_title
                description = ''
                print(f"Auto-detected: ID='{playlist_id}', Title='{playlist_title}'")
            else:
                print("Error: Could not extract date from filename. Please provide PLAYLIST_ID and PLAYLIST_TITLE")
                print("Usage: python3 convert-playlist.py <CSV_FILE> <PLAYLIST_ID> <PLAYLIST_TITLE> [DESCRIPTION]")
                sys.exit(1)
        
        print(f"Reading CSV file: {csv_input}")
        try:
            with open(csv_input, 'r', encoding='utf-8') as f:
                csv_text = f.read()
        except Exception as e:
            print(f"Error reading file: {e}")
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
