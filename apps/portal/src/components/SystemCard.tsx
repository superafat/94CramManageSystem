'use client';

interface SystemCardProps {
  emoji: string;
  name: string;
  description: string;
  url: string;
  color: string;
}

export function SystemCard({ emoji, name, description, url, color }: SystemCardProps) {
  return (
    <a
      href={url}
      className="group block rounded-2xl p-8 text-center transition-all duration-300
        hover:scale-105 hover:shadow-xl bg-white/80 backdrop-blur-sm border-2"
      style={{ borderColor: color + '66' }}
    >
      <div
        className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300"
      >
        {emoji}
      </div>
      <h2 className="text-xl font-bold text-gray-700 mb-2">{name}</h2>
      <p className="text-sm text-gray-500">{description}</p>
      <div
        className="mt-4 inline-block px-4 py-1.5 rounded-full text-sm font-medium text-white transition-opacity group-hover:opacity-90"
        style={{ backgroundColor: color }}
      >
        進入系統 →
      </div>
    </a>
  );
}
