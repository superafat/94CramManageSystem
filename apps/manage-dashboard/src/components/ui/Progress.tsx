import React from 'react';

export interface ProgressProps {
  /**
   * Progress value (0-100)
   */
  value: number;
  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Color variant
   * @default 'primary'
   */
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /**
   * Show percentage label
   * @default false
   */
  showLabel?: boolean;
  /**
   * Custom label text (overrides percentage)
   */
  label?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Animated progress bar
   * @default false
   */
  animated?: boolean;
  /**
   * Striped pattern
   * @default false
   */
  striped?: boolean;
}

/**
 * Progress bar component for displaying task completion
 */
export const Progress: React.FC<ProgressProps> = ({
  value,
  size = 'md',
  variant = 'primary',
  showLabel = false,
  label,
  className = '',
  animated = false,
  striped = false,
}) => {
  // Clamp value between 0-100
  const clampedValue = Math.min(100, Math.max(0, value));

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variantClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-500',
    danger: 'bg-red-600',
    info: 'bg-cyan-600',
  };

  const barClasses = [
    variantClasses[variant],
    'h-full rounded-full transition-all duration-300 ease-out',
    striped && 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:20px_100%]',
    animated && 'animate-pulse',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={barClasses}
          style={{ width: `${clampedValue}%` }}
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {(showLabel || label) && (
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 text-right">
          {label || `${Math.round(clampedValue)}%`}
        </div>
      )}
    </div>
  );
};
