# CSV to Archive.org Converter

A simple Node.js script to convert CSV playlist data to pipe-delimited format suitable for Archive.org descriptions.

## Usage

```bash
node csv-to-archive-converter.js your-playlist.csv
```

## Input Format

The script expects a CSV file with these columns:
- `Title` - Song title
- `Artist` - Artist name  
- `Album` - Album name
- `Time` - Duration (optional, not used in output)

Example CSV:
```csv
Title,Artist,Album,Time
The Russians Are Coming,Val Bennett,The Bunny 'Striker' Lee Story,03:33
Marcus Garvey,Burning Spear,Harder Than The Best,03:22
```

## Output Format

The script converts the data to pipe-delimited format:
```
Title | Artist | Album
The Russians Are Coming | Val Bennett | The Bunny 'Striker' Lee Story
Marcus Garvey | Burning Spear | Harder Than The Best
```

## Features

- Handles quoted fields with commas and newlines
- Skips empty rows
- Case-insensitive column matching
- Saves output to a `.txt` file for convenience
- Displays formatted output in terminal

## Example

```bash
# Convert your exported Google Sheets CSV
node csv-to-archive-converter.js september-12-2025-playlist.csv

# Output will be displayed and saved to:
# september-12-2025-playlist_archive.txt
```

Copy the output and paste it directly into your Archive.org item description.
