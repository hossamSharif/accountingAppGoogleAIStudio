# Phase 2: Complete Accounting Engine with Financial Year Integration
## Detailed Task Breakdown (Weeks 7-16)

---

## 🚀 Week 7-8: Enhanced Double-Entry Bookkeeping with Financial Year Integration

### **Task 2.1: Financial Year-Aware Transaction Validation Engine**
**Priority: CRITICAL | Estimated Time: 16-20 hours**

#### **Subtasks:**

**2.1.1 Create Enhanced Transaction Service**
- **New File:** `services/transactionService.ts`
- **Purpose:** Complete double-entry transaction management with financial year awareness
- **Implementation:**
```typescript
import { financialYearService } from './financialYearService';
import { stockTransitionService } from './stockTransitionService';

export class TransactionService extends BaseService {
  // Create transaction with financial year validation
  static async createTransaction(transactionData: CreateTransactionData): Promise<Transaction> {
    // 1. Validate financial year is open
    const financialYear = await financialYearService.getActiveFinancialYear(transactionData.shopId);
    if (!financialYear || financialYear.status !== 'open') {
      throw new Error('Cannot create transactions in closed financial year');
    }

    // 2. Validate double-entry balance
    const totalDebits = transactionData.entries
      .filter(e => e.type === 'debit')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalCredits = transactionData.entries
      .filter(e => e.type === 'credit')
      .reduce((sum, e) => sum + e.amount, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error('Transaction must be balanced (debits = credits)');
    }

    // 3. Validate stock account usage
    await this.validateStockAccountUsage(transactionData.entries, financialYear.id);

    // 4. Create transaction with financial year reference
    const batch = writeBatch(this.db);
    const transactionRef = doc(collection(this.db, 'transactions'));

    const newTransaction: Omit<Transaction, 'id'> = {
      ...transactionData,
      financialYearId: financialYear.id,
      status: 'posted',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    batch.set(transactionRef, newTransaction);

    // 5. Update account balances
    for (const entry of transactionData.entries) {
      await this.updateAccountBalance(batch, entry, financialYear.id);
    }

    await batch.commit();
    return { id: transactionRef.id, ...newTransaction };
  }

  // Validate stock account usage per financial year
  private static async validateStockAccountUsage(
    entries: TransactionEntry[],
    financialYearId: string
  ): Promise<void> {
    for (const entry of entries) {
      const account = await this.getAccountById(entry.accountId);
      if (account.type === 'OPENING_STOCK' || account.type === 'ENDING_STOCK') {
        if (account.financialYearId !== financialYearId) {
          throw new Error(`Stock account ${account.name} belongs to different financial year`);
        }
      }
    }
  }

  // Update account balance with financial year context
  private static async updateAccountBalance(
    batch: WriteBatch,
    entry: TransactionEntry,
    financialYearId: string
  ): Promise<void> {
    const account = await this.getAccountById(entry.accountId);
    const balanceRef = doc(this.db, 'accountBalances', `${entry.accountId}_${financialYearId}`);

    const currentBalance = await this.getAccountBalance(entry.accountId, financialYearId);
    const newBalance = entry.type === 'debit'
      ? currentBalance + entry.amount
      : currentBalance - entry.amount;

    batch.set(balanceRef, {
      accountId: entry.accountId,
      financialYearId,
      balance: newBalance,
      lastUpdated: Timestamp.now()
    }, { merge: true });
  }
}
```

**2.1.2 Create Accounting Engine Core**
- **New File:** `services/accountingEngine.ts`
- **Purpose:** Core accounting validation and calculation engine
- **Implementation:**
```typescript
export class AccountingEngine extends BaseService {
  // Validate transaction posting rules
  static async validatePostingRules(transaction: Transaction): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Double-entry validation
    if (!this.isTransactionBalanced(transaction)) {
      errors.push('Transaction is not balanced');
    }

    // 2. Account type validation
    for (const entry of transaction.entries) {
      const account = await this.getAccountById(entry.accountId);
      const validationResult = this.validateAccountUsage(account, entry);
      if (!validationResult.isValid) {
        errors.push(validationResult.error);
      }
    }

    // 3. Financial year validation
    const fyValidation = await this.validateFinancialYearRules(transaction);
    if (!fyValidation.isValid) {
      errors.push(fyValidation.error);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Calculate multi-dimensional account balances
  static async calculateMultiDimensionalBalances(
    shopId: string,
    financialYearId?: string,
    accountType?: AccountType
  ): Promise<BalanceMatrix> {
    const balances: BalanceMatrix = {
      perShopPerYear: {},
      perShopAllYears: {},
      allShopsPerYear: {},
      grandTotal: 0
    };

    // Build complex query based on dimensions
    let query = collection(this.db, 'accountBalances');

    if (shopId) {
      query = this.addShopFilter(query, shopId);
    }
    if (financialYearId) {
      query = this.addFinancialYearFilter(query, financialYearId);
    }
    if (accountType) {
      query = this.addAccountTypeFilter(query, accountType);
    }

    const snapshot = await getDocs(query);

    // Process and aggregate balances
    snapshot.forEach(doc => {
      const balance = doc.data() as AccountBalance;
      this.aggregateBalance(balances, balance);
    });

    return balances;
  }
}
```

**2.1.3 Create Transaction Validator Service**
- **New File:** `services/transactionValidator.ts`
- **Purpose:** Comprehensive transaction validation with business rules
- **Implementation:**
```typescript
export class TransactionValidator extends BaseService {
  // Validate transaction against business rules
  static async validateTransaction(transaction: CreateTransactionData): Promise<ValidationResult> {
    const validations = await Promise.all([
      this.validateDoubleEntry(transaction),
      this.validateAccountTypes(transaction),
      this.validateFinancialYear(transaction),
      this.validateStockAccounts(transaction),
      this.validateAccountPermissions(transaction),
      this.validateAmountLimits(transaction)
    ]);

    const errors = validations.flatMap(v => v.errors);
    const warnings = validations.flatMap(v => v.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Validate stock account specific rules
  private static async validateStockAccounts(
    transaction: CreateTransactionData
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    for (const entry of transaction.entries) {
      const account = await this.getAccountById(entry.accountId);

      if (account.type === 'OPENING_STOCK') {
        // Opening stock can only be set at financial year start
        const fy = await financialYearService.getById(account.financialYearId);
        const fyStartDate = new Date(fy.startDate);
        const transactionDate = new Date(transaction.date);

        if (transactionDate > fyStartDate) {
          errors.push(`Opening stock account can only be used at financial year start`);
        }
      }

      if (account.type === 'ENDING_STOCK') {
        // Ending stock validation rules
        const stockValue = await this.calculateCurrentStockValue(account.shopId, account.financialYearId);
        if (entry.amount > stockValue * 1.1) { // 10% tolerance
          errors.push(`Ending stock amount exceeds calculated stock value`);
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings: [] };
  }
}
```

---

### **Task 2.2: Stock Valuation Integration**
**Priority: CRITICAL | Estimated Time: 12-16 hours**

#### **Subtasks:**

**2.2.1 Enhance Financial Year Service for Stock Management**
- **File:** `services/financialYearService.ts` (Already exists - needs enhancement)
- **Enhancement:** Add stock account creation and validation
- **Implementation:**
```typescript
export class FinancialYearService extends BaseService {
  // Create financial year with automatic stock accounts
  static async createFinancialYearWithStockAccounts(
    fyData: CreateFinancialYearData
  ): Promise<FinancialYear> {
    const batch = writeBatch(this.db);

    // 1. Create financial year
    const fyRef = doc(collection(this.db, 'financialYears'));
    const newFY: Omit<FinancialYear, 'id'> = {
      ...fyData,
      status: 'open',
      createdAt: Timestamp.now()
    };
    batch.set(fyRef, newFY);

    // 2. Create opening stock account
    const openingStockRef = doc(collection(this.db, 'accounts'));
    const openingStockAccount: Omit<Account, 'id'> = {
      name: `مخزون أول المدة - ${fyData.name}`,
      accountCode: `${fyData.shopId}_OS_${fyRef.id}`,
      type: 'OPENING_STOCK',
      shopId: fyData.shopId,
      financialYearId: fyRef.id,
      isActive: true,
      createdAt: Timestamp.now()
    };
    batch.set(openingStockRef, openingStockAccount);

    // 3. Create ending stock account
    const endingStockRef = doc(collection(this.db, 'accounts'));
    const endingStockAccount: Omit<Account, 'id'> = {
      name: `مخزون آخر المدة - ${fyData.name}`,
      accountCode: `${fyData.shopId}_ES_${fyRef.id}`,
      type: 'ENDING_STOCK',
      shopId: fyData.shopId,
      financialYearId: fyRef.id,
      isActive: true,
      createdAt: Timestamp.now()
    };
    batch.set(endingStockRef, endingStockAccount);

    // 4. Update financial year with stock account references
    batch.update(fyRef, {
      openingStockAccountId: openingStockRef.id,
      closingStockAccountId: endingStockRef.id
    });

    await batch.commit();

    return {
      id: fyRef.id,
      ...newFY,
      openingStockAccountId: openingStockRef.id,
      closingStockAccountId: endingStockRef.id
    };
  }

  // Validate stock transition between financial years
  static async validateStockTransition(
    fromFYId: string,
    toFYId: string,
    closingStockValue: number
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // 1. Validate financial years are consecutive
    const fromFY = await this.getById(fromFYId);
    const toFY = await this.getById(toFYId);

    const fromEndDate = new Date(fromFY.endDate);
    const toStartDate = new Date(toFY.startDate);

    if (fromEndDate >= toStartDate) {
      errors.push('Financial years must be consecutive');
    }

    // 2. Validate closing stock value
    if (closingStockValue < 0) {
      errors.push('Closing stock value cannot be negative');
    }

    // 3. Check if transition already exists
    const existingTransition = await stockTransitionService.getTransition(fromFYId, toFYId);
    if (existingTransition) {
      errors.push('Stock transition already exists between these financial years');
    }

    return { isValid: errors.length === 0, errors, warnings: [] };
  }
}
```

