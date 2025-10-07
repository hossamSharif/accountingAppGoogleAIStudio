import {
    collection,
    query,
    where,
    getDocs,
    orderBy
} from 'firebase/firestore';
import { BaseService } from './baseService';
import { BalanceCalculator } from './balanceCalculator';
import { FinancialYearService } from './financialYearService';
import { AccountService } from './accountService';
import { ShopService } from './ShopService';
import {
    Account,
    FinancialYear,
    Shop,
    AccountType,
    AccountClassification,
    ProfitCalculation,
    ProfitQuery,
    DetailedProfitCalculation,
    ComparativeProfitAnalysis,
    StockContinuityReport,
    YearContinuityCheck,
    StockDiscrepancy,
    ShopProfitComparison,
    ShopComparisonData
} from '../types';

export class ProfitCalculationService extends BaseService {

    /**
     * Calculate profit for a specific shop and financial year
     */
    static async calculateProfitForShopAndYear(
        shopId: string,
        financialYearId: string
    ): Promise<ProfitCalculation> {

        // Get shop and financial year details
        const [shop, financialYear] = await Promise.all([
            this.getShopById(shopId),
            this.getFinancialYearById(financialYearId)
        ]);

        if (!shop || !financialYear) {
            throw new Error('Shop or Financial Year not found');
        }

        // Get account balances for the specific financial year
        const [
            salesAccounts,
            purchaseAccounts,
            expenseAccounts,
            openingStock,
            closingStock
        ] = await Promise.all([
            AccountService.getAccountsByTypeForCalculations(shopId, AccountType.SALES),
            AccountService.getAccountsByTypeForCalculations(shopId, AccountType.PURCHASES),
            AccountService.getAccountsByTypeForCalculations(shopId, AccountType.EXPENSES),
            this.getOpeningStockValue(shopId, financialYearId),
            this.getClosingStockValue(shopId, financialYearId)
        ]);

        // Calculate totals
        const salesTotal = await this.calculateAccountsTotal(salesAccounts, financialYearId);
        const purchasesTotal = await this.calculateAccountsTotal(purchaseAccounts, financialYearId);
        const expensesTotal = await this.calculateAccountsTotal(expenseAccounts, financialYearId);

        // Apply accounting formula
        const costOfGoodsSold = openingStock + purchasesTotal - closingStock;
        const grossProfit = salesTotal - costOfGoodsSold;
        const netProfit = grossProfit - expensesTotal;

        return {
            shopId,
            shopName: shop.name,
            financialYearId,
            financialYearName: financialYear.name,
            openingStock,
            purchases: purchasesTotal,
            closingStock,
            sales: salesTotal,
            expenses: expensesTotal,
            grossProfit,
            netProfit,
            costOfGoodsSold
        };
    }

    /**
     * Calculate profit with multi-dimensional support
     */
    static async calculateProfit(query: ProfitQuery): Promise<ProfitCalculation[]> {
        let results: ProfitCalculation[] = [];

        // Get shops and financial years based on query
        const shops = await this.getShopsForQuery(query);
        const financialYears = await this.getFinancialYearsForQuery(query);

        // Calculate profit for each combination
        for (const shop of shops) {
            const shopFinancialYears = financialYears.filter(fy => fy.shopId === shop.id);

            for (const financialYear of shopFinancialYears) {
                try {
                    const calculation = await this.calculateProfitForShopAndYear(
                        shop.id,
                        financialYear.id
                    );
                    results.push(calculation);
                } catch (error) {
                    console.error(`Error calculating profit for shop ${shop.name}, year ${financialYear.name}:`, error);
                }
            }
        }

        // Group results based on query groupBy parameter
        if (query.groupBy) {
            results = this.groupProfitResults(results, query.groupBy);
        }

        return results;
    }

