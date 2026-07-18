'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/providers/ToastProvider';
import { apiClient } from '@/lib/apiClient';

export type QueuedOperationType =
  | 'CREATE_FARMER'
  | 'UPDATE_FARMER'
  | 'SUBMIT_YIELD'
  | 'RECORD_DISTRIBUTION';

export interface QueuedOperation {
  id: string;
  type: QueuedOperationType;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: unknown;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  description: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'success';

const DB_NAME = 'agro_ethiopia_offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending_operations';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });
        store.createIndex('timestamp', 'timestamp', {
          unique: false,
        });
        store.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const saveOperation = async (operation: QueuedOperation): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(operation);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const getAllOperations = async (): Promise<QueuedOperation[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.getAll();
    request.onsuccess = () => resolve(request.result as QueuedOperation[]);
    request.onerror = () => reject(request.error);
  });
};

const deleteOperation = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const clearAllOperations = async (): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingOperations, setPendingOperations] = useState<QueuedOperation[]>(
    [],
  );
  const isSyncing = useRef(false);
  const { toast } = useToast();

  const loadPendingOperations = useCallback(async () => {
    try {
      const operations = await getAllOperations();
      setPendingOperations(operations);
      setPendingCount(operations.length);
    } catch (error) {
      console.warn('Failed to load pending operations:', error);
    }
  }, []);

  const enqueue = useCallback(
    async (
      type: QueuedOperationType,
      endpoint: string,
      method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
      data: unknown,
      description: string,
    ): Promise<string> => {
      const operation: QueuedOperation = {
        id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        endpoint,
        method,
        data,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
        description,
      };

      await saveOperation(operation);
      await loadPendingOperations();

      toast.info(
        'Saved offline',
        `"${description}" will sync when you reconnect.`,
      );

      return operation.id;
    },
    [loadPendingOperations, toast],
  );

  const syncQueue = useCallback(async () => {
    if (isSyncing.current || !isOnline) {
      return;
    }

    const operations = await getAllOperations();
    if (operations.length === 0) {
      return;
    }

    isSyncing.current = true;
    setSyncStatus('syncing');

    let successCount = 0;
    let failCount = 0;

    for (const operation of operations) {
      try {
        await apiClient.request({
          url: operation.endpoint,
          method: operation.method,
          data: operation.data,
        });

        await deleteOperation(operation.id);
        successCount++;
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);

        const updatedOperation = {
          ...operation,
          retryCount: operation.retryCount + 1,
        };

        if (updatedOperation.retryCount >= operation.maxRetries) {
          await deleteOperation(operation.id);
          failCount++;
        } else {
          await saveOperation(updatedOperation);
        }
      }
    }

    await loadPendingOperations();
    isSyncing.current = false;

    if (successCount > 0 && failCount === 0) {
      setSyncStatus('success');
      toast.success(
        'Sync complete',
        `${successCount} offline ${successCount === 1 ? 'action' : 'actions'} synced successfully.`,
      );
    } else if (failCount > 0 && successCount === 0) {
      setSyncStatus('error');
      toast.error(
        'Sync failed',
        `${failCount} ${failCount === 1 ? 'action' : 'actions'} could not be synced.`,
      );
    } else if (successCount > 0 && failCount > 0) {
      setSyncStatus('error');
      toast.warning(
        'Partial sync',
        `${successCount} synced, ${failCount} failed.`,
      );
    }

    setTimeout(() => setSyncStatus('idle'), 3000);
  }, [isOnline, loadPendingOperations, toast]);

  const clearQueue = useCallback(async () => {
    await clearAllOperations();
    await loadPendingOperations();
    toast.info('Queue cleared', 'All pending operations removed.');
  }, [loadPendingOperations, toast]);

  const removeOperation = useCallback(
    async (id: string) => {
      await deleteOperation(id);
      await loadPendingOperations();
    },
    [loadPendingOperations],
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online', 'Syncing your offline actions...');
      setTimeout(() => syncQueue(), 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning(
        'You are offline',
        'Actions will be saved and synced when you reconnect.',
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue, toast]);

  useEffect(() => {
    loadPendingOperations();
  }, [loadPendingOperations]);

  const queueFarmerRegistration = useCallback(
    (farmerData: unknown) =>
      enqueue(
        'CREATE_FARMER',
        '/farmers',
        'POST',
        farmerData,
        'Register farmer',
      ),
    [enqueue],
  );

  const queueFarmerUpdate = useCallback(
    (farmerId: string, farmerData: unknown) =>
      enqueue(
        'UPDATE_FARMER',
        `/farmers/${farmerId}`,
        'PUT',
        farmerData,
        'Update farmer',
      ),
    [enqueue],
  );

  const queueYieldSubmission = useCallback(
    (yieldData: unknown) =>
      enqueue(
        'SUBMIT_YIELD',
        '/yields',
        'POST',
        yieldData,
        'Submit yield report',
      ),
    [enqueue],
  );

  const queueDistributionRecord = useCallback(
    (distributionData: unknown) =>
      enqueue(
        'RECORD_DISTRIBUTION',
        '/distributions',
        'POST',
        distributionData,
        'Record distribution',
      ),
    [enqueue],
  );

  return {
    isOnline,
    isOffline: !isOnline,
    syncStatus,
    isSyncing: syncStatus === 'syncing',
    pendingCount,
    pendingOperations,
    enqueue,
    syncQueue,
    clearQueue,
    removeOperation,
    loadPendingOperations,
    queueFarmerRegistration,
    queueFarmerUpdate,
    queueYieldSubmission,
    queueDistributionRecord,
  };
}

export default useOfflineQueue;
