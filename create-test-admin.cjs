/**
 * Create Test Admin User in Emulator
 */

const admin = require('firebase-admin');

// Point to emulators
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

// Initialize
admin.initializeApp({ projectId: 'vavidiaapp' });
const auth = admin.auth();
const db = admin.firestore();

async function createTestAdmin() {
  console.log('🔧 Creating test admin user in emulator...\n');

  try {
    // Create auth user
    const userRecord = await auth.createUser({
      email: 'admin@test.com',
      password: 'admin123',
      emailVerified: true,
      displayName: 'Test Admin'
    });

    console.log('✅ Created auth user:', userRecord.email);

    // Create Firestore user document
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      name: 'Test Admin',
      email: 'admin@test.com',
      role: 'admin',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Created Firestore user document');
    console.log('\n🎉 Test admin created successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: admin@test.com');
    console.log('   Password: admin123');
    console.log('   Role: admin\n');

    process.exit(0);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      console.log('⚠️  User already exists!');
      console.log('\n📝 Login with:');
      console.log('   Email: admin@test.com');
      console.log('   Password: admin123\n');
      process.exit(0);
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

createTestAdmin();
