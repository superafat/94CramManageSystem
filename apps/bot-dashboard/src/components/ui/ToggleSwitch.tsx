'use client';

interface ToggleSwitchProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  label: string;
  description?: string;
}

export default function ToggleSwitch({ enabled, onToggle, label, description }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#4b4355]">{label}</p>
        {description && (
          <p className="text-xs text-[#7b7387] mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onToggle(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#A89BB5]/40 focus:ring-offset-2 ${
          enabled ? 'bg-[#A89BB5]' : 'bg-[#d8d3de]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
