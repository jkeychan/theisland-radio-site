import { render, screen } from '@testing-library/react';
import { Header } from '@/components/Header';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

describe('Header', () => {
  it('renders the logo', () => {
    render(<Header />);
    const logo = screen.getByAltText('The Island logo');
    expect(logo).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Header />);
    expect(screen.getByText('Playlists / Recordings')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
  });

  it('renders Listen Live button', () => {
    render(<Header />);
    const listenLive = screen.getByText('Listen Live');
    expect(listenLive).toBeInTheDocument();
    expect(listenLive.closest('a')).toHaveAttribute('href', 'https://station.voscast.com/5530050e0a38b/');
  });

  it('has proper accessibility attributes', () => {
    render(<Header />);
    const nav = screen.getByLabelText('Primary navigation');
    expect(nav).toBeInTheDocument();
  });
});

