// Minimal CSV parser that supports quoted fields and commas/newlines within quotes.
// Returns an array of records where the first row is treated as headers.

export type CsvRecord = Record<string, string>;

export function parseCsv(text: string): CsvRecord[] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && (char === ',')) {
      row.push(current);
      current = '';
      continue;
    }

    if (!inQuotes && (char === '\n')) {
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }

    if (!inQuotes && char === '\r') {
      // ignore CR
      continue;
    }

    current += char;
  }
  // flush
  row.push(current);
  rows.push(row);

  if (rows.length === 0) return [];
  const headers = rows[0];
  const out: CsvRecord[] = [];
  for (let r = 1; r < rows.length; r += 1) {
    const record: CsvRecord = {};
    const cols = rows[r];
    headers.forEach((h, idx) => {
      record[h.trim()] = (cols[idx] ?? '').trim();
    });
    // skip empty rows
    const hasValue = Object.values(record).some((v) => v !== '');
    if (hasValue) out.push(record);
  }
  return out;
}



