import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  // Change navbar background when user scrolls down
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 px-12 py-4 flex items-center justify-between transition-all duration-300"
      style={{ background: scrolled ? '#141414' : 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}
    >
      <Link to="/" className="text-4xl font-display text-netflix-red tracking-wider">
        STREAMFLIX
      </Link>
      <div className="flex items-center gap-6 text-sm font-medium text-gray-300">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 live-badge"></span>
          Live Now
        </span>
      </div>
    </nav>
  );
}