'use client';

interface Button {
  text: string;
}

interface ChatMessageProps {
  role: 'user' | 'bot';
  text: string;
  botType: 'admin' | 'parent';
  buttons?: Button[];
}

const BOT_CONFIG = {
  admin: {
    avatar: '🏫',
    accent: '#7B8FA1',
    bg: 'bg-[#7B8FA1]',
    pillBg: 'bg-[#7B8FA1]/10',
    pillText: 'text-[#7B8FA1]',
    pillBorder: 'border-[#7B8FA1]/30',
  },
  parent: {
    avatar: '👨‍👩‍👧',
    accent: '#C4A9A1',
    bg: 'bg-[#C4A9A1]',
    pillBg: 'bg-[#C4A9A1]/10',
    pillText: 'text-[#C4A9A1]',
    pillBorder: 'border-[#C4A9A1]/30',
  },
};

export default function ChatMessage({ role, text, botType, buttons }: ChatMessageProps) {
  const config = BOT_CONFIG[botType];
  const isUser = role === 'user';

  return (
    <div
      className={`flex items-end gap-2 mb-3 animate-[fadeSlideIn_0.25s_ease-out_both] ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Bot avatar */}
      {!isUser && (
        <div
          className={`flex-shrink-0 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center text-sm shadow-sm`}
        >
          {config.avatar}
        </div>
      )}

      <div className={`max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div
          className={`px-3.5 py-2.5 text-sm text-[#4b4355] whitespace-pre-line leading-relaxed ${
            isUser
              ? 'bg-[#A89BB5]/15 rounded-2xl rounded-br-sm'
              : 'bg-white border border-[#d8d3de] rounded-2xl rounded-bl-sm shadow-sm'
          }`}
        >
          {text}
        </div>

        {/* Inline buttons */}
        {buttons && buttons.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {buttons.map((btn, i) => (
              <span
                key={i}
                className={`px-3 py-1 text-xs rounded-lg border cursor-default select-none ${config.pillBg} ${config.pillText} ${config.pillBorder}`}
              >
                {btn.text}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
