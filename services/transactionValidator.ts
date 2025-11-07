import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc
} from 'firebase/firestore';
import { BaseService } from './baseService';
import { FinancialYearService } from './financialYearService';
import { AccountingEngine } from './accountingEngine';
import {
    CreateTransactionData,
    EnhancedTransaction,
    EnhancedTransactionEntry,
    ValidationResult,
    Account,
    FinancialYear,
    User,
    AccountType,
    AccountClassification,
    TransactionType
} from '../types';
import { formatCurrency, formatNumber } from '../utils/formatting';

// Helper function to normalize date to YYYY-MM-DD format
const normalizeDateString = (dateStr: string): string => {
    if (dateStr.includes('T')) {
        // Old ISO format: extract date part
        return dateStr.split('T')[0];
    }
    // Already in YYYY-MM-DD format
    return dateStr;
};

export class TransactionValidator extends BaseService {

    /**
     * Comprehensive transaction validation against all business rules
     */
    static async validateTransaction(transaction: CreateTransactionData): Promise<ValidationResult> {
        try {
            const validations = await Promise.all([
                this.validateDoubleEntry(transaction),
                this.validateAccountTypes(transaction),
                this.validateFinancialYear(transaction),
                this.validateStockAccounts(transaction),
                this.validateAccountPermissions(transaction),
                this.validateAmountLimits(transaction),
                this.validateBusinessRules(transaction),
                this.validateDateRules(transaction)
            ]);

            const errors = validations.flatMap(v => v.errors);
            const warnings = validations.flatMap(v => v.warnings);

            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };

        } catch (error) {
            return {
                isValid: false,
                errors: [`خطأ في التحقق من صحة المعاملة: ${error}`],
                warnings: []
            };
        }
    }

    /**
     * Validate transaction for specific financial year context
     */
    static async validateTransactionForFinancialYear(
        transaction: CreateTransactionData,
        financialYearId: string
    ): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            const financialYear = await this.getDocumentById<FinancialYear>('financialYears', financialYearId);

            if (!financialYear) {
                errors.push('السنة المالية غير موجودة');
                return { isValid: false, errors, warnings };
            }

            // Check if financial year belongs to the same shop
            if (financialYear.shopId !== transaction.shopId) {
                errors.push('السنة المالية لا تنتمي للمحل المحدد');
            }

            // Check if financial year is open
            if (financialYear.status !== 'open') {
                errors.push('لا يمكن إنشاء معاملات في سنة مالية مغلقة');
            }

            // Validate transaction date within financial year range using string comparison
            const transactionDateStr = normalizeDateString(transaction.date);
            const startDateStr = normalizeDateString(financialYear.startDate);
            const endDateStr = normalizeDateString(financialYear.endDate);

            if (transactionDateStr < startDateStr || transactionDateStr > endDateStr) {
                errors.push(`تاريخ المعاملة (${transactionDateStr}) خارج نطاق السنة المالية (${startDateStr} - ${endDateStr})`);
            }

            // Check for future dates
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            if (transactionDateStr > todayStr) {
                warnings.push('تاريخ المعاملة في المستقبل');
            }

            // Check for old dates (more than 1 year old)
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            if (transactionDate < oneYearAgo) {
                warnings.push('تاريخ المعاملة قديم جداً (أكثر من سنة)');
            }

        } catch (error) {
            errors.push(`خطأ في التحقق من السنة المالية: ${error}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate bulk transactions with performance optimization
     */
    static async validateBulkTransactions(
        transactions: CreateTransactionData[]
    ): Promise<{ validTransactions: CreateTransactionData[]; invalidTransactions: Array<{ transaction: CreateTransactionData; errors: string[] }> }> {
        const validTransactions: CreateTransactionData[] = [];
        const invalidTransactions: Array<{ transaction: CreateTransactionData; errors: string[] }> = [];

        for (const transaction of transactions) {
            const validation = await this.validateTransaction(transaction);
            if (validation.isValid) {
                validTransactions.push(transaction);
            } else {
                invalidTransactions.push({
                    transaction,
                    errors: validation.errors
                });
            }
        }

        return { validTransactions, invalidTransactions };
    }

    // ========== Specific Validation Methods ==========

    /**
     * Validate double-entry bookkeeping rule
     */
    private static async validateDoubleEntry(transaction: CreateTransactionData): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check if entries exist
        if (!transaction.entries || transaction.entries.length === 0) {
            errors.push('يجب أن تحتوي المعاملة على قيود محاسبية');
            return { isValid: false, errors, warnings };
        }

        // Check minimum entries (at least 2)
        if (transaction.entries.length < 2) {
            errors.push('يجب أن تحتوي المعاملة على قيدين محاسبيين على الأقل');
        }

        // Calculate totals
        const totalDebits = transaction.entries
            .filter(e => e.type === 'debit')
            .reduce((sum, e) => sum + e.amount, 0);

        const totalCredits = transaction.entries
            .filter(e => e.type === 'credit')
            .reduce((sum, e) => sum + e.amount, 0);

        // Check balance
        const difference = Math.abs(totalDebits - totalCredits);
        if (difference > 0.01) {
            errors.push(`المعاملة غير متوازنة: المدين = ${formatCurrency(totalDebits)}, الدائن = ${formatCurrency(totalCredits)}, الفرق = ${formatCurrency(difference)}`);
        }

        // Check for zero amounts
        const zeroAmountEntries = transaction.entries.filter(e => e.amount <= 0);
        if (zeroAmountEntries.length > 0) {
            errors.push('جميع المبالغ يجب أن تكون أكبر من الصفر');
        }

        // Check for duplicate accounts on same side
        const debitAccounts = transaction.entries.filter(e => e.type === 'debit').map(e => e.accountId);
        const creditAccounts = transaction.entries.filter(e => e.type === 'credit').map(e => e.accountId);

        const duplicateDebits = debitAccounts.filter((account, index) => debitAccounts.indexOf(account) !== index);
        const duplicateCredits = creditAccounts.filter((account, index) => creditAccounts.indexOf(account) !== index);

        if (duplicateDebits.length > 0 || duplicateCredits.length > 0) {
            warnings.push('يوجد حسابات مكررة في نفس الجانب');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate account types and their usage
     */
    private static async validateAccountTypes(transaction: CreateTransactionData): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const entry of transaction.entries) {
            try {
                const account = await this.getDocumentById<Account>('accounts', entry.accountId);

                if (!account) {
                    errors.push(`الحساب غير موجود: ${entry.accountId}`);
                    continue;
                }

                // Check if account is active
                if (!account.isActive) {
                    errors.push(`الحساب غير نشط: ${account.name}`);
                    continue;
                }

                // Check if account belongs to the same shop
                if (account.shopId !== transaction.shopId) {
                    errors.push(`الحساب ${account.name} لا يينتمي للمحل المحدد`);
                    continue;
                }

                // HIERARCHY VALIDATION: Check if expense account is a leaf (no children)
                if (account.type === AccountType.EXPENSES) {
                    const hasChildren = await this.hasChildAccounts(account.id, account.shopId);
                    if (hasChildren) {
                        errors.push(`لا يمكن تسجيل قيد على حساب المصروفات "${account.name}" لأنه يحتوي على حسابات فرعية. يجب التسجيل على الحساب الفرعي المحدد`);
                        continue;
                    }
                }

                // Validate account type usage based on transaction type
                const typeValidation = this.validateAccountTypeUsage(account, entry, transaction.type);
                if (!typeValidation.isValid) {
                    errors.push(`خطأ في استخدام الحساب ${account.name}: ${typeValidation.error}`);
                }

                // Check for unusual account combinations
                const combinationWarning = this.checkAccountCombinations(account, entry, transaction);
                if (combinationWarning) {
                    warnings.push(combinationWarning);
                }

            } catch (error) {
                errors.push(`خطأ في التحقق من الحساب ${entry.accountId}: ${error}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate financial year constraints
     */
    private static async validateFinancialYear(transaction: CreateTransactionData): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Get active financial year for the shop
            const activeFinancialYear = await FinancialYearService.getCurrentFinancialYear(transaction.shopId);

            if (!activeFinancialYear) {
                errors.push('لا توجد سنة مالية نشطة للمحل');
                return { isValid: false, errors, warnings };
            }

            // Check if transaction date falls within financial year using string comparison
            const transactionDateStr = normalizeDateString(transaction.date);
            const fyStartDateStr = normalizeDateString(activeFinancialYear.startDate);
            const fyEndDateStr = normalizeDateString(activeFinancialYear.endDate);

            if (transactionDateStr < fyStartDateStr || transactionDateStr > fyEndDateStr) {
                errors.push(`تاريخ المعاملة خارج نطاق السنة المالية النشطة (${fyStartDateStr} - ${fyEndDateStr})`);
            }

            // Check for period-end restrictions (last 30 days of financial year)
            const fyEndDate = new Date(fyEndDateStr);
            const restrictionPeriod = new Date(fyEndDate);
            restrictionPeriod.setDate(restrictionPeriod.getDate() - 30);
            const restrictionDateStr = `${restrictionPeriod.getFullYear()}-${String(restrictionPeriod.getMonth() + 1).padStart(2, '0')}-${String(restrictionPeriod.getDate()).padStart(2, '0')}`;

            if (transactionDateStr > restrictionDateStr && transactionDateStr <= fyEndDateStr) {
                warnings.push('المعاملة في فترة قريبة من نهاية السنة المالية - تأكد من صحة التاريخ');
            }

        } catch (error) {
            errors.push(`خطأ في التحقق من السنة المالية: ${error}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate stock account specific rules
     */
    private static async validateStockAccounts(transaction: CreateTransactionData): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const entry of transaction.entries) {
            try {
                const account = await this.getDocumentById<Account>('accounts', entry.accountId);

                if (!account) continue;

                if (account.type === AccountType.OPENING_STOCK) {
                    // Opening stock validation
                    if (entry.type !== 'debit') {
                        errors.push(`حساب بضاعة أول المدة (${account.name}) يجب أن يكون مدين`);
                    }

                    // Check if used only at beginning of financial year
                    const financialYear = await FinancialYearService.getCurrentFinancialYear(transaction.shopId);
                    if (financialYear) {
                        // Normalize dates to YYYY-MM-DD and parse to Date objects for calculation
                        const transactionDateStr = normalizeDateString(transaction.date);
                        const fyStartDateStr = normalizeDateString(financialYear.startDate);

                        const transactionDate = new Date(transactionDateStr + 'T00:00:00');
                        const fyStartDate = new Date(fyStartDateStr + 'T00:00:00');
                        const gracePeriod = 30; // 30 days grace period

                        const daysDifference = Math.floor((transactionDate.getTime() - fyStartDate.getTime()) / (1000 * 60 * 60 * 24));

                        if (daysDifference > gracePeriod) {
                            warnings.push(`استخدام حساب بضاعة أول المدة بعد ${daysDifference} يوم من بداية السنة المالية`);
                        }
                    }
                }

                if (account.type === AccountType.ENDING_STOCK) {
                    // Ending stock validation
                    if (entry.type !== 'debit') {
                        errors.push(`حساب بضاعة آخر المدة (${account.name}) يجب أن يكون مدين`);
                    }

                    // Check if used near end of financial year
                    const financialYear = await FinancialYearService.getCurrentFinancialYear(transaction.shopId);
                    if (financialYear) {
                        const transactionDate = new Date(transaction.date);
                        const fyEndDate = new Date(financialYear.endDate);
                        const gracePeriod = 30; // 30 days before end

                        const daysDifference = Math.floor((fyEndDate.getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24));

                        if (daysDifference > gracePeriod) {
                            warnings.push(`استخدام حساب بضاعة آخر المدة قبل ${daysDifference} يوم من نهاية السنة المالية`);
                        }
                    }

                    // Validate stock value reasonableness
                    if (entry.amount > 5000000) { // 5 million SAR
                        warnings.push(`قيمة مخزون آخر المدة كبيرة جداً: ${formatCurrency(entry.amount)}`);
                    }
                }

            } catch (error) {
                errors.push(`خطأ في التحقق من حساب المخزون ${entry.accountId}: ${error}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate account permissions and user access
     */
    private static async validateAccountPermissions(transaction: CreateTransactionData): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            const currentUserId = this.getCurrentUserId();
            if (!currentUserId) {
                errors.push('المستخدم غير مسجل دخول');
                return { isValid: false, errors, warnings };
            }

            const user = await this.getDocumentById<User>('users', currentUserId);
            if (!user) {
                errors.push('بيانات المستخدم غير موجودة');
                return { isValid: false, errors, warnings };
            }

            // Check if user has access to the shop
            if (user.role !== 'admin' && user.shopId !== transaction.shopId) {
                errors.push('المستخدم لا يملك صلاحية التعامل مع هذا المحل');
            }

            // Check for high-value transaction limits based on user role
            const totalAmount = transaction.entries.reduce((sum, e) => sum + e.amount, 0);

            if (user.role === 'user' && totalAmount > 100000) { // 100,000 SAR limit for regular users
                errors.push('المبلغ يتجاوز الحد المسموح للمستخدم العادي (100,000 ريال)');
            }

            if (totalAmount > 1000000) { // 1 million SAR requires special approval
                warnings.push('معاملة بمبلغ كبير - قد تحتاج موافقة خاصة');
            }

        } catch (error) {
            errors.push(`خطأ في التحقق من الصلاحيات: ${error}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate amount limits and reasonableness
     */
    private static async validateAmountLimits(transaction: CreateTransactionData): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        const totalAmount = transaction.entries.reduce((sum, e) => sum + e.amount, 0) / 2; // Divide by 2 because each entry is counted twice

        // Maximum transaction limit
        if (totalAmount > 10000000) { // 10 million SAR
            errors.push(`مبلغ المعاملة يتجاوز الحد الأقصى المسموح (10 مليون): ${formatCurrency(totalAmount)}`);
        }

        // Minimum transaction amount
        if (totalAmount < 0.01) {
            errors.push('مبلغ المعاملة صغير جداً');
        }

        // Check for round numbers (possible data entry errors)
        if (totalAmount >= 1000 && totalAmount % 100 === 0) {
            warnings.push('المبلغ رقم دائري - تأكد من صحة الإدخال');
        }

        // Check individual entry limits
        for (const entry of transaction.entries) {
            if (entry.amount > 5000000) { // 5 million SAR per entry
                warnings.push(`قيد محاسبي بمبلغ كبير: ${formatCurrency(entry.amount)}`);
            }

            // Check for very small amounts
            if (entry.amount < 1 && entry.amount > 0) {
                warnings.push(`قيد محاسبي بمبلغ صغير جداً: ${entry.amount} ريال`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate general business rules
     */
    private static async validateBusinessRules(transaction: CreateTransactionData): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate description
        if (!transaction.description || transaction.description.trim().length < 3) {
            errors.push('وصف المعاملة مطلوب ويجب أن يكون 3 أحرف على الأقل');
        }

        if (transaction.description && transaction.description.length > 200) {
            warnings.push('وصف المعاملة طويل جداً');
        }

        // Check for weekend transactions
        const transactionDate = new Date(transaction.date);
        const dayOfWeek = transactionDate.getDay();
        if (dayOfWeek === 5 || dayOfWeek === 6) { // Friday or Saturday
            warnings.push('معاملة في عطلة نهاية الأسبوع');
        }

        // Check for after-hours transactions
        const transactionHour = transactionDate.getHours();
        if (transactionHour < 6 || transactionHour > 22) {
            warnings.push('معاملة خارج ساعات العمل العادية');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate date-related rules
     */
    private static async validateDateRules(transaction: CreateTransactionData): Promise<ValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        const transactionDate = new Date(transaction.date);
        const currentDate = new Date();

        // Check for invalid dates
        if (isNaN(transactionDate.getTime())) {
            errors.push('تاريخ المعاملة غير صحيح');
            return { isValid: false, errors, warnings };
        }

        // Check for future dates
        if (transactionDate > currentDate) {
            errors.push('لا يمكن إنشاء معاملات بتاريخ مستقبلي');
        }

        // Check for very old dates
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        if (transactionDate < twoYearsAgo) {
            warnings.push('تاريخ المعاملة قديم جداً (أكثر من سنتين)');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    // ========== Helper Methods ==========

    /**
     * Validate account type usage based on transaction type
     */
    private static validateAccountTypeUsage(
        account: Account,
        entry: EnhancedTransactionEntry,
        transactionType: TransactionType
    ): { isValid: boolean; error?: string } {

        // Sales transaction validation
        if (transactionType === TransactionType.SALE) {
            if (account.type === AccountType.PURCHASES && entry.type === 'debit') {
                return { isValid: false, error: 'لا يمكن استخدام حساب المشتريات كمدين في معاملة بيع' };
            }
        }

        // Purchase transaction validation
        if (transactionType === TransactionType.PURCHASE) {
            if (account.type === AccountType.SALES && entry.type === 'credit') {
                return { isValid: false, error: 'لا يمكن استخدام حساب المبيعات كدائن في معاملة شراء' };
            }
        }

        return { isValid: true };
    }

    /**
     * Check for unusual account combinations
     */
    private static checkAccountCombinations(
        account: Account,
        entry: EnhancedTransactionEntry,
        transaction: CreateTransactionData
    ): string | null {

        // Check for cash accounts with large amounts
        if (account.type === AccountType.CASH && entry.amount > 100000) {
            return `معاملة نقدية بمبلغ كبير: ${formatCurrency(entry.amount)}`;
        }

        // Check for bank transfers to same bank
        if (account.type === AccountType.BANK) {
            const otherBankEntries = transaction.entries.filter(e =>
                e.accountId !== entry.accountId &&
                e.type !== entry.type
            );

            // This would require checking if other entries are also bank accounts
            // Implementation depends on account naming conventions
        }

        return null;
    }

    /**
     * Check if an account has child accounts
     */
    private static async hasChildAccounts(accountId: string, shopId: string): Promise<boolean> {
        try {
            const childrenQuery = query(
                this.getCollectionRef('accounts'),
                where('parentId', '==', accountId),
                where('shopId', '==', shopId)
            );

            const snapshot = await getDocs(childrenQuery);
            return !snapshot.empty;

        } catch (error) {
            console.error('Error checking child accounts:', error);
            return false;
        }
    }
}