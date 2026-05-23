import StreamCard from './StreamCard';

export default function StreamRow({ category, onPlay }) {
  if (!category.streams?.length) return null;

  return (
    <div className="mb-10">
      <h2 className="text-xl font-semibold px-12 mb-3">{category.name}</h2>
      <div className="stream-row px-12">
        {category.streams.map(stream => (
          <StreamCard key={stream.id} stream={stream} onPlay={onPlay} />
        ))}
      </div>
    </div>
  );
}