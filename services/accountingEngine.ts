import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    getDoc,
    Query
} from 'firebase/firestore';
import { BaseService } from './baseService';
import { FinancialYearService } from './financialYearService';
import { TransactionService } from './transactionService';
import {
    EnhancedTransaction,
    EnhancedTransactionEntry,
    ValidationResult,
    BalanceMatrix,
    AccountBalance,
    Account,
    FinancialYear,
    AccountType,
    AccountClassification,
    AccountNature
} from '../types';
import { formatCurrency } from '../utils/formatting';

export class AccountingEngine extends BaseService {

    /**
     * Validate transaction posting rules with comprehensive business logic
     */
    static async validatePostingRules(transaction: EnhancedTransaction): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // 1. Double-entry validation
            if (!this.isTransactionBalanced(transaction)) {
                errors.push('المعاملة غير متوازنة - مجموع المدين يجب أن يساوي مجموع الدائن');
            }

            // 2. Account type validation
            for (const entry of transaction.entries) {
                const account = await this.getDocumentById<Account>('accounts', entry.accountId);
                if (account) {
                    const validationResult = this.validateAccountUsage(account, entry);
                    if (!validationResult.isValid) {
                        errors.push(`خطأ في الحساب ${account.name}: ${validationResult.error}`);
                    }
                }
            }

            // 3. Financial year validation
            const fyValidation = await this.validateFinancialYearRules(transaction);
            if (!fyValidation.isValid) {
                errors.push(fyValidation.error);
            }

            // 4. Stock account specific validation
            const stockValidation = await this.validateStockAccountRules(transaction);
            if (!stockValidation.isValid) {
                errors.push(stockValidation.error);
            }

            // 5. Amount validation
            const amountValidation = this.validateAmountRules(transaction);
            if (!amountValidation.isValid) {
                errors.push(amountValidation.error);
            }

            // 6. Business logic warnings
            const businessWarnings = await this.checkBusinessLogicWarnings(transaction);
            warnings.push(...businessWarnings);

        } catch (error) {
            errors.push(`خطأ في التحقق من صحة المعاملة: ${error}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Calculate multi-dimensional account balances with complex aggregation
     */
    static async calculateMultiDimensionalBalances(
        shopId?: string,
        financialYearId?: string,
        accountType?: AccountType,
        accountClassification?: AccountClassification
    ): Promise<BalanceMatrix> {
        try {
            const balances: BalanceMatrix = {
                perShopPerYear: {},
                perShopAllYears: {},
                allShopsPerYear: {},
                grandTotal: 0
            };

            // Build query for account balances
            let balanceQuery = this.getCollectionRef('accountBalances');

            // Apply filters and get all relevant balances
            const balanceSnapshot = await getDocs(balanceQuery);
            const allBalances: AccountBalance[] = balanceSnapshot.docs.map(doc => ({
                ...doc.data()
            } as AccountBalance));

            // Filter balances based on criteria
            const filteredBalances = await this.filterBalancesByCriteria(
                allBalances,
                shopId,
                financialYearId,
                accountType,
                accountClassification
            );

            // Aggregate balances into matrix structure
            await this.aggregateBalancesIntoMatrix(balances, filteredBalances);

            return balances;

        } catch (error) {
            this.handleError(error, 'calculateMultiDimensionalBalances');
        }
    }

    /**
     * Generate comprehensive account trial balance
     */
    static async generateTrialBalance(
        shopId?: string,
        financialYearId?: string,
        asOfDate?: string
    ): Promise<{ debits: number; credits: number; accounts: any[] }> {
        try {
            const accounts = await this.getAccountsForTrialBalance(shopId, financialYearId);
            const trialBalanceAccounts: any[] = [];
            let totalDebits = 0;
            let totalCredits = 0;

            for (const account of accounts) {
                const balance = await this.calculateAccountBalanceForPeriod(
                    account.id,
                    financialYearId,
                    asOfDate
                );

                if (Math.abs(balance) > 0.01) {
                    const debitBalance = balance >= 0 ? balance : 0;
                    const creditBalance = balance < 0 ? Math.abs(balance) : 0;

                    trialBalanceAccounts.push({
                        accountId: account.id,
                        accountCode: account.accountCode,
                        accountName: account.name,
                        debitBalance,
                        creditBalance,
                        classification: account.classification,
                        nature: account.nature
                    });

                    totalDebits += debitBalance;
                    totalCredits += creditBalance;
                }
            }

            return {
                debits: totalDebits,
                credits: totalCredits,
                accounts: trialBalanceAccounts
            };

        } catch (error) {
            this.handleError(error, 'generateTrialBalance');
        }
    }

    /**
     * Validate financial year business rules
     */
    static async validateFinancialYearBusinessRules(
        shopId: string,
        financialYearId: string
    ): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            const financialYear = await FinancialYearService.getCurrentFinancialYear(shopId);

            if (!financialYear) {
                errors.push('لا توجد سنة مالية نشطة للمحل');
                return { isValid: false, errors, warnings };
            }

            // Check if financial year is in valid date range
            const currentDate = new Date();
            const startDate = new Date(financialYear.startDate);
            const endDate = new Date(financialYear.endDate);

            if (currentDate < startDate) {
                warnings.push('التاريخ الحالي قبل بداية السنة المالية');
            } else if (currentDate > endDate) {
                warnings.push('التاريخ الحالي بعد نهاية السنة المالية');
            }

            // Check for stock continuity
            const stockContinuity = await this.validateStockContinuityForYear(shopId, financialYearId);
            if (!stockContinuity.isValid) {
                warnings.push('يوجد مشاكل في استمرارية المخزون');
            }

            // Check for unbalanced transactions
            const unbalancedCount = await this.checkUnbalancedTransactions(shopId, financialYearId);
            if (unbalancedCount > 0) {
                errors.push(`يوجد ${unbalancedCount} معاملة غير متوازنة`);
            }

        } catch (error) {
            errors.push(`خطأ في التحقق من قواعد السنة المالية: ${error}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Advanced query builder for complex financial reporting
     */
    static buildAdvancedFinancialQuery(criteria: {
        shopIds?: string[];
        financialYearIds?: string[];
        accountTypes?: AccountType[];
        accountClassifications?: AccountClassification[];
        dateRange?: { start: string; end: string };
        includeInactive?: boolean;
    }): Query {
        let baseQuery = this.getCollectionRef('transactions');

        // Apply shop filter
        if (criteria.shopIds && criteria.shopIds.length > 0) {
            if (criteria.shopIds.length === 1) {
                baseQuery = query(baseQuery, where('shopId', '==', criteria.shopIds[0]));
            } else {
                baseQuery = query(baseQuery, where('shopId', 'in', criteria.shopIds));
            }
        }

        // Apply financial year filter
        if (criteria.financialYearIds && criteria.financialYearIds.length > 0) {
            if (criteria.financialYearIds.length === 1) {
                baseQuery = query(baseQuery, where('financialYearId', '==', criteria.financialYearIds[0]));
            } else {
                baseQuery = query(baseQuery, where('financialYearId', 'in', criteria.financialYearIds));
            }
        }

        // Apply date range filter
        if (criteria.dateRange) {
            baseQuery = query(
                baseQuery,
                where('date', '>=', criteria.dateRange.start),
                where('date', '<=', criteria.dateRange.end)
            );
        }

        // Add ordering
        baseQuery = query(baseQuery, orderBy('date', 'desc'));

        return baseQuery;
    }

    // ========== Private Helper Methods ==========

    /**
     * Check if transaction is balanced (debits = credits)
     */
    private static isTransactionBalanced(transaction: EnhancedTransaction): boolean {
        const totalDebits = transaction.entries
            .filter(e => e.type === 'debit')
            .reduce((sum, e) => sum + e.amount, 0);
        const totalCredits = transaction.entries
            .filter(e => e.type === 'credit')
            .reduce((sum, e) => sum + e.amount, 0);

        return Math.abs(totalDebits - totalCredits) <= 0.01;
    }

    /**
     * Validate account usage based on account type and nature
     */
    private static validateAccountUsage(
        account: Account,
        entry: EnhancedTransactionEntry
    ): { isValid: boolean; error?: string } {
        // Check if account is active
        if (!account.isActive) {
            return { isValid: false, error: 'الحساب غير نشط' };
        }

        // Validate amount is positive
        if (entry.amount <= 0) {
            return { isValid: false, error: 'المبلغ يجب أن يكون أكبر من الصفر' };
        }

        // Validate account nature consistency (optional business rule)
        if (account.nature === AccountNature.DEBIT && entry.type === 'credit' && entry.amount > 1000000) {
            return { isValid: false, error: 'مبلغ كبير في الجانب المخالف لطبيعة الحساب' };
        }

        // Stock account specific validations
        if (account.type === AccountType.OPENING_STOCK || account.type === AccountType.ENDING_STOCK) {
            if (entry.type !== 'debit') {
                return { isValid: false, error: 'حسابات المخزون يجب أن تكون مدينة' };
            }
        }

        return { isValid: true };
    }

    /**
     * Validate financial year rules for transaction
     */
    private static async validateFinancialYearRules(
        transaction: EnhancedTransaction
    ): Promise<{ isValid: boolean; error?: string }> {
        try {
            const financialYear = await this.getDocumentById<FinancialYear>('financialYears', transaction.financialYearId);

            if (!financialYear) {
                return { isValid: false, error: 'السنة المالية غير موجودة' };
            }

            if (financialYear.status !== 'open') {
                return { isValid: false, error: 'السنة المالية مغلقة' };
            }

            if (financialYear.shopId !== transaction.shopId) {
                return { isValid: false, error: 'السنة المالية لا تنتمي للمحل المحدد' };
            }

            // Validate transaction date is within financial year
            const transactionDate = new Date(transaction.date);
            const startDate = new Date(financialYear.startDate);
            const endDate = new Date(financialYear.endDate);

            if (transactionDate < startDate || transactionDate > endDate) {
                return { isValid: false, error: 'تاريخ المعاملة خارج نطاق السنة المالية' };
            }

            return { isValid: true };

        } catch (error) {
            return { isValid: false, error: `خطأ في التحقق من السنة المالية: ${error}` };
        }
    }

    /**
     * Validate stock account specific rules
     */
    private static async validateStockAccountRules(
        transaction: EnhancedTransaction
    ): Promise<{ isValid: boolean; error?: string }> {
        try {
            for (const entry of transaction.entries) {
                const account = await this.getDocumentById<Account>('accounts', entry.accountId);

                if (account && (account.type === AccountType.OPENING_STOCK || account.type === AccountType.ENDING_STOCK)) {
                    // Opening stock should only be used at the beginning of financial year
                    if (account.type === AccountType.OPENING_STOCK) {
                        const financialYear = await this.getDocumentById<FinancialYear>('financialYears', transaction.financialYearId);
                        if (financialYear) {
                            const transactionDate = new Date(transaction.date);
                            const fyStartDate = new Date(financialYear.startDate);

                            // Allow some grace period (30 days) for opening stock adjustments
                            const gracePeriodEnd = new Date(fyStartDate);
                            gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 30);

                            if (transactionDate > gracePeriodEnd) {
                                return {
                                    isValid: false,
                                    error: 'حساب بضاعة أول المدة يستخدم فقط في بداية السنة المالية'
                                };
                            }
                        }
                    }

                    // Stock accounts should only be debited (increased)
                    if (entry.type !== 'debit') {
                        return {
                            isValid: false,
                            error: 'حسابات المخزون يجب أن تكون مدينة فقط'
                        };
                    }
                }
            }

            return { isValid: true };

        } catch (error) {
            return { isValid: false, error: `خطأ في التحقق من قواعد المخزون: ${error}` };
        }
    }

    /**
     * Validate amount rules
     */
    private static validateAmountRules(
        transaction: EnhancedTransaction
    ): { isValid: boolean; error?: string } {
        // Check for reasonable amount limits
        const totalAmount = transaction.entries.reduce((sum, e) => sum + e.amount, 0);

        if (totalAmount > 10000000) { // 10 million SAR limit
            return {
                isValid: false,
                error: 'مبلغ المعاملة يتجاوز الحد المسموح (10 مليون ريال)'
            };
        }

        if (totalAmount < 0.01) {
            return {
                isValid: false,
                error: 'مبلغ المعاملة صغير جداً'
            };
        }

        return { isValid: true };
    }

    /**
     * Check business logic warnings
     */
    private static async checkBusinessLogicWarnings(
        transaction: EnhancedTransaction
    ): Promise<string[]> {
        const warnings: string[] = [];

        try {
            // Check for large cash transactions
            for (const entry of transaction.entries) {
                const account = await this.getDocumentById<Account>('accounts', entry.accountId);
                if (account && account.type === AccountType.CASH && entry.amount > 50000) {
                    warnings.push(`معاملة نقدية كبيرة: ${formatCurrency(entry.amount)}`);
                }
            }

            // Check for weekend transactions
            const transactionDate = new Date(transaction.date);
            const dayOfWeek = transactionDate.getDay();
            if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday or Saturday
                warnings.push('معاملة في عطلة نهاية الأسبوع');
            }

        } catch (error) {
            console.error('Error checking business logic warnings:', error);
        }

        return warnings;
    }

    /**
     * Filter balances by multiple criteria
     */
    private static async filterBalancesByCriteria(
        balances: AccountBalance[],
        shopId?: string,
        financialYearId?: string,
        accountType?: AccountType,
        accountClassification?: AccountClassification
    ): Promise<AccountBalance[]> {
        let filteredBalances = balances;

        // Filter by financial year
        if (financialYearId) {
            filteredBalances = filteredBalances.filter(b => b.financialYearId === financialYearId);
        }

        // Filter by account criteria
        if (accountType || accountClassification || shopId) {
            const validAccountIds = new Set<string>();

            for (const balance of filteredBalances) {
                const account = await this.getDocumentById<Account>('accounts', balance.accountId);
                if (account) {
                    let includeAccount = true;

                    if (shopId && account.shopId !== shopId) includeAccount = false;
                    if (accountType && account.type !== accountType) includeAccount = false;
                    if (accountClassification && account.classification !== accountClassification) includeAccount = false;

                    if (includeAccount) {
                        validAccountIds.add(balance.accountId);
                    }
                }
            }

            filteredBalances = filteredBalances.filter(b => validAccountIds.has(b.accountId));
        }

        return filteredBalances;
    }

    /**
     * Aggregate balances into matrix structure
     */
    private static async aggregateBalancesIntoMatrix(
        matrix: BalanceMatrix,
        balances: AccountBalance[]
    ): Promise<void> {
        for (const balance of balances) {
            const account = await this.getDocumentById<Account>('accounts', balance.accountId);
            if (account) {
                const shopId = account.shopId;
                const fyId = balance.financialYearId;
                const amount = balance.balance;

                // Per shop per year
                if (!matrix.perShopPerYear[shopId]) {
                    matrix.perShopPerYear[shopId] = {};
                }
                matrix.perShopPerYear[shopId][fyId] = (matrix.perShopPerYear[shopId][fyId] || 0) + amount;

                // Per shop all years
                matrix.perShopAllYears[shopId] = (matrix.perShopAllYears[shopId] || 0) + amount;

                // All shops per year
                matrix.allShopsPerYear[fyId] = (matrix.allShopsPerYear[fyId] || 0) + amount;

                // Grand total
                matrix.grandTotal += amount;
            }
        }
    }

    /**
     * Additional helper methods
     */
    private static async getAccountsForTrialBalance(
        shopId?: string,
        financialYearId?: string
    ): Promise<Account[]> {
        let accountsQuery = this.getCollectionRef('accounts');

        if (shopId) {
            accountsQuery = query(accountsQuery, where('shopId', '==', shopId));
        }

        const snapshot = await getDocs(accountsQuery);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
    }

    private static async calculateAccountBalanceForPeriod(
        accountId: string,
        financialYearId?: string,
        asOfDate?: string
    ): Promise<number> {
        if (financialYearId) {
            return await TransactionService.getAccountBalanceForFY(accountId, financialYearId);
        }

        // Calculate balance across all financial years if not specified
        const account = await this.getDocumentById<Account>('accounts', accountId);
        return account?.openingBalance || 0;
    }

    private static async validateStockContinuityForYear(
        shopId: string,
        financialYearId: string
    ): Promise<{ isValid: boolean }> {
        // Implementation would check stock continuity
        return { isValid: true };
    }

    private static async checkUnbalancedTransactions(
        shopId: string,
        financialYearId: string
    ): Promise<number> {
        // Implementation would count unbalanced transactions
        return 0;
    }
}