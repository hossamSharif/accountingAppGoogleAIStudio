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
