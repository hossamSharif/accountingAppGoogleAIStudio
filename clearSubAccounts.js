import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from './firebaseNode.js';
import { MAIN_ACCOUNT_DEFINITIONS } from './constants';
export const clearSubAccounts = async (adminEmail = 'admin@accounting-app.com', adminPassword = 'Admin123!') => {
    console.log('🧹 Starting sub-accounts clearing (preserving main accounts)...');
    try {
        // Step 1: Authenticate as admin
        console.log('🔐 Signing in as admin...');
        const adminAuth = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        console.log('✅ Admin authentication successful');
        // Step 2: Get all accounts from Firebase
        console.log('📋 Fetching all accounts...');
        const accountsSnapshot = await getDocs(collection(db, 'accounts'));
        const allAccounts = accountsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`📊 Found ${allAccounts.length} total accounts`);
        // Step 3: Identify main account codes that should be preserved
        const mainAccountCodes = MAIN_ACCOUNT_DEFINITIONS.map(account => account.accountCode);
        console.log('🔐 Main account codes to preserve:', mainAccountCodes);
        // Step 4: Separate main accounts from sub-accounts
        const mainAccounts = allAccounts.filter(account => mainAccountCodes.includes(account.accountCode));
        const subAccounts = allAccounts.filter(account => !mainAccountCodes.includes(account.accountCode));
        console.log(`✅ Main accounts identified: ${mainAccounts.length}`);
        console.log(`🗑️ Sub-accounts to delete: ${subAccounts.length}`);
        // Step 5: Display what will be preserved vs deleted
        console.log('\n📋 ACCOUNTS THAT WILL BE PRESERVED (Main System Accounts):');
        mainAccounts.forEach(account => {
            console.log(`  ✅ Keep: ${account.accountCode} - ${account.name} (Shop: ${account.shopId})`);
        });
        console.log('\n🗑️ ACCOUNTS THAT WILL BE DELETED (Sub-accounts):');
        subAccounts.forEach(account => {
            console.log(`  ❌ Delete: ${account.accountCode} - ${account.name} (Shop: ${account.shopId})`);
        });
        // Step 6: Delete sub-accounts only
        if (subAccounts.length === 0) {
            console.log('ℹ️ No sub-accounts found to delete');
            return {
                success: true,
                message: 'No sub-accounts found to delete',
                subAccountsCleared: 0,
                mainAccountsPreserved: mainAccounts.length
            };
        }
        console.log(`\n🚀 Starting deletion of ${subAccounts.length} sub-accounts...`);
        const batch = writeBatch(db);
        let batchCount = 0;
        for (const subAccount of subAccounts) {
            const accountRef = doc(db, 'accounts', subAccount.id);
            batch.delete(accountRef);
            batchCount++;
            console.log(`  🗑️ Queued for deletion: ${subAccount.accountCode} - ${subAccount.name}`);
            // Firestore batch has a limit of 500 operations
            if (batchCount >= 500) {
                await batch.commit();
                console.log(`  ⚡ Committed batch of ${batchCount} deletions`);
                const newBatch = writeBatch(db);
                Object.assign(batch, newBatch);
                batchCount = 0;
            }
        }
        // Commit remaining operations
        if (batchCount > 0) {
            await batch.commit();
            console.log(`  ⚡ Committed final batch of ${batchCount} deletions`);
        }
        // Step 7: Wait for Firestore consistency
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Step 8: Verify results
        console.log('\n🔍 Verifying results...');
        const verificationSnapshot = await getDocs(collection(db, 'accounts'));
        const remainingAccounts = verificationSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        const remainingMainAccounts = remainingAccounts.filter(account => mainAccountCodes.includes(account.accountCode));
        const remainingSubAccounts = remainingAccounts.filter(account => !mainAccountCodes.includes(account.accountCode));
        console.log('\n📊 VERIFICATION RESULTS:');
        console.log(`✅ Main accounts preserved: ${remainingMainAccounts.length}`);
        console.log(`🗑️ Sub-accounts cleared: ${subAccounts.length}`);
        console.log(`⚠️ Remaining sub-accounts: ${remainingSubAccounts.length}`);
        if (remainingSubAccounts.length > 0) {
            console.log('\n⚠️ WARNING: Some sub-accounts still remain:');
            remainingSubAccounts.forEach(account => {
                console.log(`  ⚠️ Still exists: ${account.accountCode} - ${account.name}`);
            });
        }
        // Step 9: Sign out
        await signOut(auth);
        console.log('🔓 Signed out successfully');
        console.log('\n🎉 Sub-accounts clearing completed successfully!');
        console.log('📋 Final Summary:');
        console.log(`   - Sub-accounts cleared: ${subAccounts.length}`);
        console.log(`   - Main accounts preserved: ${remainingMainAccounts.length}`);
        console.log(`   - Total remaining accounts: ${remainingAccounts.length}`);
        return {
            success: true,
            message: 'Sub-accounts cleared successfully, main accounts preserved',
            subAccountsCleared: subAccounts.length,
            mainAccountsPreserved: remainingMainAccounts.length
        };
    }
    catch (error) {
        console.error('❌ Sub-accounts clearing failed:', error);
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
            const firebaseError = error;
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
// Export for direct usage
export default clearSubAccounts;
