#!/usr/bin/env node

/**
 * Account Reset Runner
 * This script clears all existing accounts and recreates the main system accounts
 * from constants.ts for all shops.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Immediately Invoked Async Function Expression to handle environment loading
(async () => {
    try {
        // Load environment variables from .env.local FIRST
        const envPath = path.join(__dirname, '.env.local');
        console.log('📁 Loading environment from:', envPath);
        const result = dotenv.config({ path: envPath });

        if (result.error) {
            console.error('❌ Error loading .env.local:', result.error);
            process.exit(1);
        }

        console.log('✅ Environment variables loaded successfully');
        console.log('🔑 Firebase Project ID:', process.env.VITE_FIREBASE_PROJECT_ID);

        if (!process.env.VITE_FIREBASE_PROJECT_ID) {
            console.error('❌ Firebase Project ID not found in environment variables');
            process.exit(1);
        }

        // Now import dependent modules after environment is loaded
        const { clearAndReinitializeAccounts } = await import('./clearAndReinitializeAccounts.js');

        console.log('🚀 Account Reset Utility');
        console.log('='.repeat(50));
        console.log('This will:');
        console.log('  1. Clear ALL existing accounts from Firebase');
        console.log('  2. Recreate main system accounts for all shops');
        console.log('  3. Fix admin user profile for account creation');
        console.log('='.repeat(50));

        // Give user a moment to see what's happening
        console.log('⏳ Starting in 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const resetResult = await clearAndReinitializeAccounts();

        if (resetResult.success) {
            console.log('\n✅ SUCCESS: Account reset completed!');
            console.log(`📊 ${resetResult.accountsCleared || 0} accounts cleared`);
            console.log(`📊 ${resetResult.accountsCreated || 0} accounts created`);
            console.log('\n🎯 Next Steps:');
            console.log('  1. Run: npm run dev');
            console.log('  2. Login as admin: admin@accounting-app.com / Admin123!');
            console.log('  3. Test account creation in Charts of Accounts');
        } else {
            console.log('\n❌ FAILED: Account reset failed');
            console.log(`Error: ${resetResult.error}`);
            process.exit(1);
        }
    } catch (error) {
        console.error('\n💥 CRITICAL ERROR:', error);
        process.exit(1);
    }
})();