    /**
     * Calculate profit for all shops in a specific financial year
     */
    static async calculateProfitForAllShopsInYear(financialYearId: string): Promise<ProfitCalculation[]> {
        const financialYear = await this.getFinancialYearById(financialYearId);
        if (!financialYear) {
            throw new Error('Financial Year not found');
        }

        // Get all shops
        const shops = await this.getAllShops();
        const results: ProfitCalculation[] = [];

        for (const shop of shops) {
            // Check if shop has this financial year
            const shopFinancialYears = await FinancialYearService.getFinancialYearsByShop(shop.id);
            const hasThisYear = shopFinancialYears.some(fy => fy.id === financialYearId);

            if (hasThisYear) {
                try {
                    const calculation = await this.calculateProfitForShopAndYear(shop.id, financialYearId);
                    results.push(calculation);
                } catch (error) {
                    console.error(`Error calculating profit for shop ${shop.name}:`, error);
                }
            }
        }

        return results;
    }

    /**
     * Calculate profit for a specific shop across all years
     */
    static async calculateProfitForShopAllYears(shopId: string): Promise<ProfitCalculation[]> {
        const shop = await this.getShopById(shopId);
        if (!shop) {
            throw new Error('Shop not found');
        }

        const financialYears = await FinancialYearService.getFinancialYearsByShop(shopId);
        const results: ProfitCalculation[] = [];

        for (const financialYear of financialYears) {
            try {
                const calculation = await this.calculateProfitForShopAndYear(shopId, financialYear.id);
                results.push(calculation);
            } catch (error) {
                console.error(`Error calculating profit for year ${financialYear.name}:`, error);
            }
        }

        return results.sort((a, b) =>
            new Date(a.financialYearName || '').getTime() - new Date(b.financialYearName || '').getTime()
        );
    }

    /**
     * Calculate grand total profit across all shops and years
     */
    static async calculateGrandTotalProfit(): Promise<ProfitCalculation> {
        const allShops = await this.getAllShops();
        let totalSales = 0;
        let totalPurchases = 0;
        let totalExpenses = 0;
        let totalOpeningStock = 0;
        let totalClosingStock = 0;

        for (const shop of allShops) {
            const shopCalculations = await this.calculateProfitForShopAllYears(shop.id);

            for (const calc of shopCalculations) {
                totalSales += calc.sales;
                totalPurchases += calc.purchases;
                totalExpenses += calc.expenses;
                totalOpeningStock += calc.openingStock;
                totalClosingStock += calc.closingStock;
            }
        }

        const costOfGoodsSold = totalOpeningStock + totalPurchases - totalClosingStock;
        const grossProfit = totalSales - costOfGoodsSold;
        const netProfit = grossProfit - totalExpenses;

        return {
            shopName: 'جميع المحلات',
            financialYearName: 'جميع السنوات',
            openingStock: totalOpeningStock,
            purchases: totalPurchases,
            closingStock: totalClosingStock,
            sales: totalSales,
            expenses: totalExpenses,
            grossProfit,
            netProfit,
            costOfGoodsSold
        };
    }

    /**
     * Get opening stock value for a shop in a specific financial year
     */
    private static async getOpeningStockValue(
        shopId: string,
        financialYearId: string
    ): Promise<number> {
        const financialYear = await this.getFinancialYearById(financialYearId);
        return financialYear?.openingStockValue || 0;
    }

    /**
     * Get closing stock value for a shop in a specific financial year
     */
    private static async getClosingStockValue(
        shopId: string,
        financialYearId: string
    ): Promise<number> {
        const financialYear = await this.getFinancialYearById(financialYearId);
        return financialYear?.closingStockValue || 0;
    }

    /**
     * Calculate total balance for a list of accounts in a specific financial year
     */
    private static async calculateAccountsTotal(
        accounts: Account[],
        financialYearId: string
    ): Promise<number> {
        let total = 0;

        for (const account of accounts) {
            // This would integrate with transaction service to get actual balances
            // For now, using opening balance as placeholder
            total += account.openingBalance || 0;

            // TODO: Add transaction-based balance calculation for the specific financial year
            // const balance = await this.getAccountBalanceForYear(account.id, financialYearId);
            // total += balance;
        }

        return total;
    }

