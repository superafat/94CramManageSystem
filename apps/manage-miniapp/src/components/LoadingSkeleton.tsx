import React from 'react';

type SkeletonType = 'card' | 'list' | 'chart';

interface LoadingSkeletonProps {
  type?: SkeletonType;
  count?: number;
}

const MORANDI_COLORS = {
  sage: '#8fa89a',
  rose: '#c9a9a6',
  blue: '#94a7b8',
  cream: '#f5f0eb',
  stone: '#9b9590',
};

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  type = 'card', 
  count = 1 
}) => {
  const pulseStyle: React.CSSProperties = {
    background: `linear-gradient(90deg, ${MORANDI_COLORS.cream} 25%, ${MORANDI_COLORS.stone}20 50%, ${MORANDI_COLORS.cream} 75%)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
  };

  const renderCard = (index: number) => (
    <div 
      key={index}
      className="rounded-lg p-4 mb-4"
      style={{ 
        backgroundColor: MORANDI_COLORS.cream,
        border: `1px solid ${MORANDI_COLORS.stone}40`
      }}
    >
      <div 
        className="h-6 w-3/4 rounded mb-3"
        style={pulseStyle}
      />
      <div 
        className="h-4 w-full rounded mb-2"
        style={pulseStyle}
      />
      <div 
        className="h-4 w-5/6 rounded"
        style={pulseStyle}
      />
    </div>
  );

  const renderList = (index: number) => (
    <div 
      key={index}
      className="flex items-center p-3 mb-2 rounded-lg"
      style={{ 
        backgroundColor: MORANDI_COLORS.cream,
        border: `1px solid ${MORANDI_COLORS.stone}20`
      }}
    >
      <div 
        className="w-12 h-12 rounded-full mr-3"
        style={{ ...pulseStyle, backgroundColor: MORANDI_COLORS.sage }}
      />
      <div className="flex-1">
        <div 
          className="h-4 w-2/3 rounded mb-2"
          style={pulseStyle}
        />
        <div 
          className="h-3 w-1/2 rounded"
          style={pulseStyle}
        />
      </div>
    </div>
  );

  const renderChart = () => (
    <div 
      className="rounded-lg p-6"
      style={{ 
        backgroundColor: MORANDI_COLORS.cream,
        border: `1px solid ${MORANDI_COLORS.stone}40`
      }}
    >
      <div 
        className="h-5 w-1/3 rounded mb-6"
        style={pulseStyle}
      />
      <div className="flex items-end justify-between h-48 gap-2">
        {[60, 80, 50, 90, 70, 85, 65].map((height, i) => (
          <div 
            key={i}
            className="flex-1 rounded-t"
            style={{ 
              ...pulseStyle, 
              height: `${height}%`,
              backgroundColor: MORANDI_COLORS.blue 
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div 
            key={i}
            className="h-3 w-8 rounded"
            style={pulseStyle}
          />
        ))}
      </div>
    </div>
  );

  const renderSkeleton = () => {
    switch (type) {
      case 'list':
        return Array.from({ length: count }).map((_, i) => renderList(i));
      case 'chart':
        return renderChart();
      case 'card':
      default:
        return Array.from({ length: count }).map((_, i) => renderCard(i));
    }
  };

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div className="animate-pulse">
        {renderSkeleton()}
      </div>
    </>
  );
};
