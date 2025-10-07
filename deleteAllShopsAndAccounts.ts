import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc, query, where } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function deleteAllShopsAndRelatedData() {
    try {
        console.log('🚨 Starting deletion of all shops and related data...\n');

        // Step 1: Get all shops
        console.log('📋 Step 1: Fetching all shops...');
        const shopsSnapshot = await getDocs(collection(db, 'shops'));
        const shops = shopsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`   Found ${shops.length} shop(s)\n`);

        if (shops.length === 0) {
            console.log('✅ No shops found. Nothing to delete.');
            return;
        }

        // Step 2: Delete related data for each shop
        for (const shop of shops) {
            console.log(`🏪 Processing shop: ${shop.name} (ID: ${shop.id})`);

            // Delete accounts
            console.log('   📊 Deleting accounts...');
            const accountsQuery = query(collection(db, 'accounts'), where('shopId', '==', shop.id));
            const accountsSnapshot = await getDocs(accountsQuery);
            console.log(`   Found ${accountsSnapshot.size} account(s)`);

            if (accountsSnapshot.size > 0) {
                // Delete in batches (Firestore limit is 500 operations per batch)
                const accountBatches = [];
                let currentBatch = writeBatch(db);
                let operationCount = 0;

                accountsSnapshot.docs.forEach((accountDoc) => {
                    currentBatch.delete(accountDoc.ref);
                    operationCount++;

                    if (operationCount === 500) {
                        accountBatches.push(currentBatch);
                        currentBatch = writeBatch(db);
                        operationCount = 0;
                    }
                });

                if (operationCount > 0) {
                    accountBatches.push(currentBatch);
                }

                for (let i = 0; i < accountBatches.length; i++) {
                    await accountBatches[i].commit();
                    console.log(`   ✓ Deleted batch ${i + 1}/${accountBatches.length} of accounts`);
                }
            }

            // Delete transactions
            console.log('   💰 Deleting transactions...');
            const transactionsQuery = query(collection(db, 'transactions'), where('shopId', '==', shop.id));
            const transactionsSnapshot = await getDocs(transactionsQuery);
            console.log(`   Found ${transactionsSnapshot.size} transaction(s)`);

            if (transactionsSnapshot.size > 0) {
                const transactionBatches = [];
                let currentBatch = writeBatch(db);
                let operationCount = 0;

                transactionsSnapshot.docs.forEach((transactionDoc) => {
                    currentBatch.delete(transactionDoc.ref);
                    operationCount++;

                    if (operationCount === 500) {
                        transactionBatches.push(currentBatch);
                        currentBatch = writeBatch(db);
                        operationCount = 0;
                    }
                });

                if (operationCount > 0) {
                    transactionBatches.push(currentBatch);
                }

                for (let i = 0; i < transactionBatches.length; i++) {
                    await transactionBatches[i].commit();
                    console.log(`   ✓ Deleted batch ${i + 1}/${transactionBatches.length} of transactions`);
                }
            }

            // Delete financial years
            console.log('   📅 Deleting financial years...');
            const financialYearsQuery = query(collection(db, 'financialYears'), where('shopId', '==', shop.id));
            const financialYearsSnapshot = await getDocs(financialYearsQuery);
            console.log(`   Found ${financialYearsSnapshot.size} financial year(s)`);

            if (financialYearsSnapshot.size > 0) {
                const fyBatch = writeBatch(db);
                financialYearsSnapshot.docs.forEach((fyDoc) => {
                    fyBatch.delete(fyDoc.ref);
                });
                await fyBatch.commit();
                console.log(`   ✓ Deleted financial years`);
            }

            // Delete transaction templates
            console.log('   📝 Deleting transaction templates...');
            const templatesQuery = query(collection(db, 'transactionTemplates'), where('shopId', '==', shop.id));
            const templatesSnapshot = await getDocs(templatesQuery);
            console.log(`   Found ${templatesSnapshot.size} template(s)`);

            if (templatesSnapshot.size > 0) {
                const templateBatch = writeBatch(db);
                templatesSnapshot.docs.forEach((templateDoc) => {
                    templateBatch.delete(templateDoc.ref);
                });
                await templateBatch.commit();
                console.log(`   ✓ Deleted templates`);
            }

            // Delete logs related to shop
            console.log('   📋 Deleting logs...');
            const logsQuery = query(collection(db, 'logs'), where('shopId', '==', shop.id));
            const logsSnapshot = await getDocs(logsQuery);
            console.log(`   Found ${logsSnapshot.size} log(s)`);

            if (logsSnapshot.size > 0) {
                const logBatches = [];
                let currentBatch = writeBatch(db);
                let operationCount = 0;

                logsSnapshot.docs.forEach((logDoc) => {
                    currentBatch.delete(logDoc.ref);
                    operationCount++;

                    if (operationCount === 500) {
                        logBatches.push(currentBatch);
                        currentBatch = writeBatch(db);
                        operationCount = 0;
                    }
                });

                if (operationCount > 0) {
                    logBatches.push(currentBatch);
                }

                for (let i = 0; i < logBatches.length; i++) {
                    await logBatches[i].commit();
                    console.log(`   ✓ Deleted batch ${i + 1}/${logBatches.length} of logs`);
                }
            }

            // Delete notifications related to shop
            console.log('   🔔 Deleting notifications...');
            const notificationsQuery = query(collection(db, 'notifications'), where('shopId', '==', shop.id));
            const notificationsSnapshot = await getDocs(notificationsQuery);
            console.log(`   Found ${notificationsSnapshot.size} notification(s)`);

            if (notificationsSnapshot.size > 0) {
                const notificationBatch = writeBatch(db);
                notificationsSnapshot.docs.forEach((notificationDoc) => {
                    notificationBatch.delete(notificationDoc.ref);
                });
                await notificationBatch.commit();
                console.log(`   ✓ Deleted notifications`);
            }

            // Update users to remove shopId reference
            console.log('   👥 Updating users (removing shop reference)...');
            const usersQuery = query(collection(db, 'users'), where('shopId', '==', shop.id));
            const usersSnapshot = await getDocs(usersQuery);
            console.log(`   Found ${usersSnapshot.size} user(s)`);

            if (usersSnapshot.size > 0) {
                const userBatch = writeBatch(db);
                usersSnapshot.docs.forEach((userDoc) => {
                    userBatch.update(userDoc.ref, { shopId: null });
                });
                await userBatch.commit();
                console.log(`   ✓ Updated users`);
            }

            console.log(`✅ Completed processing shop: ${shop.name}\n`);
        }

        // Step 3: Delete all shops
        console.log('🏪 Step 3: Deleting all shops...');
        const shopBatch = writeBatch(db);
        shopsSnapshot.docs.forEach((shopDoc) => {
            shopBatch.delete(shopDoc.ref);
        });
        await shopBatch.commit();
        console.log(`✅ Deleted ${shops.length} shop(s)\n`);

        console.log('✅✅✅ ALL SHOPS AND RELATED DATA DELETED SUCCESSFULLY! ✅✅✅');

    } catch (error) {
        console.error('❌ Error during deletion:', error);
        throw error;
    }
}

// Run the deletion script
deleteAllShopsAndRelatedData()
    .then(() => {
        console.log('\n🎉 Script completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Script failed:', error);
        process.exit(1);
    });