    /**
     * Get shops based on query filters
     */
    private static async getShopsForQuery(query: ProfitQuery): Promise<Shop[]> {
        if (query.shopIds && query.shopIds.length > 0) {
            const shops: Shop[] = [];
            for (const shopId of query.shopIds) {
                const shop = await this.getShopById(shopId);
                if (shop) shops.push(shop);
            }
            return shops;
        }

        return this.getAllShops();
    }

    /**
     * Get financial years based on query filters
     */
    private static async getFinancialYearsForQuery(query: ProfitQuery): Promise<FinancialYear[]> {
        if (query.financialYearIds && query.financialYearIds.length > 0) {
            const financialYears: FinancialYear[] = [];
            for (const fyId of query.financialYearIds) {
                const fy = await this.getFinancialYearById(fyId);
                if (fy) financialYears.push(fy);
            }
            return financialYears;
        }

        return FinancialYearService.getAllFinancialYears();
    }

    /**
     * Group profit results based on groupBy parameter
     */
    private static groupProfitResults(
        results: ProfitCalculation[],
        groupBy: 'shop' | 'year' | 'both'
    ): ProfitCalculation[] {
        switch (groupBy) {
            case 'shop':
                return this.groupByShop(results);
            case 'year':
                return this.groupByYear(results);
            case 'both':
            default:
                return results;
        }
    }

    /**
     * Group results by shop (sum all years for each shop)
     */
    private static groupByShop(results: ProfitCalculation[]): ProfitCalculation[] {
        const shopGroups = new Map<string, ProfitCalculation[]>();

        results.forEach(result => {
            if (result.shopId) {
                if (!shopGroups.has(result.shopId)) {
                    shopGroups.set(result.shopId, []);
                }
                shopGroups.get(result.shopId)!.push(result);
            }
        });

        return Array.from(shopGroups.entries()).map(([shopId, shopResults]) => {
            const totals = shopResults.reduce((sum, result) => ({
                sales: sum.sales + result.sales,
                purchases: sum.purchases + result.purchases,
                expenses: sum.expenses + result.expenses,
                openingStock: sum.openingStock + result.openingStock,
                closingStock: sum.closingStock + result.closingStock
            }), { sales: 0, purchases: 0, expenses: 0, openingStock: 0, closingStock: 0 });

            const costOfGoodsSold = totals.openingStock + totals.purchases - totals.closingStock;
            const grossProfit = totals.sales - costOfGoodsSold;
            const netProfit = grossProfit - totals.expenses;

            return {
                shopId,
                shopName: shopResults[0].shopName,
                financialYearName: 'جميع السنوات',
                ...totals,
                grossProfit,
                netProfit,
                costOfGoodsSold
            };
        });
    }

    /**
     * Group results by year (sum all shops for each year)
     */
    private static groupByYear(results: ProfitCalculation[]): ProfitCalculation[] {
        const yearGroups = new Map<string, ProfitCalculation[]>();

        results.forEach(result => {
            if (result.financialYearId) {
                if (!yearGroups.has(result.financialYearId)) {
                    yearGroups.set(result.financialYearId, []);
                }
                yearGroups.get(result.financialYearId)!.push(result);
            }
        });

        return Array.from(yearGroups.entries()).map(([yearId, yearResults]) => {
            const totals = yearResults.reduce((sum, result) => ({
                sales: sum.sales + result.sales,
                purchases: sum.purchases + result.purchases,
                expenses: sum.expenses + result.expenses,
                openingStock: sum.openingStock + result.openingStock,
                closingStock: sum.closingStock + result.closingStock
            }), { sales: 0, purchases: 0, expenses: 0, openingStock: 0, closingStock: 0 });

            const costOfGoodsSold = totals.openingStock + totals.purchases - totals.closingStock;
            const grossProfit = totals.sales - costOfGoodsSold;
            const netProfit = grossProfit - totals.expenses;

            return {
                financialYearId: yearId,
                financialYearName: yearResults[0].financialYearName,
                shopName: 'جميع المحلات',
                ...totals,
                grossProfit,
                netProfit,
                costOfGoodsSold
            };
        });
    }

    // ========== PHASE 2: Enhanced Profit Calculation Methods ==========

    /**
     * Calculate profit with complete accounting formula and stock integration
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

            // 1. Calculate sales (Revenue accounts)
            calculation.components.sales = await this.calculateTotalRevenue(shopId, financialYearId);

            // 2. Get opening stock value
            calculation.components.openingStock = await this.getOpeningStockValue(shopId, financialYearId);

            // 3. Calculate purchases
            calculation.components.purchases = await this.calculateTotalPurchases(shopId, financialYearId);

            // 4. Get closing stock value
            calculation.components.closingStock = await this.getClosingStockValue(shopId, financialYearId);

            // 5. Calculate total expenses
            calculation.components.expenses = await this.calculateTotalExpenses(shopId, financialYearId);

            // 6. Apply accounting formula
            calculation.derivedValues.costOfGoodsSold =
                calculation.components.openingStock +
                calculation.components.purchases -
                calculation.components.closingStock;

            calculation.derivedValues.grossProfit =
                calculation.components.sales - calculation.derivedValues.costOfGoodsSold;

            calculation.derivedValues.netProfit =
                calculation.derivedValues.grossProfit - calculation.components.expenses;

            calculation.derivedValues.profitMargin =
                calculation.components.sales > 0
                    ? (calculation.derivedValues.netProfit / calculation.components.sales) * 100
                    : 0;

            // 7. Generate detailed breakdown
            calculation.breakdown = await this.generateProfitBreakdown(shopId, financialYearId);

            return calculation;
        } catch (error) {
            this.handleError(error, 'calculateProfitWithStockIntegration');
        }
    }

    /**
     * Generate comparative analysis across financial years
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

            for (const fyId of financialYearIds) {
                analysis.yearlyResults[fyId] = await this.calculateProfitWithStockIntegration(shopId, fyId);
            }

            // Calculate trends and insights
            analysis.trends = this.calculateTrends(analysis.yearlyResults);
            analysis.insights = this.generateInsights(analysis.yearlyResults, analysis.trends);

            return analysis;
        } catch (error) {
            this.handleError(error, 'generateComparativeAnalysis');
        }
    }

    /**
     * Validate stock continuity across financial years
     */
    static async validateStockContinuity(shopId: string): Promise<StockContinuityReport> {
        try {
            const financialYears = await FinancialYearService.getFinancialYearsByShop(shopId);
            const report: StockContinuityReport = {
                shopId,
                checkedAt: new Date().toISOString(),
                years: [],
                discrepancies: [],
                isValid: true
            };

            // Sort financial years by start date
            financialYears.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

            for (let i = 0; i < financialYears.length - 1; i++) {
                const currentFY = financialYears[i];
                const nextFY = financialYears[i + 1];

                const currentClosingStock = await this.getClosingStockValue(shopId, currentFY.id);
                const nextOpeningStock = await this.getOpeningStockValue(shopId, nextFY.id);

                const yearCheck: YearContinuityCheck = {
                    fromYear: currentFY.name,
                    toYear: nextFY.name,
                    closingStock: currentClosingStock,
                    openingStock: nextOpeningStock,
                    difference: Math.abs(currentClosingStock - nextOpeningStock),
                    isValid: Math.abs(currentClosingStock - nextOpeningStock) < 0.01
                };

                report.years.push(yearCheck);

                if (!yearCheck.isValid) {
                    report.isValid = false;
                    report.discrepancies.push({
                        description: `تناقض في المخزون بين ${currentFY.name} و ${nextFY.name}`,
                        amount: yearCheck.difference,
                        suggestedAction: 'مراجعة سجلات انتقال المخزون والتأكد من صحة القيم'
                    });
                }
            }

            return report;
        } catch (error) {
            this.handleError(error, 'validateStockContinuity');
        }
    }

