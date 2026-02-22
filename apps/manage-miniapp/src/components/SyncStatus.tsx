/**
 * Sync Status Component
 */

import { useOffline } from '../hooks/useOffline';
import { storage } from '../utils/storage';
import { useState, useEffect } from 'react';

export function SyncStatus() {
  const { isOnline, isSyncing, pendingChanges, lastSync, sync } = useOffline();
  const [stats, setStats] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      const s = await storage.getStats();
      setStats(s);
    };
    loadStats();
  }, [pendingChanges]);

  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return '從未同步';
    
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} 天前`;
    if (hours > 0) return `${hours} 小時前`;
    if (minutes > 0) return `${minutes} 分鐘前`;
    return '剛剛';
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full rounded-xl p-4 text-left"
        style={{ background: 'white' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ background: isOnline ? '#10b98122' : '#f59e0b22' }}
            >
              {isOnline ? '🌐' : '📡'}
            </div>
            <div>
              <div className="font-bold text-gray-800">
                {isOnline ? '線上模式' : '離線模式'}
              </div>
              <div className="text-sm text-gray-500">
                上次同步：{formatLastSync(lastSync)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingChanges > 0 && (
              <span 
                className="px-2 py-1 rounded-full text-xs font-medium"
                style={{ background: '#f59e0b22', color: '#f59e0b' }}
              >
                {pendingChanges}
              </span>
            )}
            <span className="text-gray-400">{showDetails ? '▼' : '▶'}</span>
          </div>
        </div>
      </button>

      {showDetails && (
        <div 
          className="mt-2 rounded-xl p-4"
          style={{ background: 'white' }}
        >
          <h4 className="font-bold text-sm text-gray-700 mb-3">快取統計</h4>
          {stats && (
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">學生資料</span>
                <span className="font-medium">{stats.students}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">課表</span>
                <span className="font-medium">{stats.schedules}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">通知</span>
                <span className="font-medium">{stats.alerts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">待同步</span>
                <span className="font-medium text-orange-500">{stats.pendingSync}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={sync}
              disabled={!isOnline || isSyncing}
              className="flex-1 px-4 py-2 rounded-lg font-medium text-white disabled:opacity-50 active:scale-95 transition-transform"
              style={{ background: 'var(--sage)' }}
            >
              {isSyncing ? '同步中...' : '立即同步'}
            </button>
            <button
              onClick={async () => {
                if (confirm('確定要清除所有離線資料嗎？')) {
                  await storage.clearAll();
                  setStats(await storage.getStats());
                }
              }}
              className="px-4 py-2 rounded-lg font-medium border-2"
              style={{ borderColor: 'var(--stone)', color: 'var(--stone)' }}
            >
              清除快取
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
