# Offline Work Capability Implementation Guide

## 📋 Overview

This guide provides a complete implementation plan for adding offline functionality to the accounting application, allowing shop users to:
- Add transactions when offline
- Export transaction reports without internet
- Automatically sync data when connection is restored
- Smart internet connection detection

## 🏗️ Architecture Overview

### Current Tech Stack
- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Firebase (Firestore + Auth + Cloud Functions + FCM)
- **State Management:** Real-time Firestore listeners (onSnapshot)
- **Service Worker:** Exists for FCM push notifications

### Offline Strategy
```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Add Trans.   │  │ View Data    │  │ Export Report│ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              Connection Monitor                         │
│  (Detects online/offline, triggers sync)               │
└─────────┬───────────────────────────┬───────────────────┘
          │                           │
    ONLINE│                           │OFFLINE
          ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Firestore          │     │  IndexedDB          │
│  (Cloud Database)   │     │  (Local Storage)    │
│  - Offline Cache    │     │  - Pending Queue    │
│  - Auto Sync        │     │  - Cached Reports   │
└─────────────────────┘     └─────────────────────┘
```

---

## 🚀 Phase 1: Foundation Setup

### 1.1 Enable Firestore Offline Persistence

**File:** `firebase.ts`

**Add after Firestore initialization:**

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getMessaging, isSupported as isMessagingSupported } from 'firebase/messaging';

// ... existing firebaseConfig ...

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// ✨ NEW: Enable Offline Persistence
const enableOfflineMode = async () => {
  try {
    await enableIndexedDbPersistence(db, {
      synchronizeTabs: true, // Enable across multiple tabs
      cacheSizeBytes: CACHE_SIZE_UNLIMITED // Allow unlimited cache
    });
    console.log('✅ Firestore offline persistence enabled');
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ The current browser doesn\'t support offline persistence');
    } else {
      console.error('❌ Error enabling offline persistence:', err);
    }
  }
};

// Enable offline mode immediately
if (typeof window !== 'undefined') {
  enableOfflineMode();
}

