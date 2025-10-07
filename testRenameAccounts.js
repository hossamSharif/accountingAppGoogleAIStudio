import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testRenameAccountsLogic() {
  try {
    console.log('🧪 Starting dry-run test of account renaming logic...');

    // Step 1: Get all shops
    console.log('📋 Fetching all shops...');
    const shopsSnapshot = await getDocs(collection(db, 'shops'));
    const shops = {};

    shopsSnapshot.forEach(doc => {
      shops[doc.id] = { id: doc.id, ...doc.data() };
    });

    console.log(`✅ Found ${Object.keys(shops).length} shops:`);
    Object.values(shops).forEach(shop => {
      console.log(`   - ${shop.name} (ID: ${shop.id})`);
    });

    // Step 2: Get all accounts
    console.log('\n📋 Fetching all accounts...');
    const accountsSnapshot = await getDocs(collection(db, 'accounts'));
    const accounts = [];

    accountsSnapshot.forEach(doc => {
      accounts.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Found ${accounts.length} accounts`);

    // Step 3: Analyze what would be changed (DRY RUN)
    let wouldUpdate = 0;
    let wouldSkip = 0;
    let orphanedAccounts = 0;

    console.log('\n🔍 Analysis of proposed changes:');
    console.log('================================');

    for (const account of accounts) {
      const shop = shops[account.shopId];

      if (!shop) {
        console.warn(`⚠️ ORPHANED: Account "${account.name}" (ID: ${account.id}) - Shop not found (shopId: ${account.shopId})`);
        orphanedAccounts++;
        continue;
      }

      // Check if account name already has shop suffix
      const shopSuffix = `-${shop.name}`;

      if (account.name.endsWith(shopSuffix)) {
        console.log(`⏭️ SKIP: "${account.name}" (already has suffix for shop "${shop.name}")`);
        wouldSkip++;
        continue;
      }

      // Show what would be changed
      const newName = `${account.name}${shopSuffix}`;
      const newAccountCode = account.accountCode.endsWith(shopSuffix)
        ? account.accountCode
        : `${account.accountCode}${shopSuffix}`;

      console.log(`🔄 WOULD UPDATE:`);
      console.log(`   Account ID: ${account.id}`);
      console.log(`   Shop: ${shop.name}`);
      console.log(`   Name: "${account.name}" → "${newName}"`);
      console.log(`   Code: "${account.accountCode}" → "${newAccountCode}"`);
      console.log('');

      wouldUpdate++;
    }

    // Summary
    console.log('\n📊 DRY RUN SUMMARY:');
    console.log('===================');
    console.log(`Total accounts found: ${accounts.length}`);
    console.log(`Would be updated: ${wouldUpdate}`);
    console.log(`Would be skipped: ${wouldSkip}`);
    console.log(`Orphaned (shop not found): ${orphanedAccounts}`);
    console.log(`Total shops: ${Object.keys(shops).length}`);

    return {
      success: true,
      totalAccounts: accounts.length,
      wouldUpdate,
      wouldSkip,
      orphanedAccounts,
      totalShops: Object.keys(shops).length
    };

  } catch (error) {
    console.error('❌ Error during test run:', error);
    throw error;
  }
}

// Execute the test
testRenameAccountsLogic()
  .then((result) => {
    console.log('\n🎉 Dry run completed successfully!');
    console.log('📋 Results:', result);

    if (result.wouldUpdate > 0) {
      console.log('\n✅ The script is ready to run. Execute with:');
      console.log('   npm run rename-accounts');
    } else {
      console.log('\n💡 No accounts need renaming.');
    }

    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });