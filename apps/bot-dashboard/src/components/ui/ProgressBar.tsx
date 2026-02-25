interface ProgressBarProps {
  current: number;
  limit: number;
  label?: string;
  showWarning?: boolean;
}

export default function ProgressBar({ current, limit, label, showWarning = true }: ProgressBarProps) {
  const percentage = Math.min((current / limit) * 100, 100);
  const isNearLimit = percentage >= 80;
  const isOverLimit = percentage >= 95;

  const barColor = isOverLimit
    ? 'bg-[#C4A4A0]'
    : isNearLimit
      ? 'bg-[#C8BFA9]'
      : 'bg-[#A89BB5]';

  return (
    <div>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-[#5d5468]">{label}</span>
          <span className={`text-sm font-medium ${isNearLimit && showWarning ? 'text-[#C4A4A0]' : 'text-[#4b4355]'}`}>
            {current} / {limit}
          </span>
        </div>
      )}
      <div className="w-full h-2.5 bg-[#d8d3de]/40 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isNearLimit && showWarning && (
        <p className="text-xs text-[#C4A4A0] mt-1">
          {isOverLimit ? '已接近用量上限，請考慮升級方案' : '用量已超過 80%'}
        </p>
      )}
    </div>
  );
}
