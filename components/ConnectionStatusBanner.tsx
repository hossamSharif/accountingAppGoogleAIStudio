import React, { useState, useEffect } from 'react';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { translate, getCurrentLanguage } from '../utils/translate';

interface ConnectionStatusBannerProps {
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

export const ConnectionStatusBanner: React.FC<ConnectionStatusBannerProps> = ({
  showDetails = false,
  compact = false,
  className = ''
}) => {
  const connectionStatus = useConnectionStatus();
  const [showBanner, setShowBanner] = useState(true);
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  const language = getCurrentLanguage();

  // Auto-hide banner after 10 seconds when online
  useEffect(() => {
    if (connectionStatus.isFullyOnline) {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 10000);

      return () => clearTimeout(timer);
    } else {
      setShowBanner(true);
    }
  }, [connectionStatus.isFullyOnline]);

  // Don't render if banner is hidden and we're online
  if (!showBanner && connectionStatus.isFullyOnline) {
    return null;
  }

  const getStatusIcon = () => {
    if (connectionStatus.isFullyOnline) {
      return '✅';
    } else if (connectionStatus.isOnline && connectionStatus.isFirestoreConnected) {
      return '⚠️';
    } else if (connectionStatus.isOnline) {
      return '🔄';
    } else {
      return '📴';
    }
  };

  const getStatusText = () => {
    if (connectionStatus.isFullyOnline) {
      return language === 'ar' ? 'متصل بالإنترنت' : 'Online';
    } else if (!connectionStatus.isOnline) {
      return language === 'ar' ? 'غير متصل بالإنترنت' : 'Offline';
    } else if (!connectionStatus.hasInternetAccess) {
      return language === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No Internet Connection';
    } else if (!connectionStatus.isFirestoreConnected) {
      return language === 'ar' ? 'غير متصل بقاعدة البيانات' : 'Database Disconnected';
    } else {
      return language === 'ar' ? 'اتصال محدود' : 'Limited Connection';
    }
  };

  const getStatusMessage = () => {
    if (connectionStatus.isFullyOnline) {
      return language === 'ar'
        ? 'جميع الأنظمة تعمل بشكل طبيعي'
        : 'All systems operational';
    } else if (!connectionStatus.isOnline) {
      return language === 'ar'
        ? 'تعمل في وضع دون اتصال. سيتم مزامنة التغييرات عند استعادة الاتصال.'
        : 'Working offline. Changes will sync when connection is restored.';
    } else if (!connectionStatus.hasInternetAccess) {
      return language === 'ar'
        ? 'لا يمكن الوصول إلى الإنترنت. تحقق من اتصال الشبكة.'
        : 'Cannot reach internet. Check your network connection.';
    } else if (!connectionStatus.isFirestoreConnected) {
      return language === 'ar'
        ? 'غير متصل بقاعدة البيانات. يستخدم البيانات المخزنة محلياً.'
        : 'Database disconnected. Using cached data.';
    } else {
      return language === 'ar'
        ? 'الاتصال غير مستقر. بعض الميزات قد تكون محدودة.'
        : 'Unstable connection. Some features may be limited.';
    }
  };

  const getBannerStyle = () => {
    if (connectionStatus.isFullyOnline) {
      return 'success';
    } else if (!connectionStatus.isOnline) {
      return 'error';
    } else {
      return 'warning';
    }
  };

  const handleClose = () => {
    setShowBanner(false);
  };

  const toggleDetails = () => {
    setDetailsExpanded(!detailsExpanded);
  };

  const bannerStyle = getBannerStyle();

