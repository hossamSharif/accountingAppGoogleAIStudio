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
import { BalanceCalculator } from './balanceCalculator';
import { FinancialYearService } from './financialYearService';
import { AccountService } from './accountService';
import { ShopService } from './ShopService';
import {
    TrialBalance,
    TrialBalanceAccount,
    ProfitLossStatement,
    BalanceSheet,
    ProfitLossDimension,
    DimensionType,
    Account,
    FinancialYear,
    Shop,
    AccountType,
    AccountClassification,
    AccountNature
} from '../types';

export class FinancialStatementService extends BaseService {

    /**
     * Generate multi-dimensional trial balance
     */
    static async generateTrialBalance(
        shopId?: string,
        financialYearId?: string,
        asOfDate?: string
    ): Promise<TrialBalance> {
        try {
            const accounts = await this.getAccountsForStatement(shopId, financialYearId);
            const trialBalance: TrialBalance = {
                metadata: {
                    generatedAt: new Date().toISOString(),
                    shopId,
                    financialYearId,
                    asOfDate: asOfDate || new Date().toISOString().split('T')[0]
                },
                accounts: [],
                totals: { debits: 0, credits: 0 }
            };

            for (const account of accounts) {
                const balance = await BalanceCalculator.calculateAccountBalanceForFY(
                    account.id,
                    financialYearId || account.financialYearId || '',
                    asOfDate
                );

                if (Math.abs(balance) > 0.01) { // Only include accounts with non-zero balances
                    const tbAccount: TrialBalanceAccount = {
                        accountId: account.id,
                        accountCode: account.accountCode,
                        accountName: account.name,
                        debitBalance: this.isDebitAccount(account) && balance > 0 ? balance : 0,
                        creditBalance: this.isCreditAccount(account) && balance > 0 ? balance : 0
                    };

                    trialBalance.accounts.push(tbAccount);
                    trialBalance.totals.debits += tbAccount.debitBalance;
                    trialBalance.totals.credits += tbAccount.creditBalance;
                }
            }

            // Sort accounts by account code
            trialBalance.accounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

            return trialBalance;
        } catch (error) {
            this.handleError(error, 'generateTrialBalance');
        }
    }

    /**
     * Generate multi-dimensional P&L statement
     */
    static async generateProfitLossStatement(
        dimension: ProfitLossDimension
    ): Promise<ProfitLossStatement> {
        try {
            const statement: ProfitLossStatement = {
                metadata: {
                    dimension,
                    generatedAt: new Date().toISOString(),
                    period: await this.getPeriodFromDimension(dimension)
                },
                revenue: {},
                costOfGoodsSold: {},
                grossProfit: {},
                expenses: {},
                netProfit: {}
            };

            switch (dimension.type) {
                case 'PER_SHOP_PER_YEAR':
                    return await this.generatePerShopPerYearPL(dimension.shopId!, dimension.financialYearId!);

                case 'PER_SHOP_ALL_YEARS':
                    return await this.generatePerShopAllYearsPL(dimension.shopId!);

                case 'ALL_SHOPS_PER_YEAR':
                    return await this.generateAllShopsPerYearPL(dimension.financialYearId!);

                case 'GRAND_TOTAL':
                    return await this.generateGrandTotalPL();

                default:
                    throw new Error('نوع بُعد كشف الأرباح والخسائر غير صحيح');
            }
        } catch (error) {
            this.handleError(error, 'generateProfitLossStatement');
        }
    }

