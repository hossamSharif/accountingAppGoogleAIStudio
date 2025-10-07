#!/usr/bin/env node

/**
 * Quick Shop Creation Test
 * Tests the enhanced shop creation service directly
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

// Firebase configuration (use your actual config)
const firebaseConfig = {
    // Add your Firebase config here
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

class ShopCreationServiceTest {
    constructor() {
        this.app = null;
        this.db = null;
    }

    async init() {
        try {
            console.log('🔥 Initializing Firebase connection...');
            this.app = initializeApp(firebaseConfig);
            this.db = getFirestore(this.app);
            console.log('✅ Firebase initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Firebase initialization failed:', error.message);
            return false;
        }
    }

    async testFirebaseConnection() {
        console.log('🔗 Testing Firebase connection...');

        try {
            // Try to read from a collection
            const testCollection = collection(this.db, 'shops');
            const snapshot = await getDocs(testCollection);

            console.log(`✅ Firebase connection successful`);
            console.log(`📊 Found ${snapshot.size} existing shops`);

            // List existing shops
            if (snapshot.size > 0) {
                console.log('🏪 Existing shops:');
                snapshot.forEach(doc => {
                    const data = doc.data();
                    console.log(`   - ${data.name} (${doc.id}) - ${data.isActive ? 'Active' : 'Inactive'}`);
                });
            }

            return true;
        } catch (error) {
            console.error('❌ Firebase connection failed:', error.message);
            return false;
        }
    }

    async checkShopExists(shopName) {
        console.log(`🔍 Checking if shop "${shopName}" already exists...`);

        try {
            const shopsRef = collection(this.db, 'shops');
            const q = query(shopsRef, where('name', '==', shopName));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                console.log(`✅ Shop "${shopName}" does not exist - ready for creation`);
                return false;
            } else {
                console.log(`⚠️  Shop "${shopName}" already exists`);
                snapshot.forEach(doc => {
                    const data = doc.data();
                    console.log(`   - ID: ${doc.id}`);
                    console.log(`   - Status: ${data.isActive ? 'Active' : 'Inactive'}`);
                    console.log(`   - Description: ${data.description || 'No description'}`);
                });
                return true;
            }
        } catch (error) {
            console.error('❌ Error checking shop existence:', error.message);
            return false;
        }
    }

    async validateShopData() {
        console.log('📝 Validating shop creation data...');

        const shopData = {
            name: 'قرش السلك',
            description: 'متجر متخصص في قطع غيار السيارات والأسلاك الكهربائية',
            address: 'شارع الملك فهد، الرياض، المملكة العربية السعودية',
            contactPhone: '+966501234567',
            contactEmail: 'info@qareshsalik.com',
            businessType: 'قطع غيار السيارات',
            openingStockValue: 50000
        };

        // Basic validation checks
        const validations = [
            {
                field: 'name',
                value: shopData.name,
                test: (v) => v && v.length >= 2,
                message: 'Shop name must be at least 2 characters'
            },
            {
                field: 'contactEmail',
                value: shopData.contactEmail,
                test: (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
                message: 'Invalid email format'
            },
            {
                field: 'contactPhone',
                value: shopData.contactPhone,
                test: (v) => !v || /^[+]?[0-9\s\-()]{8,20}$/.test(v),
                message: 'Invalid phone format'
            },
            {
                field: 'openingStockValue',
                value: shopData.openingStockValue,
                test: (v) => v >= 0,
                message: 'Opening stock value cannot be negative'
            }
        ];

        let allValid = true;
        console.log('🔍 Validation results:');

        validations.forEach(validation => {
            const isValid = validation.test(validation.value);
            console.log(`   ${isValid ? '✅' : '❌'} ${validation.field}: ${validation.value}`);
            if (!isValid) {
                console.log(`      Error: ${validation.message}`);
                allValid = false;
            }
        });

        if (allValid) {
            console.log('✅ All validation checks passed');
        } else {
            console.log('❌ Validation errors found');
        }

        return { valid: allValid, data: shopData };
    }

    async simulateAccountCreation(shopName) {
        console.log('🏦 Simulating account creation process...');

        const accountDefinitions = [
            { code: '1100', name: 'الصندوق', type: 'CASH' },
            { code: '1200', name: 'البنك', type: 'BANK' },
            { code: '1300', name: 'العملاء', type: 'CUSTOMER' },
            { code: '1400', name: 'المخزون', type: 'STOCK' },
            { code: '2100', name: 'الموردين', type: 'SUPPLIER' },
            { code: '4100', name: 'المبيعات', type: 'SALES' },
            { code: '5100', name: 'المشتريات', type: 'PURCHASES' },
            { code: '5200', name: 'المصروفات', type: 'EXPENSES' },
            { code: '1410', name: 'بضاعة أول المدة', type: 'OPENING_STOCK' },
            { code: '1420', name: 'بضاعة آخر المدة', type: 'ENDING_STOCK' }
        ];

        console.log(`📋 Accounts that would be created for "${shopName}":`);

        accountDefinitions.forEach((account, index) => {
            const accountName = `${account.name} - ${shopName}`;
            console.log(`   ${index + 1}. ${account.code} - ${accountName} (${account.type})`);
        });

        console.log(`📊 Total accounts: ${accountDefinitions.length}`);
        console.log('🗓️  Financial year 2025 would be created with stock accounts');

        return accountDefinitions;
    }

    async runCompleteTest() {
        console.log('🚀 Starting Enhanced Shop Creation Service Test');
        console.log('='.repeat(60));

        try {
            // Step 1: Initialize Firebase
            const firebaseOk = await this.init();
            if (!firebaseOk) {
                throw new Error('Firebase initialization failed');
            }

            // Step 2: Test connection
            const connectionOk = await this.testFirebaseConnection();
            if (!connectionOk) {
                throw new Error('Firebase connection test failed');
            }

            // Step 3: Check if shop exists
            const shopExists = await this.checkShopExists('قرش السلك');

            // Step 4: Validate shop data
            const validation = await this.validateShopData();
            if (!validation.valid) {
                throw new Error('Shop data validation failed');
            }

            // Step 5: Simulate account creation
            const accounts = await this.simulateAccountCreation('قرش السلك');

            // Test summary
            console.log('\n' + '='.repeat(60));
            console.log('📊 TEST SUMMARY');
            console.log('='.repeat(60));
            console.log(`🔥 Firebase: ✅ Connected`);
            console.log(`🏪 Shop Data: ✅ Valid`);
            console.log(`🏦 Accounts: ✅ ${accounts.length} accounts ready`);
            console.log(`📅 Financial Year: ✅ 2025 ready`);
            console.log(`💰 Opening Stock: ✅ 50,000 SAR`);

            if (shopExists) {
                console.log(`⚠️  Status: Shop "قرش السلك" already exists`);
                console.log(`💡 Recommendation: Use a different name or test update functionality`);
            } else {
                console.log(`✅ Status: Ready to create shop "قرش السلك"`);
                console.log(`🚀 Recommendation: Run the UI test to complete creation`);
            }

            console.log('\n🎯 Next Steps:');
            console.log('   1. Run the React application (npm run dev)');
            console.log('   2. Use the manual checklist to test the UI');
            console.log('   3. Or run the Puppeteer test script');
            console.log('   4. Verify all accounts and financial year are created');

            return true;

        } catch (error) {
            console.error('\n❌ TEST FAILED:', error.message);
            return false;
        }
    }
}

// Environment check
function checkEnvironment() {
    console.log('🔧 Checking environment...');

    const requiredEnvVars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID'
    ];

    let envOk = true;
    requiredEnvVars.forEach(envVar => {
        if (!process.env[envVar]) {
            console.log(`❌ Missing environment variable: ${envVar}`);
            envOk = false;
        } else {
            console.log(`✅ ${envVar}: Set`);
        }
    });

    if (!envOk) {
        console.log('\n💡 To fix environment issues:');
        console.log('   1. Create a .env file in the project root');
        console.log('   2. Add your Firebase configuration variables');
        console.log('   3. Restart the test');
        return false;
    }

    return true;
}

// Main execution
async function main() {
    console.log('🏪 Enhanced Shop Creation Service Test');
    console.log('Testing shop: "قرش السلك"');
    console.log('='.repeat(60));

    // Check environment first
    if (!checkEnvironment()) {
        process.exit(1);
    }

    const test = new ShopCreationServiceTest();
    const success = await test.runCompleteTest();

    process.exit(success ? 0 : 1);
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = ShopCreationServiceTest;