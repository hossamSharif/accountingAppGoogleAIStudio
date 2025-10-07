// Test script for Cloud Functions
// Run this after deploying functions to verify they work correctly

const admin = require('firebase-admin');
const serviceAccount = require('../path-to-your-service-account-key.json'); // Update this path

// Initialize Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://your-project-id.firebaseio.com' // Update with your project ID
});

const db = admin.firestore();

// Test data
const testShopId = 'test-shop-' + Date.now();
const testUserId = 'test-user-' + Date.now();
const testAdminId = 'test-admin-' + Date.now();

async function setupTestData() {
    console.log('Setting up test data...');

    // Create test admin user
    await db.collection('users').doc(testAdminId).set({
        id: testAdminId,
        name: 'Test Admin',
        email: 'admin@test.com',
        role: 'admin',
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create test shop user
    await db.collection('users').doc(testUserId).set({
        id: testUserId,
        name: 'Test Shop User',
        email: 'shop@test.com',
        role: 'user',
        shopId: testShopId,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create test shop
    await db.collection('shops').doc(testShopId).set({
        id: testShopId,
        name: 'Test Shop',
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Test data created successfully');
}

async function testTransactionNotification() {
    console.log('\nTesting transaction notification...');

    // Create a test transaction
    const transactionRef = await db.collection('transactions').add({
        userId: testUserId,
        shopId: testShopId,
        amount: 1000,
        description: 'Test transaction',
        type: 'income',
        date: new Date().toISOString(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Created test transaction: ${transactionRef.id}`);

    // Wait for Cloud Function to process
    console.log('Waiting for Cloud Function to process (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if notification was created
    const notifications = await db.collection('notifications')
        .where('userId', '==', testAdminId)
        .where('shopId', '==', testShopId)
        .get();

    if (!notifications.empty) {
        console.log(`✓ Notification created successfully!`);
        notifications.forEach(doc => {
            console.log(`  - ${doc.data().message}`);
        });
    } else {
        console.log('✗ No notification found. Check function logs for errors.');
    }
}

async function testLogNotification() {
    console.log('\nTesting log notification for important event...');

    // Create a test log entry
    const logRef = await db.collection('logs').add({
        userId: testUserId,
        shopId: testShopId,
        type: 'SHOP_CREATED', // Important event type
        message: 'Test shop was created',
        timestamp: new Date().toISOString()
    });

    console.log(`Created test log: ${logRef.id}`);

    // Wait for Cloud Function to process
    console.log('Waiting for Cloud Function to process (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if notification was created
    const notifications = await db.collection('notifications')
        .where('userId', '==', testAdminId)
        .where('logType', '==', 'SHOP_CREATED')
        .get();

    if (!notifications.empty) {
        console.log(`✓ Log notification created successfully!`);
        notifications.forEach(doc => {
            console.log(`  - ${doc.data().message}`);
        });
    } else {
        console.log('✗ No log notification found. Check function logs for errors.');
    }
}

async function testNotificationQueue() {
    console.log('\nTesting notification queue...');

    // Add item to notification queue
    const queueRef = await db.collection('notificationQueue').add({
        type: 'ADMIN_NOTIFICATION',
        originatingUserId: testUserId,
        shopId: testShopId,
        message: 'Test queue notification',
        logType: 'USER_ACTION',
        processed: false,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`Created queue item: ${queueRef.id}`);

    // Wait for Cloud Function to process
    console.log('Waiting for Cloud Function to process (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check if queue item was processed
    const queueItem = await queueRef.get();
    if (queueItem.data().processed) {
        console.log('✓ Queue item processed successfully!');

        // Check if notification was created
        const notifications = await db.collection('notifications')
            .where('userId', '==', testAdminId)
            .where('message', '==', 'Test queue notification')
            .get();

        if (!notifications.empty) {
            console.log('✓ Notification from queue created successfully!');
        } else {
            console.log('✗ Queue processed but no notification found.');
        }
    } else {
        console.log('✗ Queue item not processed. Check function logs for errors.');
    }
}

async function cleanupTestData() {
    console.log('\nCleaning up test data...');

    try {
        // Delete test users
        await db.collection('users').doc(testUserId).delete();
        await db.collection('users').doc(testAdminId).delete();

        // Delete test shop
        await db.collection('shops').doc(testShopId).delete();

        // Delete test transactions
        const transactions = await db.collection('transactions')
            .where('shopId', '==', testShopId)
            .get();
        const batch1 = db.batch();
        transactions.forEach(doc => batch1.delete(doc.ref));
        await batch1.commit();

        // Delete test logs
        const logs = await db.collection('logs')
            .where('shopId', '==', testShopId)
            .get();
        const batch2 = db.batch();
        logs.forEach(doc => batch2.delete(doc.ref));
        await batch2.commit();

        // Delete test notifications
        const notifications = await db.collection('notifications')
            .where('shopId', '==', testShopId)
            .get();
        const batch3 = db.batch();
        notifications.forEach(doc => batch3.delete(doc.ref));
        await batch3.commit();

        console.log('Test data cleaned up successfully');
    } catch (error) {
        console.error('Error cleaning up test data:', error);
    }
}

async function runTests() {
    console.log('========================================');
    console.log('Cloud Functions Test Suite');
    console.log('========================================');

    try {
        await setupTestData();
        await testTransactionNotification();
        await testLogNotification();
        await testNotificationQueue();
        await cleanupTestData();

        console.log('\n========================================');
        console.log('All tests completed!');
        console.log('========================================');
        console.log('\nNext steps:');
        console.log('1. Check Firebase Console for function logs');
        console.log('2. Monitor function performance metrics');
        console.log('3. Test with real users in your app');
    } catch (error) {
        console.error('Test failed:', error);
    }

    process.exit(0);
}

// Run tests
runTests();