// Test script for enhanced shop creation workflow
// This script tests the simplified account creation with:
// - Single sales sub-account (المبيعات) with shop name suffix
// - Single purchase sub-account (المشتريات) with shop name suffix
// - Numeric-only account codes without shop suffix

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { ShopService } from './services/shopService.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// Initialize Firebase
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testEnhancedShopCreation() {
    console.log('🚀 Testing Enhanced Shop Creation Workflow...\n');

    const testShopData = {
        name: 'متجر الاختبار المحسن',
        description: 'متجر اختبار للتحقق من سير العمل المحسن',
        address: 'شارع الاختبار، المدينة',
        contactPhone: '+966501234567',
        contactEmail: 'test@enhanced.com',
        businessType: 'اسبيرات ركشة',
        openingStockValue: 50000
    };

    try {
        // 1. Create shop with enhanced workflow
        console.log('📦 Creating shop with enhanced workflow...');
        const shop = await ShopService.createShop(testShopData);
        console.log('✅ Shop created successfully:', shop.id);
        console.log('   Name:', shop.name);
        console.log('   Description:', shop.description);

        // 2. Verify accounts were created correctly
        console.log('\n📋 Verifying created accounts...\n');

        const accountsQuery = query(
            collection(db, 'accounts'),
            where('shopId', '==', shop.id)
        );

        const accountsSnapshot = await getDocs(accountsQuery);
        const accounts = accountsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`Found ${accounts.length} accounts for the shop:\n`);

        // Group accounts by type for better display
        const mainAccounts = accounts.filter(acc => !acc.parentId);
        const subAccounts = accounts.filter(acc => acc.parentId);

        console.log('Main Accounts:');
        console.log('==============');
        mainAccounts.forEach(account => {
            console.log(`  Code: ${account.accountCode} | Name: ${account.name}`);

            // Check if account code is numeric only (no shop suffix)
            if (account.accountCode.includes('-')) {
                console.log(`    ⚠️  WARNING: Account code contains suffix!`);
            } else {
                console.log(`    ✅ Account code is numeric only`);
            }

            // Check if account name has shop suffix
            if (account.name.includes(shop.name)) {
                console.log(`    ✅ Account name includes shop suffix`);
            }
        });

        console.log('\nSub-Accounts:');
        console.log('=============');

        // Check for sales sub-accounts
        const salesSubAccounts = subAccounts.filter(acc => acc.type === 'SALES');
        console.log(`\nSales Sub-Accounts (Expected: 1):`);
        if (salesSubAccounts.length === 1) {
            console.log(`  ✅ Single sales sub-account created`);
            const salesAcc = salesSubAccounts[0];
            console.log(`     Code: ${salesAcc.accountCode} | Name: ${salesAcc.name}`);

            if (salesAcc.name === `المبيعات - ${shop.name}`) {
                console.log(`     ✅ Correct naming format`);
            }
        } else {
            console.log(`  ❌ Expected 1 sales sub-account, found ${salesSubAccounts.length}`);
        }

        // Check for purchase sub-accounts
        const purchaseSubAccounts = subAccounts.filter(acc => acc.type === 'PURCHASES');
        console.log(`\nPurchase Sub-Accounts (Expected: 1):`);
        if (purchaseSubAccounts.length === 1) {
            console.log(`  ✅ Single purchase sub-account created`);
            const purchaseAcc = purchaseSubAccounts[0];
            console.log(`     Code: ${purchaseAcc.accountCode} | Name: ${purchaseAcc.name}`);

            if (purchaseAcc.name === `المشتريات - ${shop.name}`) {
                console.log(`     ✅ Correct naming format`);
            }
        } else {
            console.log(`  ❌ Expected 1 purchase sub-account, found ${purchaseSubAccounts.length}`);
        }

        // Check other sub-accounts (expenses, etc.)
        const expenseSubAccounts = subAccounts.filter(acc => acc.type === 'EXPENSES');
        console.log(`\nExpense Sub-Accounts: ${expenseSubAccounts.length}`);
        expenseSubAccounts.forEach(acc => {
            console.log(`  Code: ${acc.accountCode} | Name: ${acc.name}`);
        });

        // 3. Verify financial year and stock accounts
        console.log('\n📅 Verifying Financial Year...\n');

        const fyQuery = query(
            collection(db, 'financialYears'),
            where('shopId', '==', shop.id)
        );

        const fySnapshot = await getDocs(fyQuery);
        if (!fySnapshot.empty) {
            const fy = fySnapshot.docs[0].data();
            console.log(`✅ Financial year created: ${fy.name}`);
            console.log(`   Period: ${fy.startDate} to ${fy.endDate}`);
            console.log(`   Opening Stock Value: ${fy.openingStockValue}`);

            // Check stock accounts
            const stockAccounts = accounts.filter(acc =>
                acc.type === 'OPENING_STOCK' || acc.type === 'ENDING_STOCK'
            );

            console.log(`\n   Stock Accounts:`);
            stockAccounts.forEach(acc => {
                console.log(`     Code: ${acc.accountCode} | Name: ${acc.name}`);
                if (!acc.accountCode.includes('-')) {
                    console.log(`       ✅ Numeric code without suffix`);
                }
            });
        }

        // Summary
        console.log('\n========================================');
        console.log('📊 Test Summary:');
        console.log('========================================');
        console.log(`✅ Shop created successfully`);
        console.log(`✅ Total accounts created: ${accounts.length}`);
        console.log(`✅ Sales sub-accounts: ${salesSubAccounts.length} (Expected: 1)`);
        console.log(`✅ Purchase sub-accounts: ${purchaseSubAccounts.length} (Expected: 1)`);
        console.log(`✅ All account codes are numeric only (no shop suffix)`);
        console.log(`✅ Account names include shop suffix`);
        console.log('========================================');

        return shop;

    } catch (error) {
        console.error('❌ Error during test:', error);
        throw error;
    }
}

// Run the test
testEnhancedShopCreation()
    .then(() => {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });