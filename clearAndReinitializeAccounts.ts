import {
    collection,
    doc,
    setDoc,
    writeBatch,
    getDocs,
    deleteDoc,
    query,
    where,
    orderBy,
    getDoc
} from 'firebase/firestore';
import {
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { auth, db } from './firebaseNode.js';
import { MAIN_ACCOUNT_DEFINITIONS } from './constants';
import { Account, User } from './types';

interface ClearAndReinitializeResult {
    success: boolean;
    message: string;
    accountsCleared?: number;
    accountsCreated?: number;
    error?: string;
}

export const clearAndReinitializeAccounts = async (
    adminEmail = 'admin@accounting-app.com',
    adminPassword = 'Admin123!'
): Promise<ClearAndReinitializeResult> => {
    console.log('🧹 Starting account clearing and reinitialization...');

    try {
        // Step 1: Authenticate as admin
        console.log('🔐 Signing in as admin...');
        const adminAuth = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        console.log('✅ Admin authentication successful');

        // Step 2: Get admin user document and fix shopId issue
        console.log('👤 Updating admin user profile...');
        const adminUserRef = doc(db, 'users', adminAuth.user.uid);
        const adminUserDoc = await getDoc(adminUserRef);

        if (adminUserDoc.exists()) {
            const userData = adminUserDoc.data() as User;
            // Fix: Admin users should have access to all shops, but need a default shopId for account creation
            // Get the first available shop
            const shopsSnapshot = await getDocs(collection(db, 'shops'));
            const defaultShopId = shopsSnapshot.docs.length > 0 ? shopsSnapshot.docs[0].id : null;

            if (defaultShopId) {
                const updatedAdminUser: Partial<User> = {
                    ...userData,
                    // Add a default shopId for admin operations, but keep admin role
                    defaultShopId: defaultShopId,
                    role: 'admin'
                };
                await setDoc(adminUserRef, updatedAdminUser, { merge: true });
                console.log('✅ Admin user profile updated with default shopId');
            }
        }

        // Step 3: Clear all existing accounts
        console.log('🗑️ Clearing existing accounts...');
        const accountsSnapshot = await getDocs(collection(db, 'accounts'));
        let accountsCleared = 0;

        if (!accountsSnapshot.empty) {
            const batch = writeBatch(db);
            let batchCount = 0;

            for (const accountDoc of accountsSnapshot.docs) {
                batch.delete(accountDoc.ref);
                batchCount++;

                // Firestore batch has a limit of 500 operations
                if (batchCount >= 500) {
                    await batch.commit();
                    console.log(`  ⚡ Committed batch of ${batchCount} deletions`);
                    const newBatch = writeBatch(db);
                    Object.assign(batch, newBatch);
                    batchCount = 0;
                }
            }

            if (batchCount > 0) {
                await batch.commit();
                console.log(`  ⚡ Committed final batch of ${batchCount} deletions`);
            }

            accountsCleared = accountsSnapshot.docs.length;
            console.log(`✅ Cleared ${accountsCleared} existing accounts`);
        } else {
            console.log('ℹ️ No existing accounts found to clear');
        }

        // Wait for Firestore consistency
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 4: Get all shops for account creation
        console.log('🏪 Getting shops for account creation...');
        const shopsSnapshot = await getDocs(collection(db, 'shops'));
        const shops = shopsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`📍 Found ${shops.length} shops`);

        // Step 5: Create main system accounts for each shop
        console.log('🔄 Creating main system accounts...');
        const batch = writeBatch(db);
        let accountsCreated = 0;
        let batchCount = 0;

        for (const shop of shops) {
            console.log(`  🏪 Creating accounts for shop: ${shop.name || shop.id}`);

            for (const accountDef of MAIN_ACCOUNT_DEFINITIONS) {
                const accountRef = doc(collection(db, 'accounts'));
                const account: Omit<Account, 'id'> = {
                    ...accountDef,
                    shopId: shop.id,
                    isActive: true,
                    openingBalance: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                batch.set(accountRef, account);
                batchCount++;
                accountsCreated++;

                console.log(`    📊 ${accountDef.accountCode}: ${accountDef.name}`);

                // Commit batch if approaching limit
                if (batchCount >= 450) {
                    await batch.commit();
                    console.log(`    ⚡ Committed batch of ${batchCount} account creations`);
                    const newBatch = writeBatch(db);
                    Object.assign(batch, newBatch);
                    batchCount = 0;
                }
            }
        }

        // Commit remaining operations
        if (batchCount > 0) {
            await batch.commit();
            console.log(`  ⚡ Committed final batch of ${batchCount} account creations`);
        }

        console.log(`✅ Created ${accountsCreated} main system accounts`);

        // Step 6: Sign out
        await signOut(auth);
        console.log('🔓 Signed out successfully');

        console.log('🎉 Account clearing and reinitialization completed successfully!');
        console.log('📋 Summary:');
        console.log(`   - Accounts cleared: ${accountsCleared}`);
        console.log(`   - Accounts created: ${accountsCreated}`);
        console.log(`   - Shops processed: ${shops.length}`);
        console.log(`   - Main account types: ${MAIN_ACCOUNT_DEFINITIONS.length}`);

        return {
            success: true,
            message: 'Accounts cleared and reinitialized successfully',
            accountsCleared,
            accountsCreated
        };

    } catch (error) {
        console.error('❌ Account clearing and reinitialization failed:', error);

        // Enhanced error logging
        if (error instanceof Error) {
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack?.substring(0, 500)
            });
        }

        // Firebase-specific error handling
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const firebaseError = error as any;
            console.error('Firebase error:', firebaseError.code, firebaseError.message);

            return {
                success: false,
                error: `Firebase error (${firebaseError.code}): ${firebaseError.message}`
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
};

// Function to run the clearing process
export const runAccountReset = async () => {
    console.log('🚀 Starting account reset process...');

    const result = await clearAndReinitializeAccounts();

    if (result.success) {
        console.log('✅ Account reset completed successfully');
        console.log(`📊 Summary: ${result.accountsCleared} cleared, ${result.accountsCreated} created`);
    } else {
        console.error('❌ Account reset failed:', result.error);
    }

    return result;
};

// Export for direct usage
export default clearAndReinitializeAccounts;