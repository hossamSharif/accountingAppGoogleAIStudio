// Check Firestore emails for admin users
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Read Firebase config from .env or use environment variables
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyBfYLfLEH6w9mwqVgElHWKQ1-VD6z15gHE",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "vavidiaapp.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "vavidiaapp",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "vavidiaapp.firebasestorage.app",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "646948750836",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:646948750836:web:0c2cbbb71a5bb0ef03f1f4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkFirestoreEmails() {
    try {
        console.log('🔍 Checking admin emails in Firestore...\n');

        // Get all admin users
        const q = query(collection(db, 'users'), where('role', '==', 'admin'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log('❌ No admin users found in Firestore');
            return;
        }

        console.log(`Found ${querySnapshot.size} admin user(s):\n`);

        // Also load the auth-users.json we just exported
        const authUsers = JSON.parse(readFileSync('./auth-users.json', 'utf8')).users;

        querySnapshot.forEach((doc) => {
            const userId = doc.id;
            const userData = doc.data();

            console.log(`User ID: ${userId}`);
            console.log(`📄 Firestore Email: ${userData.email}`);
            console.log(`   Name: ${userData.name}`);
            console.log(`   Active: ${userData.isActive}`);

            // Find matching auth user
            const authUser = authUsers.find(u => u.localId === userId);
            if (authUser) {
                console.log(`🔐 Firebase Auth Email: ${authUser.email}`);

                if (authUser.email === userData.email) {
                    console.log(`✅ Emails match - Login should work!`);
                } else {
                    console.log(`❌ MISMATCH DETECTED!`);
                    console.log(`   This is why you can't log in!`);
                    console.log(`   You need to use: ${authUser.email} (Auth email)`);
                    console.log(`   Or sync Auth to: ${userData.email} (Firestore email)`);
                }
            } else {
                console.log(`⚠️  No matching Auth user found!`);
            }

            console.log('\n' + '─'.repeat(60) + '\n');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkFirestoreEmails();
