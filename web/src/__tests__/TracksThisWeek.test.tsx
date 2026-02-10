import { render, screen, waitFor } from '@testing-library/react';
import { TracksThisWeek } from '@/components/TracksThisWeek';
import { useTracks } from '@/hooks/useTracks';

jest.mock('@/hooks/useTracks');

const DEFAULT_CSV_URL = 'https://example.com/tracks.csv';

describe('TracksThisWeek', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_TRACKS_CSV_URL = DEFAULT_CSV_URL;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_TRACKS_CSV_URL = DEFAULT_CSV_URL;
  });

  it('renders loading state', () => {
    (useTracks as jest.Mock).mockReturnValue({ data: [], loading: true, error: null });
    render(<TracksThisWeek />);
    expect(screen.getByText('Loading tracks…')).toBeInTheDocument();
  });

  it('renders tracks when loaded', async () => {
    const mockTracks = [
      { artist: 'Bob Marley', title: 'One Love', album: 'Legend' },
      { artist: 'Peter Tosh', title: 'Legalize It', album: undefined },
    ];
    (useTracks as jest.Mock).mockReturnValue({ data: mockTracks, loading: false, error: null });
    
    render(<TracksThisWeek />);
    
    await waitFor(() => {
      expect(screen.getByText('Bob Marley')).toBeInTheDocument();
      expect(screen.getByText('One Love')).toBeInTheDocument();
      expect(screen.getByText('Peter Tosh')).toBeInTheDocument();
    });
  });

  it('does not render when CSV URL is not set', () => {
    delete process.env.NEXT_PUBLIC_TRACKS_CSV_URL;
    const { container } = render(<TracksThisWeek />);
    expect(container.firstChild).toBeNull();
  });

  it('renders empty state when no tracks', () => {
    (useTracks as jest.Mock).mockReturnValue({ data: [], loading: false, error: null });
    render(<TracksThisWeek />);
    expect(screen.getByText('No tracks available this week.')).toBeInTheDocument();
  });
});

