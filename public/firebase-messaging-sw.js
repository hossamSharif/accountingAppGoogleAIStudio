// Firebase Cloud Messaging Service Worker
// This script runs in the background to handle push notifications

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

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
firebase.initializeApp(firebaseConfig);

// Get Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Customize notification
  const notificationTitle = payload.notification?.title || 'إشعار جديد';
  const notificationOptions = {
    body: payload.notification?.body || 'لديك إشعار جديد في نظام المحاسبة',
    icon: '/vite.svg',
    badge: '/vite.svg',
    tag: payload.data?.notificationId || 'default',
    requireInteraction: true, // Keep notification until user interacts
    data: {
      url: payload.data?.url || '/notifications',
      notificationId: payload.data?.notificationId,
      shopId: payload.data?.shopId,
      logType: payload.data?.logType
    },
    // Add Arabic text direction
    dir: 'rtl',
    lang: 'ar'
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  // Get the URL from notification data
  const urlToOpen = event.notification.data?.url || '/notifications';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  // Open the URL when notification is clicked
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === fullUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installing.');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activating.');
  event.waitUntil(clients.claim());
});
