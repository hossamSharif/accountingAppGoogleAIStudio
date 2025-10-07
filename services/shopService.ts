import { doc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch, Timestamp } from 'firebase/firestore';
import { BaseService } from './baseService';
import { Shop, Account } from '../types';
import { MAIN_ACCOUNT_DEFINITIONS, DEFAULT_SUB_ACCOUNTS } from '../constants';
import { FinancialYearService } from './financialYearService';

export interface CreateShopData {
    name: string;
    shopCode: string; // Added shop code for account naming
    description?: string;
    address?: string;
    contactPhone?: string;
    contactEmail?: string;
    businessType?: string;
    customBusinessType?: string;
    openingStockValue?: number;
}

export class ShopService extends BaseService {
    // Create shop with default accounts
    static async createShop(shopData: CreateShopData): Promise<Shop> {
        try {
            // Validate input data
            this.validateRequired(shopData, ['name', 'shopCode']);

            if (shopData.name.trim().length < 2) {
                throw new Error('Shop name must be at least 2 characters');
            }

            if (!/^[A-Za-z0-9]{2,10}$/.test(shopData.shopCode.trim())) {
                throw new Error('Shop code must be 2-10 alphanumeric characters');
            }

            // Check if shop name already exists
            const existingShop = await this.getShopByName(shopData.name.trim());
            if (existingShop) {
                throw new Error('Shop with this name already exists');
            }

            // Check if shop code already exists
            const existingShopCode = await this.getShopByCode(shopData.shopCode.trim());
            if (existingShopCode) {
                throw new Error('Shop with this code already exists');
            }

            const batch = writeBatch(this.db);

            // 1. Create shop document
            const shopRef = doc(collection(this.db, 'shops'));
            const newShopData: Omit<Shop, 'id'> & {
                address?: string;
                contactPhone?: string;
                contactEmail?: string;
                businessType?: string;
                customBusinessType?: string;
            } = {
                name: this.sanitizeString(shopData.name),
                shopCode: shopData.shopCode.trim().toUpperCase(), // Store shop code in uppercase
                description: shopData.description ? this.sanitizeString(shopData.description) : '',
                address: shopData.address ? this.sanitizeString(shopData.address) : '',
                contactPhone: shopData.contactPhone ? this.sanitizeString(shopData.contactPhone) : '',
                contactEmail: shopData.contactEmail ? this.sanitizeString(shopData.contactEmail) : '',
                businessType: shopData.businessType ? this.sanitizeString(shopData.businessType) : '',
                customBusinessType: shopData.customBusinessType ? this.sanitizeString(shopData.customBusinessType) : '',
                isActive: true
            };

            batch.set(shopRef, newShopData);

            // 2. Create default main accounts for shop (excluding stock accounts)
            const createdMainAccounts: { [code: string]: string } = {}; // Map account code to account ID

            MAIN_ACCOUNT_DEFINITIONS.filter(def =>
                def.type !== 'بضاعة أول المدة' && def.type !== 'بضاعة آخر المدة'
            ).forEach(accountDef => {
                const accountRef = doc(collection(this.db, 'accounts'));
                const accountData: Omit<Account, 'id'> = {
                    shopId: shopRef.id,
                    accountCode: accountDef.accountCode, // Use numeric code without shop suffix
                    name: `${accountDef.name} - ${newShopData.shopCode}`, // Use shop code as suffix
                    classification: accountDef.classification,
                    nature: accountDef.nature,
                    type: accountDef.type,
                    isActive: true,
                    openingBalance: 0,
                    ...(accountDef.category ? { category: accountDef.category } : {})
                };
                batch.set(accountRef, accountData);
                createdMainAccounts[accountDef.accountCode] = accountRef.id;
            });

            // 3. Create default sub-accounts for each main account
            Object.entries(DEFAULT_SUB_ACCOUNTS).forEach(([parentCode, subAccounts]) => {
                subAccounts.forEach(subAccountDef => {
                    const subAccountRef = doc(collection(this.db, 'accounts'));
                    // Use shop code for all sub-accounts
                    const accountName = `${subAccountDef.name} - ${newShopData.shopCode}`;

                    const subAccountData: Omit<Account, 'id'> = {
                        shopId: shopRef.id,
                        accountCode: subAccountDef.accountCode, // Use numeric code without shop suffix
                        name: accountName,
                        classification: subAccountDef.classification,
                        nature: subAccountDef.nature,
                        type: subAccountDef.type,
                        parentId: createdMainAccounts[parentCode],
                        isActive: true,
                        openingBalance: 0,
                        ...(subAccountDef.category ? { category: subAccountDef.category } : {})
                    };
                    batch.set(subAccountRef, subAccountData);
                });
            });

            // Commit main accounts first
            await batch.commit();

            // 4. Create default financial year with opening/ending stock accounts
            const currentYear = new Date().getFullYear();
            const openingStockValue = shopData.openingStockValue || 0;

            await FinancialYearService.createFinancialYear(
                shopRef.id,
                `السنة المالية ${currentYear} - ${newShopData.shopCode}`, // Use shop code in financial year name
                `${currentYear}-01-01`,
                `${currentYear}-12-31`,
                openingStockValue,
                newShopData.shopCode // Pass shop code for account naming
            );

            return { id: shopRef.id, ...newShopData };

        } catch (error: any) {
            this.handleError(error, 'createShop');
        }
    }

