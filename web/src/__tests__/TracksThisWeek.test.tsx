import { render, screen, waitFor } from '@testing-library/react';
import { TracksThisWeek } from '@/components/TracksThisWeek';
import { usePlaylists } from '@/hooks/usePlaylists';

jest.mock('@/hooks/usePlaylists');

const mockPlaylists = [
  {
    id: '2026-03-13',
    title: 'March 13, 2026',
    tracks: [
      { artist: 'The Upsetters', title: 'Underground', album: 'Super Ape' },
      { artist: 'Bob Marley', title: 'One Love', album: 'Legend' },
    ],
  },
  {
    id: '2026-03-06',
    title: 'March 6, 2026',
    tracks: [{ artist: 'Peter Tosh', title: 'Legalize It', album: undefined }],
  },
];

describe('TracksThisWeek', () => {
  beforeEach(() => {
    (usePlaylists as jest.Mock).mockReturnValue({ data: mockPlaylists });
  });

  it('renders tracks from the most recent playlist', async () => {
    render(<TracksThisWeek />);
    await waitFor(() => {
      expect(screen.getByText('The Upsetters')).toBeInTheDocument();
      expect(screen.getByText('Underground')).toBeInTheDocument();
      expect(screen.getByText('Bob Marley')).toBeInTheDocument();
    });
  });

  it('renders the current show date', () => {
    render(<TracksThisWeek />);
    expect(screen.getByText('March 13, 2026')).toBeInTheDocument();
  });

  it('renders past shows in the right column', () => {
    render(<TracksThisWeek />);
    expect(screen.getByText('March 6, 2026')).toBeInTheDocument();
  });

  it('renders empty state when current playlist has no tracks', () => {
    (usePlaylists as jest.Mock).mockReturnValue({
      data: [{ id: '2026-03-13', title: 'March 13, 2026', tracks: [] }],
    });
    render(<TracksThisWeek />);
    expect(screen.getByText('No tracks yet — check back Friday')).toBeInTheDocument();
  });
});