// ... rest of existing code ...
```

**Benefits:**
- Firestore automatically caches queries offline
- Read operations work without internet
- Writes queue automatically and sync when online

---

### 1.2 Create Offline Manager Service

**File:** `services/offlineManager.ts` (NEW)

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Define the database schema
interface OfflineDB extends DBSchema {
  pendingTransactions: {
    key: string;
    value: {
      id: string;
      transaction: any;
      timestamp: number;
      userId: string;
      shopId: string;
      retryCount: number;
      status: 'pending' | 'syncing' | 'failed';
      errorMessage?: string;
    };
    indexes: {
      'by-status': string;
      'by-shopId': string;
      'by-userId': string;
    };
  };
  cachedReports: {
    key: string;
    value: {
      id: string;
      reportType: string;
      data: any;
      generatedAt: number;
      shopId: string;
      expiresAt: number;
    };
    indexes: {
      'by-shopId': string;
      'by-expiry': number;
    };
  };
  appSettings: {
    key: string;
    value: {
      key: string;
      value: any;
      updatedAt: number;
    };
  };
}

export class OfflineManager {
  private static dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;
  private static DB_NAME = 'AccountingAppOffline';
  private static DB_VERSION = 1;

  // Initialize the database
  static async initDB(): Promise<IDBPDatabase<OfflineDB>> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = openDB<OfflineDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        // Create pending transactions store
        if (!db.objectStoreNames.contains('pendingTransactions')) {
          const txStore = db.createObjectStore('pendingTransactions', { keyPath: 'id' });
          txStore.createIndex('by-status', 'status');
          txStore.createIndex('by-shopId', 'shopId');
          txStore.createIndex('by-userId', 'userId');
        }

        // Create cached reports store
        if (!db.objectStoreNames.contains('cachedReports')) {
          const reportStore = db.createObjectStore('cachedReports', { keyPath: 'id' });
          reportStore.createIndex('by-shopId', 'shopId');
          reportStore.createIndex('by-expiry', 'expiresAt');
        }

        // Create app settings store
        if (!db.objectStoreNames.contains('appSettings')) {
          db.createObjectStore('appSettings', { keyPath: 'key' });
        }
      },
    });

    return this.dbPromise;
  }

  // ============ PENDING TRANSACTIONS ============

  // Add a transaction to the pending queue
  static async addPendingTransaction(
    transaction: any,
    userId: string,
    shopId: string
  ): Promise<string> {
    const db = await this.initDB();
    const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.add('pendingTransactions', {
      id,
      transaction,
      timestamp: Date.now(),
      userId,
      shopId,
      retryCount: 0,
      status: 'pending'
    });

    console.log('📥 Transaction queued for sync:', id);
    return id;
  }

  // Get all pending transactions
  static async getPendingTransactions(shopId?: string): Promise<any[]> {
    const db = await this.initDB();

    if (shopId) {
      return db.getAllFromIndex('pendingTransactions', 'by-shopId', shopId);
    }

    return db.getAll('pendingTransactions');
  }

  // Get pending count
  static async getPendingCount(shopId?: string): Promise<number> {
    const pending = await this.getPendingTransactions(shopId);
    return pending.filter(p => p.status === 'pending').length;
  }

  // Update transaction status
  static async updateTransactionStatus(
    id: string,
    status: 'pending' | 'syncing' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const db = await this.initDB();
    const tx = await db.get('pendingTransactions', id);

    if (tx) {
      tx.status = status;
      tx.retryCount = status === 'failed' ? tx.retryCount + 1 : tx.retryCount;
      if (errorMessage) tx.errorMessage = errorMessage;

      await db.put('pendingTransactions', tx);
    }
  }

  // Remove a synced transaction
  static async removePendingTransaction(id: string): Promise<void> {
    const db = await this.initDB();
    await db.delete('pendingTransactions', id);
    console.log('✅ Transaction synced and removed from queue:', id);
  }

  // Clear all pending transactions (admin only)
  static async clearAllPending(): Promise<void> {
    const db = await this.initDB();
    await db.clear('pendingTransactions');
    console.log('🗑️ All pending transactions cleared');
  }

  // ============ CACHED REPORTS ============

  // Cache a report for offline access
  static async cacheReport(
    reportType: string,
    data: any,
    shopId: string,
    expiryDays: number = 7
  ): Promise<void> {
    const db = await this.initDB();
    const id = `report_${reportType}_${shopId}_${Date.now()}`;
    const expiresAt = Date.now() + (expiryDays * 24 * 60 * 60 * 1000);

    await db.put('cachedReports', {
      id,
      reportType,
      data,
      generatedAt: Date.now(),
      shopId,
      expiresAt
    });

    console.log('💾 Report cached for offline access:', reportType);
  }

  // Get cached report
  static async getCachedReport(reportType: string, shopId: string): Promise<any | null> {
    const db = await this.initDB();
    const reports = await db.getAllFromIndex('cachedReports', 'by-shopId', shopId);

    const matchingReports = reports
      .filter(r => r.reportType === reportType && r.expiresAt > Date.now())
      .sort((a, b) => b.generatedAt - a.generatedAt);

    return matchingReports.length > 0 ? matchingReports[0].data : null;
  }

  // Clean expired reports
  static async cleanExpiredReports(): Promise<void> {
    const db = await this.initDB();
    const now = Date.now();
    const allReports = await db.getAll('cachedReports');

    for (const report of allReports) {
      if (report.expiresAt < now) {
        await db.delete('cachedReports', report.id);
      }
    }

    console.log('🧹 Expired reports cleaned');
  }

  // ============ APP SETTINGS ============

  // Save setting
  static async saveSetting(key: string, value: any): Promise<void> {
    const db = await this.initDB();
    await db.put('appSettings', {
      key,
      value,
      updatedAt: Date.now()
    });
  }

  // Get setting
  static async getSetting(key: string, defaultValue?: any): Promise<any> {
    const db = await this.initDB();
    const setting = await db.get('appSettings', key);
    return setting ? setting.value : defaultValue;
  }

  // ============ UTILITIES ============

  // Get database stats
  static async getStats(): Promise<{
    pendingCount: number;
    cachedReportsCount: number;
    totalSize: string;
  }> {
    const db = await this.initDB();
    const pending = await db.getAll('pendingTransactions');
    const reports = await db.getAll('cachedReports');

    // Estimate size (rough calculation)
    const dataSize = JSON.stringify({ pending, reports }).length;
    const sizeInMB = (dataSize / (1024 * 1024)).toFixed(2);

    return {
      pendingCount: pending.length,
      cachedReportsCount: reports.length,
      totalSize: `${sizeInMB} MB`
    };
  }
}
```

**Note:** Install `idb` library: `npm install idb`

---

### 1.3 Create Connection Monitor Hook

**File:** `hooks/useConnectionStatus.ts` (NEW)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';

interface ConnectionStatus {
  isOnline: boolean;
  isFirestoreConnected: boolean;
  hasInternetAccess: boolean;
  lastChecked: Date;
}