**2.2.2 Create Balance Calculator Service**
- **New File:** `services/balanceCalculator.ts`
- **Purpose:** Multi-dimensional balance calculations with financial year awareness
- **Implementation:**
```typescript
export class BalanceCalculator extends BaseService {
  // Calculate account balance for specific financial year
  static async calculateAccountBalanceForFY(
    accountId: string,
    financialYearId: string,
    asOfDate?: string
  ): Promise<number> {
    let query = collection(this.db, 'transactions');

    // Filter by financial year
    query = this.addFilter(query, where('financialYearId', '==', financialYearId));

    // Filter by date if provided
    if (asOfDate) {
      query = this.addFilter(query, where('date', '<=', asOfDate));
    }

    const snapshot = await getDocs(query);
    let balance = 0;

    snapshot.forEach(doc => {
      const transaction = doc.data() as Transaction;
      const entry = transaction.entries.find(e => e.accountId === accountId);
      if (entry) {
        balance += entry.type === 'debit' ? entry.amount : -entry.amount;
      }
    });

    return balance;
  }

  // Calculate multi-dimensional profit matrix
  static async calculateProfitMatrix(
    shopId?: string,
    financialYearId?: string
  ): Promise<ProfitMatrix> {
    const matrix: ProfitMatrix = {
      perShopPerYear: {},
      perShopAllYears: {},
      allShopsPerYear: {},
      grandTotal: 0
    };

    // Get all combinations of shops and financial years
    const shops = shopId ? [await this.getShopById(shopId)] : await this.getAllShops();
    const financialYears = financialYearId
      ? [await financialYearService.getById(financialYearId)]
      : await financialYearService.getAllFinancialYears();

    for (const shop of shops) {
      matrix.perShopAllYears[shop.id] = 0;

      for (const fy of financialYears.filter(f => f.shopId === shop.id)) {
        // Calculate profit for this shop-year combination
        const profit = await this.calculateProfitForShopAndYear(shop.id, fy.id);

        // Update matrix
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
      }
    }

    return matrix;
  }

  // Calculate profit using accounting formula with stock
  private static async calculateProfitForShopAndYear(
    shopId: string,
    financialYearId: string
  ): Promise<number> {
    // Profit = Sales - (Opening Stock + Purchases - Closing Stock) - Expenses

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
  }
}
```

---

## 🔧 Week 9-12: Multi-Dimensional Financial Statements

### **Task 2.3: Enhanced Statement Generators**
**Priority: HIGH | Estimated Time: 20-24 hours**

#### **Subtasks:**

