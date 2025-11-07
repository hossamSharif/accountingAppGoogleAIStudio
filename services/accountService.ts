import { doc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { BaseService } from './baseService';
import { Account, Transaction, User, AccountType } from '../types';
import { RESTRICTED_ACCOUNT_TYPES, USER_ALLOWED_ACCOUNT_TYPES, EXPENSE_CATEGORIES, MAX_ACCOUNT_HIERARCHY_DEPTH } from '../constants';

export interface CreateAccountData {
    name: string;
    nameEnglish?: string;
    accountCode: string;
    parentAccountCode?: string;
    type: AccountType;
    description?: string;
    shopId: string;
    classification?: string;
    nature?: string;
    openingBalance?: number;
    category?: string;
}

export interface AccountTreeNode extends Account {
    children: AccountTreeNode[];
    level: number;
    balance?: number;
}

export class AccountService extends BaseService {
    // Create account with role-based permissions
    static async createAccount(accountData: CreateAccountData, user: User): Promise<Account> {
        try {
            // Validate input data
            this.validateRequired(accountData, ['name', 'accountCode', 'type', 'shopId']);

            if (accountData.name.trim().length < 2) {
                throw new Error('Account name must be at least 2 characters');
            }

            if (accountData.accountCode.trim().length < 1) {
                throw new Error('Account code is required');
            }

            // Check user permissions
            if (user.role !== 'admin') {
                // Users can only create sub-accounts from specific account types
                if (!USER_ALLOWED_ACCOUNT_TYPES.includes(accountData.type)) {
                    throw new Error('غير مسموح لك بإنشاء هذا النوع من الحسابات');
                }

                // Users can only create accounts for their own shop
                if (accountData.shopId !== user.shopId) {
                    throw new Error('يمكنك إنشاء حسابات فقط للمحل الخاص بك');
                }

                // Users must specify a parent account
                if (!accountData.parentAccountCode) {
                    throw new Error('يجب تحديد الحساب الرئيسي');
                }
            }

            // 1. Validate account code uniqueness within shop
            const existingAccount = await this.getAccountByCode(accountData.accountCode, accountData.shopId);
            if (existingAccount) {
                throw new Error('Account code already exists in this shop');
            }

            // 2. Validate parent account if specified
            if (accountData.parentAccountCode) {
                const parentAccount = await this.getAccountByCode(accountData.parentAccountCode, accountData.shopId);
                if (!parentAccount) {
                    throw new Error('Parent account not found');
                }
                if (!parentAccount.isActive) {
                    throw new Error('Cannot create account under inactive parent account');
                }

                // Check depth limit using constant
                const parentDepth = await this.getAccountDepth(parentAccount.id);
                if (parentDepth >= MAX_ACCOUNT_HIERARCHY_DEPTH) {
                    throw new Error(`لا يمكن إنشاء أكثر من ${MAX_ACCOUNT_HIERARCHY_DEPTH} مستويات من الحسابات`);
                }

                // For users, ensure they can create sub-accounts under this parent type
                if (user.role !== 'admin' && RESTRICTED_ACCOUNT_TYPES.includes(parentAccount.type)) {
                    throw new Error('غير مسموح لك بإنشاء حسابات فرعية تحت هذا النوع من الحسابات');
                }
            }

            // 3. Validate expense category
            if (accountData.type === AccountType.EXPENSES && accountData.category) {
                if (!EXPENSE_CATEGORIES.includes(accountData.category)) {
                    throw new Error('فئة المصروفات غير صالحة');
                }
            }

            // 3. Verify shop exists
            const shopExists = await this.documentExists('shops', accountData.shopId);
            if (!shopExists) {
                throw new Error('Shop not found');
            }

            // 4. Create account document
            const accountRef = doc(collection(this.db, 'accounts'));

            // Get parent account and calculate level
            const parentAccount = accountData.parentAccountCode ?
                await this.getAccountByCode(accountData.parentAccountCode, accountData.shopId) :
                undefined;

            const parentId = parentAccount?.id;
            const level = parentId ? await this.getDepthByParentId(parentId) : 1;

            const newAccount: Omit<Account, 'id'> = {
                shopId: accountData.shopId,
                accountCode: accountData.accountCode.trim(),
                name: this.sanitizeString(accountData.name),
                classification: accountData.classification as any || 'الأصول',
                nature: accountData.nature as any || 'مدين',
                type: accountData.type,
                parentId,
                level,
                isActive: true,
                openingBalance: accountData.openingBalance || 0,
                category: accountData.category
            };

            await setDoc(accountRef, newAccount);
            return { id: accountRef.id, ...newAccount };

        } catch (error: any) {
            this.handleError(error, 'createAccount');
        }
    }

    // Update account
    static async updateAccount(accountId: string, accountData: Partial<Omit<Account, 'id' | 'shopId' | 'isActive' | 'createdAt'>>): Promise<void> {
        try {
            this.validateRequired({ accountId }, ['accountId']);

            // Get current account
            const account = await this.getDocumentById<Account>('accounts', accountId);
            if (!account) {
                throw new Error('Account not found');
            }

            // Sanitize data
            const updateData: any = {};

            if (accountData.name) {
                if (accountData.name.trim().length < 2) {
                    throw new Error('Account name must be at least 2 characters');
                }
                updateData.name = this.sanitizeString(accountData.name);
            }

            if (accountData.nameEnglish) {
                updateData.nameEnglish = this.sanitizeString(accountData.nameEnglish);
            }

            if (accountData.accountCode) {
                // Check if new code conflicts with existing account
                if (accountData.accountCode.trim() !== account.accountCode) {
                    const existingAccount = await this.getAccountByCode(accountData.accountCode.trim(), account.shopId);
                    if (existingAccount && existingAccount.id !== accountId) {
                        throw new Error('Account code already exists in this shop');
                    }
                }
                updateData.accountCode = accountData.accountCode.trim();
            }

            if (accountData.parentAccountCode !== undefined) {
                if (accountData.parentAccountCode.trim()) {
                    // Validate parent account exists
                    const parentAccount = await this.getAccountByCode(accountData.parentAccountCode.trim(), account.shopId);
                    if (!parentAccount) {
                        throw new Error('Parent account not found');
                    }
                    if (parentAccount.id === accountId) {
                        throw new Error('Account cannot be its own parent');
                    }
                    // Check for circular reference
                    const wouldCreateCircle = await this.wouldCreateCircularReference(accountId, parentAccount.id);
                    if (wouldCreateCircle) {
                        throw new Error('This would create a circular reference in the account hierarchy');
                    }
                    updateData.parentId = parentAccount.id;
                    // Also update level when parent changes
                    updateData.level = await this.getDepthByParentId(parentAccount.id);
                } else {
                    updateData.parentId = undefined;
                    updateData.level = 1;
                }
            }

            if (accountData.type) {
                updateData.type = accountData.type;
            }

            if (accountData.description !== undefined) {
                updateData.description = accountData.description ? this.sanitizeString(accountData.description) : '';
            }

            if (accountData.openingBalance !== undefined) {
                updateData.openingBalance = accountData.openingBalance;
            }

            if (Object.keys(updateData).length === 0) {
                throw new Error('No valid data to update');
            }

            await updateDoc(doc(this.db, 'accounts', accountId), updateData);

        } catch (error: any) {
            this.handleError(error, 'updateAccount');
        }
    }

    // Toggle account active status
    static async toggleAccountStatus(accountId: string): Promise<void> {
        try {
            this.validateRequired({ accountId }, ['accountId']);

            // Get current account
            const account = await this.getDocumentById<Account>('accounts', accountId);
            if (!account) {
                throw new Error('Account not found');
            }

            // Check if account has child accounts (prevent deactivating parent account with active children)
            if (account.isActive) {
                const hasActiveChildren = await this.hasActiveChildAccounts(accountId, account.shopId);
                if (hasActiveChildren) {
                    throw new Error('Cannot deactivate account with active child accounts. Please deactivate child accounts first.');
                }

                // Check if account has transactions (warn but allow)
                const hasTransactions = await this.hasTransactions(accountId);
                if (hasTransactions) {
                    // This is a warning, but we allow the operation
                    console.warn(`Account ${account.name} has transactions but is being deactivated`);
                }
            }

            // Update status
            await updateDoc(doc(this.db, 'accounts', accountId), {
                isActive: !account.isActive
            });

        } catch (error: any) {
            this.handleError(error, 'toggleAccountStatus');
        }
    }

    // Delete account (only if no transactions and no child accounts)
    static async deleteAccount(accountId: string): Promise<void> {
        try {
            this.validateRequired({ accountId }, ['accountId']);

            // Get account
            const account = await this.getDocumentById<Account>('accounts', accountId);
            if (!account) {
                throw new Error('Account not found');
            }

            // Check for transactions
            const hasTransactions = await this.hasTransactions(accountId);
            if (hasTransactions) {
                throw new Error('Cannot delete account with existing transactions');
            }

            // Check for child accounts
            const hasChildren = await this.hasChildAccounts(accountId, account.shopId);
            if (hasChildren) {
                throw new Error('Cannot delete account with child accounts');
            }

            await deleteDoc(doc(this.db, 'accounts', accountId));

        } catch (error: any) {
            this.handleError(error, 'deleteAccount');
        }
    }

    // Calculate account balance
    static async calculateAccountBalance(accountId: string): Promise<number> {
        try {
            // Get all transactions affecting this account
            const q = query(
                collection(this.db, 'transactions'),
                where('entries', 'array-contains', { accountId })
            );

            const snapshot = await getDocs(q);
            let balance = 0;

            snapshot.forEach(doc => {
                const transaction = doc.data() as Transaction;
                const entry = transaction.entries.find(e => e.accountId === accountId);
                if (entry) {
                    balance += entry.amount;
                }
            });

            return balance;

        } catch (error: any) {
            console.error('Error calculating account balance:', error);
            return 0;
        }
    }

    // Get account by ID
    static async getAccountById(accountId: string): Promise<Account | null> {
        return this.getDocumentById<Account>('accounts', accountId);
    }

    // Get account by code within shop
    static async getAccountByCode(accountCode: string, shopId: string): Promise<Account | null> {
        try {
            const q = query(
                collection(this.db, 'accounts'),
                where('accountCode', '==', accountCode.trim()),
                where('shopId', '==', shopId)
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) {
                return null;
            }

            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as Account;

        } catch (error: any) {
            console.error('Error getting account by code:', error);
            return null;
        }
    }

    // Get accounts by shop
    static async getAccountsByShop(shopId: string): Promise<Account[]> {
        return this.getDocumentsByField<Account>('accounts', 'shopId', shopId, 'accountCode');
    }

    // Get account hierarchy for shop
    static async getAccountHierarchy(shopId: string): Promise<AccountTreeNode[]> {
        try {
            const accounts = await this.getAccountsByShop(shopId);
            return this.buildAccountTree(accounts);
        } catch (error: any) {
            console.error('Error getting account hierarchy:', error);
            return [];
        }
    }

    // Build account tree structure
    static buildAccountTree(accounts: Account[]): AccountTreeNode[] {
        const accountMap = new Map<string, AccountTreeNode>();
        const rootNodes: AccountTreeNode[] = [];

        // Create tree nodes
        accounts.forEach(account => {
            accountMap.set(account.accountCode, {
                ...account,
                children: [],
                level: 0
            });
        });

        // Build hierarchy - using parentId to find parent accounts
        accounts.forEach(account => {
            const node = accountMap.get(account.accountCode);
            if (!node) return;

            if (account.parentId) {
                // Find parent by parentId
                const parentAccount = accounts.find(a => a.id === account.parentId);
                if (parentAccount) {
                    const parent = accountMap.get(parentAccount.accountCode);
                    if (parent) {
                        parent.children.push(node);
                        node.level = parent.level + 1;
                        return;
                    }
                }
            }

            // No parent found or no parentId - this is a root node
            rootNodes.push(node);
        });

        // Sort children recursively
        const sortChildren = (nodes: AccountTreeNode[]) => {
            nodes.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
            nodes.forEach(node => {
                if (node.children.length > 0) {
                    sortChildren(node.children);
                }
            });
        };

        sortChildren(rootNodes);
        return rootNodes;
    }

    // Check if account has transactions
    static async hasTransactions(accountId: string): Promise<boolean> {
        try {
            const q = query(
                collection(this.db, 'transactions'),
                where('entries', 'array-contains', { accountId })
            );

            const snapshot = await getDocs(q);
            return !snapshot.empty;

        } catch (error: any) {
            console.error('Error checking account transactions:', error);
            return true; // Assume true to be safe
        }
    }

    // Check if account has child accounts
    static async hasChildAccounts(accountId: string, shopId: string): Promise<boolean> {
        try {
            const account = await this.getAccountById(accountId);
            if (!account) return false;

            const q = query(
                collection(this.db, 'accounts'),
                where('parentId', '==', account.id),
                where('shopId', '==', shopId)
            );

            const snapshot = await getDocs(q);
            return !snapshot.empty;

        } catch (error: any) {
            console.error('Error checking child accounts:', error);
            return true; // Assume true to be safe
        }
    }

    // Check if account has active child accounts
    static async hasActiveChildAccounts(accountId: string, shopId: string): Promise<boolean> {
        try {
            const account = await this.getAccountById(accountId);
            if (!account) return false;

            const q = query(
                collection(this.db, 'accounts'),
                where('parentId', '==', account.id),
                where('shopId', '==', shopId),
                where('isActive', '==', true)
            );

            const snapshot = await getDocs(q);
            return !snapshot.empty;

        } catch (error: any) {
            console.error('Error checking active child accounts:', error);
            return true; // Assume true to be safe
        }
    }

    // Check if setting parent would create circular reference
    static async wouldCreateCircularReference(accountId: string, potentialParentId: string): Promise<boolean> {
        try {
            let currentParentId = potentialParentId;
            const visitedIds = new Set<string>();

            while (currentParentId && !visitedIds.has(currentParentId)) {
                if (currentParentId === accountId) {
                    return true; // Circular reference detected
                }

                visitedIds.add(currentParentId);
                const parent = await this.getAccountById(currentParentId);
                if (!parent || !parent.parentId) {
                    break;
                }

                currentParentId = parent.parentId;
            }

            return false;

        } catch (error: any) {
            console.error('Error checking circular reference:', error);
            return true; // Assume true to be safe
        }
    }

    // Get the depth/level of an account (1 = main, 2 = sub1, 3 = sub2)
    static async getAccountDepth(accountId: string): Promise<number> {
        try {
            const account = await this.getAccountById(accountId);
            if (!account) return 0;

            let depth = 1;
            let currentAccount = account;

            while (currentAccount.parentId) {
                depth++;
                const parent = await this.getAccountById(currentAccount.parentId);
                if (!parent) break;
                currentAccount = parent;
            }

            return depth;
        } catch (error: any) {
            console.error('Error calculating account depth:', error);
            return 0;
        }
    }

    // Get the depth/level of an account by parent ID
    static async getDepthByParentId(parentId: string | undefined): Promise<number> {
        if (!parentId) return 1; // No parent means level 1 (main account)

        const parentDepth = await this.getAccountDepth(parentId);
        return parentDepth + 1;
    }

    // Get account statistics
    static async getAccountStats(accountId: string): Promise<{
        balance: number;
        transactionCount: number;
        childAccountsCount: number;
        lastTransactionDate?: string;
    }> {
        try {
            const account = await this.getAccountById(accountId);
            if (!account) {
                throw new Error('Account not found');
            }

            const [balance, hasTransactions, hasChildren] = await Promise.all([
                this.calculateAccountBalance(accountId),
                this.hasTransactions(accountId),
                this.hasChildAccounts(accountId, account.shopId)
            ]);

            // Get transaction count and last transaction date
            const q = query(
                collection(this.db, 'transactions'),
                where('entries', 'array-contains', { accountId })
            );

            const snapshot = await getDocs(q);
            const transactions = snapshot.docs.map(doc => doc.data() as Transaction);
            const lastTransaction = transactions.length > 0
                ? transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                : null;

            // Count child accounts using the hasChildAccounts method for consistency
            const childAccountsQuery = query(
                collection(this.db, 'accounts'),
                where('parentId', '==', account.id),
                where('shopId', '==', account.shopId)
            );
            const childSnapshot = await getDocs(childAccountsQuery);

            return {
                balance,
                transactionCount: transactions.length,
                childAccountsCount: childSnapshot.size,
                lastTransactionDate: lastTransaction?.date
            };

        } catch (error: any) {
            console.error('Error getting account stats:', error);
            return {
                balance: 0,
                transactionCount: 0,
                childAccountsCount: 0
            };
        }
    }

    // Search accounts by name or code
    static async searchAccounts(searchTerm: string, shopId: string): Promise<Account[]> {
        try {
            // Get all accounts for the shop (Firestore doesn't support text search natively)
            const accounts = await this.getAccountsByShop(shopId);

            // Filter by search term
            const searchLower = searchTerm.toLowerCase().trim();
            return accounts.filter(account =>
                account.name.toLowerCase().includes(searchLower) ||
                account.nameEnglish.toLowerCase().includes(searchLower) ||
                account.accountCode.toLowerCase().includes(searchLower)
            );

        } catch (error: any) {
            this.handleError(error, 'searchAccounts');
        }
    }

    // Get accounts by type
    static async getAccountsByType(shopId: string, type: string): Promise<Account[]> {
        return this.getDocumentsByField<Account>('accounts', 'shopId', shopId).then(accounts =>
            accounts.filter(account => account.type === type)
        );
    }

    // Get root accounts (accounts with no parent)
    static async getRootAccounts(shopId: string): Promise<Account[]> {
        return this.getDocumentsByField<Account>('accounts', 'shopId', shopId).then(accounts =>
            accounts.filter(account => !account.parentId)
        );
    }

    // ========== Permission & Category Methods ==========

    /**
     * Validate user permissions for account operations
     */
    static canUserManageAccount(account: Account, user: User): boolean {
        // Admin can manage all accounts
        if (user.role === 'admin') return true;

        // User can only manage accounts in their shop
        if (account.shopId !== user.shopId) return false;

        // User cannot manage restricted account types
        if (RESTRICTED_ACCOUNT_TYPES.includes(account.type)) return false;

        return true;
    }

    /**
     * Get allowed account types for user
     */
    static getAllowedAccountTypes(user: User): AccountType[] {
        if (user.role === 'admin') {
            return Object.values(AccountType);
        }

        return USER_ALLOWED_ACCOUNT_TYPES;
    }

    /**
     * Get accounts by type for financial calculations
     */
    static async getAccountsByTypeForCalculations(
        shopId: string,
        accountType: AccountType
    ): Promise<Account[]> {
        const q = query(
            collection(this.db, 'accounts'),
            where('shopId', '==', shopId),
            where('type', '==', accountType),
            where('isActive', '==', true)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Account));
    }

    /**
     * Get expense accounts by category
     */
    static async getExpenseAccountsByCategory(
        shopId: string,
        category: string
    ): Promise<Account[]> {
        const q = query(
            collection(this.db, 'accounts'),
            where('shopId', '==', shopId),
            where('type', '==', AccountType.EXPENSES),
            where('category', '==', category),
            where('isActive', '==', true)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Account));
    }

    /**
     * Get accounts by shop with user permissions
     */
    static async getAccountsByShopWithPermissions(
        shopId: string,
        user: User,
        filters?: {
            type?: AccountType;
            parentId?: string;
            category?: string;
        }
    ): Promise<Account[]> {

        // Check permissions
        if (user.role !== 'admin' && user.shopId !== shopId) {
            throw new Error('يمكنك عرض حسابات محلك فقط');
        }

        let q = query(
            collection(this.db, 'accounts'),
            where('shopId', '==', shopId),
            where('isActive', '==', true)
        );

        // Apply filters
        if (filters?.type) {
            q = query(q, where('type', '==', filters.type));
        }
        if (filters?.parentId) {
            q = query(q, where('parentId', '==', filters.parentId));
        }
        if (filters?.category) {
            q = query(q, where('category', '==', filters.category));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Account));
    }
}