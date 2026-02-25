'use client';

interface SystemCardProps {
  emoji: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  color: string;
  highlights: string[];
}

export function SystemCard({ emoji, name, tagline, description, url, color, highlights }: SystemCardProps) {
  return (
    <a
      href={url}
      className="group block rounded-2xl bg-white border-2 p-8 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
      style={{ borderColor: color + '88' }}
    >
      <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{emoji}</div>
      <h3 className="text-xl font-bold text-[#4b5c53] mb-1">{name}</h3>
      <p className="text-sm font-medium mb-3" style={{ color }}>{tagline}</p>
      <p className="text-sm text-[#6b746e] mb-5 leading-relaxed">{description}</p>
      <ul className="space-y-1.5 mb-6">
        {highlights.map((h) => (
          <li key={h} className="text-xs text-[#5d6c64] flex items-center gap-2">
            <span className="text-[#8fa895]">✓</span> {h}
          </li>
        ))}
      </ul>
      <div
        className="inline-block w-full text-center px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-opacity group-hover:opacity-90"
        style={{ backgroundColor: color }}
      >
        了解更多 →
      </div>
    </a>
  );
}
