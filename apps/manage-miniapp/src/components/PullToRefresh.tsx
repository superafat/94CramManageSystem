import { useState, useRef, useCallback, type ReactNode } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
}

const MORANDI_COLORS = {
  sage: '#8fa89a',
  rose: '#c9a9a6',
  blue: '#94a7b8',
  cream: '#f5f0eb',
  stone: '#9b9590',
};

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (pullStartY === 0 || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const distance = currentY - pullStartY;

      if (distance > 0 && containerRef.current?.scrollTop === 0) {
        // Prevent default scroll when pulling
        e.preventDefault();
        // Apply resistance: diminishing returns as you pull further
        const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
        setPullDistance(resistedDistance);
      }
    },
    [pullStartY, isRefreshing, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(threshold);

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setPullStartY(0);
      }
    } else {
      setPullDistance(0);
      setPullStartY(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  const getRotation = () => {
    if (isRefreshing) return 0;
    // Rotate arrow based on pull distance, max 180deg
    return Math.min((pullDistance / threshold) * 180, 180);
  };

  const getOpacity = () => {
    return Math.min(pullDistance / threshold, 1);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        position: 'relative',
      }}
    >
      {/* Pull indicator */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${pullDistance}px`,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: '10px',
          backgroundColor: MORANDI_COLORS.cream,
          opacity: getOpacity(),
          transition: isRefreshing || pullDistance === 0 ? 'all 0.3s ease-out' : 'none',
          zIndex: 10,
        }}
      >
        {isRefreshing ? (
          // Loading spinner
          <div
            style={{
              width: '24px',
              height: '24px',
              border: `3px solid ${MORANDI_COLORS.stone}30`,
              borderTopColor: MORANDI_COLORS.sage,
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          >
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          // Arrow icon
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={MORANDI_COLORS.sage}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: `rotate(${getRotation()}deg)`,
              transition: 'transform 0.2s ease-out',
            }}
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};
