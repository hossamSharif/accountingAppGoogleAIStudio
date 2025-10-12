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
