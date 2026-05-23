import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

export default function PlayerModal({ stream, onClose }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const iframeRef = useRef(null);

  // Build the full list: main URL first, then mirrors
  const allSources = [
    { id: 'main', label: 'Source 1', url: stream.stream_url },
    ...(stream.mirrors || []).map((m, i) => ({
      id: m.id,
      label: m.label || `Mirror ${i + 1}`,
      url: m.url
    }))
  ];

  const [activeSource, setActiveSource] = useState(allSources[0]);

  const isEmbed = (url) => url?.includes('/embed/') || url?.includes('youtube.com');

  const loadSource = (source, videoEl) => {
    if (!videoEl || isEmbed(source.url)) return;

    // Destroy previous HLS instance
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    videoEl.src = '';

    const tryFullscreen = (el) => {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    };

    const unmuteAndPlay = (el) => {
      el.muted = false;
      el.volume = 1;
      return el.play().then(() => tryFullscreen(el)).catch(() => {
        el.muted = true;
        el.play().then(() => tryFullscreen(el));
      });
    };

    const isHLS = source.url?.includes('.m3u8');

    if (isHLS && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(source.url);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => unmuteAndPlay(videoEl));
    } else if (isHLS) {
      videoEl.src = source.url;
      unmuteAndPlay(videoEl);
    } else {
      videoEl.src = source.url;
      unmuteAndPlay(videoEl);
    }
  };

  // Load source whenever activeSource changes
  useEffect(() => {
    if (isEmbed(activeSource.url)) return;
    if (videoRef.current) loadSource(activeSource, videoRef.current);
  }, [activeSource]);

  // Auto-fullscreen for embeds
  useEffect(() => {
    if (!isEmbed(activeSource.url) || !iframeRef.current) return;
    const el = iframeRef.current;
    const timer = setTimeout(() => {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    }, 500);
    return () => clearTimeout(timer);
  }, [activeSource]);

  // Lock background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Cleanup HLS on unmount
  useEffect(() => {
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, []);

  if (!stream) return null;

  const switchSource = (source) => {
    setActiveSource(source);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col overflow-y-auto">

      {/* Top bar */}
      <div className="flex items-start justify-between px-8 py-4 bg-black/50 sticky top-0 z-10 flex-shrink-0">
        <div>
          <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded w-fit mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white live-badge"></span>LIVE
          </span>
          <h2 className="font-display text-3xl tracking-wide">{stream.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-5xl leading-none transition-colors ml-4 flex-shrink-0"
        >
          ×
        </button>
      </div>

      {/* Player */}
      <div className="flex items-center justify-center px-4 py-2 flex-shrink-0 relative">
        {isEmbed(activeSource.url) ? (
          <iframe
            key={activeSource.id}
            ref={iframeRef}
            src={activeSource.url}
            className="w-full max-w-6xl aspect-video rounded-lg"
            allowFullScreen
            allow="autoplay; encrypted-media"
            title={stream.title}
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full max-w-6xl aspect-video rounded-lg bg-black"
            controls
            autoPlay
            playsInline
          />
        )}
      </div>

      {/* Source switcher — only shows if there are multiple sources */}
      {allSources.length > 1 && (
        <div className="px-8 py-3 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-gray-500 text-xs uppercase tracking-wider flex-shrink-0">Switch Source:</span>
            {allSources.map(source => (
              <button
                key={source.id}
                onClick={() => switchSource(source)}
                className={`px-4 py-1.5 rounded text-xs font-semibold transition-all ${
                  activeSource.id === source.id
                    ? 'bg-netflix-red text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {source.label}
                {activeSource.id === source.id && (
                  <span className="ml-1.5 text-red-300">●</span>
                )}
              </button>
            ))}
            <span className="text-gray-600 text-xs">If one doesn't work, try another</span>
          </div>
        </div>
      )}

      {/* Description */}
      {stream.description && (
        <div className="px-8 py-2 max-w-6xl mx-auto w-full">
          <p className="text-gray-500 text-sm leading-relaxed">{stream.description}</p>
        </div>
      )}

      <div className="h-8 flex-shrink-0" />
    </div>
  );
}