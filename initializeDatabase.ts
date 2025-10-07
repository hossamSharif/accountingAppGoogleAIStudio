import {
    collection,
    doc,
    setDoc,
    writeBatch,
    getDocs,
    Timestamp
} from 'firebase/firestore';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { auth, db } from './firebase';
import { MAIN_ACCOUNT_DEFINITIONS } from './constants';
import { User, Shop, Account, FinancialYear } from './types';

export interface InitializationData {
    adminUser: {
        email: string;
        password: string;
        name: string;
    };
    shops: Omit<Shop, 'id'>[];
}

const createOrSignInUser = async (email: string, password: string) => {
    try {
        return await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            console.log(`⚠️ User ${email} already exists, signing in...`);
            return await signInWithEmailAndPassword(auth, email, password);
        }
        throw error;
    }
};

export const initializeDatabase = async (data: InitializationData) => {
    console.log('🚀 Starting database initialization...');

    try {
        // Step 1: Create/signin admin user
        console.log('📝 Setting up admin user...');
        const adminAuthUser = await createOrSignInUser(data.adminUser.email, data.adminUser.password);
        console.log('✅ Admin authentication successful:', adminAuthUser.user.email);

        // Step 2: Create admin user document in Firestore
        console.log('📄 Creating admin user document...');
        const adminUserDoc: User = {
            id: adminAuthUser.user.uid,
            email: data.adminUser.email,
            name: data.adminUser.name,
            role: 'admin',
            isActive: true
        };

        await setDoc(doc(db, 'users', adminAuthUser.user.uid), adminUserDoc, { merge: true });
        console.log('✅ Admin user document created/updated successfully');

        // Wait a moment for Firestore consistency
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 3: Check for existing shops
        console.log('🔍 Checking for existing shops...');
        const existingShops = await getDocs(collection(db, 'shops'));
        const shopRefs: string[] = [];

        if (existingShops.empty) {
            console.log('📦 Creating shops and accounts...');

            // Create shops and accounts in batch
            const batch = writeBatch(db);
            let batchOperationCount = 0;

            for (const shopData of data.shops) {
                console.log(`🏪 Preparing shop: ${shopData.name}`);

                const shopRef = doc(collection(db, 'shops'));
                batch.set(shopRef, shopData);
                shopRefs.push(shopRef.id);
                batchOperationCount++;

                // Create default accounts for this shop
                console.log(`📊 Preparing ${MAIN_ACCOUNT_DEFINITIONS.length} accounts for ${shopData.name}`);
                MAIN_ACCOUNT_DEFINITIONS.forEach((accountDef, index) => {
                    const accountRef = doc(collection(db, 'accounts'));
                    const account: Omit<Account, 'id'> = {
                        ...accountDef,
                        shopId: shopRef.id,
                        isActive: true,
                        openingBalance: 0
                    };
                    batch.set(accountRef, account);
                    batchOperationCount++;
                    console.log(`  📈 Account ${index + 1}: ${account.name}`);
                });

                // Create financial year for this shop
                const currentYear = new Date().getFullYear();
                const fyRef = doc(collection(db, 'financialYears'));
                const financialYear: Omit<FinancialYear, 'id'> = {
                    shopId: shopRef.id,
                    name: `السنة المالية ${currentYear}`,
                    startDate: `${currentYear}-01-01`,
                    endDate: `${currentYear}-12-31`,
                    status: 'open',
                    openingStockValue: 0
                };
                batch.set(fyRef, financialYear);
                batchOperationCount++;
                console.log(`  📅 Financial year: ${financialYear.name}`);
            }

            console.log(`💾 Committing ${batchOperationCount} operations to Firestore...`);
            await batch.commit();
            console.log('✅ Shops, accounts, and financial years created successfully');
        } else {
            console.log('⚠️ Shops already exist, using existing shops');
            existingShops.docs.forEach(shopDoc => {
                shopRefs.push(shopDoc.id);
                console.log(`  📍 Found existing shop: ${shopDoc.data().name} (${shopDoc.id})`);
            });
        }

        // Step 4: Create sample user
        if (shopRefs.length > 0) {
            console.log('👤 Setting up sample shop user...');

            const sampleUserAuth = await createOrSignInUser('user@example.com', 'user123');
            console.log('✅ Sample user authentication successful:', sampleUserAuth.user.email);

            const sampleUserDoc: User = {
                id: sampleUserAuth.user.uid,
                email: 'user@example.com',
                name: 'مستخدم تجريبي',
                role: 'user',
                isActive: true,
                shopId: shopRefs[0]
            };

            console.log(`📄 Assigning sample user to shop: ${shopRefs[0]}`);
            await setDoc(doc(db, 'users', sampleUserAuth.user.uid), sampleUserDoc, { merge: true });
            console.log('✅ Sample user created/updated and assigned to shop');
        }

        // Step 5: Sign out from initialization
        await signOut(auth);

        console.log('🎉 Database initialization completed successfully!');
        console.log('📋 Summary:');
        console.log(`   - Admin user: ${data.adminUser.email}`);
        console.log(`   - Shops: ${shopRefs.length}`);
        console.log(`   - Accounts per shop: ${MAIN_ACCOUNT_DEFINITIONS.length}`);
        console.log('   - Sample user: user@example.com / user123');

        return {
            success: true,
            adminUid: adminAuthUser.user.uid,
            message: 'Database initialized successfully'
        };

    } catch (error) {
        console.error('❌ Database initialization failed:', error);

        // Detailed error logging
        if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            if (error.stack) {
                console.error('Error stack:', error.stack);
            }
        }

        // Firebase-specific error handling
        if (typeof error === 'object' && error !== null && 'code' in error) {
            const firebaseError = error as any;
            console.error('Firebase error code:', firebaseError.code);

            switch (firebaseError.code) {
                case 'permission-denied':
                    return {
                        success: false,
                        error: 'Permission denied. Please make sure Firestore security rules are deployed properly.'
                    };
                case 'unauthenticated':
                    return {
                        success: false,
                        error: 'Authentication failed. Please check your Firebase Auth configuration.'
                    };
                case 'failed-precondition':
                    return {
                        success: false,
                        error: 'Database operation failed. This might be due to security rules or missing indexes.'
                    };
                default:
                    return {
                        success: false,
                        error: `Firebase error (${firebaseError.code}): ${firebaseError.message}`
                    };
            }
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
};

// Default initialization data
export const defaultInitializationData: InitializationData = {
    adminUser: {
        email: 'admin@accounting-app.com',
        password: 'Admin123!',
        name: 'مدير النظام'
    },
    shops: [
        {
            name: 'متجر قطع الغيار الأول',
            description: 'متخصص في قطع غيار السيارات اليابانية والكورية',
            isActive: true
        },
        {
            name: 'متجر قطع الغيار الثاني',
            description: 'متخصص في قطع غيار السيارات الأوروبية والأمريكية',
            isActive: true
        },
        {
            name: 'متجر الإطارات والزيوت',
            description: 'متخصص في الإطارات وزيوت المحركات',
            isActive: true
        }
    ]
};