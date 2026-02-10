import { render, screen } from '@testing-library/react';
import { Footer } from '@/components/Footer';

describe('Footer', () => {
  it('renders copyright information', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${currentYear} The Island`))).toBeInTheDocument();
  });

  it('renders WART FM link', () => {
    render(<Footer />);
    const wartLink = screen.getByText('WART 95.5 FM');
    expect(wartLink.closest('a')).toHaveAttribute('href', 'https://wartfm.org');
    expect(wartLink.closest('a')).toHaveAttribute('target', '_blank');
  });

  it('renders show schedule', () => {
    render(<Footer />);
    expect(screen.getByText(/Fridays 6:30–8pm ET/)).toBeInTheDocument();
  });

  it('renders contact link', () => {
    render(<Footer />);
    const contactLink = screen.getByText('Contact');
    expect(contactLink.closest('a')).toHaveAttribute('href', '/contact/');
  });
});