**2.3.1 Create Financial Statement Service**
- **New File:** `services/financialStatementService.ts`
- **Purpose:** Generate multi-dimensional financial statements
- **Implementation:**
```typescript
export class FinancialStatementService extends BaseService {
  // Generate multi-dimensional trial balance
  static async generateTrialBalance(
    shopId?: string,
    financialYearId?: string,
    asOfDate?: string
  ): Promise<TrialBalance> {
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
      const balance = await balanceCalculator.calculateAccountBalanceForFY(
        account.id,
        financialYearId || account.financialYearId,
        asOfDate
      );

      if (Math.abs(balance) > 0.01) { // Only include accounts with non-zero balances
        const tbAccount: TrialBalanceAccount = {
          accountId: account.id,
          accountCode: account.accountCode,
          accountName: account.name,
          debitBalance: balance > 0 ? balance : 0,
          creditBalance: balance < 0 ? Math.abs(balance) : 0
        };

        trialBalance.accounts.push(tbAccount);
        trialBalance.totals.debits += tbAccount.debitBalance;
        trialBalance.totals.credits += tbAccount.creditBalance;
      }
    }

    return trialBalance;
  }

  // Generate multi-dimensional P&L statement
  static async generateProfitLossStatement(
    dimension: ProfitLossDimension
  ): Promise<ProfitLossStatement> {
    const statement: ProfitLossStatement = {
      metadata: {
        dimension,
        generatedAt: new Date().toISOString(),
        period: this.getPeriodFromDimension(dimension)
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
        throw new Error('Invalid profit/loss dimension');
    }
  }

  // Generate balance sheet with proper stock valuation
  static async generateBalanceSheet(
    shopId: string,
    financialYearId: string,
    asOfDate?: string
  ): Promise<BalanceSheet> {
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
    const assetAccounts = await this.getAccountsByType(shopId, 'ASSET', financialYearId);
    for (const account of assetAccounts) {
      const balance = await balanceCalculator.calculateAccountBalanceForFY(
        account.id,
        financialYearId,
        asOfDate
      );

      if (account.category === 'CURRENT_ASSET') {
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

    // Calculate liabilities and equity similarly...

    return balanceSheet;
  }
}
```

**2.3.2 Create Multi-Dimensional Profit Report Component**
- **New File:** `components/MultiDimensionalProfitReport.tsx`
- **Purpose:** Display profit analysis across multiple dimensions
- **Implementation:**
```typescript
interface MultiDimensionalProfitReportProps {
  shopId?: string;
  financialYearId?: string;
}

export const MultiDimensionalProfitReport: React.FC<MultiDimensionalProfitReportProps> = ({
  shopId,
  financialYearId
}) => {
  const [profitMatrix, setProfitMatrix] = useState<ProfitMatrix | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<DimensionType>('PER_SHOP_PER_YEAR');
  const [isLoading, setIsLoading] = useState(false);

  const generateReport = async () => {
    try {
      setIsLoading(true);
      const matrix = await balanceCalculator.calculateProfitMatrix(shopId, financialYearId);
      setProfitMatrix(matrix);
    } catch (error) {
      console.error('Error generating profit report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderProfitMatrix = () => {
    if (!profitMatrix) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Per Shop Per Year Matrix */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">الربح لكل متجر لكل سنة مالية</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-2">المتجر</th>
                  {Object.keys(profitMatrix.allShopsPerYear).map(fyId => (
                    <th key={fyId} className="text-right p-2">السنة {fyId}</th>
                  ))}
                  <th className="text-right p-2 font-bold">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(profitMatrix.perShopPerYear).map(([shopId, yearData]) => (
                  <tr key={shopId} className="border-b">
                    <td className="p-2">{shopId}</td>
                    {Object.values(yearData).map((profit, index) => (
                      <td key={index} className="p-2 text-green-600">
                        {profit.toLocaleString('ar-SA')} ريال
                      </td>
                    ))}
                    <td className="p-2 font-bold text-blue-600">
                      {profitMatrix.perShopAllYears[shopId].toLocaleString('ar-SA')} ريال
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-2">إجمالي الربح</h3>
            <p className="text-3xl font-bold">
              {profitMatrix.grandTotal.toLocaleString('ar-SA')} ريال
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">الربح حسب السنة المالية</h3>
            {Object.entries(profitMatrix.allShopsPerYear).map(([fyId, profit]) => (
              <div key={fyId} className="flex justify-between py-2 border-b">
                <span>السنة المالية {fyId}</span>
                <span className="font-semibold text-green-600">
                  {profit.toLocaleString('ar-SA')} ريال
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">تقرير الربح متعدد الأبعاد</h2>
        <button
          onClick={generateReport}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'جاري التحليل...' : 'تحليل الربح'}
        </button>
      </div>

      {renderProfitMatrix()}
    </div>
  );
};
```

---

### **Task 2.4: Stock-Integrated Profit Calculation**
**Priority: HIGH | Estimated Time: 16-20 hours**

#### **Subtasks:**