    // Add missing accounts to existing shops (migration function)
    static async addMissingAccountsToExistingShops(): Promise<void> {
        try {
            console.log('🔄 Starting migration: Adding missing accounts to existing shops...');

            // Get all shops
            const shops = await this.getAllShops();

            for (const shop of shops) {
                console.log(`📋 Processing shop: ${shop.name}`);

                // Get existing accounts for this shop
                const existingAccounts = await this.getDocumentsByField<Account>('accounts', 'shopId', shop.id);
                const existingCodes = new Set(existingAccounts.map(acc => acc.accountCode));

                const batch = writeBatch(this.db);
                let batchSize = 0;
                const MAX_BATCH_SIZE = 500; // Firestore batch limit

                // Check and add missing main accounts
                for (const accountDef of MAIN_ACCOUNT_DEFINITIONS) {
                    if (!existingCodes.has(accountDef.accountCode)) {
                        console.log(`  ➕ Adding main account: ${accountDef.name} (${accountDef.accountCode})`);

                        const accountRef = doc(collection(this.db, 'accounts'));
                        const accountData: Omit<Account, 'id'> = {
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
                            createdAt: Timestamp.now().toDate().toISOString()
                        };
                        batch.set(accountRef, accountData);
                        batchSize++;

                        // Commit batch if it gets too large
                        if (batchSize >= MAX_BATCH_SIZE) {
                            await batch.commit();
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

                                const subAccountRef = doc(collection(this.db, 'accounts'));
                                const subAccountData: Omit<Account, 'id'> = {
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
                                    createdAt: Timestamp.now().toDate().toISOString()
                                };
                                batch.set(subAccountRef, subAccountData);
                                batchSize++;

                                // Commit batch if it gets too large
                                if (batchSize >= MAX_BATCH_SIZE) {
                                    await batch.commit();
                                    batchSize = 0;
                                }
                            }
                        }
                    }
                }

                // Commit remaining items in batch
                if (batchSize > 0) {
                    await batch.commit();
                }
            }

            console.log('✅ Migration completed successfully!');

        } catch (error: any) {
            console.error('❌ Migration failed:', error);
            this.handleError(error, 'addMissingAccountsToExistingShops');
        }
    }

    // Update shop
    static async updateShop(shopId: string, shopData: Partial<Omit<Shop, 'id' | 'isActive' | 'createdAt'>>): Promise<void> {
        try {
            this.validateRequired({ shopId }, ['shopId']);

            // Verify shop exists
            const shop = await this.getDocumentById<Shop>('shops', shopId);
            if (!shop) {
                throw new Error('Shop not found');
            }

            // Sanitize data
            const updateData: any = {};

            if (shopData.name) {
                if (shopData.name.trim().length < 2) {
                    throw new Error('Shop name must be at least 2 characters');
                }

                // Check if new name conflicts with existing shop
                if (shopData.name.trim() !== shop.name) {
                    const existingShop = await this.getShopByName(shopData.name.trim());
                    if (existingShop && existingShop.id !== shopId) {
                        throw new Error('Shop with this name already exists');
                    }
                }

                updateData.name = this.sanitizeString(shopData.name);
            }

            if (shopData.description !== undefined) {
                updateData.description = shopData.description ? this.sanitizeString(shopData.description) : '';
            }

            if (Object.keys(updateData).length === 0) {
                throw new Error('No valid data to update');
            }

            await updateDoc(doc(this.db, 'shops', shopId), updateData);

        } catch (error: any) {
            this.handleError(error, 'updateShop');
        }
    }

    // Toggle shop status
    static async toggleShopStatus(shopId: string): Promise<void> {
        try {
            this.validateRequired({ shopId }, ['shopId']);

            // Get current shop data
            const shop = await this.getDocumentById<Shop>('shops', shopId);
            if (!shop) {
                throw new Error('Shop not found');
            }

            // Check if shop has active users (prevent deactivating shop with active users)
            if (shop.isActive) {
                const hasActiveUsers = await this.hasActiveUsers(shopId);
                if (hasActiveUsers) {
                    throw new Error('Cannot deactivate shop with active users. Please deactivate all users first.');
                }
            }

            // Update status
            await updateDoc(doc(this.db, 'shops', shopId), {
                isActive: !shop.isActive
            });

        } catch (error: any) {
            this.handleError(error, 'toggleShopStatus');
        }
    }

    // Delete shop (only if no data exists)
    static async deleteShop(shopId: string): Promise<void> {
        try {
            this.validateRequired({ shopId }, ['shopId']);

            // Check for existing data
            const hasData = await this.shopHasData(shopId);
            if (hasData) {
                throw new Error('Cannot delete shop with existing data (users, accounts, or transactions)');
            }

            await deleteDoc(doc(this.db, 'shops', shopId));

        } catch (error: any) {
            this.handleError(error, 'deleteShop');
        }
    }

    // Force delete shop and ALL associated data (dangerous operation)
    static async forceDeleteShop(shopId: string): Promise<{ deletedCount: { [key: string]: number } }> {
        try {
            this.validateRequired({ shopId }, ['shopId']);

            // Verify shop exists
            const shop = await this.getShopById(shopId);
            if (!shop) {
                throw new Error('Shop not found');
            }

            const deletedCount = {
                accounts: 0,
                transactions: 0,
                financialYears: 0,
                users: 0,
                shops: 0
            };

            // Use batches for deletion (max 500 operations per batch)
            const MAX_BATCH_SIZE = 500;

            // 1. Delete all accounts for this shop
            const accountsQuery = query(collection(this.db, 'accounts'), where('shopId', '==', shopId));
            const accountsSnapshot = await getDocs(accountsQuery);

            let batch = writeBatch(this.db);
            let batchCount = 0;

            for (const accountDoc of accountsSnapshot.docs) {
                batch.delete(accountDoc.ref);
                deletedCount.accounts++;
                batchCount++;

                if (batchCount >= MAX_BATCH_SIZE) {
                    await batch.commit();
                    batch = writeBatch(this.db);
                    batchCount = 0;
                }
            }
            if (batchCount > 0) await batch.commit();

            // 2. Delete all transactions for this shop
            const transactionsQuery = query(collection(this.db, 'transactions'), where('shopId', '==', shopId));
            const transactionsSnapshot = await getDocs(transactionsQuery);

            batch = writeBatch(this.db);
            batchCount = 0;

            for (const transDoc of transactionsSnapshot.docs) {
                batch.delete(transDoc.ref);
                deletedCount.transactions++;
                batchCount++;

                if (batchCount >= MAX_BATCH_SIZE) {
                    await batch.commit();
                    batch = writeBatch(this.db);
                    batchCount = 0;
                }
            }
            if (batchCount > 0) await batch.commit();

            // 3. Delete all financial years for this shop
            const financialYearsQuery = query(collection(this.db, 'financialYears'), where('shopId', '==', shopId));
            const financialYearsSnapshot = await getDocs(financialYearsQuery);

            batch = writeBatch(this.db);
            batchCount = 0;

            for (const fyDoc of financialYearsSnapshot.docs) {
                batch.delete(fyDoc.ref);
                deletedCount.financialYears++;
                batchCount++;

                if (batchCount >= MAX_BATCH_SIZE) {
                    await batch.commit();
                    batch = writeBatch(this.db);
                    batchCount = 0;
                }
            }
            if (batchCount > 0) await batch.commit();

            // 4. Remove shop assignment from users (don't delete users, just unassign them)
            const usersQuery = query(collection(this.db, 'users'), where('shopId', '==', shopId));
            const usersSnapshot = await getDocs(usersQuery);

            batch = writeBatch(this.db);
            batchCount = 0;

            for (const userDoc of usersSnapshot.docs) {
                batch.update(userDoc.ref, { shopId: null });
                deletedCount.users++;
                batchCount++;

                if (batchCount >= MAX_BATCH_SIZE) {
                    await batch.commit();
                    batch = writeBatch(this.db);
                    batchCount = 0;
                }
            }
            if (batchCount > 0) await batch.commit();

            // 5. Finally, delete the shop itself
            await deleteDoc(doc(this.db, 'shops', shopId));
            deletedCount.shops = 1;

            return { deletedCount };

        } catch (error: any) {
            this.handleError(error, 'forceDeleteShop');
        }
    }

    // Get shop by ID
    static async getShopById(shopId: string): Promise<Shop | null> {
        return this.getDocumentById<Shop>('shops', shopId);
    }

    // Get shop by name
    static async getShopByName(name: string): Promise<Shop | null> {
        try {
            const q = query(
                collection(this.db, 'shops'),
                where('name', '==', name.trim())
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as Shop;

        } catch (error: any) {
            console.error('Error getting shop by name:', error);
            return null;
        }
    }

    // Get shop by code
    static async getShopByCode(code: string): Promise<Shop | null> {
        try {
            const q = query(
                collection(this.db, 'shops'),
                where('shopCode', '==', code.trim().toUpperCase())
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as Shop;

        } catch (error: any) {
            console.error('Error getting shop by code:', error);
            return null;
        }
    }

    // Get all shops
    static async getAllShops(): Promise<Shop[]> {
        try {
            const snapshot = await getDocs(collection(this.db, 'shops'));
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
        } catch (error: any) {
            console.error('Error getting all shops:', error);
            return [];
        }
    }

    // Get active shops only
    static async getActiveShops(): Promise<Shop[]> {
        return this.getDocumentsByField<Shop>('shops', 'isActive', true, 'name');
    }

    // Check if shop has active users
    static async hasActiveUsers(shopId: string): Promise<boolean> {
        try {
            const q = query(
                collection(this.db, 'users'),
                where('shopId', '==', shopId),
                where('isActive', '==', true)
            );

            const snapshot = await getDocs(q);
            return !snapshot.empty;

        } catch (error: any) {
            console.error('Error checking active users:', error);
            return true; // Assume true to be safe
        }
    }

    // Check if shop has any data (users, accounts, transactions)
    static async shopHasData(shopId: string): Promise<boolean> {
        try {
            // Check for users
            const usersQuery = query(
                collection(this.db, 'users'),
                where('shopId', '==', shopId)
            );
            const usersSnapshot = await getDocs(usersQuery);
            if (!usersSnapshot.empty) return true;

            // Check for transactions
            const transactionsQuery = query(
                collection(this.db, 'transactions'),
                where('shopId', '==', shopId)
            );
            const transactionsSnapshot = await getDocs(transactionsQuery);
            if (!transactionsSnapshot.empty) return true;

            // Check for custom accounts (beyond default ones)
            const accountsQuery = query(
                collection(this.db, 'accounts'),
                where('shopId', '==', shopId)
            );
            const accountsSnapshot = await getDocs(accountsQuery);
            // If there are more accounts than the default ones, consider it as having data
            if (accountsSnapshot.size > MAIN_ACCOUNT_DEFINITIONS.length) return true;

            return false;

        } catch (error: any) {
            console.error('Error checking shop data:', error);
            return true; // Assume true to be safe
        }
    }

    // Assign user to shop
    static async assignUserToShop(userId: string, shopId: string): Promise<void> {
        try {
            this.validateRequired({ userId, shopId }, ['userId', 'shopId']);

            // Verify shop exists and is active
            const shop = await this.getShopById(shopId);
            if (!shop) {
                throw new Error('Shop not found');
            }
            if (!shop.isActive) {
                throw new Error('Cannot assign user to inactive shop');
            }

            // Verify user exists
            const userExists = await this.documentExists('users', userId);
            if (!userExists) {
                throw new Error('User not found');
            }

            // Update user's shop assignment
            await updateDoc(doc(this.db, 'users', userId), { shopId });

        } catch (error: any) {
            this.handleError(error, 'assignUserToShop');
        }
    }

    // Get shop statistics
    static async getShopStats(shopId: string): Promise<{
        usersCount: number;
        activeUsersCount: number;
        accountsCount: number;
        transactionsCount: number;
        lastTransactionDate?: string;
    }> {
        try {
            const [users, accounts, transactions] = await Promise.all([
                this.getDocumentsByField('users', 'shopId', shopId),
                this.getDocumentsByField('accounts', 'shopId', shopId),
                this.getDocumentsByField('transactions', 'shopId', shopId)
            ]);

            const activeUsers = users.filter((user: any) => user.isActive);
            const lastTransaction = transactions.length > 0
                ? transactions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                : null;

            return {
                usersCount: users.length,
                activeUsersCount: activeUsers.length,
                accountsCount: accounts.length,
                transactionsCount: transactions.length,
                lastTransactionDate: lastTransaction?.date
            };

        } catch (error: any) {
            console.error('Error getting shop stats:', error);
            return {
                usersCount: 0,
                activeUsersCount: 0,
                accountsCount: 0,
                transactionsCount: 0
            };
        }
    }
}