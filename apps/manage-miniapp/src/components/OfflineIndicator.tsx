/**
 * Offline Indicator Component
 */

import { useOffline } from '../hooks/useOffline';

export function OfflineIndicator() {
  const { isOnline, isSyncing, pendingChanges } = useOffline();

  if (isOnline && !isSyncing && pendingChanges === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-2">
      <div 
        className="rounded-lg px-4 py-2 shadow-lg flex items-center justify-between text-sm font-medium"
        style={{
          background: !isOnline ? '#f59e0b' : isSyncing ? '#3b82f6' : '#10b981',
          color: 'white'
        }}
      >
        <div className="flex items-center gap-2">
          {!isOnline && (
            <>
              <span className="text-lg">📡</span>
              <span>離線模式</span>
            </>
          )}
          {isOnline && isSyncing && (
            <>
              <span className="text-lg animate-spin">🔄</span>
              <span>同步中...</span>
            </>
          )}
          {isOnline && !isSyncing && pendingChanges > 0 && (
            <>
              <span className="text-lg">⏳</span>
              <span>{pendingChanges} 個待同步項目</span>
            </>
          )}
        </div>
        
        {pendingChanges > 0 && (
          <span className="text-xs opacity-90">
            {isOnline ? '自動同步中' : '連線後將自動同步'}
          </span>
        )}
      </div>
    </div>
  );
}
