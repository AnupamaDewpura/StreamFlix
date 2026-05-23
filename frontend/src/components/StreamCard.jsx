import { useState } from 'react';

export default function StreamCard({ stream, onPlay }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex-shrink-0 w-64 rounded-md overflow-hidden cursor-pointer"
      style={{
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
        zIndex: hovered ? 10 : 1,
        transition: 'transform 0.3s ease'
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onPlay(stream)}
    >
      {/* Thumbnail image */}
      <div className="aspect-video bg-netflix-card">
        <img
          src={stream.thumbnail_url || `https://picsum.photos/seed/${stream.id}/400/225`}
          alt={stream.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info shown when hovering */}
      <div className={`card-gradient absolute inset-0 flex flex-col justify-end p-3 transition-opacity duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        <span className="flex items-center gap-1 bg-red-600 text-white text-xs px-2 py-0.5 rounded font-bold w-fit mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white live-badge"></span>LIVE
        </span>
        <p className="font-semibold text-sm leading-tight">{stream.title}</p>
        {stream.source_website && (
          <p className="text-gray-400 text-xs mt-0.5 truncate">{stream.source_website}</p>
        )}
        <button className="mt-2 w-full bg-white text-black text-xs font-bold py-1.5 rounded hover:bg-gray-200 transition-colors">
          ▶ Watch
        </button>
      </div>

      {/* Title shown when NOT hovering */}
      <div className={`card-gradient absolute inset-0 flex flex-col justify-end p-3 transition-opacity duration-300 ${hovered ? 'opacity-0' : 'opacity-100'}`}>
        <p className="font-medium text-xs text-gray-200 truncate">{stream.title}</p>
      </div>
    </div>
  );
}