    /**
     * Generate balance sheet with proper stock valuation
     */
    static async generateBalanceSheet(
        shopId: string,
        financialYearId: string,
        asOfDate?: string
    ): Promise<BalanceSheet> {
        try {
            const balanceSheet: BalanceSheet = {
                metadata: {
                    shopId,
                    financialYearId,
                    asOfDate: asOfDate || new Date().toISOString().split('T')[0],
                    generatedAt: new Date().toISOString()
                },
                assets: { current: {}, nonCurrent: {}, total: 0 },
                liabilities: { current: {}, nonCurrent: {}, total: 0 },
                equity: { capital: 0, retainedEarnings: 0, total: 0 }
            };

            // Get all asset accounts
            const assetAccounts = await this.getAccountsByClassification(
                shopId,
                AccountClassification.ASSETS,
                financialYearId
            );

            for (const account of assetAccounts) {
                const balance = await BalanceCalculator.calculateAccountBalanceForFY(
                    account.id,
                    financialYearId,
                    asOfDate
                );

                if (this.isCurrentAsset(account)) {
                    balanceSheet.assets.current[account.name] = balance;
                } else {
                    balanceSheet.assets.nonCurrent[account.name] = balance;
                }
                balanceSheet.assets.total += balance;
            }

            // Include stock valuation
            const stockValue = await this.getStockValueForBalanceSheet(shopId, financialYearId, asOfDate);
            balanceSheet.assets.current['المخزون'] = stockValue;
            balanceSheet.assets.total += stockValue;

            // Get liability accounts
            const liabilityAccounts = await this.getAccountsByClassification(
                shopId,
                AccountClassification.LIABILITIES,
                financialYearId
            );

            for (const account of liabilityAccounts) {
                const balance = await BalanceCalculator.calculateAccountBalanceForFY(
                    account.id,
                    financialYearId,
                    asOfDate
                );

                if (this.isCurrentLiability(account)) {
                    balanceSheet.liabilities.current[account.name] = balance;
                } else {
                    balanceSheet.liabilities.nonCurrent[account.name] = balance;
                }
                balanceSheet.liabilities.total += balance;
            }

            // Get equity accounts
            const equityAccounts = await this.getAccountsByClassification(
                shopId,
                AccountClassification.EQUITY,
                financialYearId
            );

            for (const account of equityAccounts) {
                const balance = await BalanceCalculator.calculateAccountBalanceForFY(
                    account.id,
                    financialYearId,
                    asOfDate
                );

                if (account.name.includes('رأس المال')) {
                    balanceSheet.equity.capital += balance;
                } else {
                    balanceSheet.equity.retainedEarnings += balance;
                }
            }

            balanceSheet.equity.total = balanceSheet.equity.capital + balanceSheet.equity.retainedEarnings;

            return balanceSheet;
        } catch (error) {
            this.handleError(error, 'generateBalanceSheet');
        }
    }

    // ================ PRIVATE HELPER METHODS ================

    /**
     * Get accounts for statement generation
     */
    private static async getAccountsForStatement(
        shopId?: string,
        financialYearId?: string
    ): Promise<Account[]> {
        try {
            let accountQuery = collection(this.db, 'accounts');
            let q = query(accountQuery, where('isActive', '==', true));

            if (shopId) {
                q = query(q, where('shopId', '==', shopId));
            }

            if (financialYearId) {
                q = query(q, where('financialYearId', '==', financialYearId));
            }

            q = query(q, orderBy('accountCode', 'asc'));

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
        } catch (error) {
            this.handleError(error, 'getAccountsForStatement');
        }
    }

