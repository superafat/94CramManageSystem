'use client';

import { useState } from 'react';
import ChatWindow from './ChatWindow';
import { ADMIN_DEMO_SCRIPTS, PARENT_DEMO_SCRIPTS } from './demo-scripts';

type Tab = 'admin' | 'parent';

const TABS: Array<{ id: Tab; label: string; accent: string; activeBg: string; inactiveBg: string; inactiveText: string }> = [
  {
    id: 'admin',
    label: '🏫 千里眼 管理員',
    accent: '#7B8FA1',
    activeBg: 'bg-[#7B8FA1]',
    inactiveBg: 'bg-[#7B8FA1]/10',
    inactiveText: 'text-[#7B8FA1]',
  },
  {
    id: 'parent',
    label: '👨‍👩‍👧 順風耳 家長',
    accent: '#C4A9A1',
    activeBg: 'bg-[#C4A9A1]',
    inactiveBg: 'bg-[#C4A9A1]/10',
    inactiveText: 'text-[#C4A9A1]',
  },
];

export default function ChatDemo() {
  const [activeTab, setActiveTab] = useState<Tab>('admin');

  return (
    <div className="w-full">
      {/* Tab selector */}
      <div className="flex gap-3 justify-center mb-6 flex-wrap">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                isActive
                  ? `${tab.activeBg} text-white shadow-sm`
                  : `${tab.inactiveBg} ${tab.inactiveText} hover:opacity-80`
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Chat window — key forces remount on tab switch so animation replays */}
      <div className="max-w-lg mx-auto">
        <ChatWindow
          key={activeTab}
          scripts={activeTab === 'admin' ? ADMIN_DEMO_SCRIPTS : PARENT_DEMO_SCRIPTS}
          botType={activeTab}
        />
      </div>
    </div>
  );
}
