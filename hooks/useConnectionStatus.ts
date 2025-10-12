import { useState, useEffect, useCallback } from 'react';

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
        isFirestoreConnected: hasInternet,
        lastChecked: new Date()
      }));
      console.log('🌐 Connection restored');
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        hasInternetAccess: false,
        isFirestoreConnected: false,
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

  // Periodic internet check (every 30 seconds when online)
  useEffect(() => {
    if (!status.isOnline) return;

    const intervalId = setInterval(async () => {
      const hasInternet = await checkInternetAccess();
      setStatus(prev => ({
        ...prev,
        hasInternetAccess: hasInternet,
        isFirestoreConnected: hasInternet,
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
      isFirestoreConnected: hasInternet,
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