    /**
     * Generate multi-shop profit comparison
     */
    static async generateMultiShopComparison(
        shopIds: string[],
        financialYearIds: string[]
    ): Promise<ShopProfitComparison> {
        try {
            const comparison: ShopProfitComparison = {
                shopData: {},
                shopNames: {},
                yearNames: {}
            };

            // Get shop and year names
            const [shops, financialYears] = await Promise.all([
                Promise.all(shopIds.map(id => ShopService.getShopById(id))),
                Promise.all(financialYearIds.map(id => FinancialYearService.getById(id)))
            ]);

            shops.forEach(shop => {
                if (shop) comparison.shopNames[shop.id] = shop.name;
            });

            financialYears.forEach(fy => {
                if (fy) comparison.yearNames[fy.id] = fy.name;
            });

            // Calculate profit for each shop
            for (const shopId of shopIds) {
                const shopData: ShopComparisonData = {
                    yearlyProfits: {},
                    averageProfit: 0,
                    growthRate: 0
                };

                const profits: number[] = [];

                for (const fyId of financialYearIds) {
                    try {
                        const calculation = await this.calculateProfitWithStockIntegration(shopId, fyId);
                        shopData.yearlyProfits[fyId] = calculation.derivedValues.netProfit;
                        profits.push(calculation.derivedValues.netProfit);
                    } catch (error) {
                        console.warn(`No data for shop ${shopId} in financial year ${fyId}`);
                        shopData.yearlyProfits[fyId] = 0;
                        profits.push(0);
                    }
                }

                // Calculate average profit
                shopData.averageProfit = profits.reduce((sum, profit) => sum + profit, 0) / profits.length;

                // Calculate growth rate (comparing first and last available years)
                const nonZeroProfits = profits.filter(p => p !== 0);
                if (nonZeroProfits.length > 1) {
                    const firstProfit = nonZeroProfits[0];
                    const lastProfit = nonZeroProfits[nonZeroProfits.length - 1];
                    shopData.growthRate = firstProfit > 0
                        ? ((lastProfit - firstProfit) / firstProfit) * 100
                        : 0;
                }

                comparison.shopData[shopId] = shopData;
            }

            return comparison;
        } catch (error) {
            this.handleError(error, 'generateMultiShopComparison');
        }
    }

    // ========== PRIVATE ENHANCED HELPER METHODS ==========

    private static async calculateTotalRevenue(shopId: string, financialYearId: string): Promise<number> {
        try {
            const revenueAccounts = await this.getDocumentsByField<Account>(
                'accounts',
                'classification',
                AccountClassification.REVENUE
            );

            let totalRevenue = 0;
            for (const account of revenueAccounts) {
                if (account.shopId === shopId) {
                    const balance = await BalanceCalculator.calculateAccountBalanceForFY(account.id, financialYearId);
                    totalRevenue += Math.abs(balance); // Revenue accounts are typically credit balance
                }
            }

            return totalRevenue;
        } catch (error) {
            console.warn('Error calculating total revenue:', error);
            return 0;
        }
    }

    private static async calculateTotalPurchases(shopId: string, financialYearId: string): Promise<number> {
        try {
            const purchaseAccounts = await this.getDocumentsByField<Account>(
                'accounts',
                'type',
                AccountType.PURCHASES
            );

            let totalPurchases = 0;
            for (const account of purchaseAccounts) {
                if (account.shopId === shopId) {
                    const balance = await BalanceCalculator.calculateAccountBalanceForFY(account.id, financialYearId);
                    totalPurchases += Math.abs(balance);
                }
            }

            return totalPurchases;
        } catch (error) {
            console.warn('Error calculating total purchases:', error);
            return 0;
        }
    }

