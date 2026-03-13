import { render, screen, fireEvent } from '@testing-library/react';
import { PlaylistsList } from '@/components/PlaylistsList';
import { usePlaylists } from '@/hooks/usePlaylists';

jest.mock('@/hooks/usePlaylists');

const mockPlaylists = [
  {
    id: '2025-11-14',
    title: 'November 14, 2025',
    description: 'Test playlist',
    tracks: [
      { artist: 'Artist 1', title: 'Song 1', album: 'Album 1' },
      { artist: 'Artist 2', title: 'Song 2' },
    ],
  },
  {
    id: '2025-11-07',
    title: 'November 7, 2025',
    tracks: [
      { artist: 'Artist 3', title: 'Song 3' },
    ],
  },
];

describe('PlaylistsList', () => {
  beforeEach(() => {
    (usePlaylists as jest.Mock).mockReturnValue({ data: mockPlaylists });
  });

  it('renders playlists', () => {
    render(<PlaylistsList showAll={true} />);
    expect(screen.getByText('November 14, 2025')).toBeInTheDocument();
    expect(screen.getByText('November 7, 2025')).toBeInTheDocument();
  });

  it('renders only first playlist when showAll is false', () => {
    render(<PlaylistsList showAll={false} />);
    expect(screen.getByText('November 14, 2025')).toBeInTheDocument();
    expect(screen.queryByText('November 7, 2025')).not.toBeInTheDocument();
  });

  it('renders tracks after expanding a playlist', () => {
    render(<PlaylistsList showAll={true} />);
    // Tracks are hidden until accordion is opened
    expect(screen.queryByText('Artist 1')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('November 14, 2025'));
    expect(screen.getByText('Artist 1')).toBeInTheDocument();
    expect(screen.getByText('Song 1')).toBeInTheDocument();
    expect(screen.getByText(/Album 1/)).toBeInTheDocument();
  });

  it('respects limit prop', () => {
    render(<PlaylistsList limit={1} />);
    expect(screen.getByText('November 14, 2025')).toBeInTheDocument();
    expect(screen.queryByText('November 7, 2025')).not.toBeInTheDocument();
  });

  it('excludes current when excludeCurrent is true', () => {
    render(<PlaylistsList excludeCurrent={true} />);
    expect(screen.queryByText('November 14, 2025')).not.toBeInTheDocument();
    expect(screen.getByText('November 7, 2025')).toBeInTheDocument();
  });

  it('returns null when no playlists', () => {
    (usePlaylists as jest.Mock).mockReturnValue({ data: [] });
    const { container } = render(<PlaylistsList />);
    expect(container.firstChild).toBeNull();
  });
});
