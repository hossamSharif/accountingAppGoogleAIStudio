import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    doc,
    getDoc
} from 'firebase/firestore';
import { BaseService } from './baseService';
import { TransactionService } from './transactionService';
import { FinancialYearService } from './financialYearService';
import { AccountService } from './accountService';
import {
    BalanceMatrix,
    ProfitMatrix,
    DetailedProfitCalculation,
    ComparativeProfitAnalysis,
    EnhancedTransaction,
    Account,
    FinancialYear,
    Shop,
    AccountType,
    AccountClassification
} from '../types';

export class BalanceCalculator extends BaseService {

    /**
     * Calculate account balance for specific financial year with transaction analysis
     */
    static async calculateAccountBalanceForFY(
        accountId: string,
        financialYearId: string,
        asOfDate?: string
    ): Promise<number> {
        try {
            // Get account to understand its nature and starting balance
            const account = await this.getDocumentById<Account>('accounts', accountId);
            if (!account) {
                throw new Error(`الحساب غير موجود: ${accountId}`);
            }

            // Start with opening balance
            let balance = account.openingBalance || 0;

            // Get all transactions for this account in the financial year
            let transactionQuery = query(
                this.getCollectionRef('transactions'),
                where('financialYearId', '==', financialYearId),
                orderBy('date', 'asc')
            );

            // Apply date filter if provided
            if (asOfDate) {
                transactionQuery = query(
                    transactionQuery,
                    where('date', '<=', asOfDate)
                );
            }

            const transactionSnapshot = await getDocs(transactionQuery);
            const transactions: EnhancedTransaction[] = transactionSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as EnhancedTransaction));

            // Process each transaction's entries for this account
            for (const transaction of transactions) {
                if (transaction.status === 'posted') { // Only count posted transactions
                    const relevantEntries = transaction.entries.filter(entry => entry.accountId === accountId);

                    for (const entry of relevantEntries) {
                        if (entry.type === 'debit') {
                            balance += entry.amount;
                        } else {
                            balance -= entry.amount;
                        }
                    }
                }
            }

