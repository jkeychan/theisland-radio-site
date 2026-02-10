import { parseCsv } from '@/lib/csv';

describe('parseCsv', () => {
  it('parses simple CSV', () => {
    const csv = `Title,Artist,Album
Song 1,Artist 1,Album 1
Song 2,Artist 2,Album 2`;
    
    const result = parseCsv(csv);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ Title: 'Song 1', Artist: 'Artist 1', Album: 'Album 1' });
    expect(result[1]).toEqual({ Title: 'Song 2', Artist: 'Artist 2', Album: 'Album 2' });
  });

  it('handles quoted fields with commas', () => {
    const csv = `Title,Artist,Album
"Song, The",Artist 1,"Album, The"`;
    
    const result = parseCsv(csv);
    expect(result[0]).toEqual({ Title: 'Song, The', Artist: 'Artist 1', Album: 'Album, The' });
  });

  it('handles escaped quotes', () => {
    const csv = `Title,Artist,Album
"Song ""Great""",Artist 1,Album 1`;
    
    const result = parseCsv(csv);
    expect(result[0]).toEqual({ Title: 'Song "Great"', Artist: 'Artist 1', Album: 'Album 1' });
  });

  it('skips empty rows', () => {
    const csv = `Title,Artist,Album
Song 1,Artist 1,Album 1

Song 2,Artist 2,Album 2`;
    
    const result = parseCsv(csv);
    expect(result).toHaveLength(2);
  });

  it('handles missing values', () => {
    const csv = `Title,Artist,Album
Song 1,Artist 1,
Song 2,,Album 2`;
    
    const result = parseCsv(csv);
    expect(result[0].Album).toBe('');
    expect(result[1].Artist).toBe('');
  });
});

