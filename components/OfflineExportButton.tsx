import React, { useState, useEffect } from 'react';
import { ExportService } from '../services/exportService';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { ExportConfiguration } from '../types';
import { translate, getCurrentLanguage } from '../utils/translate';

interface OfflineExportButtonProps {
  shopId: string;
  userId: string;
  exportConfig?: ExportConfiguration;
  className?: string;
  buttonText?: string;
  disabled?: boolean;
}

export const OfflineExportButton: React.FC<OfflineExportButtonProps> = ({
  shopId,
  userId,
  exportConfig,
  className = '',
  buttonText,
  disabled = false
}) => {
  const connectionStatus = useConnectionStatus();
  const [isExporting, setIsExporting] = useState(false);
  const [cachedInfo, setCachedInfo] = useState<{
    recordCount: number;
    cachedAt: Date | null;
    expiresAt: Date | null;
    isExpired: boolean;
  } | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  const language = getCurrentLanguage();

  // Check cached data availability
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const available = await ExportService.isOfflineExportAvailable(shopId);
        setIsAvailable(available);

        if (available) {
          const info = await ExportService.getCachedDataInfo(shopId);
          setCachedInfo(info);
        }
      } catch (error) {
        console.error('Error checking offline export availability:', error);
        setIsAvailable(false);
      }
    };

    checkAvailability();
  }, [shopId]);

  // Automatically cache transactions when online
  useEffect(() => {
    const cacheTransactions = async () => {
      if (connectionStatus.isFullyOnline && shopId && userId) {
        try {
          await ExportService.cacheRecentTransactions(shopId, userId, 30);

          // Update availability info
          const available = await ExportService.isOfflineExportAvailable(shopId);
          setIsAvailable(available);

          if (available) {
            const info = await ExportService.getCachedDataInfo(shopId);
            setCachedInfo(info);
          }
        } catch (error) {
          console.error('Error caching transactions:', error);
        }
      }
    };

    // Cache on mount and when connection is restored
    cacheTransactions();
  }, [connectionStatus.isFullyOnline, shopId, userId]);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const defaultConfig: ExportConfiguration = {
        name: 'تقرير دون اتصال',
        format: 'CSV',
        fileName: `offline_export_${new Date().toISOString().split('T')[0]}`,
        includeHeader: true,
        includeFooter: false,
        dateFormat: 'DD/MM/YYYY',
        numberFormat: '#,##0.00',
        currency: 'SAR',
        encoding: 'UTF-8'
      };

      const config = exportConfig || defaultConfig;

      let blob: Blob;

      // Use offline export if not fully online
      if (!connectionStatus.isFullyOnline) {
        blob = await ExportService.exportOffline(shopId, config, language);
      } else {
        // Use regular export if online
        const data = await ExportService.getCachedReportData(shopId);
        blob = await ExportService.exportToCSV(data, config, language);
      }

      // Download the file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${config.fileName}.${config.format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const successMsg = translate('exports.messages.exportSuccess', language);
      alert(successMsg);
    } catch (error) {
      console.error('Error exporting:', error);
      const errorMsg = error instanceof Error ? error.message : translate('exports.errors.exportError', language);
      alert(errorMsg);
    } finally {
      setIsExporting(false);
    }
  };

  const getButtonLabel = () => {
    if (buttonText) return buttonText;

    if (!connectionStatus.isFullyOnline) {
      return language === 'ar' ? 'تصدير (دون اتصال)' : 'Export (Offline)';
    }

    return language === 'ar' ? 'تصدير' : 'Export';
  };

  const getStatusMessage = () => {
    if (!isAvailable) {
      return language === 'ar'
        ? 'لا توجد بيانات محفوظة للتصدير'
        : 'No cached data available';
    }

    if (cachedInfo) {
      const recordText = language === 'ar'
        ? `${cachedInfo.recordCount} سجل محفوظ`
        : `${cachedInfo.recordCount} records cached`;

      const dateText = cachedInfo.cachedAt
        ? language === 'ar'
          ? ` (حفظ في ${cachedInfo.cachedAt.toLocaleDateString('ar-SA')})`
          : ` (cached on ${cachedInfo.cachedAt.toLocaleDateString('en-US')})`
        : '';

      const expiredText = cachedInfo.isExpired
        ? language === 'ar'
          ? ' - منتهي'
          : ' - expired'
        : '';

      return recordText + dateText + expiredText;
    }

    return '';
  };

  const isDisabled = disabled || isExporting || !isAvailable;

  return (
    <div className="offline-export-container">
      <button
        onClick={handleExport}
        disabled={isDisabled}
        className={`offline-export-button ${className} ${!connectionStatus.isFullyOnline ? 'offline-mode' : ''}`}
        title={getStatusMessage()}
      >
        {isExporting ? (
          <>
            <span className="spinner"></span>
            {language === 'ar' ? 'جاري التصدير...' : 'Exporting...'}
          </>
        ) : (
          <>
            <span className="export-icon">📥</span>
            {getButtonLabel()}
          </>
        )}
      </button>

      {isAvailable && cachedInfo && (
        <div className="cache-info-tooltip">
          <small>{getStatusMessage()}</small>
        </div>
      )}

      {!connectionStatus.isFullyOnline && !isAvailable && (
        <div className="warning-message">
          <small>
            {language === 'ar'
              ? '⚠️ لا توجد بيانات محفوظة. يرجى الاتصال بالإنترنت أولاً.'
              : '⚠️ No cached data. Please connect to internet first.'}
          </small>
        </div>
      )}

      <style>{`
        .offline-export-container {
          display: inline-block;
          position: relative;
        }

        .offline-export-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
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

        .offline-export-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .offline-export-button:disabled {
          background: #cccccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .offline-export-button.offline-mode {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        .offline-export-button.offline-mode:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(245, 87, 108, 0.4);
        }

        .export-icon {
          font-size: 18px;
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

        .cache-info-tooltip {
          margin-top: 6px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          text-align: center;
        }

        .cache-info-tooltip small {
          color: #666;
          font-size: 12px;
        }

        .warning-message {
          margin-top: 6px;
          padding: 6px 10px;
          background: rgba(255, 193, 7, 0.1);
          border-left: 3px solid #ffc107;
          border-radius: 4px;
        }

        .warning-message small {
          color: #856404;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};