  return (
    <div className={`connection-banner ${bannerStyle} ${compact ? 'compact' : ''} ${className}`}>
      <div className="banner-content">
        <div className="status-main">
          <span className="status-icon">{getStatusIcon()}</span>
          <div className="status-text">
            <div className="status-title">{getStatusText()}</div>
            {!compact && <div className="status-message">{getStatusMessage()}</div>}
          </div>
        </div>

        <div className="banner-actions">
          {showDetails && (
            <button
              onClick={toggleDetails}
              className="details-button"
              title={language === 'ar' ? 'عرض التفاصيل' : 'Show details'}
            >
              {detailsExpanded ? '▼' : '▶'}
            </button>
          )}

          {connectionStatus.isFullyOnline && (
            <button
              onClick={handleClose}
              className="close-button"
              title={language === 'ar' ? 'إغلاق' : 'Close'}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {detailsExpanded && showDetails && (
        <div className="connection-details">
          <div className="detail-item">
            <span className="detail-label">
              {language === 'ar' ? 'حالة الشبكة:' : 'Network Status:'}
            </span>
            <span className={`detail-value ${connectionStatus.isOnline ? 'online' : 'offline'}`}>
              {connectionStatus.isOnline
                ? (language === 'ar' ? 'متصل' : 'Online')
                : (language === 'ar' ? 'غير متصل' : 'Offline')}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">
              {language === 'ar' ? 'الإنترنت:' : 'Internet:'}
            </span>
            <span className={`detail-value ${connectionStatus.hasInternetAccess ? 'online' : 'offline'}`}>
              {connectionStatus.hasInternetAccess
                ? (language === 'ar' ? 'متاح' : 'Available')
                : (language === 'ar' ? 'غير متاح' : 'Unavailable')}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">
              {language === 'ar' ? 'قاعدة البيانات:' : 'Database:'}
            </span>
            <span className={`detail-value ${connectionStatus.isFirestoreConnected ? 'online' : 'offline'}`}>
              {connectionStatus.isFirestoreConnected
                ? (language === 'ar' ? 'متصل' : 'Connected')
                : (language === 'ar' ? 'غير متصل' : 'Disconnected')}
            </span>
          </div>

          <div className="detail-item">
            <span className="detail-label">
              {language === 'ar' ? 'آخر فحص:' : 'Last Check:'}
            </span>
            <span className="detail-value">
              {connectionStatus.lastChecked
                ? new Date(connectionStatus.lastChecked).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US')
                : '-'}
            </span>
          </div>
        </div>
      )}

      <style>{`
        .connection-banner {
          width: 100%;
          padding: 16px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          animation: slideDown 0.3s ease-out;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .connection-banner.compact {
          padding: 10px 16px;
        }

        .connection-banner.success {
          background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
          border-left: 4px solid #28a745;
        }

        .connection-banner.warning {
          background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          border-left: 4px solid #ffc107;
        }

        .connection-banner.error {
          background: linear-gradient(135deg, #f8d7da 0%, #f5c6cb 100%);
          border-left: 4px solid #dc3545;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .banner-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .status-main {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .status-icon {
          font-size: 28px;
          line-height: 1;
        }

        .connection-banner.compact .status-icon {
          font-size: 20px;
        }

        .status-text {
          flex: 1;
        }

        .status-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }

        .connection-banner.compact .status-title {
          font-size: 14px;
          margin-bottom: 0;
        }

        .status-message {
          font-size: 14px;
          color: #666;
          line-height: 1.4;
        }

        .banner-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .details-button,
        .close-button {
          background: transparent;
          border: none;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 14px;
          border-radius: 6px;
          transition: background 0.2s ease;
          color: #666;
        }

        .details-button:hover,
        .close-button:hover {
          background: rgba(0, 0, 0, 0.1);
        }

        .connection-details {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .detail-label {
          font-size: 13px;
          color: #666;
          font-weight: 500;
        }

        .detail-value {
          font-size: 13px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .detail-value.online {
          color: #28a745;
          background: rgba(40, 167, 69, 0.1);
        }

        .detail-value.offline {
          color: #dc3545;
          background: rgba(220, 53, 69, 0.1);
        }
      `}</style>
    </div>
  );
};
