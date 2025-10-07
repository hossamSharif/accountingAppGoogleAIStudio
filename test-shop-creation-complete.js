// Test script to verify complete shop creation with all fields
// Run this with: node test-shop-creation-complete.js

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs, query, where } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAJlcvJpToqLFOkJLmQqt-lVdG5FjLRkMY",
    authDomain: "accounting-app-9ebf7.firebaseapp.com",
    projectId: "accounting-app-9ebf7",
    storageBucket: "accounting-app-9ebf7.firebasestorage.app",
    messagingSenderId: "537621295614",
    appId: "1:537621295614:web:3da8fbad8e5b1cccd17064",
    measurementId: "G-R26LJJ5DJR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verifyShopFields(shopName) {
    console.log('\n=== Verifying Shop Fields for:', shopName, '===\n');

    try {
        // 1. Find the shop by name
        const shopsQuery = query(collection(db, 'shops'), where('name', '==', shopName));
        const shopsSnapshot = await getDocs(shopsQuery);

        if (shopsSnapshot.empty) {
            console.log('❌ Shop not found with name:', shopName);
            return;
        }

        const shopDoc = shopsSnapshot.docs[0];
        const shopData = shopDoc.data();
        const shopId = shopDoc.id;

        console.log('✅ Shop found with ID:', shopId);
        console.log('\n📋 Shop Details:');
        console.log('  - Name:', shopData.name || '❌ Missing');
        console.log('  - Description:', shopData.description || '⚠️ Empty');
        console.log('  - Business Type:', shopData.businessType || '⚠️ Not set');
        console.log('  - Custom Business Type:', shopData.customBusinessType || '⚠️ Not set');
        console.log('  - Address:', shopData.address || '⚠️ Not set');
        console.log('  - Phone:', shopData.contactPhone || '⚠️ Not set');
        console.log('  - Email:', shopData.contactEmail || '⚠️ Not set');
        console.log('  - Active:', shopData.isActive ? '✅ Yes' : '❌ No');

        // 2. Check for financial year
        console.log('\n💰 Checking Financial Year...');
        const fyQuery = query(collection(db, 'financialYears'), where('shopId', '==', shopId));
        const fySnapshot = await getDocs(fyQuery);

        if (!fySnapshot.empty) {
            const fyData = fySnapshot.docs[0].data();
            console.log('✅ Financial Year found:');
            console.log('  - Name:', fyData.name);
            console.log('  - Opening Stock Value:', fyData.openingStockValue, 'SAR');
            console.log('  - Status:', fyData.status);
            console.log('  - Start Date:', fyData.startDate);
            console.log('  - End Date:', fyData.endDate);

            // 3. Check opening stock account
            if (fyData.openingStockAccountId) {
                const osAccount = await getDoc(doc(db, 'accounts', fyData.openingStockAccountId));
                if (osAccount.exists()) {
                    const osData = osAccount.data();
                    console.log('\n📦 Opening Stock Account:');
                    console.log('  - Name:', osData.name);
                    console.log('  - Opening Balance:', osData.openingBalance, 'SAR');
                    console.log('  - Account Code:', osData.accountCode);
                    console.log('  - Type:', osData.type);
                }
            }
        } else {
            console.log('❌ No financial year found for this shop');
        }

        // 4. Check default accounts created
        console.log('\n📊 Checking Default Accounts...');
        const accountsQuery = query(collection(db, 'accounts'), where('shopId', '==', shopId));
        const accountsSnapshot = await getDocs(accountsQuery);

        console.log('  - Total accounts created:', accountsSnapshot.size);

        const accountTypes = {};
        accountsSnapshot.forEach(doc => {
            const data = doc.data();
            accountTypes[data.type] = (accountTypes[data.type] || 0) + 1;
        });

        console.log('\n  Account types:');
        Object.entries(accountTypes).forEach(([type, count]) => {
            console.log(`    - ${type}: ${count}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Main test function
async function runTests() {
    console.log('=== Shop Creation Verification Test ===');
    console.log('This script verifies that all shop fields are properly saved\n');

    // You can modify this to test with an actual shop name in your database
    const testShopName = 'متجر تجريبي'; // Change this to an actual shop name

    await verifyShopFields(testShopName);

    console.log('\n=== Test Complete ===');
    process.exit(0);
}

// Run the tests
runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});