    private static async calculateTotalExpenses(shopId: string, financialYearId: string): Promise<number> {
        try {
            const expenseAccounts = await this.getDocumentsByField<Account>(
                'accounts',
                'classification',
                AccountClassification.EXPENSES
            );

            let totalExpenses = 0;
            for (const account of expenseAccounts) {
                if (account.shopId === shopId) {
                    const balance = await BalanceCalculator.calculateAccountBalanceForFY(account.id, financialYearId);
                    totalExpenses += Math.abs(balance);
                }
            }

            return totalExpenses;
        } catch (error) {
            console.warn('Error calculating total expenses:', error);
            return 0;
        }
    }

    private static async generateProfitBreakdown(shopId: string, financialYearId: string): Promise<any> {
        try {
            const breakdown = {
                salesByCategory: {},
                expensesByCategory: {},
                monthlyTrend: []
            };

            // Get sales by category
            const salesAccounts = await this.getDocumentsByField<Account>(
                'accounts',
                'type',
                AccountType.SALES
            );

            for (const account of salesAccounts) {
                if (account.shopId === shopId && account.category) {
                    const balance = await BalanceCalculator.calculateAccountBalanceForFY(account.id, financialYearId);
                    breakdown.salesByCategory[account.category] =
                        (breakdown.salesByCategory[account.category] || 0) + Math.abs(balance);
                }
            }

            // Get expenses by category
            const expenseAccounts = await this.getDocumentsByField<Account>(
                'accounts',
                'classification',
                AccountClassification.EXPENSES
            );

            for (const account of expenseAccounts) {
                if (account.shopId === shopId && account.category) {
                    const balance = await BalanceCalculator.calculateAccountBalanceForFY(account.id, financialYearId);
                    breakdown.expensesByCategory[account.category] =
                        (breakdown.expensesByCategory[account.category] || 0) + Math.abs(balance);
                }
            }

            // Monthly trend would require more complex date-based calculations
            // For now, return empty array
            breakdown.monthlyTrend = [];

            return breakdown;
        } catch (error) {
            console.warn('Error generating profit breakdown:', error);
            return { salesByCategory: {}, expensesByCategory: {}, monthlyTrend: [] };
        }
    }

    private static calculateTrends(yearlyResults: { [financialYearId: string]: DetailedProfitCalculation }): any {
        const trends = {
            salesGrowth: [],
            profitGrowth: [],
            marginTrend: []
        };

        const sortedResults = Object.entries(yearlyResults).sort((a, b) =>
            new Date(a[1].calculatedAt).getTime() - new Date(b[1].calculatedAt).getTime()
        );

        for (let i = 1; i < sortedResults.length; i++) {
            const prev = sortedResults[i - 1][1];
            const curr = sortedResults[i][1];

            // Sales growth
            const salesGrowth = prev.components.sales > 0
                ? ((curr.components.sales - prev.components.sales) / prev.components.sales) * 100
                : 0;
            trends.salesGrowth.push({ year: curr.financialYearId, growth: salesGrowth });

            // Profit growth
            const profitGrowth = prev.derivedValues.netProfit > 0
                ? ((curr.derivedValues.netProfit - prev.derivedValues.netProfit) / prev.derivedValues.netProfit) * 100
                : 0;
            trends.profitGrowth.push({ year: curr.financialYearId, growth: profitGrowth });

            // Margin trend
            trends.marginTrend.push({ year: curr.financialYearId, margin: curr.derivedValues.profitMargin });
        }

        return trends;
    }

