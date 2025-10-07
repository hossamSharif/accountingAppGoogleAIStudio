import { useEffect, useState, useCallback } from 'react';
import { getToken, onMessage, type Messaging } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { messaging, VAPID_KEY, db } from '../firebase';
import { User } from '../types';

export interface PushNotificationState {
  permission: NotificationPermission;
  token: string | null;
  error: string | null;
  isLoading: boolean;
  isSupported: boolean;
}

export const usePushNotifications = (currentUser: User | null) => {
  const [state, setState] = useState<PushNotificationState>({
    permission: 'default',
    token: null,
    error: null,
    isLoading: false,
    isSupported: false
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      console.log('🔍 Checking push notification support...');
      console.log('  - Notification API:', 'Notification' in window);
      console.log('  - Service Worker API:', 'serviceWorker' in navigator);
      console.log('  - Firebase Messaging:', messaging !== null);
      console.log('  - VAPID Key:', VAPID_KEY ? '✅ Present' : '❌ Missing');

      const supported =
        'Notification' in window &&
        'serviceWorker' in navigator &&
        messaging !== null;

      console.log('  - Overall Support:', supported ? '✅ Supported' : '❌ Not Supported');

      setState(prev => ({ ...prev, isSupported: supported }));

      if (supported) {
        const permission = Notification.permission;
        console.log('  - Current Permission:', permission);
        setState(prev => ({
          ...prev,
          permission
        }));
      }
    };

    // Add small delay to ensure messaging is initialized
    const timer = setTimeout(checkSupport, 500);
    return () => clearTimeout(timer);
  }, []);

  // Request notification permission and get FCM token
  const requestPermission = useCallback(async () => {
    if (!state.isSupported || !messaging || !currentUser) {
      console.warn('Push notifications not supported or user not logged in');
      return null;
    }

    if (!VAPID_KEY) {
      console.error('VAPID key not configured. Please add VITE_FIREBASE_VAPID_KEY to .env file');
      setState(prev => ({
        ...prev,
        error: 'VAPID key not configured'
      }));
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission === 'granted') {
        console.log('✅ Notification permission granted');

        // Register service worker
        const registration = await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js',
          { scope: '/' }
        );

        await navigator.serviceWorker.ready;
        console.log('✅ Service worker registered');

        // Get FCM token
        const token = await getToken(messaging as Messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });

        if (token) {
          console.log('✅ FCM token obtained:', token.substring(0, 20) + '...');

          // Save token to user document in Firestore
          const userRef = doc(db, 'users', currentUser.id);
          await updateDoc(userRef, {
            fcmToken: token,
            fcmTokenUpdatedAt: new Date().toISOString()
          });

          console.log('✅ FCM token saved to user document');

          setState(prev => ({
            ...prev,
            token,
            isLoading: false,
            error: null
          }));

          return token;
        } else {
          throw new Error('No FCM token received');
        }
      } else {
        console.warn('⚠️ Notification permission denied');
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Notification permission denied'
        }));
        return null;
      }
    } catch (error: any) {
      console.error('❌ Error getting FCM token:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to get notification permission'
      }));
      return null;
    }
  }, [state.isSupported, currentUser]);

  // Listen for foreground messages (when app is open)
  useEffect(() => {
    if (!messaging || !currentUser) return;

    console.log('📬 Setting up foreground message listener');

    const unsubscribe = onMessage(messaging as Messaging, (payload) => {
      console.log('📨 Foreground message received:', payload);

      // Show notification even when app is open
      const notificationTitle = payload.notification?.title || 'إشعار جديد';
      const notificationOptions = {
        body: payload.notification?.body || 'لديك إشعار جديد',
        icon: '/vite.svg',
        tag: payload.data?.notificationId || 'default',
        data: payload.data,
        dir: 'rtl' as NotificationDirection,
        lang: 'ar'
      };

      if (Notification.permission === 'granted') {
        new Notification(notificationTitle, notificationOptions);
      }

      // You can also show a toast or update UI here
      // For example: showToast(payload.notification?.body, 'info');
    });

    return () => {
      console.log('🔌 Unsubscribing from foreground messages');
      unsubscribe();
    };
  }, [messaging, currentUser]);

  // Auto-request permission for admin users on first login
  useEffect(() => {
    if (
      currentUser &&
      currentUser.role === 'admin' &&
      state.isSupported &&
      state.permission === 'default' &&
      !currentUser.fcmToken
    ) {
      console.log('🔔 Auto-requesting notification permission for admin user');
      // Don't auto-request, let user decide via the prompt
      // requestPermission();
    }
  }, [currentUser, state.isSupported, state.permission]);

  return {
    ...state,
    requestPermission,
    hasPermission: state.permission === 'granted'
  };
};
