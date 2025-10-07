// Test Firebase Connection Script
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

// Initialize Firebase with your config
const firebaseConfig = {
  apiKey: "AIzaSyC9PglQejrYi41ZShGj__FiAd3oxyfbRO0",
  authDomain: "vavidiaapp.firebaseapp.com",
  projectId: "vavidiaapp",
  storageBucket: "vavidiaapp.firebasestorage.app",
  messagingSenderId: "646948750836",
  appId: "1:646948750836:web:549bf4bdcdf380dac5a5a1",
  measurementId: "G-69J0441627"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testFirebaseConnection() {
  console.log('🔥 Testing Firebase Connection...');

  try {
    // Test 1: Check Firebase config
    console.log('📋 Firebase Project ID:', db.app.options.projectId);
    console.log('📋 Auth Domain:', auth.app.options.authDomain);

    // Test 2: Try to read a collection (should work with current rules)
    console.log('\n📊 Testing Firestore access...');
    const testCollection = collection(db, 'users');
    const snapshot = await getDocs(testCollection);
    console.log('✅ Firestore connection successful!');
    console.log(`📊 Users collection has ${snapshot.size} documents`);

    // Test 3: Test authentication
    console.log('\n🔐 Testing Authentication...');

    // Try to create admin user (will fail if exists)
    try {
      const adminUser = await createUserWithEmailAndPassword(
        auth,
        'admin@vavidiaapp.com',
        'Admin123!'
      );
      console.log('✅ Admin user created successfully!');
      console.log('👤 Admin UID:', adminUser.user.uid);

      // Create admin user document
      await setDoc(doc(db, 'users', adminUser.user.uid), {
        email: 'admin@vavidiaapp.com',
        role: 'admin',
        isActive: true,
        firstName: 'System',
        lastName: 'Administrator',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log('✅ Admin user document created in Firestore!');

    } catch (authError) {
      if (authError.code === 'auth/email-already-in-use') {
        console.log('ℹ️ Admin user already exists, trying to sign in...');

        // Try to sign in instead
        const adminSignIn = await signInWithEmailAndPassword(
          auth,
          'admin@vavidiaapp.com',
          'Admin123!'
        );
        console.log('✅ Admin user signed in successfully!');
        console.log('👤 Admin UID:', adminSignIn.user.uid);

        // Check if user document exists
        const userDoc = await getDoc(doc(db, 'users', adminSignIn.user.uid));
        if (!userDoc.exists()) {
          console.log('⚠️ User document missing, creating...');
          await setDoc(doc(db, 'users', adminSignIn.user.uid), {
            email: 'admin@vavidiaapp.com',
            role: 'admin',
            isActive: true,
            firstName: 'System',
            lastName: 'Administrator',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log('✅ Admin user document created!');
        } else {
          console.log('✅ Admin user document exists!');
        }
      } else {
        console.error('❌ Auth error:', authError.message);
      }
    }

    console.log('\n🎉 Firebase setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Go to Firebase Console');
    console.log('2. Deploy the updated firestore.rules');
    console.log('3. Verify admin user exists in Authentication');
    console.log('4. Test login in your app');

  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Check if Firebase project exists');
    console.log('2. Verify API keys in .env.local');
    console.log('3. Enable Authentication in Firebase Console');
    console.log('4. Create Firestore database');
    console.log('5. Deploy firestore.rules');
  }
}

// Run the test
testFirebaseConnection().catch(console.error);