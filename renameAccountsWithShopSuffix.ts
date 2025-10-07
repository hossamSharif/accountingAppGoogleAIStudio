import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';

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

interface Account {
  id: string;
  name: string;
  shopId: string;
  accountCode: string;
  [key: string]: any;
}

interface Shop {
  id: string;
  name: string;
  [key: string]: any;
}

async function renameAccountsWithShopSuffix() {
  try {
    console.log('🔄 Starting account renaming process...');

    // Step 1: Get all shops
    console.log('📋 Fetching all shops...');
    const shopsSnapshot = await getDocs(collection(db, 'shops'));
    const shops: { [shopId: string]: Shop } = {};

    shopsSnapshot.forEach(doc => {
      shops[doc.id] = { id: doc.id, ...doc.data() } as Shop;
    });

    console.log(`✅ Found ${Object.keys(shops).length} shops`);

    // Step 2: Get all accounts
    console.log('📋 Fetching all accounts...');
    const accountsSnapshot = await getDocs(collection(db, 'accounts'));
    const accounts: Account[] = [];

    accountsSnapshot.forEach(doc => {
      accounts.push({ id: doc.id, ...doc.data() } as Account);
    });

    console.log(`✅ Found ${accounts.length} accounts`);

    // Step 3: Process accounts in batches
    const batch = writeBatch(db);
    let batchCount = 0;
    let updatedCount = 0;
    const MAX_BATCH_SIZE = 500; // Firestore batch limit

    for (const account of accounts) {
      const shop = shops[account.shopId];

      if (!shop) {
        console.warn(`⚠️ Shop not found for account ${account.name} (shopId: ${account.shopId})`);
        continue;
      }

      // Check if account name already has shop suffix
      const shopSuffix = `-${shop.name}`;

      if (account.name.endsWith(shopSuffix)) {
        console.log(`⏭️ Account "${account.name}" already has shop suffix, skipping...`);
        continue;
      }

      // Create new name with shop suffix
      const newName = `${account.name}${shopSuffix}`;
      const newAccountCode = account.accountCode.endsWith(shopSuffix)
        ? account.accountCode
        : `${account.accountCode}${shopSuffix}`;

      console.log(`🔄 Renaming: "${account.name}" → "${newName}"`);
      console.log(`🔄 Account code: "${account.accountCode}" → "${newAccountCode}"`);

      // Add to batch
      const accountRef = doc(db, 'accounts', account.id);
      batch.update(accountRef, {
        name: newName,
        accountCode: newAccountCode
      });

      batchCount++;
      updatedCount++;

      // Execute batch if it reaches the limit
      if (batchCount >= MAX_BATCH_SIZE) {
        console.log(`💾 Committing batch of ${batchCount} updates...`);
        await batch.commit();

        // Create new batch
        const newBatch = writeBatch(db);
        Object.assign(batch, newBatch);
        batchCount = 0;
      }
    }

    // Commit remaining items in batch
    if (batchCount > 0) {
      console.log(`💾 Committing final batch of ${batchCount} updates...`);
      await batch.commit();
    }

    console.log(`✅ Account renaming completed successfully!`);
    console.log(`📊 Total accounts updated: ${updatedCount}`);
    console.log(`📊 Total accounts processed: ${accounts.length}`);

  } catch (error) {
    console.error('❌ Error during account renaming:', error);
    throw error;
  }
}

// Execute the script
if (require.main === module) {
  renameAccountsWithShopSuffix()
    .then(() => {
      console.log('🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { renameAccountsWithShopSuffix };