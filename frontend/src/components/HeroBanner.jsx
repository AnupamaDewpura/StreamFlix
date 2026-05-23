import { useState, useEffect } from 'react';

export default function HeroBanner({ featured, onPlay }) {
  const [current, setCurrent] = useState(0);

  // Auto-rotate the featured streams every 8 seconds
  useEffect(() => {
    if (!featured?.length) return;
    const interval = setInterval(() => {
      setCurrent(prev => (prev + 1) % featured.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [featured]);

  if (!featured?.length) return null;
  const stream = featured[current];

  return (
    <div className="relative h-[85vh] w-full overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
        style={{ backgroundImage: `url(${stream.thumbnail_url})`, filter: 'brightness(0.5)' }}
      />
      {/* Gradient overlay */}
      <div className="hero-gradient absolute inset-0" />

      {/* Text content on the left */}
      <div className="absolute bottom-0 left-0 p-12 pb-24 max-w-2xl">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-white live-badge"></span>
            LIVE
          </span>
          {stream.category_name && (
            <span className="text-gray-400 text-sm">{stream.category_name}</span>
          )}
        </div>

        <h1 className="font-display text-7xl tracking-wide mb-4 leading-none">
          {stream.title}
        </h1>
        <p className="text-gray-300 text-base mb-8 leading-relaxed line-clamp-3">
          {stream.description}
        </p>

        <div className="flex gap-4">
          <button
            onClick={() => onPlay(stream)}
            className="bg-white text-black font-semibold px-8 py-3 rounded hover:bg-gray-200 transition-all text-sm"
          >
            ▶ Watch Live
          </button>
          <button className="bg-gray-600/70 text-white font-semibold px-8 py-3 rounded hover:bg-gray-600 transition-all text-sm backdrop-blur-sm">
            ℹ More Info
          </button>
        </div>
      </div>

      {/* Navigation dots at the bottom right */}
      {featured.length > 1 && (
        <div className="absolute bottom-8 right-12 flex gap-2">
          {featured.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all ${i === current ? 'bg-white w-6' : 'bg-gray-500 w-2'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}