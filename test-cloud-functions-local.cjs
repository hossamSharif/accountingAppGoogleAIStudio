/**
 * Local Testing Script for Cloud Functions
 * 
 * Prerequisites:
 * 1. Start Firebase emulators: npm run emulators
 * 2. Make sure .env.local has VITE_USE_EMULATORS=true
 * 3. Run this script: node test-cloud-functions-local.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for local testing
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

admin.initializeApp({ projectId: 'vavidiaapp' });
const db = admin.firestore();

async function setupTestData() {
  console.log('🔧 Setting up test data...\n');

  try {
    // Create test admin user
    const adminUser = {
      id: 'test-admin-1',
      name: 'Admin Test User',
      email: 'admin@test.com',
      role: 'admin',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc('test-admin-1').set(adminUser);
    console.log('✅ Created test admin user');

    // Create test shop user
    const shopUser = {
      id: 'test-user-1',
      name: 'Shop Test User',
      email: 'shop@test.com',
      role: 'user',
      shopId: 'test-shop-1',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc('test-user-1').set(shopUser);
    console.log('✅ Created test shop user');

    // Create test shop
    const shop = {
      id: 'test-shop-1',
      name: 'Test Shop',
      owner: 'test-user-1',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('shops').doc('test-shop-1').set(shop);
    console.log('✅ Created test shop\n');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
  }
}

async function testTransactionNotification() {
  console.log('📝 Testing transaction notification...\n');

  try {
    // Create a transaction (this should trigger onTransactionCreated)
    const transaction = {
      userId: 'test-user-1',
      shopId: 'test-shop-1',
      amount: 500,
      description: 'Test transaction for cloud function',
      type: 'expense',
      category: 'supplies',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const transactionRef = await db.collection('transactions').add(transaction);
    console.log('✅ Created test transaction:', transactionRef.id);

    // Wait for cloud function to process
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if notification was created
    const notifications = await db.collection('notifications')
      .where('userId', '==', 'test-admin-1')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (!notifications.empty) {
      const notification = notifications.docs[0].data();
      console.log('✅ Notification created successfully!');
      console.log('   Message:', notification.message);
      console.log('   Log Type:', notification.logType);
      console.log('   Is Read:', notification.isRead);
    } else {
      console.log('⚠️  No notification found. Check function logs.');
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error testing transaction notification:', error);
  }
}

async function testLogNotification() {
  console.log('📋 Testing log notification...\n');

  try {
    // Create an important log entry (this should trigger onLogCreated)
    const log = {
      userId: 'test-user-1',
      shopId: 'test-shop-1',
      type: 'SHOP_CREATED',
      message: 'متجر جديد تم إنشاؤه للاختبار',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    };

    const logRef = await db.collection('logs').add(log);
    console.log('✅ Created test log:', logRef.id);

    // Wait for cloud function to process
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if notification was created
    const notifications = await db.collection('notifications')
      .where('logType', '==', 'SHOP_CREATED')
      .orderBy('timestamp', 'desc')
      .limit(1)
      .get();

    if (!notifications.empty) {
      const notification = notifications.docs[0].data();
      console.log('✅ Notification created successfully!');
      console.log('   Message:', notification.message);
      console.log('   Log Type:', notification.logType);
    } else {
      console.log('⚠️  No notification found. Check function logs.');
    }

    console.log('');

  } catch (error) {
    console.error('❌ Error testing log notification:', error);
  }
}

async function checkNotifications() {
  console.log('📬 Checking all notifications...\n');

  try {
    const notifications = await db.collection('notifications')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    console.log(`Found ${notifications.size} notification(s):\n`);

    notifications.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.message}`);
      console.log(`   Type: ${data.logType}`);
      console.log(`   User: ${data.userId}`);
      console.log(`   Read: ${data.isRead}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error checking notifications:', error);
  }
}

async function cleanup() {
  console.log('🧹 Cleaning up test data...\n');

  try {
    // Delete test documents
    const collections = ['notifications', 'transactions', 'logs', 'users', 'shops'];

    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      const batch = db.batch();

      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      if (!snapshot.empty) {
        await batch.commit();
        console.log(`✅ Deleted ${snapshot.size} document(s) from ${collectionName}`);
      }
    }

    console.log('\n✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Main test execution
async function runTests() {
  console.log('\n🚀 Starting Cloud Functions Local Tests\n');
  console.log('=' .repeat(50) + '\n');

  await setupTestData();
  await testTransactionNotification();
  await testLogNotification();
  await checkNotifications();

  console.log('=' .repeat(50) + '\n');
  console.log('✅ Tests completed!\n');
  console.log('💡 Tips:');
  console.log('   - Check function logs: firebase functions:log --follow');
  console.log('   - View Emulator UI: http://localhost:4000');
  console.log('   - Run cleanup: node test-cloud-functions-local.js cleanup\n');

  process.exit(0);
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('cleanup')) {
  cleanup().then(() => process.exit(0));
} else {
  runTests();
}
