// Firebase Cloud Messaging Service Worker
// This script runs in the background to handle push notifications
// Version: 2.0.0 - Enhanced cross-browser support and English notifications

console.log('[SW] Firebase Messaging Service Worker v2.0.0 loading...');

// Import Firebase scripts for service worker
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
  console.log('[SW] Firebase scripts loaded successfully');
} catch (error) {
  console.error('[SW] Error loading Firebase scripts:', error);
}

// Firebase configuration (must match your app config)
// Note: These values are safe to expose in client-side code
const firebaseConfig = {
  apiKey: "AIzaSyC9PglQejrYi41ZShGj__FiAd3oxyfbRO0",
  authDomain: "vavidiaapp.firebaseapp.com",
  projectId: "vavidiaapp",
  storageBucket: "vavidiaapp.firebasestorage.app",
  messagingSenderId: "646948750836",
  appId: "1:646948750836:web:549bf4bdcdf380dac5a5a1",
  measurementId: "G-69J0441627"
};

// Initialize Firebase in service worker
try {
  firebase.initializeApp(firebaseConfig);
  console.log('[SW] Firebase initialized successfully');
} catch (error) {
  console.error('[SW] Error initializing Firebase:', error);
}

// Get Firebase Messaging instance
const messaging = firebase.messaging();
console.log('[SW] Firebase Messaging instance obtained');

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message:', payload);

  try {
    // Customize notification - ALL MESSAGES IN ENGLISH
    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new notification in the accounting system',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: payload.data?.notificationId || 'default',
      requireInteraction: true, // Keep notification until user interacts
      data: {
        url: payload.data?.url || '/notifications',
        notificationId: payload.data?.notificationId,
        shopId: payload.data?.shopId,
        logType: payload.data?.logType
      },
      // Use LTR direction for English text
      dir: 'ltr',
      lang: 'en',
      vibrate: [200, 100, 200], // Vibration pattern for mobile devices
      timestamp: Date.now()
    };

    console.log('[SW] Showing notification:', notificationTitle);
    // Show notification
    return self.registration.showNotification(notificationTitle, notificationOptions);
  } catch (error) {
    console.error('[SW] Error showing notification:', error);
    // Fallback notification
    return self.registration.showNotification('New Notification', {
      body: 'You have a new notification',
      icon: '/logo.png'
    });
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  try {
    // Get the URL from notification data
    const urlToOpen = event.notification.data?.url || '/notifications';
    const fullUrl = new URL(urlToOpen, self.location.origin).href;

    console.log('[SW] Opening URL:', fullUrl);

    // Open the URL when notification is clicked
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if there's already a window open
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url === fullUrl && 'focus' in client) {
              console.log('[SW] Focusing existing window');
              return client.focus();
            }
          }
          // If no window is open, open a new one
          if (clients.openWindow) {
            console.log('[SW] Opening new window');
            return clients.openWindow(fullUrl);
          }
        })
        .catch(error => {
          console.error('[SW] Error handling notification click:', error);
        })
    );
  } catch (error) {
    console.error('[SW] Error in notification click handler:', error);
  }
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker v2.0.0 installing...');
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker v2.0.0 activating...');
  event.waitUntil(
    Promise.all([
      // Take control of all clients immediately
      clients.claim(),
      // Clear old caches if any
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName.startsWith('firebase-messaging')) {
              console.log('[SW] Clearing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ]).then(() => {
      console.log('[SW] Service Worker v2.0.0 activated successfully');
    })
  );
});

// Handle fetch events (for debugging)
self.addEventListener('fetch', (event) => {
  // Just pass through, no caching for now
  // This helps with debugging in production
  return;
});

// Handle errors
self.addEventListener('error', (event) => {
  console.error('[SW] Service Worker error:', event.error);
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled promise rejection:', event.reason);
});