    /**
     * Get accounts by classification
     */
    private static async getAccountsByClassification(
        shopId: string,
        classification: AccountClassification,
        financialYearId?: string
    ): Promise<Account[]> {
        try {
            let q = query(
                this.getCollectionRef('accounts'),
                where('shopId', '==', shopId),
                where('classification', '==', classification),
                where('isActive', '==', true)
            );

            if (financialYearId) {
                q = query(q, where('financialYearId', '==', financialYearId));
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
        } catch (error) {
            this.handleError(error, 'getAccountsByClassification');
        }
    }

    /**
     * Generate per shop per year P&L
     */
    private static async generatePerShopPerYearPL(
        shopId: string,
        financialYearId: string
    ): Promise<ProfitLossStatement> {
        const statement: ProfitLossStatement = {
            metadata: {
                dimension: { type: 'PER_SHOP_PER_YEAR', shopId, financialYearId },
                generatedAt: new Date().toISOString(),
                period: await this.getPeriodFromDimension({ type: 'PER_SHOP_PER_YEAR', shopId, financialYearId })
            },
            revenue: {},
            costOfGoodsSold: {},
            grossProfit: {},
            expenses: {},
            netProfit: {}
        };

        // Calculate revenue
        const revenueAccounts = await this.getAccountsByClassification(
            shopId,
            AccountClassification.REVENUE,
            financialYearId
        );

        let totalRevenue = 0;
        for (const account of revenueAccounts) {
            const balance = await BalanceCalculator.calculateAccountBalanceForFY(account.id, financialYearId);
            statement.revenue[account.name] = balance;
            totalRevenue += balance;
        }

        // Calculate COGS (Cost of Goods Sold)
        const [openingStock, purchases, closingStock] = await Promise.all([
            this.getOpeningStockValue(shopId, financialYearId),
            this.getTotalPurchases(shopId, financialYearId),
            this.getClosingStockValue(shopId, financialYearId)
        ]);

        const costOfGoodsSold = openingStock + purchases - closingStock;
        statement.costOfGoodsSold['تكلفة البضاعة المبيعة'] = costOfGoodsSold;

        // Calculate gross profit
        const grossProfit = totalRevenue - costOfGoodsSold;
        statement.grossProfit['إجمالي الربح'] = grossProfit;

        // Calculate expenses
        const expenseAccounts = await this.getAccountsByClassification(
            shopId,
            AccountClassification.EXPENSES,
            financialYearId
        );

        let totalExpenses = 0;
        for (const account of expenseAccounts) {
            const balance = await BalanceCalculator.calculateAccountBalanceForFY(account.id, financialYearId);
            statement.expenses[account.name] = balance;
            totalExpenses += balance;
        }

        // Calculate net profit
        const netProfit = grossProfit - totalExpenses;
        statement.netProfit['صافي الربح'] = netProfit;

        return statement;
    }

    /**
     * Generate per shop all years P&L
     */
    private static async generatePerShopAllYearsPL(shopId: string): Promise<ProfitLossStatement> {
        const financialYears = await FinancialYearService.getFinancialYearsByShop(shopId);

        const statement: ProfitLossStatement = {
            metadata: {
                dimension: { type: 'PER_SHOP_ALL_YEARS', shopId },
                generatedAt: new Date().toISOString(),
                period: `جميع السنوات المالية للمتجر`
            },
            revenue: {},
            costOfGoodsSold: {},
            grossProfit: {},
            expenses: {},
            netProfit: {}
        };

        let totalRevenue = 0;
        let totalCOGS = 0;
        let totalExpenses = 0;

        for (const fy of financialYears) {
            const yearStatement = await this.generatePerShopPerYearPL(shopId, fy.id);

            // Aggregate revenues
            Object.entries(yearStatement.revenue).forEach(([account, amount]) => {
                const key = `${account} - ${fy.name}`;
                statement.revenue[key] = amount;
                totalRevenue += amount;
            });

            // Aggregate COGS
            Object.entries(yearStatement.costOfGoodsSold).forEach(([account, amount]) => {
                const key = `${account} - ${fy.name}`;
                statement.costOfGoodsSold[key] = amount;
                totalCOGS += amount;
            });

            // Aggregate expenses
            Object.entries(yearStatement.expenses).forEach(([account, amount]) => {
                const key = `${account} - ${fy.name}`;
                statement.expenses[key] = amount;
                totalExpenses += amount;
            });
        }

        statement.grossProfit['إجمالي الربح - جميع السنوات'] = totalRevenue - totalCOGS;
        statement.netProfit['صافي الربح - جميع السنوات'] = totalRevenue - totalCOGS - totalExpenses;

        return statement;
    }

    /**
     * Generate all shops per year P&L
     */
    private static async generateAllShopsPerYearPL(financialYearId: string): Promise<ProfitLossStatement> {
        const shops = await ShopService.getAllShops();
        const financialYear = await FinancialYearService.getById(financialYearId);

        const statement: ProfitLossStatement = {
            metadata: {
                dimension: { type: 'ALL_SHOPS_PER_YEAR', financialYearId },
                generatedAt: new Date().toISOString(),
                period: `جميع المتاجر - ${financialYear?.name || 'السنة المالية'}`
            },
            revenue: {},
            costOfGoodsSold: {},
            grossProfit: {},
            expenses: {},
            netProfit: {}
        };

        let totalRevenue = 0;
        let totalCOGS = 0;
        let totalExpenses = 0;

        for (const shop of shops) {
            try {
                const shopStatement = await this.generatePerShopPerYearPL(shop.id, financialYearId);

                // Aggregate revenues
                Object.entries(shopStatement.revenue).forEach(([account, amount]) => {
                    const key = `${account} - ${shop.name}`;
                    statement.revenue[key] = amount;
                    totalRevenue += amount;
                });

                // Aggregate COGS
                Object.entries(shopStatement.costOfGoodsSold).forEach(([account, amount]) => {
                    const key = `${account} - ${shop.name}`;
                    statement.costOfGoodsSold[key] = amount;
                    totalCOGS += amount;
                });

                // Aggregate expenses
                Object.entries(shopStatement.expenses).forEach(([account, amount]) => {
                    const key = `${account} - ${shop.name}`;
                    statement.expenses[key] = amount;
                    totalExpenses += amount;
                });
            } catch (error) {
                // Skip shops that don't have data for this financial year
                console.warn(`No data for shop ${shop.name} in financial year ${financialYearId}`);
            }
        }

        statement.grossProfit['إجمالي الربح - جميع المتاجر'] = totalRevenue - totalCOGS;
        statement.netProfit['صافي الربح - جميع المتاجر'] = totalRevenue - totalCOGS - totalExpenses;

        return statement;
    }

    /**
     * Generate grand total P&L across all shops and years
     */
    private static async generateGrandTotalPL(): Promise<ProfitLossStatement> {
        const shops = await ShopService.getAllShops();
        const allFinancialYears = await FinancialYearService.getAllFinancialYears();

        const statement: ProfitLossStatement = {
            metadata: {
                dimension: { type: 'GRAND_TOTAL' },
                generatedAt: new Date().toISOString(),
                period: 'الإجمالي العام - جميع المتاجر وجميع السنوات'
            },
            revenue: {},
            costOfGoodsSold: {},
            grossProfit: {},
            expenses: {},
            netProfit: {}
        };

        let totalRevenue = 0;
        let totalCOGS = 0;
        let totalExpenses = 0;

        for (const shop of shops) {
            const shopYears = allFinancialYears.filter(fy => fy.shopId === shop.id);

            for (const fy of shopYears) {
                try {
                    const shopYearStatement = await this.generatePerShopPerYearPL(shop.id, fy.id);

                    // Aggregate revenues
                    Object.entries(shopYearStatement.revenue).forEach(([account, amount]) => {
                        const key = `${account} - ${shop.name} - ${fy.name}`;
                        statement.revenue[key] = amount;
                        totalRevenue += amount;
                    });

                    // Aggregate COGS
                    Object.entries(shopYearStatement.costOfGoodsSold).forEach(([account, amount]) => {
                        const key = `${account} - ${shop.name} - ${fy.name}`;
                        statement.costOfGoodsSold[key] = amount;
                        totalCOGS += amount;
                    });

                    // Aggregate expenses
                    Object.entries(shopYearStatement.expenses).forEach(([account, amount]) => {
                        const key = `${account} - ${shop.name} - ${fy.name}`;
                        statement.expenses[key] = amount;
                        totalExpenses += amount;
                    });
                } catch (error) {
                    // Skip combinations that don't have data
                    console.warn(`No data for shop ${shop.name} in financial year ${fy.name}`);
                }
            }
        }

        statement.grossProfit['إجمالي الربح - الإجمالي العام'] = totalRevenue - totalCOGS;
        statement.netProfit['صافي الربح - الإجمالي العام'] = totalRevenue - totalCOGS - totalExpenses;

        return statement;
    }

    // ================ UTILITY METHODS ================

    private static isDebitAccount(account: Account): boolean {
        return account.nature === AccountNature.DEBIT;
    }

    private static isCreditAccount(account: Account): boolean {
        return account.nature === AccountNature.CREDIT;
    }

    private static isCurrentAsset(account: Account): boolean {
        return account.category === 'CURRENT_ASSET' ||
               account.type === AccountType.CASH ||
               account.type === AccountType.BANK ||
               account.type === AccountType.CUSTOMER;
    }

    private static isCurrentLiability(account: Account): boolean {
        return account.category === 'CURRENT_LIABILITY' ||
               account.type === AccountType.SUPPLIER;
    }

    private static async getPeriodFromDimension(dimension: ProfitLossDimension): Promise<string> {
        try {
            if (dimension.financialYearId) {
                const fy = await FinancialYearService.getById(dimension.financialYearId);
                return fy?.name || 'السنة المالية';
            }
            if (dimension.shopId) {
                const shop = await ShopService.getShopById(dimension.shopId);
                return shop?.name || 'المتجر';
            }
            return 'فترة مخصصة';
        } catch (error) {
            return 'فترة مخصصة';
        }
    }

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

            return 0;
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

            return 0;
        } catch (error) {
            console.warn('Error getting closing stock value:', error);
            return 0;
        }
    }

    private static async getTotalPurchases(shopId: string, financialYearId: string): Promise<number> {
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
                    totalPurchases += balance;
                }
            }

            return totalPurchases;
        } catch (error) {
            console.warn('Error getting total purchases:', error);
            return 0;
        }
    }

    private static async getStockValueForBalanceSheet(
        shopId: string,
        financialYearId: string,
        asOfDate?: string
    ): Promise<number> {
        // For balance sheet, we typically use closing stock value
        return await this.getClosingStockValue(shopId, financialYearId);
    }
}