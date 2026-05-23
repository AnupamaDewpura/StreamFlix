import { useState, useEffect } from 'react';
import api from '../utils/api';
import Navbar from '../components/Navbar';
import HeroBanner from '../components/HeroBanner';
import StreamRow from '../components/StreamRow';
import PlayerModal from '../components/PlayerModal';

export default function Home() {
  const [data, setData] = useState({ featured: [], categories: [] });
  const [activeStream, setActiveStream] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load streams from backend when page opens
  useEffect(() => {
    api.get('/streams')
      .then(res => setData(res.data))
      .catch(err => console.error('Could not load streams:', err))
      .finally(() => setLoading(false));
  }, []);

  // Loading screen
  if (loading) return (
    <div className="h-screen bg-netflix-dark flex items-center justify-center">
      <div className="text-center">
        <div className="font-display text-6xl text-netflix-red mb-4">STREAMFLIX</div>
        <div className="text-gray-400 text-sm animate-pulse">Loading live channels...</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-netflix-dark">
      <Navbar />

      {/* Big hero banner at the top */}
      <HeroBanner featured={data.featured} onPlay={setActiveStream} />

      {/* Stream category rows below */}
      <div className="relative z-10 -mt-16 pb-16">
        {data.categories.map(cat => (
          <StreamRow key={cat.id} category={cat} onPlay={setActiveStream} />
        ))}

        {/* Message if no streams are configured yet */}
        {data.categories.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-2xl mb-3">No channels yet!</p>
            <p className="text-sm">
              Go to the{' '}
              <a href="/admin" className="text-netflix-red hover:underline">
                admin panel
              </a>{' '}
              to add your first stream.
            </p>
          </div>
        )}
      </div>

      {/* Full-screen player - only shows when a stream is selected */}
      {activeStream && (
        <PlayerModal stream={activeStream} onClose={() => setActiveStream(null)} />
      )}
    </div>
  );
}