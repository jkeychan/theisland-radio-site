import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/Footer';

describe('Footer', () => {
  it('renders copyright information', () => {
    render(<Footer />);
    expect(screen.getByText(/© 2026 The Island/)).toBeInTheDocument();
  });

  it('renders WART FM link', () => {
    render(<Footer />);
    const wartLink = screen.getByText('wartfm.org');
    expect(wartLink.closest('a')).toHaveAttribute('href', 'https://wartfm.org');
    expect(wartLink.closest('a')).toHaveAttribute('target', '_blank');
  });

  it('renders archive link', () => {
    render(<Footer />);
    const archiveLink = screen.getByText('archive.org');
    expect(archiveLink.closest('a')).toHaveAttribute('href', expect.stringContaining('archive.org'));
    expect(archiveLink.closest('a')).toHaveAttribute('target', '_blank');
  });

  it('renders contact link', () => {
    render(<Footer />);
    const contactLink = screen.getByText('contact');
    expect(contactLink.closest('a')).toHaveAttribute('href', '/contact/');
  });
});
