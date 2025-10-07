#!/usr/bin/env node

/**
 * Sub-Account Clear Runner
 * This script clears all sub-accounts while preserving the main system accounts
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
        const { clearSubAccounts } = await import('./clearSubAccounts.js');

        console.log('🧹 Sub-Account Clear Utility');
        console.log('='.repeat(50));
        console.log('This will:');
        console.log('  1. Identify and preserve all main system accounts (10 types)');
        console.log('  2. Delete ALL sub-accounts created under main accounts');
        console.log('  3. Keep the core account structure intact');
        console.log('  4. Clear shop-specific customizations');
        console.log('='.repeat(50));
        console.log('');
        console.log('⚠️  IMPORTANT: This will delete all shop sub-accounts!');
        console.log('✅ SAFE: Main system accounts will be preserved');
        console.log('');

        // Give user a moment to see what's happening
        console.log('⏳ Starting in 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const clearResult = await clearSubAccounts();

        if (clearResult.success) {
            console.log('\n✅ SUCCESS: Sub-account clearing completed!');
            console.log(`🗑️ ${clearResult.subAccountsCleared || 0} sub-accounts cleared`);
            console.log(`✅ ${clearResult.mainAccountsPreserved || 0} main accounts preserved`);
            console.log('\n🎯 Results:');
            console.log('  ✅ Main system accounts intact');
            console.log('  🧹 All shop sub-accounts removed');
            console.log('  🚀 Ready for fresh sub-account creation');
        } else {
            console.log('\n❌ FAILED: Sub-account clearing failed');
            console.log(`Error: ${clearResult.error}`);
            process.exit(1);
        }
    } catch (error) {
        console.error('\n💥 CRITICAL ERROR:', error);
        process.exit(1);
    }
})();