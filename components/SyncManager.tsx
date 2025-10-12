import React, { useState, useEffect } from 'react';
import { SyncService, SyncProgress } from '../services/syncService';
import { OfflineManager } from '../services/offlineManager';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { User } from '../types';
import { translate, getCurrentLanguage } from '../utils/translate';

interface SyncManagerProps {
  user: User;
  shopId: string;
  autoSync?: boolean;
  showPendingCount?: boolean;
  className?: string;
}

export const SyncManager: React.FC<SyncManagerProps> = ({
  user,
  shopId,
  autoSync = true,
  showPendingCount = true,
  className = ''
}) => {
  const connectionStatus = useConnectionStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const language = getCurrentLanguage();

  // Update pending count
  const updatePendingCount = async () => {
    try {
      const count = await OfflineManager.getPendingCount(shopId);
      setPendingCount(count);
    } catch (error) {
      console.error('Error updating pending count:', error);
    }
  };

  // Subscribe to sync progress
  useEffect(() => {
    const unsubscribe = SyncService.onSyncProgress((progress) => {
      setSyncProgress(progress);

      if (progress.status === 'completed' || progress.status === 'error') {
        setLastSyncTime(new Date());

        // Update pending count after sync completes
        setTimeout(() => {
          updatePendingCount();
        }, 500);
      }
    });

    return unsubscribe;
  }, [shopId]);

  // Update pending count on mount and when shop changes
  useEffect(() => {
    updatePendingCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(updatePendingCount, 30000);
    return () => clearInterval(interval);
  }, [shopId]);

  // Auto-sync when connection is restored
  useEffect(() => {
    if (autoSync && connectionStatus.isFullyOnline && pendingCount > 0) {
      handleSync();
    }
  }, [connectionStatus.isFullyOnline, autoSync]);

  const handleSync = async () => {
    if (!connectionStatus.isFullyOnline) {
      alert(language === 'ar'
        ? 'يجب الاتصال بالإنترنت للمزامنة'
        : 'Internet connection required for sync');
      return;
    }

    if (SyncService.isSyncInProgress()) {
      console.log('Sync already in progress');
      return;
    }

    try {
      await SyncService.syncPendingTransactions(user, shopId);
    } catch (error) {
      console.error('Error syncing:', error);
      alert(language === 'ar'
        ? 'فشلت المزامنة. يرجى المحاولة مرة أخرى.'
        : 'Sync failed. Please try again.');
    }
  };

  const handleRetryFailed = async () => {
    if (!connectionStatus.isFullyOnline) {
      alert(language === 'ar'
        ? 'يجب الاتصال بالإنترنت لإعادة المحاولة'
        : 'Internet connection required to retry');
      return;
    }

    try {
      await SyncService.retryFailed(user, shopId);
    } catch (error) {
      console.error('Error retrying failed transactions:', error);
      alert(language === 'ar'
        ? 'فشلت إعادة المحاولة. يرجى التحقق من الاتصال.'
        : 'Retry failed. Please check your connection.');
    }
  };

  const getSyncStatusText = () => {
    if (!syncProgress) return '';

    switch (syncProgress.status) {
      case 'syncing':
        return language === 'ar'
          ? `جاري المزامنة... (${syncProgress.current}/${syncProgress.total})`
          : `Syncing... (${syncProgress.current}/${syncProgress.total})`;
      case 'completed':
        return language === 'ar' ? 'تمت المزامنة بنجاح' : 'Sync completed';
      case 'error':
        return language === 'ar' ? 'فشلت المزامنة' : 'Sync failed';
      default:
        return '';
    }
  };

  const getProgressPercentage = () => {
    if (!syncProgress || syncProgress.total === 0) return 0;
    return (syncProgress.current / syncProgress.total) * 100;
  };

  const formatLastSyncTime = () => {
    if (!lastSyncTime) return language === 'ar' ? 'لم تتم المزامنة بعد' : 'Not synced yet';

    const now = new Date();
    const diffMs = now.getTime() - lastSyncTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) {
      return language === 'ar' ? 'الآن' : 'Just now';
    } else if (diffMins < 60) {
      return language === 'ar'
        ? `منذ ${diffMins} دقيقة`
        : `${diffMins} minutes ago`;
    } else {
      return lastSyncTime.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US');
    }
  };

  const isSyncing = syncProgress?.status === 'syncing';

  return (
    <div className={`sync-manager ${className}`}>
      {/* Pending Count Badge */}
      {showPendingCount && pendingCount > 0 && (
        <div className="pending-badge">
          <span className="badge-icon">📤</span>
          <span className="badge-count">{pendingCount}</span>
          <span className="badge-text">
            {language === 'ar' ? 'معاملات معلقة' : 'pending'}
          </span>
        </div>
      )}

      {/* Sync Button */}
      <button
        onClick={handleSync}
        disabled={!connectionStatus.isFullyOnline || isSyncing || pendingCount === 0}
        className="sync-button"
        title={language === 'ar' ? 'مزامنة الآن' : 'Sync now'}
      >
        {isSyncing ? (
          <>
            <span className="spinner"></span>
            {language === 'ar' ? 'جاري المزامنة...' : 'Syncing...'}
          </>
        ) : (
          <>
            <span className="sync-icon">🔄</span>
            {language === 'ar' ? 'مزامنة' : 'Sync'}
          </>
        )}
      </button>

      {/* Details Toggle */}
      {(syncProgress || lastSyncTime || pendingCount > 0) && (
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="details-toggle"
          title={language === 'ar' ? 'التفاصيل' : 'Details'}
        >
          {showDetails ? '▼' : '▶'}
        </button>
      )}

      {/* Sync Details Panel */}
      {showDetails && (
        <div className="sync-details-panel">
          {/* Progress Bar */}
          {isSyncing && (
            <div className="progress-section">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgressPercentage()}%` }}
                />
              </div>
              <div className="progress-text">{getSyncStatusText()}</div>
            </div>
          )}

          {/* Sync Status */}
          {syncProgress && syncProgress.status !== 'syncing' && (
            <div className={`sync-status ${syncProgress.status}`}>
              <div className="status-message">{syncProgress.message}</div>
              {syncProgress.errors.length > 0 && (
                <div className="error-list">
                  <div className="error-header">
                    {language === 'ar' ? 'أخطاء:' : 'Errors:'}
                  </div>
                  {syncProgress.errors.map((err, index) => (
                    <div key={index} className="error-item">
                      <span className="error-id">#{err.id.substring(0, 8)}</span>
                      <span className="error-message">{err.error}</span>
                    </div>
                  ))}
                  <button onClick={handleRetryFailed} className="retry-button">
                    {language === 'ar' ? 'إعادة المحاولة' : 'Retry Failed'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Last Sync Time */}
          <div className="sync-info">
            <div className="info-item">
              <span className="info-label">
                {language === 'ar' ? 'آخر مزامنة:' : 'Last sync:'}
              </span>
              <span className="info-value">{formatLastSyncTime()}</span>
            </div>

            <div className="info-item">
              <span className="info-label">
                {language === 'ar' ? 'معاملات معلقة:' : 'Pending:'}
              </span>
              <span className={`info-value ${pendingCount > 0 ? 'pending' : 'synced'}`}>
                {pendingCount}
              </span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sync-manager {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .pending-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          border-radius: 20px;
          border: 2px solid #ffc107;
          font-size: 13px;
          font-weight: 600;
          color: #856404;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .badge-icon {
          font-size: 16px;
        }

        .badge-count {
          background: #ffc107;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
        }

        .sync-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .sync-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .sync-button:disabled {
          background: #cccccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .sync-icon {
          font-size: 18px;
          animation: rotate 2s linear infinite paused;
        }

        .sync-button:not(:disabled):hover .sync-icon {
          animation-play-state: running;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .details-toggle {
          background: transparent;
          border: 1px solid #ddd;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .details-toggle:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .sync-details-panel {
          width: 100%;
          margin-top: 12px;
          padding: 16px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .progress-section {
          margin-bottom: 16px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e0e0e0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease;
          border-radius: 4px;
        }

        .progress-text {
          font-size: 13px;
          color: #666;
          text-align: center;
        }

        .sync-status {
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 16px;
        }

        .sync-status.completed {
          background: rgba(40, 167, 69, 0.1);
          border-left: 3px solid #28a745;
        }

        .sync-status.error {
          background: rgba(220, 53, 69, 0.1);
          border-left: 3px solid #dc3545;
        }

        .status-message {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .error-list {
          margin-top: 12px;
        }

        .error-header {
          font-size: 13px;
          font-weight: 600;
          color: #dc3545;
          margin-bottom: 8px;
        }

        .error-item {
          display: flex;
          gap: 8px;
          padding: 6px 8px;
          background: rgba(220, 53, 69, 0.05);
          border-radius: 4px;
          margin-bottom: 4px;
          font-size: 12px;
        }

        .error-id {
          color: #999;
          font-family: monospace;
        }

        .error-message {
          color: #666;
        }

        .retry-button {
          margin-top: 8px;
          padding: 6px 12px;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .retry-button:hover {
          background: #c82333;
        }

        .sync-info {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }

        .info-item {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .info-label {
          font-size: 13px;
          color: #666;
          font-weight: 500;
        }

        .info-value {
          font-size: 13px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.05);
        }

        .info-value.pending {
          color: #ffc107;
          background: rgba(255, 193, 7, 0.1);
        }

        .info-value.synced {
          color: #28a745;
          background: rgba(40, 167, 69, 0.1);
        }
      `}</style>
    </div>
  );
};
