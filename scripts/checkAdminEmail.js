// Script to check admin email in Firestore and Firebase Auth
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
    readFileSync(join(__dirname, '../serviceAccountKey.json'), 'utf8')
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkAdminEmail() {
    try {
        console.log('🔍 Checking admin email in Firestore and Auth...\n');

        // Get all admin users from Firestore
        const usersSnapshot = await db.collection('users')
            .where('role', '==', 'admin')
            .get();

        if (usersSnapshot.empty) {
            console.log('❌ No admin users found in Firestore');
            return;
        }

        console.log(`Found ${usersSnapshot.size} admin user(s):\n`);

        for (const doc of usersSnapshot.docs) {
            const userId = doc.id;
            const userData = doc.data();

            console.log(`Admin User ID: ${userId}`);
            console.log(`📄 Firestore Email: ${userData.email}`);
            console.log(`   Name: ${userData.name}`);
            console.log(`   Active: ${userData.isActive}`);

            // Check Firebase Auth
            try {
                const authUser = await admin.auth().getUser(userId);
                console.log(`🔐 Firebase Auth Email: ${authUser.email}`);

                if (authUser.email === userData.email) {
                    console.log(`✅ Emails match - Login should work!\n`);
                } else {
                    console.log(`❌ MISMATCH DETECTED!`);
                    console.log(`   Firestore: ${userData.email}`);
                    console.log(`   Auth: ${authUser.email}`);
                    console.log(`   This is why login is failing!\n`);
                }
            } catch (authError) {
                console.log(`❌ Error fetching Auth user: ${authError.message}\n`);
            }

            console.log('─'.repeat(50) + '\n');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

checkAdminEmail();
