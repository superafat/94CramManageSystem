import React from 'react';

export interface CircularProgressProps {
  /**
   * Progress value (0-100)
   */
  value: number;
  /**
   * Size in pixels
   * @default 64
   */
  size?: number;
  /**
   * Stroke width in pixels
   * @default 4
   */
  strokeWidth?: number;
  /**
   * Color variant
   * @default 'primary'
   */
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /**
   * Show percentage label in center
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
   * Animated rotation
   * @default false
   */
  animated?: boolean;
}

/**
 * Circular progress indicator component
 */
export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  size = 64,
  strokeWidth = 4,
  variant = 'primary',
  showLabel = false,
  label,
  className = '',
  animated = false,
}) => {
  // Clamp value between 0-100
  const clampedValue = Math.min(100, Math.max(0, value));

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedValue / 100) * circumference;

  const variantColors = {
    primary: '#2563eb',
    success: '#16a34a',
    warning: '#eab308',
    danger: '#dc2626',
    info: '#0891b2',
  };

  const color = variantColors[variant];

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className={animated ? 'animate-spin' : ''}
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          className="dark:stroke-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </svg>
      {(showLabel || label) && (
        <div
          className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-300"
          style={{ fontSize: size / 4 }}
        >
          {label || `${Math.round(clampedValue)}%`}
        </div>
      )}
    </div>
  );
};