    private static generateInsights(
        yearlyResults: { [financialYearId: string]: DetailedProfitCalculation },
        trends: any
    ): string[] {
        const insights: string[] = [];

        // Analyze profit trends
        const profitGrowthRates = trends.profitGrowth.map((t: any) => t.growth);
        if (profitGrowthRates.length > 0) {
            const avgGrowth = profitGrowthRates.reduce((sum: number, rate: number) => sum + rate, 0) / profitGrowthRates.length;

            if (avgGrowth > 10) {
                insights.push('نمو ممتاز في الأرباح: متوسط النمو أكثر من 10%');
            } else if (avgGrowth > 0) {
                insights.push('نمو إيجابي في الأرباح');
            } else {
                insights.push('تراجع في الأرباح - يحتاج مراجعة الاستراتيجية');
            }
        }

        // Analyze margin trends
        const margins = trends.marginTrend.map((t: any) => t.margin);
        if (margins.length > 0) {
            const avgMargin = margins.reduce((sum: number, margin: number) => sum + margin, 0) / margins.length;

            if (avgMargin > 20) {
                insights.push('هامش ربح ممتاز: أكثر من 20%');
            } else if (avgMargin > 10) {
                insights.push('هامش ربح جيد: بين 10-20%');
            } else if (avgMargin > 0) {
                insights.push('هامش ربح منخفض: أقل من 10%');
            } else {
                insights.push('خسائر: هامش ربح سالب');
            }
        }

        return insights;
    }

    // Update existing helper methods to use enhanced stock calculation

    private static async getOpeningStockValue(shopId: string, financialYearId: string): Promise<number> {
        try {
            const openingStockAccounts = await this.getDocumentsByField<Account>(
                'accounts',
                'type',
                AccountType.OPENING_STOCK
            );

            const relevantAccount = openingStockAccounts.find(
                account => account.shopId === shopId && account.financialYearId === financialYearId
            );

            if (relevantAccount) {
                return await BalanceCalculator.calculateAccountBalanceForFY(relevantAccount.id, financialYearId);
            }

            // Fallback to financial year opening stock value
            const financialYear = await FinancialYearService.getById(financialYearId);
            return financialYear?.openingStockValue || 0;
        } catch (error) {
            console.warn('Error getting opening stock value:', error);
            return 0;
        }
    }

    private static async getClosingStockValue(shopId: string, financialYearId: string): Promise<number> {
        try {
            const closingStockAccounts = await this.getDocumentsByField<Account>(
                'accounts',
                'type',
                AccountType.ENDING_STOCK
            );

            const relevantAccount = closingStockAccounts.find(
                account => account.shopId === shopId && account.financialYearId === financialYearId
            );

            if (relevantAccount) {
                return await BalanceCalculator.calculateAccountBalanceForFY(relevantAccount.id, financialYearId);
            }

            // Fallback to financial year closing stock value
            const financialYear = await FinancialYearService.getById(financialYearId);
            return financialYear?.closingStockValue || 0;
        } catch (error) {
            console.warn('Error getting closing stock value:', error);
            return 0;
        }
    }

    // ========== Helper Methods ==========

    private static async getShopById(shopId: string): Promise<Shop | null> {
        try {
            const shopDoc = await import('../services/ShopService').then(module =>
                module.ShopService.getShopById(shopId)
            );
            return shopDoc;
        } catch (error) {
            console.error('Error getting shop:', error);
            return null;
        }
    }

    private static async getAllShops(): Promise<Shop[]> {
        try {
            const shops = await import('../services/ShopService').then(module =>
                module.ShopService.getAllShops()
            );
            return shops;
        } catch (error) {
            console.error('Error getting shops:', error);
            return [];
        }
    }

    private static async getFinancialYearById(financialYearId: string): Promise<FinancialYear | null> {
        try {
            const q = query(
                collection(db, 'financialYears'),
                where('__name__', '==', financialYearId)
            );

            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;

            return {
                id: snapshot.docs[0].id,
                ...snapshot.docs[0].data()
            } as FinancialYear;
        } catch (error) {
            console.error('Error getting financial year:', error);
            return null;
        }
    }
}