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

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Enable Firestore Offline Persistence
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

// Initialize Firebase Cloud Messaging (only if supported)
let messaging: any = null;
let messagingInitialized = false;

const initializeMessaging = async () => {
  if (typeof window === 'undefined' || messagingInitialized) return;

  try {
    const supported = await isMessagingSupported();
    if (supported) {
      messaging = getMessaging(app);
      messagingInitialized = true;
      console.log('✅ Firebase Messaging initialized');
    } else {
      console.warn('⚠️ Push notifications are not supported in this browser');
    }
  } catch (err) {
    console.error('❌ Error initializing Firebase Messaging:', err);
  }
};

// Initialize messaging immediately
if (typeof window !== 'undefined') {
  initializeMessaging();
}

// Connect to emulators if in development mode
const USE_EMULATORS = import.meta.env.VITE_USE_EMULATORS === 'true';

if (USE_EMULATORS) {
  console.log('🔧 Connecting to Firebase Emulators...');

  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);

  console.log('✅ Connected to Firebase Emulators');
  console.log('   - Auth: http://localhost:9099');
  console.log('   - Firestore: http://localhost:8080');
  console.log('   - Functions: http://localhost:5001');
  console.log('   - UI: http://localhost:4000');
}

export { auth, db, functions, messaging };

// VAPID key for Web Push (get from Firebase Console -> Project Settings -> Cloud Messaging)
// Add to .env file as VITE_FIREBASE_VAPID_KEY
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Log VAPID key status on startup
if (typeof window !== 'undefined') {
  if (VAPID_KEY) {
    console.log('✅ VAPID Key loaded:', VAPID_KEY.substring(0, 10) + '...');
  } else {
    console.error('❌ VAPID Key NOT FOUND! Add VITE_FIREBASE_VAPID_KEY to .env file');
  }
}