**2.4.1 Enhance Profit Calculation Service**
- **File:** `services/profitCalculationService.ts` (Already exists - needs enhancement)
- **Enhancement:** Add multi-dimensional calculations and stock integration
- **Implementation:**
```typescript
export class ProfitCalculationService extends BaseService {
  // Calculate profit with complete accounting formula
  static async calculateProfitWithStockIntegration(
    shopId: string,
    financialYearId: string,
    includeProjections: boolean = false
  ): Promise<DetailedProfitCalculation> {
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
  }

  // Generate comparative analysis across financial years
  static async generateComparativeAnalysis(
    shopId: string,
    financialYearIds: string[]
  ): Promise<ComparativeProfitAnalysis> {
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
  }

  // Validate stock continuity across financial years
  static async validateStockContinuity(shopId: string): Promise<StockContinuityReport> {
    const financialYears = await financialYearService.getFinancialYearsByShop(shopId);
    const report: StockContinuityReport = {
      shopId,
      checkedAt: new Date().toISOString(),
      years: [],
      discrepancies: [],
      isValid: true
    };

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
          description: `Stock discrepancy between ${currentFY.name} and ${nextFY.name}`,
          amount: yearCheck.difference,
          suggestedAction: 'Review stock transition records'
        });
      }
    }

    return report;
  }
}
```

