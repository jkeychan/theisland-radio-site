import { render, screen, waitFor } from '@testing-library/react';
import { TracksThisWeek } from '@/components/TracksThisWeek';
import { useTracks } from '@/hooks/useTracks';
import { usePlaylists } from '@/hooks/usePlaylists';

jest.mock('@/hooks/useTracks');
jest.mock('@/hooks/usePlaylists');

const DEFAULT_CSV_URL = 'https://example.com/tracks.csv';

const mockPlaylists = [
  {
    id: '2026-03-13',
    title: 'March 13, 2026',
    tracks: [{ artist: 'The Upsetters', title: 'Underground', album: 'Super Ape' }],
  },
];

describe('TracksThisWeek', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_TRACKS_CSV_URL = DEFAULT_CSV_URL;
    (usePlaylists as jest.Mock).mockReturnValue({ data: mockPlaylists });
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
    expect(screen.getByText('No tracks yet — check back Friday')).toBeInTheDocument();
  });
});
