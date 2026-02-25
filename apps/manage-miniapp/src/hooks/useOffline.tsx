/**
 * Offline-aware state management context
 */

import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { storage } from '../utils/storage';

export interface OfflineState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingChanges: number;
  lastSync: number | null;
}

interface OfflineContextValue extends OfflineState {
  sync: () => Promise<void>;
  updateOnlineStatus: (online: boolean) => void;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    pendingChanges: 0,
    lastSync: null
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      sync(); // Auto-sync when coming back online
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial pending changes count
    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updatePendingCount = async () => {
    const syncs = await storage.getPendingSyncs();
    setState(prev => ({ ...prev, pendingChanges: syncs.length }));
  };

  const sync = async () => {
    if (state.isSyncing || !state.isOnline) return;

    setState(prev => ({ ...prev, isSyncing: true }));

    try {
      const result = await storage.processPendingSyncs(async (syncItem) => {
        try {
          const response = await fetch(syncItem.endpoint, {
            method: syncItem.action === 'create' ? 'POST' :
                    syncItem.action === 'update' ? 'PUT' : 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: syncItem.action !== 'delete' ? JSON.stringify(syncItem.data) : undefined
          });

          return response.ok;
        } catch (error) {
          console.error('Sync error:', error);
          return false;
        }
      });

      console.log(`Sync completed: ${result.success} success, ${result.failed} failed`);
      
      await updatePendingCount();
      setState(prev => ({ ...prev, lastSync: Date.now() }));
    } finally {
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  };

  const updateOnlineStatus = (online: boolean) => {
    setState(prev => ({ ...prev, isOnline: online }));
  };

  return (
    <OfflineContext.Provider value={{ ...state, sync, updateOnlineStatus }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
}