**2.4.2 Create Financial Year Selector Component**
- **New File:** `components/FinancialYearSelector.tsx`
- **Purpose:** Allow users to select financial years for calculations
- **Implementation:**
```typescript
interface FinancialYearSelectorProps {
  shopId?: string;
  selectedYearId?: string;
  onYearChange: (yearId: string) => void;
  allowMultiple?: boolean;
  selectedYearIds?: string[];
  onMultipleYearsChange?: (yearIds: string[]) => void;
}

export const FinancialYearSelector: React.FC<FinancialYearSelectorProps> = ({
  shopId,
  selectedYearId,
  onYearChange,
  allowMultiple = false,
  selectedYearIds = [],
  onMultipleYearsChange
}) => {
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadFinancialYears();
  }, [shopId]);

  const loadFinancialYears = async () => {
    try {
      setIsLoading(true);
      const years = shopId
        ? await financialYearService.getFinancialYearsByShop(shopId)
        : await financialYearService.getAllFinancialYears();
      setFinancialYears(years);
    } catch (error) {
      console.error('Error loading financial years:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleYearToggle = (yearId: string) => {
    if (allowMultiple && onMultipleYearsChange) {
      const newSelection = selectedYearIds.includes(yearId)
        ? selectedYearIds.filter(id => id !== yearId)
        : [...selectedYearIds, yearId];
      onMultipleYearsChange(newSelection);
    } else {
      onYearChange(yearId);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-10 rounded"></div>;
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {allowMultiple ? 'اختر السنوات المالية' : 'اختر السنة المالية'}
      </label>

      {allowMultiple ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {financialYears.map(year => (
            <label key={year.id} className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                checked={selectedYearIds.includes(year.id)}
                onChange={() => handleYearToggle(year.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">{year.name}</span>
              <span className={`text-xs px-2 py-1 rounded ${
                year.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {year.status === 'open' ? 'مفتوحة' : 'مغلقة'}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <select
          value={selectedYearId || ''}
          onChange={(e) => onYearChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">اختر السنة المالية</option>
          {financialYears.map(year => (
            <option key={year.id} value={year.id}>
              {year.name} ({year.status === 'open' ? 'مفتوحة' : 'مغلقة'})
            </option>
          ))}
        </select>
      )}
    </div>
  );
};
```

---

## 📊 Week 13-16: Financial Year Management & Advanced Features

### **Task 2.5: Financial Year Lifecycle Management**
**Priority: HIGH | Estimated Time: 18-22 hours**

#### **Subtasks:**

**2.5.1 Create Financial Year Management Page**
- **New File:** `pages/FinancialYearManagementPage.tsx`
- **Purpose:** Complete financial year lifecycle management interface
- **Implementation:**
```typescript
export const FinancialYearManagementPage: React.FC = () => {
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStockTransitionModal, setShowStockTransitionModal] = useState(false);
  const [selectedFYForTransition, setSelectedFYForTransition] = useState<string>('');

  const handleCreateFinancialYear = async (fyData: CreateFinancialYearData) => {
    try {
      const newFY = await financialYearService.createFinancialYearWithStockAccounts(fyData);
      setFinancialYears(prev => [...prev, newFY]);
      setShowCreateModal(false);

      // Log the action
      await loggingService.logAction(
        currentUser,
        LogType.FINANCIAL_YEAR_CREATED,
        `تم إنشاء سنة مالية جديدة: ${newFY.name}`,
        newFY.shopId
      );
    } catch (error) {
      console.error('Error creating financial year:', error);
    }
  };

  const handleCloseFinancialYear = async (fyId: string) => {
    try {
      await financialYearService.closeFinancialYear(fyId);

      // Refresh the list
      await loadFinancialYears();

      // Log the action
      const fy = financialYears.find(f => f.id === fyId);
      await loggingService.logAction(
        currentUser,
        LogType.FINANCIAL_YEAR_CLOSED,
        `تم إغلاق السنة المالية: ${fy?.name}`,
        fy?.shopId
      );
    } catch (error) {
      console.error('Error closing financial year:', error);
    }
  };

  const renderFinancialYearCard = (fy: FinancialYear) => (
    <div key={fy.id} className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold">{fy.name}</h3>
        <span className={`px-3 py-1 rounded-full text-sm ${
          fy.status === 'open'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {fy.status === 'open' ? 'مفتوحة' : 'مغلقة'}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <p>تاريخ البداية: {fy.startDate}</p>
        <p>تاريخ النهاية: {fy.endDate}</p>
        <p>قيمة مخزون أول المدة: {fy.openingStockValue?.toLocaleString('ar-SA')} ريال</p>
        {fy.closingStockValue && (
          <p>قيمة مخزون آخر المدة: {fy.closingStockValue.toLocaleString('ar-SA')} ريال</p>
        )}
      </div>

      <div className="flex space-x-2 space-x-reverse">
        {fy.status === 'open' && (
          <>
            <button
              onClick={() => {
                setSelectedFYForTransition(fy.id);
                setShowStockTransitionModal(true);
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              انتقال المخزون
            </button>
            <button
              onClick={() => handleCloseFinancialYear(fy.id)}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              إغلاق السنة
            </button>
          </>
        )}
        <button
          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          التقارير
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">إدارة السنوات المالية</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          إنشاء سنة مالية جديدة
        </button>
      </div>

      {/* Shop Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <ShopSelector
          selectedShopId={selectedShop}
          onShopChange={setSelectedShop}
          allowAll={true}
        />
      </div>

      {/* Financial Years Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {financialYears.map(renderFinancialYearCard)}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <FinancialYearCreateModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateFinancialYear}
          selectedShopId={selectedShop}
        />
      )}

      {showStockTransitionModal && (
        <StockTransitionModal
          financialYearId={selectedFYForTransition}
          onClose={() => setShowStockTransitionModal(false)}
          onTransitionComplete={() => {
            setShowStockTransitionModal(false);
            loadFinancialYears();
          }}
        />
      )}
    </div>
  );
};
```

**2.5.2 Create Stock Transition Modal Component**
- **New File:** `components/StockTransitionModal.tsx`
- **Purpose:** Handle stock transitions between financial years
- **Implementation:**
```typescript
interface StockTransitionModalProps {
  financialYearId: string;
  onClose: () => void;
  onTransitionComplete: () => void;
}

export const StockTransitionModal: React.FC<StockTransitionModalProps> = ({
  financialYearId,
  onClose,
  onTransitionComplete
}) => {
  const [closingStockValue, setClosingStockValue] = useState<number>(0);
  const [nextFinancialYear, setNextFinancialYear] = useState<FinancialYear | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    loadNextFinancialYear();
  }, [financialYearId]);

  const loadNextFinancialYear = async () => {
    try {
      const currentFY = await financialYearService.getById(financialYearId);
      const nextFY = await financialYearService.getNextFinancialYear(financialYearId);
      setNextFinancialYear(nextFY);

      // Pre-populate with calculated stock value if available
      const calculatedStock = await stockTransitionService.calculateClosingStockValue(
        currentFY.shopId,
        financialYearId
      );
      setClosingStockValue(calculatedStock);
    } catch (error) {
      console.error('Error loading next financial year:', error);
    }
  };

  const validateTransition = async () => {
    if (!nextFinancialYear) return;

    try {
      setIsValidating(true);
      const result = await financialYearService.validateStockTransition(
        financialYearId,
        nextFinancialYear.id,
        closingStockValue
      );
      setValidationResult(result);
    } catch (error) {
      console.error('Error validating transition:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const executeTransition = async () => {
    if (!nextFinancialYear || !validationResult?.isValid) return;

    try {
      setIsTransitioning(true);

      await stockTransitionService.executeStockTransition({
        fromFinancialYearId: financialYearId,
        toFinancialYearId: nextFinancialYear.id,
        closingStockValue,
        executedBy: currentUser.id
      });

      onTransitionComplete();
    } catch (error) {
      console.error('Error executing stock transition:', error);
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">انتقال المخزون بين السنوات المالية</h2>
        </div>

        <div className="p-6 space-y-4">
          {nextFinancialYear ? (
            <>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  سيتم انتقال المخزون إلى: <strong>{nextFinancialYear.name}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  قيمة مخزون آخر المدة
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={closingStockValue}
                  onChange={(e) => setClosingStockValue(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <button
                onClick={validateTransition}
                disabled={isValidating}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isValidating ? 'جاري التحقق...' : 'تحقق من صحة الانتقال'}
              </button>

              {validationResult && (
                <div className={`p-4 rounded-lg ${
                  validationResult.isValid ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {validationResult.isValid ? (
                    <p className="text-green-800">✓ يمكن تنفيذ انتقال المخزون</p>
                  ) : (
                    <div className="text-red-800">
                      <p className="font-semibold">❌ لا يمكن تنفيذ الانتقال:</p>
                      <ul className="mt-2 space-y-1">
                        {validationResult.errors.map((error, index) => (
                          <li key={index} className="text-sm">• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {validationResult?.isValid && (
                <button
                  onClick={executeTransition}
                  disabled={isTransitioning}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isTransitioning ? 'جاري تنفيذ الانتقال...' : 'تنفيذ انتقال المخزون'}
                </button>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">لا توجد سنة مالية تالية للانتقال إليها</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### **Task 2.6: Enhanced Reporting & Export**
**Priority: MEDIUM | Estimated Time: 14-18 hours**

#### **Subtasks:**

**2.6.1 Create Stock Continuity Report Component**
- **New File:** `components/StockContinuityReport.tsx`
- **Purpose:** Display stock continuity validation across financial years
- **Implementation:**
```typescript
interface StockContinuityReportProps {
  shopId: string;
}

export const StockContinuityReport: React.FC<StockContinuityReportProps> = ({ shopId }) => {
  const [continuityReport, setContinuityReport] = useState<StockContinuityReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateReport = async () => {
    try {
      setIsLoading(true);
      const report = await profitCalculationService.validateStockContinuity(shopId);
      setContinuityReport(report);
    } catch (error) {
      console.error('Error generating stock continuity report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (shopId) {
      generateReport();
    }
  }, [shopId]);

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>;
  }

  if (!continuityReport) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">تقرير استمرارية المخزون</h3>
        <span className={`px-3 py-1 rounded-full text-sm ${
          continuityReport.isValid
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {continuityReport.isValid ? '✓ سليم' : '⚠ يحتاج مراجعة'}
        </span>
      </div>

      <div className="space-y-4">
        {continuityReport.years.map((yearCheck, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              yearCheck.isValid
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">
                {yearCheck.fromYear} ← {yearCheck.toYear}
              </h4>
              <span className={`text-sm ${
                yearCheck.isValid ? 'text-green-600' : 'text-red-600'
              }`}>
                {yearCheck.isValid ? '✓' : '⚠'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">مخزون آخر المدة:</span>
                <p className="font-semibold">
                  {yearCheck.closingStock.toLocaleString('ar-SA')} ريال
                </p>
              </div>
              <div>
                <span className="text-gray-600">مخزون أول المدة:</span>
                <p className="font-semibold">
                  {yearCheck.openingStock.toLocaleString('ar-SA')} ريال
                </p>
              </div>
              <div>
                <span className="text-gray-600">الفرق:</span>
                <p className={`font-semibold ${
                  yearCheck.difference > 0.01 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {yearCheck.difference.toLocaleString('ar-SA')} ريال
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {continuityReport.discrepancies.length > 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">التناقضات المكتشفة:</h4>
          <ul className="space-y-2">
            {continuityReport.discrepancies.map((discrepancy, index) => (
              <li key={index} className="text-sm text-yellow-700">
                <strong>{discrepancy.description}</strong>
                <br />
                المبلغ: {discrepancy.amount.toLocaleString('ar-SA')} ريال
                <br />
                الإجراء المقترح: {discrepancy.suggestedAction}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

**2.6.2 Create Multi-Shop Profit Comparison Component**
- **New File:** `components/MultiShopProfitComparison.tsx`
- **Purpose:** Compare profit across multiple shops and financial years
- **Implementation:**
```typescript
export const MultiShopProfitComparison: React.FC = () => {
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<ShopProfitComparison | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const generateComparison = async () => {
    try {
      const data = await profitCalculationService.generateMultiShopComparison(
        selectedShops,
        selectedYears
      );
      setComparisonData(data);
    } catch (error) {
      console.error('Error generating comparison:', error);
    }
  };

  const renderComparisonTable = () => {
    if (!comparisonData) return null;

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-right border-b">المتجر</th>
              {selectedYears.map(yearId => (
                <th key={yearId} className="px-4 py-2 text-right border-b">
                  {comparisonData.yearNames[yearId]}
                </th>
              ))}
              <th className="px-4 py-2 text-right border-b font-bold">المتوسط</th>
              <th className="px-4 py-2 text-right border-b font-bold">النمو %</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(comparisonData.shopData).map(([shopId, shopData]) => (
              <tr key={shopId} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">
                  {comparisonData.shopNames[shopId]}
                </td>
                {selectedYears.map(yearId => (
                  <td key={yearId} className="px-4 py-2 text-green-600">
                    {shopData.yearlyProfits[yearId]?.toLocaleString('ar-SA') || '-'} ريال
                  </td>
                ))}
                <td className="px-4 py-2 font-bold text-blue-600">
                  {shopData.averageProfit.toLocaleString('ar-SA')} ريال
                </td>
                <td className={`px-4 py-2 font-bold ${
                  shopData.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {shopData.growthRate.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">مقارنة الأرباح بين المتاجر</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="font-medium mb-2">اختر المتاجر</h3>
            <ShopSelector
              allowMultiple={true}
              selectedShopIds={selectedShops}
              onMultipleShopsChange={setSelectedShops}
            />
          </div>

          <div>
            <h3 className="font-medium mb-2">اختر السنوات المالية</h3>
            <FinancialYearSelector
              allowMultiple={true}
              selectedYearIds={selectedYears}
              onMultipleYearsChange={setSelectedYears}
            />
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <button
            onClick={generateComparison}
            disabled={selectedShops.length === 0 || selectedYears.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            إنشاء المقارنة
          </button>

          {comparisonData && (
            <div className="flex space-x-2 space-x-reverse">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                جدول
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1 rounded ${
                  viewMode === 'chart' ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                رسم بياني
              </button>
            </div>
          )}
        </div>

        {comparisonData && (
          <div>
            {viewMode === 'table' ? renderComparisonTable() : renderComparisonChart()}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 🎯 Success Criteria for Phase 2

### **Week 7-8 Completion Criteria:**
- [ ] Financial year-aware transaction validation engine operational
- [ ] Stock account creation and validation per financial year works
- [ ] Double-entry validation with financial year context functions
- [ ] Accounting engine core validates complex business rules
- [ ] Multi-dimensional balance calculations accurate

### **Week 9-12 Completion Criteria:**
- [ ] Multi-dimensional trial balance generation works
- [ ] Four-way profit & loss statements generate correctly:
  - [ ] Per shop per financial year
  - [ ] Per shop across all years
  - [ ] All shops per financial year
  - [ ] Grand total across all shops/years
- [ ] Balance sheet includes proper stock valuation
- [ ] Stock-integrated profit calculations use accounting formula
- [ ] Financial year selector component functions properly

### **Week 13-16 Completion Criteria:**
- [ ] Financial year lifecycle management complete
- [ ] Stock transition workflows functional with validation
- [ ] Stock continuity validation across years works
- [ ] Multi-shop profit comparison component operational
- [ ] Enhanced reporting and export features working
- [ ] Financial year data integrity maintained

### **Overall Phase 2 Success:**
- [ ] Complete accounting engine with financial year integration
- [ ] Multi-dimensional financial statements generation
- [ ] Stock management per financial year with transitions
- [ ] Advanced profit calculations with stock integration
- [ ] Comprehensive financial year lifecycle management
- [ ] Production-ready accounting features with audit trails

---

## 📚 Resources & Documentation

### **Accounting Standards References:**
- Double-entry bookkeeping principles
- Financial year management best practices
- Stock valuation methods
- Multi-dimensional financial reporting

### **Technical Implementation:**
- All code snippets above should be implemented
- Follow existing TypeScript patterns from Phase 1
- Maintain Arabic RTL interface consistency
- Use established service layer architecture
- Implement comprehensive error handling and validation

This detailed breakdown provides clear, actionable tasks for completing Phase 2 of the financial year-integrated accounting engine. Each task includes specific implementations, code examples, and measurable success criteria.