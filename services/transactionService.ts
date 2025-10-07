import {
    writeBatch,
    doc,
    collection,
    getDoc,
    getDocs,
    query,
    where,
    Timestamp,
    WriteBatch
} from 'firebase/firestore';
import { BaseService } from './baseService';
import { FinancialYearService } from './financialYearService';
import { AccountService } from './accountService';
import {
    CreateTransactionData,
    EnhancedTransaction,
    EnhancedTransactionEntry,
    ValidationResult,
    AccountBalance,
    Account,
    FinancialYear,
    AccountType
} from '../types';

export class TransactionService extends BaseService {

    /**
     * Create transaction with financial year validation and double-entry enforcement
     */
    static async createTransaction(transactionData: CreateTransactionData): Promise<EnhancedTransaction> {
        try {
            // 1. Validate financial year is open
            const financialYear = await this.getActiveFinancialYear(transactionData.shopId);
            if (!financialYear || financialYear.status !== 'open') {
                throw new Error('لا يمكن إنشاء المعاملات في سنة مالية مغلقة');
            }

            // 2. Validate double-entry balance
            const totalDebits = transactionData.entries
                .filter(e => e.type === 'debit')
                .reduce((sum, e) => sum + e.amount, 0);
            const totalCredits = transactionData.entries
                .filter(e => e.type === 'credit')
                .reduce((sum, e) => sum + e.amount, 0);

            if (Math.abs(totalDebits - totalCredits) > 0.01) {
                throw new Error('يجب أن تكون المعاملة متوازنة (المدين = الدائن)');
            }

            // 3. Validate stock account usage
            await this.validateStockAccountUsage(transactionData.entries, financialYear.id);

            // 4. Create transaction with financial year reference
            const batch = this.createBatch();
            const transactionRef = this.getDocumentRef('transactions');

            const newTransaction: Omit<EnhancedTransaction, 'id'> = {
                ...transactionData,
                financialYearId: financialYear.id,
                status: 'posted',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: this.requireAuth()
            };

            batch.set(transactionRef, newTransaction);

            // 5. Update account balances
            for (const entry of transactionData.entries) {
                await this.updateAccountBalance(batch, entry, financialYear.id);
            }

            await batch.commit();

            return { id: transactionRef.id, ...newTransaction };

        } catch (error) {
            this.handleError(error, 'createTransaction');
        }
    }

