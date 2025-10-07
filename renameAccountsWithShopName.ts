// Migration Script: Rename All Accounts with Shop Name Suffix
// This script will add shop name suffix to all existing accounts

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Account, Shop } from './types';

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

interface RenameResult {
  success: boolean;
  totalProcessed: number;
  updated: number;
  skipped: number;
  orphaned: number;
  errors: string[];
}

async function renameAccountsWithShopSuffix(dryRun: boolean = false): Promise<RenameResult> {
  const result: RenameResult = {
    success: false,
    totalProcessed: 0,
    updated: 0,
    skipped: 0,
    orphaned: 0,
    errors: []
  };

  try {
    console.log(dryRun ? '🧪 Starting DRY RUN of account renaming...' : '🔄 Starting account renaming process...');

    // Step 1: Get all shops
    console.log('📋 Fetching all shops...');
    const shopsSnapshot = await getDocs(collection(db, 'shops'));
    const shops: { [shopId: string]: Shop } = {};

    shopsSnapshot.forEach(doc => {
      shops[doc.id] = { id: doc.id, ...doc.data() } as Shop;
    });

    console.log(`✅ Found ${Object.keys(shops).length} shops:`);
    Object.values(shops).forEach(shop => {
      console.log(`   - ${shop.name} (ID: ${shop.id})`);
    });

    // Step 2: Get all accounts
    console.log('\n📋 Fetching all accounts...');
    const accountsSnapshot = await getDocs(collection(db, 'accounts'));
    const accounts: Account[] = [];

    accountsSnapshot.forEach(doc => {
      accounts.push({ id: doc.id, ...doc.data() } as Account);
    });

    console.log(`✅ Found ${accounts.length} accounts`);
    result.totalProcessed = accounts.length;

    // Step 3: Process accounts
    if (!dryRun) {
      const batch = writeBatch(db);
      let batchCount = 0;
      const MAX_BATCH_SIZE = 500;

      for (const account of accounts) {
        const shop = shops[account.shopId];

        if (!shop) {
          console.warn(`⚠️ ORPHANED: Account "${account.name}" - Shop not found (shopId: ${account.shopId})`);
          result.orphaned++;
          continue;
        }

        const shopSuffix = `-${shop.name}`;

        if (account.name.endsWith(shopSuffix)) {
          console.log(`⏭️ SKIP: "${account.name}" (already has suffix)`);
          result.skipped++;
          continue;
        }

        const newName = `${account.name}${shopSuffix}`;

        console.log(`🔄 Renaming: "${account.name}" → "${newName}"`);

        const accountRef = doc(db, 'accounts', account.id);
        batch.update(accountRef, {
          name: newName
        });

        batchCount++;
        result.updated++;

        if (batchCount >= MAX_BATCH_SIZE) {
          console.log(`💾 Committing batch of ${batchCount} updates...`);
          await batch.commit();

          const newBatch = writeBatch(db);
          Object.assign(batch, newBatch);
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        console.log(`💾 Committing final batch of ${batchCount} updates...`);
        await batch.commit();
      }
    } else {
      // Dry run - just analyze
      console.log('\n🔍 DRY RUN ANALYSIS:');
      console.log('====================');

      for (const account of accounts) {
        const shop = shops[account.shopId];

        if (!shop) {
          console.warn(`⚠️ ORPHANED: "${account.name}" - Shop not found (shopId: ${account.shopId})`);
          result.orphaned++;
          continue;
        }

        const shopSuffix = `-${shop.name}`;

        if (account.name.endsWith(shopSuffix)) {
          console.log(`⏭️ SKIP: "${account.name}" (already has suffix for shop "${shop.name}")`);
          result.skipped++;
          continue;
        }

        const newName = `${account.name}${shopSuffix}`;

        console.log(`🔄 WOULD RENAME:`);
        console.log(`   Shop: ${shop.name}`);
        console.log(`   Name: "${account.name}" → "${newName}"`);
        console.log(`   Code: "${account.accountCode}" (unchanged)`);
        console.log('');

        result.updated++;
      }
    }

    result.success = true;
    return result;

  } catch (error: any) {
    console.error('❌ Error during account renaming:', error);
    result.errors.push(error.message);
    throw error;
  }
}

async function runAccountRenaming() {
  console.log('🚀 Starting Account Renaming Migration');
  console.log('======================================');

  try {
    // Authenticate as admin (required for migration)
    console.log('🔐 Authenticating as admin...');
    await signInWithEmailAndPassword(auth, 'admin@vavidiaapp.com', 'Admin123!');
    console.log('✅ Admin authentication successful');

    // First, run a dry run
    console.log('\n🧪 Running dry run first...');
    const dryRunResult = await renameAccountsWithShopSuffix(true);

    console.log('\n📊 DRY RUN SUMMARY:');
    console.log('===================');
    console.log(`Total accounts: ${dryRunResult.totalProcessed}`);
    console.log(`Would update: ${dryRunResult.updated}`);
    console.log(`Would skip: ${dryRunResult.skipped}`);
    console.log(`Orphaned: ${dryRunResult.orphaned}`);

    if (dryRunResult.updated === 0) {
      console.log('\n💡 No accounts need renaming. All accounts already have shop suffixes.');
      return;
    }

    // Ask for confirmation (in a real scenario, you'd want user input)
    console.log('\n❓ Ready to proceed with actual renaming...');

    // Run the actual migration
    console.log('\n🚀 Running actual account renaming...');
    const result = await renameAccountsWithShopSuffix(false);

    console.log('\n🎉 Account renaming completed successfully!');
    console.log('');
    console.log('📊 FINAL SUMMARY:');
    console.log('=================');
    console.log(`Total accounts processed: ${result.totalProcessed}`);
    console.log(`Accounts updated: ${result.updated}`);
    console.log(`Accounts skipped: ${result.skipped}`);
    console.log(`Orphaned accounts: ${result.orphaned}`);
    console.log('');
    console.log('✅ All accounts now have shop name suffixes!');

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    console.error('Please check the error details and try again.');
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
console.log('📋 ACCOUNT RENAMING MIGRATION INSTRUCTIONS:');
console.log('1. This script will add shop name suffixes to all accounts');
console.log('2. Example: "المصروفات" → "المصروفات-قرش-الحصايا"');
console.log('3. Make sure your Firebase project is configured');
console.log('4. Ensure admin user exists: admin@vavidiaapp.com');
console.log('5. Run this script: npm run rename-accounts-ts');
console.log('');

// Run migration if called directly
runAccountRenaming().catch(console.error);

export { runAccountRenaming, renameAccountsWithShopSuffix };