            return balance;

        } catch (error) {
            this.handleError(error, 'calculateAccountBalanceForFY');
        }
    }

    /**
     * Calculate multi-dimensional profit matrix with comprehensive analysis
     */
    static async calculateProfitMatrix(
        shopId?: string,
        financialYearId?: string
    ): Promise<ProfitMatrix> {
        try {
            const matrix: ProfitMatrix = {
                perShopPerYear: {},
                perShopAllYears: {},
                allShopsPerYear: {},
                grandTotal: 0
            };

            // Get all combinations of shops and financial years based on filters
            const shops = shopId
                ? [await this.getShopById(shopId)].filter(Boolean) as Shop[]
                : await this.getAllShops();

            const financialYears = financialYearId
                ? [await this.getFinancialYearById(financialYearId)].filter(Boolean) as FinancialYear[]
                : await this.getAllFinancialYears();

            // Calculate profit for each shop-year combination
            for (const shop of shops) {
                matrix.perShopAllYears[shop.id] = 0;

                const shopFinancialYears = financialYears.filter(fy => fy.shopId === shop.id);

                for (const fy of shopFinancialYears) {
                    try {
                        const profit = await this.calculateProfitForShopAndYear(shop.id, fy.id);

                        // Update matrix dimensions
                        if (!matrix.perShopPerYear[shop.id]) {
                            matrix.perShopPerYear[shop.id] = {};
                        }
                        matrix.perShopPerYear[shop.id][fy.id] = profit;
                        matrix.perShopAllYears[shop.id] += profit;

                        if (!matrix.allShopsPerYear[fy.id]) {
                            matrix.allShopsPerYear[fy.id] = 0;
                        }
                        matrix.allShopsPerYear[fy.id] += profit;
                        matrix.grandTotal += profit;

                    } catch (error) {
                        console.error(`Error calculating profit for shop ${shop.name}, year ${fy.name}:`, error);
                        // Continue with other calculations
                    }
                }
            }

            return matrix;

        } catch (error) {
            this.handleError(error, 'calculateProfitMatrix');
        }
    }

    /**
     * Calculate profit using comprehensive accounting formula with stock integration
     */
    static async calculateProfitForShopAndYear(
        shopId: string,
        financialYearId: string
    ): Promise<number> {
        try {
            // Apply accounting formula: Profit = Sales - (Opening Stock + Purchases - Closing Stock) - Expenses
            const [sales, openingStock, purchases, closingStock, expenses] = await Promise.all([
                this.calculateTotalSales(shopId, financialYearId),
                this.getOpeningStockValue(shopId, financialYearId),
                this.calculateTotalPurchases(shopId, financialYearId),
                this.getClosingStockValue(shopId, financialYearId),
                this.calculateTotalExpenses(shopId, financialYearId)
            ]);

            const costOfGoodsSold = openingStock + purchases - closingStock;
            const grossProfit = sales - costOfGoodsSold;
            const netProfit = grossProfit - expenses;

            return netProfit;

        } catch (error) {
            this.handleError(error, 'calculateProfitForShopAndYear');
        }
    }

    /**
     * Calculate detailed profit with comprehensive breakdown and analysis
     */
    static async calculateProfitWithStockIntegration(
        shopId: string,
        financialYearId: string,
        includeProjections: boolean = false
    ): Promise<DetailedProfitCalculation> {
        try {
            const calculation: DetailedProfitCalculation = {
                shopId,
                financialYearId,
                calculatedAt: new Date().toISOString(),
                components: {
                    sales: 0,
                    openingStock: 0,
                    purchases: 0,
                    closingStock: 0,
                    expenses: 0
                },
                derivedValues: {
                    costOfGoodsSold: 0,
                    grossProfit: 0,
                    netProfit: 0,
                    profitMargin: 0
                },
                breakdown: {
                    salesByCategory: {},
                    expensesByCategory: {},
                    monthlyTrend: []
                }
            };

            // 1. Calculate main components
            const [sales, openingStock, purchases, closingStock, expenses] = await Promise.all([
                this.calculateTotalSales(shopId, financialYearId),
                this.getOpeningStockValue(shopId, financialYearId),
                this.calculateTotalPurchases(shopId, financialYearId),
                this.getClosingStockValue(shopId, financialYearId),
                this.calculateTotalExpenses(shopId, financialYearId)
            ]);

            calculation.components = {
                sales,
                openingStock,
                purchases,
                closingStock,
                expenses
            };

            // 2. Apply accounting formula
            calculation.derivedValues.costOfGoodsSold = openingStock + purchases - closingStock;
            calculation.derivedValues.grossProfit = sales - calculation.derivedValues.costOfGoodsSold;
            calculation.derivedValues.netProfit = calculation.derivedValues.grossProfit - expenses;
            calculation.derivedValues.profitMargin = sales > 0
                ? (calculation.derivedValues.netProfit / sales) * 100
                : 0;

            // 3. Generate detailed breakdown
            calculation.breakdown = await this.generateProfitBreakdown(shopId, financialYearId);

            return calculation;

        } catch (error) {
            this.handleError(error, 'calculateProfitWithStockIntegration');
        }
    }

    /**
     * Generate comparative analysis across multiple financial years
     */
    static async generateComparativeAnalysis(
        shopId: string,
        financialYearIds: string[]
    ): Promise<ComparativeProfitAnalysis> {
        try {
            const analysis: ComparativeProfitAnalysis = {
                shopId,
                comparedYears: financialYearIds,
                yearlyResults: {},
                trends: {
                    salesGrowth: [],
                    profitGrowth: [],
                    marginTrend: []
                },
                insights: []
            };

            // Calculate profit for each year
            for (const fyId of financialYearIds) {
                analysis.yearlyResults[fyId] = await this.calculateProfitWithStockIntegration(shopId, fyId);
            }

            // Calculate trends
            analysis.trends = this.calculateTrends(analysis.yearlyResults);

            // Generate insights
            analysis.insights = this.generateInsights(analysis.yearlyResults, analysis.trends);

            return analysis;

        } catch (error) {
            this.handleError(error, 'generateComparativeAnalysis');
        }
    }

    /**
     * Calculate account balances for multiple dimensions
     */
    static async calculateMultiDimensionalBalances(
        criteria: {
            shopIds?: string[];
            financialYearIds?: string[];
            accountTypes?: AccountType[];
            accountClassifications?: AccountClassification[];
        }
    ): Promise<BalanceMatrix> {
        try {
            const matrix: BalanceMatrix = {
                perShopPerYear: {},
                perShopAllYears: {},
                allShopsPerYear: {},
                grandTotal: 0
            };

            // Get accounts based on criteria
            const accounts = await this.getAccountsByCriteria(criteria);

            // Calculate balances for each account across dimensions
            for (const account of accounts) {
                const relevantFYs = criteria.financialYearIds
                    ? criteria.financialYearIds.filter(fyId => this.isAccountValidForFY(account, fyId))
                    : await this.getFinancialYearsForAccount(account);

                for (const fyId of relevantFYs) {
                    const balance = await this.calculateAccountBalanceForFY(account.id, fyId);

                    // Update matrix
                    if (!matrix.perShopPerYear[account.shopId]) {
                        matrix.perShopPerYear[account.shopId] = {};
                    }
                    matrix.perShopPerYear[account.shopId][fyId] =
                        (matrix.perShopPerYear[account.shopId][fyId] || 0) + balance;

                    matrix.perShopAllYears[account.shopId] =
                        (matrix.perShopAllYears[account.shopId] || 0) + balance;

                    matrix.allShopsPerYear[fyId] =
                        (matrix.allShopsPerYear[fyId] || 0) + balance;

                    matrix.grandTotal += balance;
                }
            }

            return matrix;

        } catch (error) {
            this.handleError(error, 'calculateMultiDimensionalBalances');
        }
    }

    /**
     * Calculate balance sheet with proper stock valuation
     */
    static async calculateBalanceSheetBalances(
        shopId: string,
        financialYearId: string,
        asOfDate?: string
    ): Promise<{
        assets: { current: number; nonCurrent: number; total: number };
        liabilities: { current: number; nonCurrent: number; total: number };
        equity: { capital: number; retainedEarnings: number; total: number };
    }> {
        try {
            const result = {
                assets: { current: 0, nonCurrent: 0, total: 0 },
                liabilities: { current: 0, nonCurrent: 0, total: 0 },
                equity: { capital: 0, retainedEarnings: 0, total: 0 }
            };

            // Get all accounts for the shop
            const accounts = await this.getAccountsByShop(shopId);

            for (const account of accounts) {
                const balance = await this.calculateAccountBalanceForFY(account.id, financialYearId, asOfDate);

                if (account.classification === AccountClassification.ASSETS) {
                    if (account.category === 'current' || account.type === AccountType.CASH || account.type === AccountType.BANK) {
                        result.assets.current += balance;
                    } else {
                        result.assets.nonCurrent += balance;
                    }
                    result.assets.total += balance;
                }
                else if (account.classification === AccountClassification.LIABILITIES) {
                    if (account.category === 'current') {
                        result.liabilities.current += balance;
                    } else {
                        result.liabilities.nonCurrent += balance;
                    }
                    result.liabilities.total += balance;
                }
                else if (account.classification === AccountClassification.EQUITY) {
                    result.equity.capital += balance;
                    result.equity.total += balance;
                }
            }

            // Add stock valuation to current assets
            const stockValue = await this.getStockValueForBalanceSheet(shopId, financialYearId, asOfDate);
            result.assets.current += stockValue;
            result.assets.total += stockValue;

            // Calculate retained earnings (simplified)
            const netProfit = await this.calculateProfitForShopAndYear(shopId, financialYearId);
            result.equity.retainedEarnings = netProfit;
            result.equity.total += netProfit;

            return result;

        } catch (error) {
            this.handleError(error, 'calculateBalanceSheetBalances');
        }
    }

    // ========== Private Helper Methods ==========

    /**
     * Calculate total sales for shop and financial year
     */
    private static async calculateTotalSales(shopId: string, financialYearId: string): Promise<number> {
        const salesAccounts = await this.getAccountsByType(shopId, AccountType.SALES);
        let total = 0;

        for (const account of salesAccounts) {
            // Sales accounts are typically credit nature, so we need the absolute credit balance
            const balance = await this.calculateAccountBalanceForFY(account.id, financialYearId);
            total += Math.abs(balance); // Take absolute value for sales
        }

        return total;
    }

    /**
     * Calculate total purchases for shop and financial year
     */
    private static async calculateTotalPurchases(shopId: string, financialYearId: string): Promise<number> {
        const purchaseAccounts = await this.getAccountsByType(shopId, AccountType.PURCHASES);
        let total = 0;

        for (const account of purchaseAccounts) {
            const balance = await this.calculateAccountBalanceForFY(account.id, financialYearId);
            total += balance; // Purchases are debit nature
        }

        return total;
    }

    /**
     * Calculate total expenses for shop and financial year
     */
    private static async calculateTotalExpenses(shopId: string, financialYearId: string): Promise<number> {
        const expenseAccounts = await this.getAccountsByType(shopId, AccountType.EXPENSES);
        let total = 0;

        for (const account of expenseAccounts) {
            const balance = await this.calculateAccountBalanceForFY(account.id, financialYearId);
            total += balance; // Expenses are debit nature
        }

        return total;
    }

    /**
     * Get opening stock value for financial year
     */
    private static async getOpeningStockValue(shopId: string, financialYearId: string): Promise<number> {
        const financialYear = await this.getFinancialYearById(financialYearId);
        return financialYear?.openingStockValue || 0;
    }

    /**
     * Get closing stock value for financial year
     */
    private static async getClosingStockValue(shopId: string, financialYearId: string): Promise<number> {
        const financialYear = await this.getFinancialYearById(financialYearId);
        return financialYear?.closingStockValue || 0;
    }

    /**
     * Get stock value for balance sheet (current stock)
     */
    private static async getStockValueForBalanceSheet(
        shopId: string,
        financialYearId: string,
        asOfDate?: string
    ): Promise<number> {
        // For balance sheet, we typically use current stock value
        // This could be either closing stock or a calculated current value
        const financialYear = await this.getFinancialYearById(financialYearId);

        if (financialYear?.status === 'closed' && financialYear.closingStockValue !== undefined) {
            return financialYear.closingStockValue;
        }

        // If year is still open, calculate current stock value
        // This is a simplified approach - in practice, you'd need real-time inventory tracking
        return financialYear?.openingStockValue || 0;
    }

    /**
     * Generate detailed profit breakdown by categories and time
     */
    private static async generateProfitBreakdown(
        shopId: string,
        financialYearId: string
    ): Promise<DetailedProfitCalculation['breakdown']> {
        const breakdown: DetailedProfitCalculation['breakdown'] = {
            salesByCategory: {},
            expensesByCategory: {},
            monthlyTrend: []
        };

        try {
            // Get all accounts for the shop
            const accounts = await this.getAccountsByShop(shopId);

            // Sales by category
            const salesAccounts = accounts.filter(a => a.type === AccountType.SALES);
            for (const account of salesAccounts) {
                const category = account.category || 'عام';
                const balance = await this.calculateAccountBalanceForFY(account.id, financialYearId);
                breakdown.salesByCategory[category] = (breakdown.salesByCategory[category] || 0) + Math.abs(balance);
            }

            // Expenses by category
            const expenseAccounts = accounts.filter(a => a.type === AccountType.EXPENSES);
            for (const account of expenseAccounts) {
                const category = account.category || 'عام';
                const balance = await this.calculateAccountBalanceForFY(account.id, financialYearId);
                breakdown.expensesByCategory[category] = (breakdown.expensesByCategory[category] || 0) + balance;
            }

            // Monthly trend (simplified - would need more complex date-based calculations)
            breakdown.monthlyTrend = await this.calculateMonthlyTrend(shopId, financialYearId);

        } catch (error) {
            console.error('Error generating profit breakdown:', error);
        }

        return breakdown;
    }

    /**
     * Calculate monthly profit trend
     */
    private static async calculateMonthlyTrend(
        shopId: string,
        financialYearId: string
    ): Promise<Array<{ month: string; sales: number; expenses: number; profit: number }>> {
        // This is a simplified implementation
        // In practice, you'd need to analyze transactions by month
        const months = [];
        const financialYear = await this.getFinancialYearById(financialYearId);

        if (financialYear) {
            const startDate = new Date(financialYear.startDate);
            const endDate = new Date(financialYear.endDate);

            // Generate monthly data (simplified approach)
            for (let month = 0; month < 12; month++) {
                const monthDate = new Date(startDate);
                monthDate.setMonth(startDate.getMonth() + month);

                if (monthDate <= endDate) {
                    months.push({
                        month: monthDate.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }),
                        sales: 0, // Would need month-specific calculation
                        expenses: 0, // Would need month-specific calculation
                        profit: 0 // Would need month-specific calculation
                    });
                }
            }
        }

        return months;
    }

    /**
     * Calculate growth trends between years
     */
    private static calculateTrends(yearlyResults: { [fyId: string]: DetailedProfitCalculation }): ComparativeProfitAnalysis['trends'] {
        const trends = {
            salesGrowth: [],
            profitGrowth: [],
            marginTrend: []
        } as ComparativeProfitAnalysis['trends'];

        const years = Object.keys(yearlyResults).sort();

        for (let i = 1; i < years.length; i++) {
            const currentYear = yearlyResults[years[i]];
            const previousYear = yearlyResults[years[i - 1]];

            // Sales growth
            const salesGrowth = previousYear.components.sales > 0
                ? ((currentYear.components.sales - previousYear.components.sales) / previousYear.components.sales) * 100
                : 0;

            trends.salesGrowth.push({
                year: years[i],
                growth: salesGrowth
            });

            // Profit growth
            const profitGrowth = previousYear.derivedValues.netProfit > 0
                ? ((currentYear.derivedValues.netProfit - previousYear.derivedValues.netProfit) / previousYear.derivedValues.netProfit) * 100
                : 0;

            trends.profitGrowth.push({
                year: years[i],
                growth: profitGrowth
            });

            // Margin trend
            trends.marginTrend.push({
                year: years[i],
                margin: currentYear.derivedValues.profitMargin
            });
        }

        return trends;
    }

    /**
     * Generate business insights based on analysis
     */
    private static generateInsights(
        yearlyResults: { [fyId: string]: DetailedProfitCalculation },
        trends: ComparativeProfitAnalysis['trends']
    ): string[] {
        const insights: string[] = [];

        const years = Object.keys(yearlyResults);
        if (years.length < 2) return insights;

        // Analyze profit trend
        const latestYear = yearlyResults[years[years.length - 1]];
        const previousYear = yearlyResults[years[years.length - 2]];

        if (latestYear.derivedValues.netProfit > previousYear.derivedValues.netProfit) {
            insights.push('الربح الصافي في تحسن مقارنة بالسنة السابقة');
        } else {
            insights.push('الربح الصافي في تراجع مقارنة بالسنة السابقة');
        }

        // Analyze margin
        if (latestYear.derivedValues.profitMargin > 10) {
            insights.push('هامش الربح جيد (أكثر من 10%)');
        } else if (latestYear.derivedValues.profitMargin > 5) {
            insights.push('هامش الربح متوسط (5-10%)');
        } else {
            insights.push('هامش الربح منخفض (أقل من 5%) - يحتاج تحسين');
        }

        return insights;
    }

    // Additional helper methods for account and financial year operations
    private static async getAccountsByType(shopId: string, accountType: AccountType): Promise<Account[]> {
        const q = query(
            this.getCollectionRef('accounts'),
            where('shopId', '==', shopId),
            where('type', '==', accountType),
            where('isActive', '==', true)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
    }

    private static async getAccountsByShop(shopId: string): Promise<Account[]> {
        const q = query(
            this.getCollectionRef('accounts'),
            where('shopId', '==', shopId),
            where('isActive', '==', true)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
    }

    private static async getShopById(shopId: string): Promise<Shop | null> {
        return await this.getDocumentById<Shop>('shops', shopId);
    }

    private static async getAllShops(): Promise<Shop[]> {
        const snapshot = await getDocs(this.getCollectionRef('shops'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
    }

    private static async getFinancialYearById(financialYearId: string): Promise<FinancialYear | null> {
        return await this.getDocumentById<FinancialYear>('financialYears', financialYearId);
    }

    private static async getAllFinancialYears(): Promise<FinancialYear[]> {
        const snapshot = await getDocs(this.getCollectionRef('financialYears'));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialYear));
    }

    private static async getAccountsByCriteria(criteria: {
        shopIds?: string[];
        accountTypes?: AccountType[];
        accountClassifications?: AccountClassification[];
    }): Promise<Account[]> {
        let accountQuery = query(this.getCollectionRef('accounts'), where('isActive', '==', true));

        // Apply filters as needed
        // Note: Firestore has limitations on compound queries, so this might need optimization

        const snapshot = await getDocs(accountQuery);
        let accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));

        // Apply additional filters in memory
        if (criteria.shopIds && criteria.shopIds.length > 0) {
            accounts = accounts.filter(a => criteria.shopIds!.includes(a.shopId));
        }

        if (criteria.accountTypes && criteria.accountTypes.length > 0) {
            accounts = accounts.filter(a => criteria.accountTypes!.includes(a.type));
        }

        if (criteria.accountClassifications && criteria.accountClassifications.length > 0) {
            accounts = accounts.filter(a => criteria.accountClassifications!.includes(a.classification));
        }

        return accounts;
    }

    private static isAccountValidForFY(account: Account, financialYearId: string): boolean {
        // This would implement logic to check if an account is valid for a specific financial year
        // For now, return true for all accounts
        return true;
    }

    private static async getFinancialYearsForAccount(account: Account): Promise<string[]> {
        const financialYears = await FinancialYearService.getFinancialYearsByShop(account.shopId);
        return financialYears.map(fy => fy.id);
    }
}