    /**
     * Get transactions for a specific financial year
     */
    static async getTransactionsByFinancialYear(
        shopId: string,
        financialYearId: string
    ): Promise<EnhancedTransaction[]> {
        try {
            const q = query(
                this.getCollectionRef('transactions'),
                where('shopId', '==', shopId),
                where('financialYearId', '==', financialYearId)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as EnhancedTransaction));

        } catch (error) {
            this.handleError(error, 'getTransactionsByFinancialYear');
        }
    }

    /**
     * Update existing transaction with validation
     */
    static async updateTransaction(
        transactionId: string,
        updates: Partial<CreateTransactionData>
    ): Promise<EnhancedTransaction> {
        try {
            // Get existing transaction
            const existingTransaction = await this.getDocumentById<EnhancedTransaction>('transactions', transactionId);
            if (!existingTransaction) {
                throw new Error('المعاملة غير موجودة');
            }

            // Check if financial year is still open
            const financialYear = await FinancialYearService.getCurrentFinancialYear(existingTransaction.shopId);
            if (!financialYear || financialYear.status !== 'open') {
                throw new Error('لا يمكن تعديل المعاملات في سنة مالية مغلقة');
            }

            // Merge updates with existing data
            const updatedData: CreateTransactionData = {
                ...existingTransaction,
                ...updates,
                entries: updates.entries || existingTransaction.entries
            };

            // Validate the updated transaction
            const validation = await this.validateTransactionData(updatedData, financialYear.id);
            if (!validation.isValid) {
                throw new Error(`تعذر التحديث: ${validation.errors.join(', ')}`);
            }

            const batch = this.createBatch();
            const transactionRef = this.getDocumentRef('transactions', transactionId);

            // Reverse old account balance updates
            for (const entry of existingTransaction.entries) {
                await this.reverseAccountBalance(batch, entry, existingTransaction.financialYearId);
            }

            // Apply new account balance updates
            for (const entry of updatedData.entries) {
                await this.updateAccountBalance(batch, entry, financialYear.id);
            }

            // Update transaction
            const updatedTransaction: EnhancedTransaction = {
                ...existingTransaction,
                ...updatedData,
                updatedAt: new Date().toISOString()
            };

            batch.set(transactionRef, updatedTransaction);
            await batch.commit();

            return updatedTransaction;

        } catch (error) {
            this.handleError(error, 'updateTransaction');
        }
    }

    /**
     * Reverse a transaction (mark as reversed and undo balance changes)
     */
    static async reverseTransaction(transactionId: string, reason: string): Promise<boolean> {
        try {
            const transaction = await this.getDocumentById<EnhancedTransaction>('transactions', transactionId);
            if (!transaction) {
                throw new Error('المعاملة غير موجودة');
            }

            if (transaction.status === 'reversed') {
                throw new Error('المعاملة مسترجعة بالفعل');
            }

            // Check if financial year is still open
            const financialYear = await FinancialYearService.getCurrentFinancialYear(transaction.shopId);
            if (!financialYear || financialYear.status !== 'open') {
                throw new Error('لا يمكن استرجاع المعاملات في سنة مالية مغلقة');
            }

            const batch = this.createBatch();

            // Reverse account balance changes
            for (const entry of transaction.entries) {
                await this.reverseAccountBalance(batch, entry, transaction.financialYearId);
            }

            // Update transaction status
            batch.update(this.getDocumentRef('transactions', transactionId), {
                status: 'reversed',
                reversalReason: reason,
                reversedAt: new Date().toISOString(),
                reversedBy: this.requireAuth()
            });

            await batch.commit();
            return true;

        } catch (error) {
            this.handleError(error, 'reverseTransaction');
        }
    }

    /**
     * Get account balance for specific financial year
     */
    static async getAccountBalanceForFY(
        accountId: string,
        financialYearId: string
    ): Promise<number> {
        try {
            const balanceDoc = await getDoc(
                doc(this.db, 'accountBalances', `${accountId}_${financialYearId}`)
            );

            if (balanceDoc.exists()) {
                const data = balanceDoc.data() as AccountBalance;
                return data.balance || 0;
            }

            // If no balance record exists, check account's opening balance
            const account = await this.getDocumentById<Account>('accounts', accountId);
            return account?.openingBalance || 0;

        } catch (error) {
            console.error('Error getting account balance:', error);
            return 0;
        }
    }

    /**
     * Calculate total account balances for a list of accounts in specific financial year
     */
    static async calculateAccountsTotalForFY(
        accountIds: string[],
        financialYearId: string
    ): Promise<number> {
        let total = 0;
        for (const accountId of accountIds) {
            total += await this.getAccountBalanceForFY(accountId, financialYearId);
        }
        return total;
    }

    // ========== Private Helper Methods ==========

    /**
     * Validate stock account usage per financial year
     */
    private static async validateStockAccountUsage(
        entries: EnhancedTransactionEntry[],
        financialYearId: string
    ): Promise<void> {
        for (const entry of entries) {
            const account = await this.getDocumentById<Account>('accounts', entry.accountId);
            if (!account) {
                throw new Error(`الحساب غير موجود: ${entry.accountId}`);
            }

            if (account.type === AccountType.OPENING_STOCK || account.type === AccountType.ENDING_STOCK) {
                // Get the account's financial year context
                const accountFinancialYear = await this.getAccountFinancialYear(account);
                if (accountFinancialYear && accountFinancialYear.id !== financialYearId) {
                    throw new Error(`حساب المخزون ${account.name} ينتمي إلى سنة مالية مختلفة`);
                }
            }
        }
    }

    /**
     * Update account balance with financial year context
     */
    private static async updateAccountBalance(
        batch: WriteBatch,
        entry: EnhancedTransactionEntry,
        financialYearId: string
    ): Promise<void> {
        const balanceRef = doc(this.db, 'accountBalances', `${entry.accountId}_${financialYearId}`);

        const currentBalance = await this.getAccountBalanceForFY(entry.accountId, financialYearId);
        const newBalance = entry.type === 'debit'
            ? currentBalance + entry.amount
            : currentBalance - entry.amount;

        batch.set(balanceRef, {
            accountId: entry.accountId,
            financialYearId,
            balance: newBalance,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
    }

    /**
     * Reverse account balance changes
     */
    private static async reverseAccountBalance(
        batch: WriteBatch,
        entry: EnhancedTransactionEntry,
        financialYearId: string
    ): Promise<void> {
        const balanceRef = doc(this.db, 'accountBalances', `${entry.accountId}_${financialYearId}`);

        const currentBalance = await this.getAccountBalanceForFY(entry.accountId, financialYearId);
        const newBalance = entry.type === 'debit'
            ? currentBalance - entry.amount
            : currentBalance + entry.amount;

        batch.set(balanceRef, {
            accountId: entry.accountId,
            financialYearId,
            balance: newBalance,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
    }

    /**
     * Get active financial year for a shop
     */
    private static async getActiveFinancialYear(shopId: string): Promise<FinancialYear | null> {
        return await FinancialYearService.getCurrentFinancialYear(shopId);
    }

    /**
     * Get financial year for an account (for stock accounts)
     */
    private static async getAccountFinancialYear(account: Account): Promise<FinancialYear | null> {
        if (account.type === AccountType.OPENING_STOCK || account.type === AccountType.ENDING_STOCK) {
            // Extract year from account code or name
            const yearMatch = account.accountCode.match(/(\d{4})/);
            if (yearMatch) {
                const year = yearMatch[1];
                const financialYears = await FinancialYearService.getFinancialYearsByShop(account.shopId);
                return financialYears.find(fy => fy.name.includes(year)) || null;
            }
        }
        return null;
    }

    /**
     * Validate transaction data
     */
    private static async validateTransactionData(
        data: CreateTransactionData,
        financialYearId: string
    ): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic validation
        if (!data.entries || data.entries.length === 0) {
            errors.push('يجب أن تحتوي المعاملة على قيود محاسبية');
        }

        // Double-entry validation
        const totalDebits = data.entries
            .filter(e => e.type === 'debit')
            .reduce((sum, e) => sum + e.amount, 0);
        const totalCredits = data.entries
            .filter(e => e.type === 'credit')
            .reduce((sum, e) => sum + e.amount, 0);

        if (Math.abs(totalDebits - totalCredits) > 0.01) {
            errors.push('يجب أن تكون المعاملة متوازنة (المدين = الدائن)');
        }

        // Account existence validation
        for (const entry of data.entries) {
            const account = await this.getDocumentById<Account>('accounts', entry.accountId);
            if (!account) {
                errors.push(`الحساب غير موجود: ${entry.accountId}`);
            } else if (!account.isActive) {
                warnings.push(`الحساب غير نشط: ${account.name}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}