export const useConnectionStatus = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    isFirestoreConnected: true,
    hasInternetAccess: navigator.onLine,
    lastChecked: new Date()
  });

  // Check actual internet connectivity (not just network connection)
  const checkInternetAccess = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch a small file from Firebase
      const response = await fetch('https://www.gstatic.com/firebasejs/ping', {
        method: 'HEAD',
        cache: 'no-cache',
        mode: 'no-cors'
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  // Monitor browser online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      const hasInternet = await checkInternetAccess();
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        hasInternetAccess: hasInternet,
        lastChecked: new Date()
      }));
      console.log('🌐 Connection restored');
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        hasInternetAccess: false,
        lastChecked: new Date()
      }));
      console.log('📵 Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkInternetAccess]);

  // Monitor Firestore connection state
  useEffect(() => {
    // Create a special document listener to detect Firestore connectivity
    // When offline, Firestore will serve from cache and update when online
    const unsubscribe = onSnapshot(
      doc(db, '.info/connectivity'),
      { includeMetadataChanges: true },
      (snapshot) => {
        const isConnected = snapshot.metadata.fromCache === false;
        setStatus(prev => ({
          ...prev,
          isFirestoreConnected: isConnected,
          lastChecked: new Date()
        }));
      },
      (error) => {
        console.error('Firestore connection monitoring error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Periodic internet check (every 30 seconds when online)
  useEffect(() => {
    if (!status.isOnline) return;

    const intervalId = setInterval(async () => {
      const hasInternet = await checkInternetAccess();
      setStatus(prev => ({
        ...prev,
        hasInternetAccess: hasInternet,
        lastChecked: new Date()
      }));
    }, 30000); // Check every 30 seconds

    return () => clearInterval(intervalId);
  }, [status.isOnline, checkInternetAccess]);

  // Manual refresh
  const refresh = useCallback(async () => {
    const hasInternet = await checkInternetAccess();
    setStatus(prev => ({
      ...prev,
      isOnline: navigator.onLine,
      hasInternetAccess: hasInternet,
      lastChecked: new Date()
    }));
  }, [checkInternetAccess]);

  return {
    ...status,
    isFullyOnline: status.isOnline && status.hasInternetAccess && status.isFirestoreConnected,
    isPartiallyOnline: status.isOnline && !status.hasInternetAccess,
    isOffline: !status.isOnline,
    refresh
  };
};
```

---

### 1.4 Enhance Service Worker

**File:** `public/sw.js` (NEW - separate from firebase-messaging-sw.js)

```javascript
// Accounting App Service Worker for Offline Functionality
// Version: 1.0.0

const CACHE_NAME = 'accounting-app-v1';
const RUNTIME_CACHE = 'accounting-runtime-v1';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.tsx',
  '/logo.png',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Service worker installed successfully');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map(name => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Network first strategy for API calls
  if (request.url.includes('/api/') || request.url.includes('firestore.googleapis.com')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache first strategy for static assets
  event.respondWith(cacheFirst(request));
});

// Network first, fallback to cache
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    // Update cache with fresh response
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    // No cache available
    throw error;
  }
}

// Cache first, fallback to network
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      })
    );
  }
});
```

---

### 1.5 Create PWA Manifest

**File:** `public/manifest.json` (NEW)

```json
{
  "name": "نظام محاسبة قطع الغيار",
  "short_name": "نظام محاسبة",
  "description": "نظام محاسبة شامل لإدارة المبيعات والمشتريات والمصروفات",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#111827",
  "theme_color": "#FDB913",
  "orientation": "any",
  "dir": "rtl",
  "lang": "ar",
  "icons": [
    {
      "src": "/logo.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/logo.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["business", "finance", "productivity"],
  "screenshots": [],
  "prefer_related_applications": false,
  "offline_enabled": true
}
```

**Add to `index.html` in `<head>`:**

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#FDB913">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="نظام محاسبة">
```

---

## 🔄 Phase 2: Transaction Management

### 2.1 Create Sync Service

**File:** `services/syncService.ts` (NEW)

```typescript
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { OfflineManager } from './offlineManager';
import { LoggingService } from './loggingService';
import { User, LogType } from '../types';

export interface SyncProgress {
  total: number;
  current: number;
  status: 'idle' | 'syncing' | 'completed' | 'error';
  message: string;
  errors: Array<{ id: string; error: string }>;
}

export class SyncService {
  private static isSyncing = false;
  private static syncListeners: Array<(progress: SyncProgress) => void> = [];

  // Subscribe to sync progress updates
  static onSyncProgress(callback: (progress: SyncProgress) => void): () => void {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(cb => cb !== callback);
    };
  }

  private static notifyProgress(progress: SyncProgress): void {
    this.syncListeners.forEach(callback => callback(progress));
  }

  // Main sync function
  static async syncPendingTransactions(
    user: User,
    shopId: string
  ): Promise<{ success: number; failed: number; errors: any[] }> {

    if (this.isSyncing) {
      console.warn('⚠️ Sync already in progress');
      return { success: 0, failed: 0, errors: [] };
    }

    this.isSyncing = true;
    console.log('🔄 Starting sync...');

    const pending = await OfflineManager.getPendingTransactions(shopId);

    if (pending.length === 0) {
      console.log('✅ No pending transactions to sync');
      this.isSyncing = false;
      return { success: 0, failed: 0, errors: [] };
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    };

    const progress: SyncProgress = {
      total: pending.length,
      current: 0,
      status: 'syncing',
      message: `Syncing ${pending.length} transactions...`,
      errors: []
    };

    this.notifyProgress(progress);

    // Process transactions in batches of 5
    const BATCH_SIZE = 5;
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (item) => {
          try {
            // Mark as syncing
            await OfflineManager.updateTransactionStatus(item.id, 'syncing');

            // Add to Firestore
            await addDoc(collection(db, 'transactions'), {
              ...item.transaction,
              syncedAt: Timestamp.now(),
              offlineCreatedAt: item.timestamp
            });

            // Remove from pending queue
            await OfflineManager.removePendingTransaction(item.id);

            results.success++;
            console.log(`✅ Synced transaction ${item.id}`);

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Update retry count
            await OfflineManager.updateTransactionStatus(item.id, 'failed', errorMessage);

            results.failed++;
            results.errors.push({ id: item.id, error: errorMessage });

            console.error(`❌ Failed to sync transaction ${item.id}:`, errorMessage);
          }

          // Update progress
          progress.current++;
          progress.message = `Synced ${progress.current} of ${progress.total}`;
          this.notifyProgress(progress);
        })
      );

      // Small delay between batches to avoid overwhelming Firestore
      if (i + BATCH_SIZE < pending.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Log sync completion
    if (results.success > 0) {
      await LoggingService.logAction(
        user,
        LogType.SYNC,
        `Synced ${results.success} offline transactions`,
        shopId
      );
    }

    // Final progress update
    progress.status = results.failed > 0 ? 'error' : 'completed';
    progress.message = results.failed > 0
      ? `Synced ${results.success} transactions, ${results.failed} failed`
      : `Successfully synced all ${results.success} transactions`;
    progress.errors = results.errors.map(e => ({ id: e.id, error: e.error }));

    this.notifyProgress(progress);

    this.isSyncing = false;
    console.log('✅ Sync completed:', results);

    return results;
  }

  // Check if sync is needed
  static async needsSync(shopId?: string): Promise<boolean> {
    const count = await OfflineManager.getPendingCount(shopId);
    return count > 0;
  }

  // Get sync status
  static isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  // Retry failed transactions
  static async retryFailed(user: User, shopId: string): Promise<void> {
    const pending = await OfflineManager.getPendingTransactions(shopId);
    const failed = pending.filter(p => p.status === 'failed');

    if (failed.length === 0) {
      console.log('No failed transactions to retry');
      return;
    }

    // Reset status to pending
    for (const item of failed) {
      await OfflineManager.updateTransactionStatus(item.id, 'pending');
    }

    // Trigger sync
    await this.syncPendingTransactions(user, shopId);
  }
}
```

---

### 2.2 Modify App.tsx

**File:** `App.tsx`

**Add these imports:**
```typescript
import { OfflineManager } from './services/offlineManager';
import { SyncService } from './services/syncService';
import { useConnectionStatus } from './hooks/useConnectionStatus';
```

**Add inside AppContent component:**

```typescript
const AppContent: React.FC = () => {
    const { t } = useI18n();

    // ✨ NEW: Connection status monitoring
    const connectionStatus = useConnectionStatus();

    // ✨ NEW: Pending transactions count
    const [pendingCount, setPendingCount] = useState(0);

    // ... existing state ...

    // ✨ NEW: Initialize offline manager
    useEffect(() => {
        OfflineManager.initDB().then(() => {
            console.log('✅ Offline manager initialized');
        });
    }, []);

    // ✨ NEW: Update pending count
    useEffect(() => {
        const updatePendingCount = async () => {
            if (activeShop) {
                const count = await OfflineManager.getPendingCount(activeShop.id);
                setPendingCount(count);
            }
        };

        updatePendingCount();

        // Update every 10 seconds
        const interval = setInterval(updatePendingCount, 10000);
        return () => clearInterval(interval);
    }, [activeShop]);

    // ✨ NEW: Auto-sync when connection is restored
    useEffect(() => {
        const handleReconnection = async () => {
            if (connectionStatus.isFullyOnline && currentUser && activeShop) {
                const needsSync = await SyncService.needsSync(activeShop.id);

                if (needsSync) {
                    console.log('🔄 Connection restored, starting auto-sync...');

                    try {
                        const results = await SyncService.syncPendingTransactions(
                            currentUser,
                            activeShop.id
                        );

                        if (results.success > 0) {
                            // Optionally show a notification
                            console.log(`✅ Auto-sync: ${results.success} transactions synced`);
                        }

                        // Update pending count
                        const count = await OfflineManager.getPendingCount(activeShop.id);
                        setPendingCount(count);
                    } catch (error) {
                        console.error('❌ Auto-sync failed:', error);
                    }
                }
            }
        };

        handleReconnection();
    }, [connectionStatus.isFullyOnline, currentUser, activeShop]);

    // ... rest of existing code ...
};
```

---

### 2.3 Modify Dashboard Component

**File:** `components/Dashboard.tsx`

**Add connection status banner at the top:**

```typescript
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { OfflineManager } from '../services/offlineManager';
import { SyncService } from '../services/syncService';

// Inside Dashboard component, add at the beginning:
const Dashboard: React.FC<DashboardProps> = ({ ... }) => {
    const connectionStatus = useConnectionStatus();
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    // Update pending count
    useEffect(() => {
        const updateCount = async () => {
            if (activeShop) {
                const count = await OfflineManager.getPendingCount(activeShop.id);
                setPendingCount(count);
            }
        };

        updateCount();
        const interval = setInterval(updateCount, 5000);
        return () => clearInterval(interval);
    }, [activeShop]);

    // Manual sync handler
    const handleManualSync = async () => {
        if (!user || !activeShop || isSyncing) return;

        setIsSyncing(true);
        try {
            await SyncService.syncPendingTransactions(user, activeShop.id);
            const count = await OfflineManager.getPendingCount(activeShop.id);
            setPendingCount(count);
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Connection Status Banner */}
            {!connectionStatus.isFullyOnline && (
                <div className="bg-yellow-500/20 border border-yellow-500 text-yellow-300 px-4 py-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="font-semibold">وضع عدم الاتصال</p>
                            <p className="text-sm">يمكنك متابعة العمل. سيتم المزامنة عند استعادة الاتصال.</p>
                        </div>
                    </div>
                    {pendingCount > 0 && (
                        <span className="bg-yellow-500 text-black px-3 py-1 rounded-full font-bold">
                            {pendingCount} معلق
                        </span>
                    )}
                </div>
            )}

            {/* Sync Button (when online with pending transactions) */}
            {connectionStatus.isFullyOnline && pendingCount > 0 && (
                <div className="bg-blue-500/20 border border-blue-500 text-blue-300 px-4 py-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <div>
                            <p className="font-semibold">لديك {pendingCount} معاملة بانتظار المزامنة</p>
                            <p className="text-sm">انقر للمزامنة الآن أو انتظر المزامنة التلقائية</p>
                        </div>
                    </div>
                    <button
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSyncing ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>جاري المزامنة...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>مزامنة الآن</span>
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Rest of existing dashboard content */}
            {/* ... */}
        </div>
    );
};
```

---

### 2.4 Modify Transaction Form for Offline Support

**File:** `components/DailyEntryForm.tsx`

**Modify the `handleSubmit` function:**

```typescript
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { OfflineManager } from '../services/offlineManager';

// Inside DailyEntryForm component:
const DailyEntryForm: React.FC<DailyEntryFormProps> = ({ ... }) => {
    const connectionStatus = useConnectionStatus();

    // ... existing code ...

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (isFormDisabled) { setError(disabledMessage); return; }

        // ... existing validation logic ...

        // Build transaction object
        const newTransaction: Omit<Transaction, 'id' | 'shopId' | 'date'> = {
            type: finalType,
            description,
            entries,
            totalAmount: finalTotalAmount
        };

        if (finalCategoryId) newTransaction.categoryId = finalCategoryId;
        if (finalPartyId) newTransaction.partyId = finalPartyId;

        // ✨ NEW: Check if offline
        if (!connectionStatus.isFullyOnline) {
            try {
                // Queue transaction for later sync
                const pendingId = await OfflineManager.addPendingTransaction(
                    {
                        ...newTransaction,
                        date: selectedDate.toISOString(),
                        shopId: activeShop?.id
                    },
                    currentUser?.id || '',
                    activeShop?.id || ''
                );

                console.log('📥 Transaction queued:', pendingId);

                // Show success message
                setError('');
                onClose();

                // Optionally show a toast notification
                alert('تم حفظ المعاملة محلياً. سيتم المزامنة عند استعادة الاتصال.');

            } catch (error) {
                console.error('Error queuing transaction:', error);
                setError('فشل في حفظ المعاملة محلياً');
            }
            return;
        }

        // ✨ Original online flow
        if (isEditMode) {
            const updatedTransaction: Transaction = {
                ...transactionToEdit,
                type: finalType,
                description,
                entries,
                totalAmount: finalTotalAmount
            };
            if (finalCategoryId) updatedTransaction.categoryId = finalCategoryId;
            if (finalPartyId) updatedTransaction.partyId = finalPartyId;

            onUpdateTransaction(updatedTransaction);
        } else {
            onAddTransaction(newTransaction);
        }

        onClose();
    };

    // ... rest of existing code ...

    return (
        <div className="...">
            {/* ... existing modal content ... */}

            {/* ✨ NEW: Show offline indicator in form */}
            {!connectionStatus.isFullyOnline && (
                <div className="bg-yellow-500/20 text-yellow-300 text-sm p-3 rounded-md m-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>وضع عدم الاتصال: سيتم حفظ المعاملة محلياً والمزامنة لاحقاً</span>
                </div>
            )}

            {/* ... rest of form ... */}
        </div>
    );
};
```

---

## 📊 Phase 3: Offline Export Functionality

### 3.1 Enhance Export Service

**File:** `services/exportService.ts`

**Add methods for offline export:**

```typescript
// Add to ExportService class

// Export from cached data when offline
static async exportOffline(
  shopId: string,
  reportType: 'transactions' | 'statement' | 'summary',
  format: 'pdf' | 'csv' | 'excel',
  language: Language = 'ar'
): Promise<Blob> {
  try {
    // Get cached report data
    const cachedData = await OfflineManager.getCachedReport(reportType, shopId);

    if (!cachedData) {
      throw new Error(translate('exports.errors.noCachedData', language));
    }

    // Add watermark indicating offline generation
    const watermarkedData = {
      ...cachedData,
      generatedOffline: true,
      offlineTimestamp: new Date().toISOString(),
      note: translate('exports.offlineNote', language)
    };

    // Generate export based on format
    const config: ExportConfiguration = {
      fileName: `${reportType}_offline_${Date.now()}`,
      format: format.toUpperCase() as any,
      includeHeader: true,
      includeFooter: true,
      watermark: translate('exports.offlineWatermark', language),
      dateFormat: 'DD/MM/YYYY',
      numberFormat: '#,##0.00',
      currency: 'SDG'
    };

    return await this.exportToFormat(watermarkedData.transactions || [], config, language);
  } catch (error) {
    console.error('Error exporting offline:', error);
    throw error;
  }
}

// Cache recent transactions for offline access
static async cacheRecentTransactions(
  shopId: string,
  transactions: Transaction[],
  days: number = 90
): Promise<void> {
  try {
    const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);

    const recentTransactions = transactions.filter(tx =>
      new Date(tx.date).getTime() > cutoffDate
    );

    await OfflineManager.cacheReport(
      'transactions',
      { transactions: recentTransactions },
      shopId,
      days
    );

    console.log(`💾 Cached ${recentTransactions.length} transactions for offline access`);
  } catch (error) {
    console.error('Error caching transactions:', error);
  }
}
```

---

### 3.2 Create Offline Export Component

**File:** `components/OfflineExportButton.tsx` (NEW)

```typescript
import React, { useState } from 'react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { ExportService } from '../services/exportService';
import { OfflineManager } from '../services/offlineManager';
import { useTranslation } from '../i18n/useTranslation';

interface OfflineExportButtonProps {
  shopId: string;
  shopName: string;
}

export const OfflineExportButton: React.FC<OfflineExportButtonProps> = ({
  shopId,
  shopName
}) => {
  const { t, language } = useTranslation();
  const connectionStatus = useConnectionStatus();
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleExport = async (format: 'pdf' | 'csv' | 'excel') => {
    setIsExporting(true);
    try {
      const blob = await ExportService.exportOffline(
        shopId,
        'transactions',
        format,
        language
      );

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${shopName}_transactions_offline.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowMenu(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('exports.errors.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        disabled={isExporting}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>{t('exports.exportOffline')}</span>
        {!connectionStatus.isFullyOnline && (
          <span className="bg-yellow-500 text-black text-xs px-2 py-1 rounded">
            {t('common.offline')}
          </span>
        )}
      </button>

      {showMenu && (
        <div className="absolute left-0 mt-2 bg-surface border border-gray-700 rounded-lg shadow-xl z-50 min-w-[200px]">
          <button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="w-full text-right px-4 py-3 hover:bg-background flex items-center gap-3 rounded-t-lg"
          >
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5z" />
            </svg>
            <span>PDF</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="w-full text-right px-4 py-3 hover:bg-background flex items-center gap-3"
          >
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5z" />
            </svg>
            <span>CSV</span>
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={isExporting}
            className="w-full text-right px-4 py-3 hover:bg-background flex items-center gap-3 rounded-b-lg"
          >
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 2h12v10H4V5z" />
            </svg>
            <span>Excel</span>
          </button>
        </div>
      )}
    </div>
  );
};
```

---

## 🎨 Phase 4: UI/UX Enhancements

### 4.1 Connection Status Banner Component

**File:** `components/ConnectionStatusBanner.tsx` (NEW)

```typescript
import React from 'react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { useTranslation } from '../i18n/useTranslation';

export const ConnectionStatusBanner: React.FC = () => {
  const connectionStatus = useConnectionStatus();
  const { t } = useTranslation();

  if (connectionStatus.isFullyOnline) {
    return null; // Don't show banner when fully online
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="bg-yellow-500 text-black px-4 py-2 flex items-center justify-between animate-slide-down">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
          </svg>
          <span className="font-semibold">{t('connection.offline')}</span>
          <span className="text-sm opacity-90">
            {t('connection.offlineMessage')}
          </span>
        </div>
        <button
          onClick={connectionStatus.refresh}
          className="bg-black/20 hover:bg-black/30 px-3 py-1 rounded text-sm font-medium"
        >
          {t('connection.checkAgain')}
        </button>
      </div>
    </div>
  );
};
```

**Add to App.tsx at the top level:**
```typescript
<ConnectionStatusBanner />
```

---

### 4.2 Sync Manager Component

**File:** `components/SyncManager.tsx` (NEW)

```typescript
import React, { useState, useEffect } from 'react';
import { OfflineManager } from '../services/offlineManager';
import { SyncService, SyncProgress } from '../services/syncService';
import { User } from '../types';
import { useTranslation } from '../i18n/useTranslation';

interface SyncManagerProps {
  user: User;
  shopId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SyncManager: React.FC<SyncManagerProps> = ({
  user,
  shopId,
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();

      // Subscribe to sync progress
      const unsubscribe = SyncService.onSyncProgress(setSyncProgress);
      return unsubscribe;
    }
  }, [isOpen, shopId]);

  const loadData = async () => {
    const pending = await OfflineManager.getPendingTransactions(shopId);
    setPendingTransactions(pending);

    const dbStats = await OfflineManager.getStats();
    setStats(dbStats);
  };

  const handleSync = async () => {
    await SyncService.syncPendingTransactions(user, shopId);
    await loadData();
  };

  const handleRetryFailed = async () => {
    await SyncService.retryFailed(user, shopId);
    await loadData();
  };

  const handleClearAll = async () => {
    if (window.confirm(t('sync.confirmClearAll'))) {
      await OfflineManager.clearAllPending();
      await loadData();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold">{t('sync.manager')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-700">
            <div className="bg-background p-4 rounded-lg">
              <div className="text-text-secondary text-sm">{t('sync.pendingCount')}</div>
              <div className="text-3xl font-bold text-primary">{stats.pendingCount}</div>
            </div>
            <div className="bg-background p-4 rounded-lg">
              <div className="text-text-secondary text-sm">{t('sync.cachedReports')}</div>
              <div className="text-3xl font-bold text-accent">{stats.cachedReportsCount}</div>
            </div>
            <div className="bg-background p-4 rounded-lg">
              <div className="text-text-secondary text-sm">{t('sync.storageUsed')}</div>
              <div className="text-3xl font-bold text-green-500">{stats.totalSize}</div>
            </div>
          </div>
        )}

        {/* Sync Progress */}
        {syncProgress && syncProgress.status === 'syncing' && (
          <div className="p-6 border-b border-gray-700">
            <div className="mb-2 flex justify-between">
              <span>{syncProgress.message}</span>
              <span className="font-bold">{syncProgress.current} / {syncProgress.total}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Pending Transactions List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-lg font-bold mb-4">{t('sync.pendingTransactions')}</h3>

          {pendingTransactions.length === 0 ? (
            <div className="text-center text-text-secondary py-12">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg">{t('sync.noPendingTransactions')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTransactions.map((item) => (
                <div
                  key={item.id}
                  className={`
                    p-4 rounded-lg border
                    ${item.status === 'pending' ? 'bg-background border-gray-700' : ''}
                    ${item.status === 'syncing' ? 'bg-blue-900/20 border-blue-500' : ''}
                    ${item.status === 'failed' ? 'bg-red-900/20 border-red-500' : ''}
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold">{item.transaction.description || t('sync.noDescription')}</div>
                      <div className="text-sm text-text-secondary mt-1">
                        {new Date(item.timestamp).toLocaleString('ar-SA')}
                      </div>
                      <div className="text-lg font-bold text-primary mt-1">
                        {item.transaction.totalAmount} {t('currency.symbol')}
                      </div>
                      {item.errorMessage && (
                        <div className="text-sm text-red-400 mt-2">
                          {t('sync.error')}: {item.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-semibold
                        ${item.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : ''}
                        ${item.status === 'syncing' ? 'bg-blue-500/20 text-blue-300' : ''}
                        ${item.status === 'failed' ? 'bg-red-500/20 text-red-300' : ''}
                      `}>
                        {t(`sync.status.${item.status}`)}
                      </span>
                      {item.retryCount > 0 && (
                        <span className="text-xs text-text-secondary">
                          ({item.retryCount} {t('sync.retries')})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center p-6 border-t border-gray-700">
          <div className="flex gap-3">
            {user.role === 'admin' && pendingTransactions.length > 0 && (
              <button
                onClick={handleClearAll}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                {t('sync.clearAll')}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              {t('common.close')}
            </button>
            {pendingTransactions.some(p => p.status === 'failed') && (
              <button
                onClick={handleRetryFailed}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg"
              >
                {t('sync.retryFailed')}
              </button>
            )}
            {pendingTransactions.length > 0 && (
              <button
                onClick={handleSync}
                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg flex items-center gap-2"
                disabled={syncProgress?.status === 'syncing'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t('sync.syncNow')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 📝 Phase 5: Update Types

**File:** `types.ts`

**Add to the end of the file:**

```typescript
// ========== OFFLINE & SYNC INTERFACES ==========

export interface PendingTransaction {
  id: string;
  transaction: Omit<Transaction, 'id'>;
  timestamp: number;
  userId: string;
  shopId: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  errorMessage?: string;
}

export interface CachedReport {
  id: string;
  reportType: string;
  data: any;
  generatedAt: number;
  shopId: string;
  expiresAt: number;
}

export interface ConnectionStatus {
  isOnline: boolean;
  isFirestoreConnected: boolean;
  hasInternetAccess: boolean;
  lastChecked: Date;
}

export interface SyncResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface OfflineStats {
  pendingCount: number;
  cachedReportsCount: number;
  totalSize: string;
}
```

---

## 🧪 Testing Guide

### Testing Offline Functionality

1. **Simulate Offline Mode**
   - Open Chrome DevTools → Network tab
   - Select "Offline" from throttling dropdown
   - Try adding transactions

2. **Test Auto-Sync**
   - Add transactions while offline
   - Go back online
   - Verify auto-sync triggers
   - Check Firebase console for synced data

3. **Test Manual Sync**
   - Add transactions offline
   - Stay offline
   - Click manual sync button (should fail gracefully)
   - Go online
   - Click manual sync button (should succeed)

4. **Test Export Offline**
   - Cache some transaction data
   - Go offline
   - Try exporting reports
   - Verify watermark appears

5. **Test Connection Detection**
   - Test with airplane mode
   - Test with WiFi disconnected
   - Test with no internet (connected to router but no WAN)
   - Verify banner shows/hides appropriately

---

## 🚀 Deployment Checklist

### Before Deployment

- [ ] Install dependencies: `npm install idb`
- [ ] Update `index.html` with manifest link
- [ ] Create `manifest.json` with proper icons
- [ ] Register both service workers (app SW + FCM SW)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Test on mobile devices
- [ ] Verify IndexedDB storage limits (usually 50MB+)

### Firebase Rules

Ensure Firestore rules allow offline writes:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /transactions/{transactionId} {
      allow create: if request.auth != null
        && request.resource.data.shopId is string
        && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 🔧 Troubleshooting

### Common Issues

**Issue:** Service worker not registering
- **Solution:** Check HTTPS (required for SW except localhost)
- Check browser console for errors
- Clear browser cache

**Issue:** IndexedDB quota exceeded
- **Solution:** Implement cleanup of old cached data
- Reduce cache expiry time
- Ask user to free up storage

**Issue:** Firestore persistence fails
- **Solution:** Check for Safari private mode (doesn't support IndexedDB)
- Add try-catch around enableIndexedDbPersistence()
- Show graceful error message

**Issue:** Transactions not syncing
- **Solution:** Check Firestore rules
- Verify internet connection
- Check browser console for errors
- Retry failed transactions manually

---

## 📚 Additional Resources

- [Firebase Offline Persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Guide](https://web.dev/progressive-web-apps/)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)

---

## 🎯 Summary

This implementation provides:

✅ **Automatic offline support** via Firestore persistence
✅ **Local transaction queuing** when offline
✅ **Smart connection detection** with multiple strategies
✅ **Auto-sync on reconnection** with retry logic
✅ **Manual sync controls** for users
✅ **Offline export** from cached data
✅ **Admin oversight** via sync manager
✅ **PWA capabilities** for installation
✅ **User-friendly indicators** for offline status
✅ **Minimal code changes** to existing components

**Implementation Time:** ~2-3 days
**Maintenance:** Low (leverages Firebase built-in features)
**User Experience:** Seamless offline/online transitions

---

**Created:** 2025
**Version:** 1.0
**Last Updated:** January 2025
