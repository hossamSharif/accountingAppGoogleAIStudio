import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC9PglQejrYi41ZShGj__FiAd3oxyfbRO0",
  authDomain: "vavidiaapp.firebaseapp.com",
  projectId: "vavidiaapp",
  storageBucket: "vavidiaapp.firebasestorage.app",
  messagingSenderId: "646948750836",
  appId: "1:646948750836:web:549bf4bdcdf380dac5a5a1",
  measurementId: "G-69J0441627"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
