// Migration Script: Add Missing Purchase Accounts to Existing Shops
// Run this script once to update existing shops with the new purchase accounts

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { ShopService } from './services/ShopService';

// Firebase configuration (hardcoded for migration script)
const firebaseConfig = {
  apiKey: "AIzaSyC9PglQejrYi41ZShGj__FiAd3oxyfbRO0",
  authDomain: "vavidiaapp.firebaseapp.com",
  projectId: "vavidiaapp",
  storageBucket: "vavidiaapp.firebasestorage.app",
  messagingSenderId: "646948750836",
  appId: "1:646948750836:web:549bf4bdcdf380dac5a5a1",
  measurementId: "G-69J0441627"
};

// Initialize Firebase for migration
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function runMigration() {
    console.log('🚀 Starting Purchase Accounts Migration');
    console.log('=====================================');

    try {
        // Authenticate as admin (required for migration)
        console.log('🔐 Authenticating as admin...');
        await signInWithEmailAndPassword(auth, 'admin@vavidiaapp.com', 'Admin123!');
        console.log('✅ Admin authentication successful');

        // Run the migration
        await ShopService.addMissingAccountsToExistingShops();

        console.log('🎉 Migration completed successfully!');
        console.log('');
        console.log('📋 What was added:');
        console.log('- المشتريات (5100) - Main Purchases Account');
        console.log('- مشتريات قطع الغيار (5101)');
        console.log('- مشتريات الزيوت والسوائل (5102)');
        console.log('- مشتريات الإطارات (5103)');
        console.log('- مشتريات أخرى (5104)');
        console.log('- Enhanced sub-accounts for Sales and Expenses');
        console.log('');
        console.log('✅ All existing shops now have complete account structure!');

    } catch (error: any) {
        console.error('❌ Migration failed:', error);
        console.error('Please check your Firebase configuration and try again.');
    } finally {
        // Sign out
        try {
            await auth.signOut();
            console.log('🔐 Signed out successfully');
        } catch (e) {
            console.warn('Warning: Could not sign out');
        }
    }
}

// Instructions for running this migration
console.log('📋 MIGRATION INSTRUCTIONS:');
console.log('1. Make sure your Firebase project is configured');
console.log('2. Ensure admin user exists: admin@vavidiaapp.com');
console.log('3. Run this script: npm run migrate-purchases');
console.log('');

// Run migration if called directly
if (require.main === module) {
    runMigration().catch(console.error);
}

export { runMigration };