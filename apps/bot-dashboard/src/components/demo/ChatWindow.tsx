'use client';

import { useEffect, useRef, useState } from 'react';
import { DemoMessage, DemoScript } from './demo-scripts';
import ChatMessage from './ChatMessage';
import ChatTypingIndicator from './ChatTypingIndicator';

interface ChatWindowProps {
  scripts: DemoScript[];
  botType: 'admin' | 'parent';
}

const BOT_META = {
  admin: {
    name: '千里眼',
    subtitle: '管理員 Bot',
    avatar: '🏫',
    accent: '#7B8FA1',
    accentBg: 'bg-[#7B8FA1]',
    chipActiveBg: 'bg-[#7B8FA1]',
    chipActiveText: 'text-white',
    chipInactiveBg: 'bg-[#7B8FA1]/10',
    chipInactiveText: 'text-[#7B8FA1]',
  },
  parent: {
    name: '順風耳',
    subtitle: '家長 Bot',
    avatar: '👨‍👩‍👧',
    accent: '#C4A9A1',
    accentBg: 'bg-[#C4A9A1]',
    chipActiveBg: 'bg-[#C4A9A1]',
    chipActiveText: 'text-white',
    chipInactiveBg: 'bg-[#C4A9A1]/10',
    chipInactiveText: 'text-[#C4A9A1]',
  },
};

export default function ChatWindow({ scripts, botType }: ChatWindowProps) {
  const meta = BOT_META[botType];
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<DemoMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const playingRef = useRef(false);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [visibleMessages, isTyping]);

  const playScript = async (script: DemoScript) => {
    if (playingRef.current) return;
    playingRef.current = true;
    setIsPlaying(true);
    setIsComplete(false);
    setVisibleMessages([]);
    setIsTyping(false);

    for (const msg of script.messages) {
      if (!playingRef.current) break;

      // User message: short pause then show
      if (msg.role === 'user') {
        await sleep(msg.delay ?? 500);
        if (!playingRef.current) break;
        setVisibleMessages((prev) => [...prev, msg]);
      } else {
        // Bot message: show typing indicator first
        await sleep(msg.delay ?? 1200);
        if (!playingRef.current) break;
        setIsTyping(true);
        await sleep(900);
        if (!playingRef.current) break;
        setIsTyping(false);
        setVisibleMessages((prev) => [...prev, msg]);
      }
    }

    playingRef.current = false;
    setIsPlaying(false);
    setIsComplete(true);
  };

  const handleSelectScript = (index: number) => {
    playingRef.current = false;
    setActiveIndex(index);
    setVisibleMessages([]);
    setIsTyping(false);
    setIsPlaying(false);
    setIsComplete(false);
    // Small delay so state resets before play
    setTimeout(() => playScript(scripts[index]), 80);
  };

  const handleReplay = () => {
    handleSelectScript(activeIndex);
  };

  // Auto-play first script on mount
  useEffect(() => {
    playScript(scripts[0]);
    return () => { playingRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-2xl border border-[#d8d3de] overflow-hidden shadow-sm flex flex-col">
      {/* Header */}
      <div className={`${meta.accentBg} px-4 py-3 flex items-center gap-3`}>
        <div className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center text-lg">
          {meta.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm leading-tight">{meta.name}</p>
          <p className="text-white/75 text-xs">{meta.subtitle}</p>
        </div>
        <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">
          Demo
        </span>
      </div>

      {/* Script selector chips */}
      <div className="flex gap-2 px-3 py-2.5 overflow-x-auto scrollbar-none border-b border-[#d8d3de] bg-white">
        {scripts.map((s, i) => (
          <button
            key={s.id}
            onClick={() => handleSelectScript(i)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
              i === activeIndex
                ? `${meta.chipActiveBg} ${meta.chipActiveText}`
                : `${meta.chipInactiveBg} ${meta.chipInactiveText} hover:opacity-80`
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 max-h-[380px] overflow-y-auto px-3 py-4 bg-[#f8f6fa] flex flex-col"
      >
        {visibleMessages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            text={msg.text}
            botType={botType}
            buttons={msg.buttons}
          />
        ))}
        {isTyping && <ChatTypingIndicator botType={botType} />}
        <div className="h-1" />
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-[#d8d3de] px-3 py-2.5 flex items-center gap-2 min-h-[52px]">
        {isComplete ? (
          <>
            <button
              onClick={handleReplay}
              className="text-xs px-3 py-1.5 rounded-full border border-[#d8d3de] text-[#7b7387] hover:bg-[#f5f0f7] transition"
            >
              ↺ 重播
            </button>
            <a
              href="https://t.me"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-xs px-3 py-1.5 rounded-full font-medium"
              style={{ backgroundColor: `${meta.accent}1a`, color: meta.accent }}
            >
              前往 Telegram 體驗 →
            </a>
          </>
        ) : (
          <p className="text-xs text-[#9b92a5] italic">
            {isPlaying ? '模擬對話中…' : '選擇情境開始'}
          </p>
        )}
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
