/**
 * Create Test Shop User in Emulator
 */

const admin = require('firebase-admin');

// Point to emulators
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Initialize (check if already initialized)
if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'vavidiaapp' });
}

const auth = admin.auth();
const db = admin.firestore();

async function createTestShopUser() {
  console.log('🔧 Creating test shop user and shop in emulator...\n');

  try {
    // Create shop user auth account
    const userRecord = await auth.createUser({
      email: 'shop@test.com',
      password: 'shop123',
      emailVerified: true,
      displayName: 'Shop Test User'
    });

    console.log('✅ Created shop auth user:', userRecord.email);

    // Create test shop first
    const shopRef = db.collection('shops').doc();
    await shopRef.set({
      id: shopRef.id,
      name: 'Test Shop',
      owner: userRecord.uid,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      financialYearStart: '2025-01-01',
      financialYearEnd: '2025-12-31'
    });

    console.log('✅ Created test shop:', shopRef.id);

    // Create Firestore user document
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      name: 'Shop Test User',
      email: 'shop@test.com',
      role: 'user',
      shopId: shopRef.id,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Created Firestore user document');
    console.log('\n🎉 Test shop user created successfully!');
    console.log('\n📝 Shop User Login credentials:');
    console.log('   Email: shop@test.com');
    console.log('   Password: shop123');
    console.log('   Role: user (shop owner)');
    console.log('   Shop ID:', shopRef.id);
    console.log('\n💡 Use this account to create transactions!');
    console.log('   Admin will receive notifications.\n');

    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('⚠️  User already exists!');
      console.log('\n📝 Login with:');
      console.log('   Email: shop@test.com');
      console.log('   Password: shop123\n');
      process.exit(0);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

createTestShopUser();
