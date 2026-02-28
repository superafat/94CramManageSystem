'use client';

interface ChatTypingIndicatorProps {
  botType: 'admin' | 'parent';
}

const BOT_CONFIG = {
  admin: {
    avatar: '🏫',
    bg: 'bg-[#7B8FA1]',
    dot: 'bg-[#7B8FA1]',
  },
  parent: {
    avatar: '👨‍👩‍👧',
    bg: 'bg-[#C4A9A1]',
    dot: 'bg-[#C4A9A1]',
  },
};

export default function ChatTypingIndicator({ botType }: ChatTypingIndicatorProps) {
  const config = BOT_CONFIG[botType];

  return (
    <div className="flex items-end gap-2 mb-3 animate-[fadeSlideIn_0.2s_ease-out_both]">
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center text-sm shadow-sm`}
      >
        {config.avatar}
      </div>

      {/* Typing bubble */}
      <div className="bg-white border border-[#d8d3de] rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 flex items-center gap-1">
        {[0, 150, 300].map((delay, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full ${config.dot} animate-bounce`}
            style={{ animationDelay: `${delay}ms`, animationDuration: '0.8s' }}
          />
        ))}
      </div>
    </div>
  );
}
