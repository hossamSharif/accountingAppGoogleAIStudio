// Browser Migration Script - Copy and paste this into browser console
// Make sure you're logged in as admin first

(async function migratePurchaseAccounts() {
    console.log('🚀 Starting Purchase Accounts Migration');
    console.log('=====================================');

    try {
        // Import Firebase functions
        const { collection, doc, query, where, getDocs, writeBatch, Timestamp } = await import('firebase/firestore');

        // Access the global db from your app
        if (!window.db) {
            throw new Error('Firebase db not found. Make sure you are on the application page and logged in.');
        }

        const db = window.db;

        // Define the new accounts to add
        const MAIN_ACCOUNT_DEFINITIONS = [
            { accountCode: '1100', name: 'الصندوق', classification: 'الأصول', nature: 'مدين', type: 'الصندوق' },
            { accountCode: '1200', name: 'البنك', classification: 'الأصول', nature: 'مدين', type: 'البنك' },
            { accountCode: '1300', name: 'العملاء', classification: 'الأصول', nature: 'مدين', type: 'العملاء' },
            { accountCode: '1400', name: 'المخزون', classification: 'الأصول', nature: 'مدين', type: 'المخزون' },
            { accountCode: '2100', name: 'الموردين', classification: 'الخصوم', nature: 'دائن', type: 'الموردين' },
            { accountCode: '4100', name: 'المبيعات', classification: 'الإيرادات', nature: 'دائن', type: 'المبيعات' },
            { accountCode: '5100', name: 'المشتريات', classification: 'المصروفات', nature: 'مدين', type: 'المشتريات' },
            { accountCode: '5200', name: 'المصروفات', classification: 'المصروفات', nature: 'مدين', type: 'المصروفات' },
        ];

        const DEFAULT_SUB_ACCOUNTS = {
            '5100': [
                { accountCode: '5101', name: 'مشتريات قطع الغيار', classification: 'المصروفات', nature: 'مدين', type: 'المشتريات' },
                { accountCode: '5102', name: 'مشتريات الزيوت والسوائل', classification: 'المصروفات', nature: 'مدين', type: 'المشتريات' },
                { accountCode: '5103', name: 'مشتريات الإطارات', classification: 'المصروفات', nature: 'مدين', type: 'المشتريات' },
                { accountCode: '5104', name: 'مشتريات أخرى', classification: 'المصروفات', nature: 'مدين', type: 'المشتريات' },
            ],
            '4100': [
                { accountCode: '4101', name: 'مبيعات قطع الغيار', classification: 'الإيرادات', nature: 'دائن', type: 'المبيعات' },
                { accountCode: '4102', name: 'مبيعات الزيوت والسوائل', classification: 'الإيرادات', nature: 'دائن', type: 'المبيعات' },
                { accountCode: '4103', name: 'مبيعات الإطارات', classification: 'الإيرادات', nature: 'دائن', type: 'المبيعات' },
                { accountCode: '4104', name: 'مبيعات أخرى', classification: 'الإيرادات', nature: 'دائن', type: 'المبيعات' },
            ],
            '5200': [
                { accountCode: '5201', name: 'إيجار المحل', classification: 'المصروفات', nature: 'مدين', type: 'المصروفات' },
                { accountCode: '5202', name: 'رواتب الموظفين', classification: 'المصروفات', nature: 'مدين', type: 'المصروفات' },
                { accountCode: '5203', name: 'فواتير الكهرباء والماء', classification: 'المصروفات', nature: 'مدين', type: 'المصروفات' },
                { accountCode: '5204', name: 'مصروفات التسويق', classification: 'المصروفات', nature: 'مدين', type: 'المصروفات' },
                { accountCode: '5205', name: 'مصروفات أخرى', classification: 'المصروفات', nature: 'مدين', type: 'المصروفات' },
            ],
        };

        // Get all shops
        console.log('📋 Getting all shops...');
        const shopsQuery = query(collection(db, 'shops'));
        const shopsSnapshot = await getDocs(shopsQuery);
        const shops = shopsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`Found ${shops.length} shops to process`);

        for (const shop of shops) {
            console.log(`📋 Processing shop: ${shop.name}`);

            // Get existing accounts for this shop
            const accountsQuery = query(collection(db, 'accounts'), where('shopId', '==', shop.id));
            const accountsSnapshot = await getDocs(accountsQuery);
            const existingAccounts = accountsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const existingCodes = new Set(existingAccounts.map(acc => acc.accountCode));

            const batch = writeBatch(db);
            let batchSize = 0;
            const MAX_BATCH_SIZE = 450; // Stay under Firestore's 500 limit

            // Check and add missing main accounts
            for (const accountDef of MAIN_ACCOUNT_DEFINITIONS) {
                if (!existingCodes.has(accountDef.accountCode)) {
                    console.log(`  ➕ Adding main account: ${accountDef.name} (${accountDef.accountCode})`);

                    const accountRef = doc(collection(db, 'accounts'));
                    const accountData = {
                        name: accountDef.name,
                        nameEnglish: accountDef.name,
                        accountCode: accountDef.accountCode,
                        parentAccountCode: '',
                        type: accountDef.type,
                        description: `حساب رئيسي لـ ${accountDef.name}`,
                        classification: accountDef.classification,
                        nature: accountDef.nature,
                        shopId: shop.id,
                        isActive: true,
                        createdAt: new Date().toISOString()
                    };
                    batch.set(accountRef, accountData);
                    batchSize++;

                    // Commit batch if it gets too large
                    if (batchSize >= MAX_BATCH_SIZE) {
                        await batch.commit();
                        console.log(`  💾 Committed batch of ${batchSize} accounts`);
                        batchSize = 0;
                    }
                }
            }

            // Check and add missing sub-accounts
            for (const [parentCode, subAccounts] of Object.entries(DEFAULT_SUB_ACCOUNTS)) {
                // Only add sub-accounts if parent exists
                if (existingCodes.has(parentCode)) {
                    for (const subAccountDef of subAccounts) {
                        if (!existingCodes.has(subAccountDef.accountCode)) {
                            console.log(`  ➕ Adding sub-account: ${subAccountDef.name} (${subAccountDef.accountCode})`);

                            const subAccountRef = doc(collection(db, 'accounts'));
                            const subAccountData = {
                                name: subAccountDef.name,
                                nameEnglish: subAccountDef.name,
                                accountCode: subAccountDef.accountCode,
                                parentAccountCode: parentCode,
                                type: subAccountDef.type,
                                description: `حساب فرعي تحت ${MAIN_ACCOUNT_DEFINITIONS.find(a => a.accountCode === parentCode)?.name || 'الحساب الرئيسي'}`,
                                classification: subAccountDef.classification,
                                nature: subAccountDef.nature,
                                shopId: shop.id,
                                isActive: true,
                                createdAt: new Date().toISOString()
                            };
                            batch.set(subAccountRef, subAccountData);
                            batchSize++;

                            // Commit batch if it gets too large
                            if (batchSize >= MAX_BATCH_SIZE) {
                                await batch.commit();
                                console.log(`  💾 Committed batch of ${batchSize} accounts`);
                                batchSize = 0;
                            }
                        }
                    }
                }
            }

            // Commit remaining items in batch
            if (batchSize > 0) {
                await batch.commit();
                console.log(`  💾 Committed final batch of ${batchSize} accounts`);
            }
        }

        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('📋 What was added:');
        console.log('- المشتريات (5100) - Main Purchases Account');
        console.log('- مشتريات قطع الغيار (5101)');
        console.log('- مشتريات الزيوت والسوائل (5102)');
        console.log('- مشتريات الإطارات (5103)');
        console.log('- مشتريات أخرى (5104)');
        console.log('- Enhanced sub-accounts for Sales and Expenses');
        console.log('');
        console.log('✅ All existing shops now have complete account structure!');

        // Refresh the page to see the new accounts
        console.log('🔄 Refreshing page to see new accounts...');
        setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        console.error('Please check your setup and try again.');
        console.log('');
        console.log('📋 Troubleshooting:');
        console.log('1. Make sure you are logged in as admin');
        console.log('2. Make sure you are on the application page');
        console.log('3. Check the browser console for errors');
    }
})();