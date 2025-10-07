# Phase 3: Production Features & Advanced Operations
## Detailed Task Breakdown (Weeks 17-24)

---

## 🚀 Week 17-18: Advanced Transaction Management & Daily Operations

### **Task 3.1: Enhanced Daily Transaction System**
**Priority: CRITICAL | Estimated Time: 18-22 hours**

#### **Subtasks:**

**3.1.1 Create Advanced Daily Entry Form**
- **New File:** `components/AdvancedDailyEntryForm.tsx`
- **Purpose:** Production-ready daily transaction entry with validation and templates
- **Implementation:**
```typescript
interface AdvancedDailyEntryFormProps {
  shopId: string;
  financialYearId: string;
  templateId?: string;
  onTransactionSaved: (transaction: Transaction) => void;
}

export const AdvancedDailyEntryForm: React.FC<AdvancedDailyEntryFormProps> = ({
  shopId,
  financialYearId,
  templateId,
  onTransactionSaved
}) => {
  const [transactionData, setTransactionData] = useState<CreateTransactionData>({
    shopId,
    financialYearId,
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    entries: [
      { accountId: '', amount: 0, type: 'debit', description: '' },
      { accountId: '', amount: 0, type: 'credit', description: '' }
    ],
    attachments: [],
    tags: []
  });

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isCalculatingBalances, setIsCalculatingBalances] = useState(false);
  const [suggestedAccounts, setSuggestedAccounts] = useState<Account[]>([]);
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);

  // Real-time balance calculation as user types
  const calculateRealTimeBalances = useCallback(
    debounce(async (entries: TransactionEntry[]) => {
      try {
        setIsCalculatingBalances(true);
        const balances = await Promise.all(
          entries.map(async (entry) => {
            if (!entry.accountId) return null;
            const balance = await balanceCalculator.calculateAccountBalanceForFY(
              entry.accountId,
              financialYearId
            );
            return { accountId: entry.accountId, balance };
          })
        );
        setAccountBalances(balances.filter(Boolean));
      } catch (error) {
        console.error('Error calculating balances:', error);
      } finally {
        setIsCalculatingBalances(false);
      }
    }, 500),
    [financialYearId]
  );

  // Intelligent account suggestions based on description
  const suggestAccountsFromDescription = async (description: string) => {
    if (description.length < 3) return;

    try {
      const suggestions = await transactionService.suggestAccountsFromDescription(
        description,
        shopId,
        financialYearId
      );
      setSuggestedAccounts(suggestions);
    } catch (error) {
      console.error('Error getting account suggestions:', error);
    }
  };

  // Auto-balance helper
  const autoBalanceEntries = () => {
    const totalDebits = transactionData.entries
      .filter(e => e.type === 'debit')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const totalCredits = transactionData.entries
      .filter(e => e.type === 'credit')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const difference = totalDebits - totalCredits;
    if (Math.abs(difference) > 0.01) {
      const lastCreditEntry = transactionData.entries
        .filter(e => e.type === 'credit')
        .pop();

      if (lastCreditEntry && difference > 0) {
        lastCreditEntry.amount = (lastCreditEntry.amount || 0) + difference;
        setTransactionData({...transactionData});
      }
    }
  };

  const renderEntryRow = (entry: TransactionEntry, index: number) => (
    <div key={index} className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg">
      <div className="col-span-4">
        <AccountSelector
          selectedAccountId={entry.accountId}
          onAccountChange={(accountId) => updateEntry(index, 'accountId', accountId)}
          shopId={shopId}
          financialYearId={financialYearId}
          suggestedAccounts={suggestedAccounts}
          showBalance={true}
        />
      </div>

      <div className="col-span-2">
        <input
          type="number"
          step="0.01"
          placeholder="المبلغ"
          value={entry.amount || ''}
          onChange={(e) => updateEntry(index, 'amount', parseFloat(e.target.value) || 0)}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="col-span-2">
        <select
          value={entry.type}
          onChange={(e) => updateEntry(index, 'type', e.target.value as 'debit' | 'credit')}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="debit">مدين</option>
          <option value="credit">دائن</option>
        </select>
      </div>

      <div className="col-span-3">
        <input
          type="text"
          placeholder="البيان"
          value={entry.description || ''}
          onChange={(e) => updateEntry(index, 'description', e.target.value)}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="col-span-1 flex space-x-2">
        <button
          onClick={() => addEntry()}
          className="text-green-600 hover:text-green-800"
        >
          ➕
        </button>
        {transactionData.entries.length > 2 && (
          <button
            onClick={() => removeEntry(index)}
            className="text-red-600 hover:text-red-800"
          >
            ❌
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">قيد يومي جديد</h2>
        <div className="flex space-x-2 space-x-reverse">
          <TemplateSelector
            templates={templates}
            onTemplateSelect={loadTemplate}
          />
          <button
            onClick={autoBalanceEntries}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            توازن تلقائي
          </button>
        </div>
      </div>

      {/* Transaction Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            التاريخ
          </label>
          <input
            type="date"
            value={transactionData.date}
            onChange={(e) => setTransactionData({...transactionData, date: e.target.value})}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            رقم المرجع
          </label>
          <input
            type="text"
            value={transactionData.reference}
            onChange={(e) => setTransactionData({...transactionData, reference: e.target.value})}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="رقم الفاتورة أو المرجع"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            البيان العام
          </label>
          <input
            type="text"
            value={transactionData.description}
            onChange={(e) => {
              setTransactionData({...transactionData, description: e.target.value});
              suggestAccountsFromDescription(e.target.value);
            }}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="وصف المعاملة"
          />
        </div>
      </div>

      {/* Transaction Entries */}
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-semibold">قيود المعاملة</h3>
        {transactionData.entries.map((entry, index) => renderEntryRow(entry, index))}
      </div>

      {/* Balance Summary */}
      <TransactionBalanceSummary
        entries={transactionData.entries}
        isCalculating={isCalculatingBalances}
      />

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <ValidationErrorDisplay errors={validationErrors} />
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-4 space-x-reverse mt-6">
        <button
          onClick={() => saveAsDraft()}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          حفظ كمسودة
        </button>
        <button
          onClick={() => saveAndPost()}
          disabled={validationErrors.length > 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          حفظ وترحيل
        </button>
      </div>
    </div>
  );
};
```

**3.1.2 Create Transaction Template System**
- **New File:** `services/transactionTemplateService.ts`
- **Purpose:** Reusable transaction templates for common operations
- **Implementation:**
```typescript
export class TransactionTemplateService extends BaseService {
  // Create transaction template
  static async createTemplate(templateData: CreateTransactionTemplateData): Promise<TransactionTemplate> {
    try {
      const templateRef = doc(collection(this.db, 'transactionTemplates'));
      const newTemplate: Omit<TransactionTemplate, 'id'> = {
        ...templateData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        usageCount: 0,
        isActive: true
      };

      await setDoc(templateRef, newTemplate);

      // Log template creation
      await loggingService.logAction(
        templateData.createdBy,
        LogType.TEMPLATE_CREATED,
        `تم إنشاء قالب معاملة: ${templateData.name}`,
        templateData.shopId
      );

      return { id: templateRef.id, ...newTemplate };
    } catch (error) {
      console.error('Error creating transaction template:', error);
      throw new Error('فشل في إنشاء قالب المعاملة');
    }
  }

  // Get templates for shop and financial year
  static async getTemplatesForShop(
    shopId: string,
    financialYearId?: string,
    category?: TransactionTemplateCategory
  ): Promise<TransactionTemplate[]> {
    try {
      let query = collection(this.db, 'transactionTemplates');

      // Apply filters
      query = this.addFilter(query, where('shopId', '==', shopId));
      query = this.addFilter(query, where('isActive', '==', true));

      if (financialYearId) {
        query = this.addFilter(query, where('applicableFinancialYears', 'array-contains', financialYearId));
      }

      if (category) {
        query = this.addFilter(query, where('category', '==', category));
      }

      query = this.addFilter(query, orderBy('usageCount', 'desc'));

      const snapshot = await getDocs(query);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransactionTemplate));
    } catch (error) {
      console.error('Error getting transaction templates:', error);
      throw new Error('فشل في جلب قوالب المعاملات');
    }
  }

  // Apply template to create transaction data
  static async applyTemplate(
    templateId: string,
    overrides: Partial<CreateTransactionData> = {}
  ): Promise<CreateTransactionData> {
    try {
      const template = await this.getById(templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Increment usage count
      await this.incrementUsageCount(templateId);

      // Create transaction data from template
      const transactionData: CreateTransactionData = {
        shopId: template.shopId,
        financialYearId: overrides.financialYearId || template.defaultFinancialYearId || '',
        date: overrides.date || new Date().toISOString().split('T')[0],
        description: overrides.description || template.description,
        reference: overrides.reference || '',
        entries: template.entryTemplate.map(entryTemplate => ({
          accountId: entryTemplate.accountId,
          amount: overrides.entries?.find(e => e.accountId === entryTemplate.accountId)?.amount || 0,
          type: entryTemplate.type,
          description: entryTemplate.description || template.description
        })),
        tags: template.defaultTags || [],
        attachments: []
      };

      return transactionData;
    } catch (error) {
      console.error('Error applying transaction template:', error);
      throw new Error('فشل في تطبيق قالب المعاملة');
    }
  }

  // Get most used templates for quick access
  static async getMostUsedTemplates(shopId: string, limit: number = 5): Promise<TransactionTemplate[]> {
    try {
      let query = collection(this.db, 'transactionTemplates');
      query = this.addFilter(query, where('shopId', '==', shopId));
      query = this.addFilter(query, where('isActive', '==', true));
      query = this.addFilter(query, orderBy('usageCount', 'desc'));
      query = this.addFilter(query, limitQuery(limit));

      const snapshot = await getDocs(query);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TransactionTemplate));
    } catch (error) {
      console.error('Error getting most used templates:', error);
      throw new Error('فشل في جلب القوالب الأكثر استخداماً');
    }
  }

  // Create smart templates based on transaction history
  static async createSmartTemplates(shopId: string, financialYearId: string): Promise<TransactionTemplate[]> {
    try {
      // Analyze transaction patterns
      const patterns = await this.analyzeTransactionPatterns(shopId, financialYearId);
      const smartTemplates: TransactionTemplate[] = [];

      for (const pattern of patterns) {
        if (pattern.frequency >= 3 && pattern.consistency >= 0.8) {
          const template: TransactionTemplate = {
            id: '',
            name: `قالب ذكي - ${pattern.description}`,
            description: pattern.description,
            category: 'SMART_GENERATED',
            shopId,
            entryTemplate: pattern.commonEntries,
            defaultTags: pattern.commonTags,
            isActive: true,
            isSmartGenerated: true,
            createdBy: 'system',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            usageCount: 0,
            applicableFinancialYears: [financialYearId]
          };

          const created = await this.createTemplate(template);
          smartTemplates.push(created);
        }
      }

      return smartTemplates;
    } catch (error) {
      console.error('Error creating smart templates:', error);
      throw new Error('فشل في إنشاء القوالب الذكية');
    }
  }
}
```

---

### **Task 3.2: Bulk Operations & Data Management**
**Priority: HIGH | Estimated Time: 14-18 hours**

#### **Subtasks:**

**3.2.1 Create Bulk Transaction Manager**
- **New File:** `components/BulkTransactionManager.tsx`
- **Purpose:** Import, export, and manage multiple transactions
- **Implementation:**
```typescript
interface BulkTransactionManagerProps {
  shopId: string;
  financialYearId: string;
}

export const BulkTransactionManager: React.FC<BulkTransactionManagerProps> = ({
  shopId,
  financialYearId
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'bulk-edit'>('import');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation | null>(null);

  const renderImportTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">استيراد المعاملات</h3>
        <p className="text-blue-700 text-sm mb-4">
          يمكنك استيراد المعاملات من ملف Excel أو CSV. تأكد من أن الملف يتبع القالب المحدد.
        </p>
        <div className="flex space-x-4 space-x-reverse">
          <button
            onClick={() => downloadTemplate()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            تحميل القالب
          </button>
          <FileUploader
            accept=".xlsx,.csv"
            onFileSelect={handleFileImport}
            className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100"
          >
            اختر ملف للاستيراد
          </FileUploader>
        </div>
      </div>

      {importPreview.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-4">معاينة الاستيراد ({importPreview.length} معاملة)</h3>
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right">التاريخ</th>
                  <th className="px-4 py-2 text-right">البيان</th>
                  <th className="px-4 py-2 text-right">المبلغ</th>
                  <th className="px-4 py-2 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.map((transaction, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-4 py-2">{transaction.date}</td>
                    <td className="px-4 py-2">{transaction.description}</td>
                    <td className="px-4 py-2">{transaction.amount.toLocaleString('ar-SA')}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        transaction.validationStatus === 'valid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.validationStatus === 'valid' ? 'صحيح' : 'خطأ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => executeImport()}
              disabled={importPreview.some(t => t.validationStatus === 'invalid')}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              تنفيذ الاستيراد
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderExportTab = () => (
    <div className="space-y-6">
      <ExportConfigurationPanel
        shopId={shopId}
        financialYearId={financialYearId}
        onExport={handleExport}
      />
    </div>
  );

  const renderBulkEditTab = () => (
    <div className="space-y-6">
      <TransactionBulkEditor
        transactions={transactions}
        selectedTransactions={selectedTransactions}
        onBulkUpdate={handleBulkUpdate}
      />
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="border-b mb-6">
        <nav className="-mb-px flex space-x-8 space-x-reverse">
          {[
            { id: 'import', label: 'استيراد المعاملات', icon: '📥' },
            { id: 'export', label: 'تصدير المعاملات', icon: '📤' },
            { id: 'bulk-edit', label: 'تعديل مجمع', icon: '✏️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'import' && renderImportTab()}
      {activeTab === 'export' && renderExportTab()}
      {activeTab === 'bulk-edit' && renderBulkEditTab()}
    </div>
  );
};
```

---

## 📊 Week 19-20: Executive Dashboard & Analytics

### **Task 3.3: Executive Dashboard System**
**Priority: CRITICAL | Estimated Time: 20-24 hours**

#### **Subtasks:**

**3.3.1 Create Executive Dashboard**
- **New File:** `pages/ExecutiveDashboard.tsx`
- **Purpose:** Comprehensive business intelligence dashboard
- **Implementation:**
```typescript
export const ExecutiveDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('thisMonth');
  const [selectedShops, setSelectedShops] = useState<string[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(300000); // 5 minutes

  const renderKPICards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <KPICard
        title="إجمالي المبيعات"
        value={dashboardData?.totalSales || 0}
        previousValue={dashboardData?.previousSales || 0}
        format="currency"
        trend="up"
        icon="💰"
      />
      <KPICard
        title="صافي الربح"
        value={dashboardData?.netProfit || 0}
        previousValue={dashboardData?.previousProfit || 0}
        format="currency"
        trend={dashboardData?.profitTrend || 'neutral'}
        icon="📈"
      />
      <KPICard
        title="هامش الربح"
        value={dashboardData?.profitMargin || 0}
        previousValue={dashboardData?.previousMargin || 0}
        format="percentage"
        trend={dashboardData?.marginTrend || 'neutral'}
        icon="📊"
      />
      <KPICard
        title="قيمة المخزون"
        value={dashboardData?.stockValue || 0}
        previousValue={dashboardData?.previousStockValue || 0}
        format="currency"
        trend={dashboardData?.stockTrend || 'neutral'}
        icon="📦"
      />
    </div>
  );

  const renderCharts = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">تطور المبيعات والأرباح</h3>
        <SalesAndProfitChart
          data={dashboardData?.salesProfitTrend || []}
          period={selectedPeriod}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">توزيع المبيعات حسب المتجر</h3>
        <ShopSalesDistributionChart
          data={dashboardData?.shopSalesDistribution || []}
        />
      </div>
    </div>
  );

  const renderTopPerformers = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <TopPerformersCard
        title="أفضل المتاجر أداءً"
        items={dashboardData?.topShops || []}
        metric="sales"
      />
      <TopPerformersCard
        title="أكثر المنتجات مبيعاً"
        items={dashboardData?.topProducts || []}
        metric="quantity"
      />
      <TopPerformersCard
        title="أكبر العملاء"
        items={dashboardData?.topCustomers || []}
        metric="value"
      />
    </div>
  );

  const renderAlerts = () => {
    if (!dashboardData?.alerts || dashboardData.alerts.length === 0) return null;

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-3">تنبيهات مهمة</h3>
        <div className="space-y-2">
          {dashboardData.alerts.map((alert, index) => (
            <div key={index} className={`flex items-center p-2 rounded ${
              alert.severity === 'high' ? 'bg-red-100 text-red-800' :
              alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              <span className="mr-2">
                {alert.severity === 'high' ? '🚨' :
                 alert.severity === 'medium' ? '⚠️' : 'ℹ️'}
              </span>
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">لوحة القيادة التنفيذية</h1>
          <div className="flex space-x-4 space-x-reverse">
            <PeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />
            <ShopMultiSelector value={selectedShops} onChange={setSelectedShops} />
            <RefreshButton onClick={refreshDashboard} />
          </div>
        </div>

        {renderAlerts()}
        {renderKPICards()}
        {renderCharts()}
        {renderTopPerformers()}

        {/* Quick Actions */}
        <QuickActionsPanel />
      </div>
    </div>
  );
};
```

**3.3.2 Create Analytics Service**
- **New File:** `services/analyticsService.ts`
- **Purpose:** Business intelligence and analytics calculations
- **Implementation:**
```typescript
export class AnalyticsService extends BaseService {
  // Calculate comprehensive dashboard metrics
  static async calculateDashboardMetrics(
    shopIds: string[],
    period: DashboardPeriod,
    financialYearId?: string
  ): Promise<DashboardData> {
    try {
      const dateRange = this.getPeriodDateRange(period);
      const previousDateRange = this.getPreviousPeriodDateRange(period);

      const [
        currentMetrics,
        previousMetrics,
        trends,
        alerts,
        topPerformers
      ] = await Promise.all([
        this.calculatePeriodMetrics(shopIds, dateRange, financialYearId),
        this.calculatePeriodMetrics(shopIds, previousDateRange, financialYearId),
        this.calculateTrends(shopIds, dateRange, financialYearId),
        this.generateAlerts(shopIds, financialYearId),
        this.getTopPerformers(shopIds, dateRange, financialYearId)
      ]);

      return {
        totalSales: currentMetrics.totalSales,
        previousSales: previousMetrics.totalSales,
        netProfit: currentMetrics.netProfit,
        previousProfit: previousMetrics.netProfit,
        profitMargin: currentMetrics.profitMargin,
        previousMargin: previousMetrics.profitMargin,
        stockValue: currentMetrics.stockValue,
        previousStockValue: previousMetrics.stockValue,
        salesProfitTrend: trends.salesProfitTrend,
        shopSalesDistribution: trends.shopSalesDistribution,
        profitTrend: this.calculateTrendDirection(currentMetrics.netProfit, previousMetrics.netProfit),
        marginTrend: this.calculateTrendDirection(currentMetrics.profitMargin, previousMetrics.profitMargin),
        stockTrend: this.calculateTrendDirection(currentMetrics.stockValue, previousMetrics.stockValue),
        alerts,
        topShops: topPerformers.topShops,
        topProducts: topPerformers.topProducts,
        topCustomers: topPerformers.topCustomers
      };
    } catch (error) {
      console.error('Error calculating dashboard metrics:', error);
      throw new Error('فشل في حساب مؤشرات لوحة القيادة');
    }
  }

  // Generate business intelligence insights
  static async generateBusinessInsights(
    shopId: string,
    financialYearId: string
  ): Promise<BusinessInsight[]> {
    try {
      const insights: BusinessInsight[] = [];

      // Revenue growth analysis
      const revenueGrowth = await this.analyzeRevenueGrowth(shopId, financialYearId);
      if (revenueGrowth.growthRate > 0.1) {
        insights.push({
          type: 'POSITIVE',
          category: 'REVENUE',
          title: 'نمو ممتاز في الإيرادات',
          description: `نمو الإيرادات بنسبة ${(revenueGrowth.growthRate * 100).toFixed(1)}% مقارنة بالفترة السابقة`,
          actionable: true,
          recommendations: ['استمر في الاستراتيجية الحالية', 'فكر في التوسع']
        });
      }

      // Profit margin analysis
      const marginTrend = await this.analyzeProfitMarginTrend(shopId, financialYearId);
      if (marginTrend.trend === 'declining') {
        insights.push({
          type: 'WARNING',
          category: 'PROFITABILITY',
          title: 'انخفاض في هامش الربح',
          description: `هامش الربح انخفض بنسبة ${Math.abs(marginTrend.changePercent).toFixed(1)}%`,
          actionable: true,
          recommendations: ['مراجعة تكاليف التشغيل', 'تحسين استراتيجية التسعير']
        });
      }

      // Inventory turnover analysis
      const inventoryTurnover = await this.calculateInventoryTurnover(shopId, financialYearId);
      if (inventoryTurnover < 4) {
        insights.push({
          type: 'WARNING',
          category: 'INVENTORY',
          title: 'دوران مخزون منخفض',
          description: `معدل دوران المخزون ${inventoryTurnover.toFixed(1)} مرات في السنة`,
          actionable: true,
          recommendations: ['مراجعة استراتيجية الشراء', 'تحسين إدارة المخزون']
        });
      }

      return insights;
    } catch (error) {
      console.error('Error generating business insights:', error);
      throw new Error('فشل في توليد التحليلات التجارية');
    }
  }

  // Predictive analytics for future trends
  static async generatePredictiveAnalytics(
    shopId: string,
    financialYearId: string,
    forecastMonths: number = 3
  ): Promise<PredictiveAnalytics> {
    try {
      const historicalData = await this.getHistoricalMetrics(shopId, financialYearId, 12);

      const salesForecast = this.forecastSales(historicalData, forecastMonths);
      const profitForecast = this.forecastProfit(historicalData, forecastMonths);
      const cashFlowForecast = this.forecastCashFlow(historicalData, forecastMonths);

      return {
        forecastPeriod: forecastMonths,
        salesForecast,
        profitForecast,
        cashFlowForecast,
        confidence: this.calculateForecastConfidence(historicalData),
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating predictive analytics:', error);
      throw new Error('فشل في توليد التحليلات التنبؤية');
    }
  }
}
```

---

## 📋 Week 21-22: Advanced Reporting & Export System

### **Task 3.4: Advanced Report Builder**
**Priority: HIGH | Estimated Time: 18-22 hours**

#### **Subtasks:**

**3.4.1 Create Report Builder Interface**
- **New File:** `components/ReportBuilder.tsx`
- **Purpose:** Drag-and-drop custom report builder
- **Implementation:**
```typescript
interface ReportBuilderProps {
  onReportGenerated: (report: CustomReport) => void;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({ onReportGenerated }) => {
  const [reportConfig, setReportConfig] = useState<ReportConfiguration>({
    name: '',
    description: '',
    type: 'FINANCIAL',
    dataSource: 'TRANSACTIONS',
    filters: [],
    grouping: [],
    sorting: [],
    columns: [],
    calculations: [],
    formatting: {
      currency: 'SAR',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: '#,##0.00'
    }
  });

  const [availableFields, setAvailableFields] = useState<ReportField[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const renderDataSourceSelector = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">مصدر البيانات</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { id: 'TRANSACTIONS', label: 'المعاملات', icon: '💳' },
          { id: 'ACCOUNTS', label: 'الحسابات', icon: '📁' },
          { id: 'FINANCIAL_YEARS', label: 'السنوات المالية', icon: '📅' },
          { id: 'SHOPS', label: 'المتاجر', icon: '🏪' }
        ].map(source => (
          <button
            key={source.id}
            onClick={() => setReportConfig({...reportConfig, dataSource: source.id as any})}
            className={`p-4 border rounded-lg text-center ${
              reportConfig.dataSource === source.id
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-2xl mb-2">{source.icon}</div>
            <div className="font-medium">{source.label}</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderFieldSelector = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">الحقول المتاحة</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-3">الحقول المتاحة</h4>
          <div className="max-h-64 overflow-y-auto border rounded-lg p-4">
            {availableFields.map(field => (
              <FieldDragItem
                key={field.id}
                field={field}
                onDrag={() => addFieldToReport(field)}
              />
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3">الحقول المحددة</h4>
          <div className="min-h-64 border-2 border-dashed border-gray-300 rounded-lg p-4">
            <DragDropContainer
              items={reportConfig.columns}
              onReorder={reorderColumns}
              onRemove={removeColumn}
              renderItem={(column, index) => (
                <ReportColumnItem
                  key={column.id}
                  column={column}
                  index={index}
                  onEdit={editColumn}
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderFiltersAndGrouping = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">المرشحات</h3>
        <FilterBuilder
          filters={reportConfig.filters}
          availableFields={availableFields}
          onChange={updateFilters}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">التجميع والترتيب</h3>
        <GroupingAndSortBuilder
          grouping={reportConfig.grouping}
          sorting={reportConfig.sorting}
          availableFields={availableFields}
          onChange={updateGroupingAndSort}
        />
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">معاينة التقرير</h3>
        <button
          onClick={generatePreview}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          تحديث المعاينة
        </button>
      </div>

      {previewData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {reportConfig.columns.map(column => (
                  <th key={column.id} className="px-4 py-2 text-right font-medium">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.slice(0, 10).map((row, index) => (
                <tr key={index} className="border-b">
                  {reportConfig.columns.map(column => (
                    <td key={column.id} className="px-4 py-2">
                      {formatCellValue(row[column.fieldId], column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {previewData.length > 10 && (
            <div className="text-center py-2 text-gray-500">
              ... و {previewData.length - 10} صف إضافي
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          لا توجد بيانات للمعاينة
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">منشئ التقارير المخصصة</h1>
        <p className="text-gray-600">قم بإنشاء تقارير مخصصة بسحب الحقول وتطبيق المرشحات</p>
      </div>

      {renderDataSourceSelector()}
      {renderFieldSelector()}
      {renderFiltersAndGrouping()}
      {renderPreview()}

      <div className="flex justify-end space-x-4 space-x-reverse">
        <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
          إلغاء
        </button>
        <button
          onClick={saveAndGenerateReport}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          حفظ وإنشاء التقرير
        </button>
      </div>
    </div>
  );
};
```

**3.4.2 Create Export Service**
- **New File:** `services/exportService.ts`
- **Purpose:** Advanced export functionality with multiple formats
- **Implementation:**
```typescript
export class ExportService extends BaseService {
  // Export data to Excel with advanced formatting
  static async exportToExcel(
    data: any[],
    config: ExportConfiguration
  ): Promise<Blob> {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(config.sheetName || 'التقرير');

      // Add company header if configured
      if (config.includeHeader) {
        this.addExcelHeader(worksheet, config);
      }

      // Add data with formatting
      this.addExcelData(worksheet, data, config);

      // Apply styling
      this.applyExcelStyling(worksheet, config);

      // Generate buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error('فشل في تصدير البيانات إلى Excel');
    }
  }

  // Export data to PDF with custom layouts
  static async exportToPDF(
    data: any[],
    config: PDFExportConfiguration
  ): Promise<Blob> {
    try {
      const pdf = new jsPDF({
        orientation: config.orientation || 'portrait',
        unit: 'mm',
        format: config.pageSize || 'a4'
      });

      // Add Arabic font support
      pdf.addFont('/fonts/arabic-font.ttf', 'ArabicFont', 'normal');
      pdf.setFont('ArabicFont');

      // Add header
      if (config.includeHeader) {
        this.addPDFHeader(pdf, config);
      }

      // Add data table
      this.addPDFTable(pdf, data, config);

      // Add footer
      if (config.includeFooter) {
        this.addPDFFooter(pdf, config);
      }

      return pdf.output('blob');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw new Error('فشل في تصدير البيانات إلى PDF');
    }
  }

  // Schedule automatic reports
  static async scheduleReport(
    reportConfig: ScheduledReportConfig
  ): Promise<ScheduledReport> {
    try {
      const scheduleRef = doc(collection(this.db, 'scheduledReports'));
      const newSchedule: Omit<ScheduledReport, 'id'> = {
        ...reportConfig,
        isActive: true,
        lastExecuted: null,
        nextExecution: this.calculateNextExecution(reportConfig.schedule),
        createdAt: Timestamp.now(),
        executionCount: 0
      };

      await setDoc(scheduleRef, newSchedule);

      // Register with scheduler service
      await this.registerWithScheduler(scheduleRef.id, reportConfig.schedule);

      return { id: scheduleRef.id, ...newSchedule };
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw new Error('فشل في جدولة التقرير');
    }
  }

  // Batch export multiple reports
  static async batchExport(
    reports: BatchExportItem[]
  ): Promise<BatchExportResult> {
    try {
      const results: BatchExportResult = {
        successful: [],
        failed: [],
        totalCount: reports.length,
        executedAt: new Date().toISOString()
      };

      for (const item of reports) {
        try {
          const data = await this.generateReportData(item.reportConfig);
          const exported = await this.exportToFormat(data, item.exportConfig);

          results.successful.push({
            reportName: item.reportConfig.name,
            fileName: item.exportConfig.fileName,
            format: item.exportConfig.format,
            size: exported.size
          });
        } catch (error) {
          results.failed.push({
            reportName: item.reportConfig.name,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in batch export:', error);
      throw new Error('فشل في التصدير المجمع');
    }
  }
}
```

---

## 🔧 Week 23-24: Production Readiness & Optimization

### **Task 3.5: Performance Optimization & Security**
**Priority: CRITICAL | Estimated Time: 16-20 hours**

#### **Subtasks:**

**3.5.1 Create Performance Monitor**
- **New File:** `services/performanceMonitor.ts`
- **Purpose:** Monitor and optimize application performance
- **Implementation:**
```typescript
export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static thresholds = {
    queryTime: 1000, // 1 second
    componentRender: 100, // 100ms
    bundleSize: 2048, // 2MB
    memoryUsage: 50 // 50MB
  };

  // Monitor Firebase query performance
  static async monitorQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    let result: T;
    let error: Error | null = null;

    try {
      result = await queryFunction();
    } catch (e) {
      error = e as Error;
      throw e;
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.recordMetric({
        type: 'QUERY',
        name: queryName,
        duration,
        timestamp: new Date().toISOString(),
        success: !error,
        details: {
          threshold: this.thresholds.queryTime,
          exceeded: duration > this.thresholds.queryTime
        }
      });

      if (duration > this.thresholds.queryTime) {
        console.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
      }
    }

    return result!;
  }

  // Monitor component render performance
  static monitorComponentRender(componentName: string) {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;

      descriptor.value = function (...args: any[]) {
        const startTime = performance.now();
        const result = method.apply(this, args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        PerformanceMonitor.recordMetric({
          type: 'RENDER',
          name: `${componentName}.${propertyName}`,
          duration,
          timestamp: new Date().toISOString(),
          success: true,
          details: {
            threshold: PerformanceMonitor.thresholds.componentRender,
            exceeded: duration > PerformanceMonitor.thresholds.componentRender
          }
        });

        return result;
      };
    };
  }

  // Performance optimization recommendations
  static generateOptimizationRecommendations(): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    const recentMetrics = this.getRecentMetrics(24); // Last 24 hours

    // Query optimization recommendations
    const slowQueries = recentMetrics
      .filter(m => m.type === 'QUERY' && m.details.exceeded)
      .reduce((acc, metric) => {
        acc[metric.name] = (acc[metric.name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    Object.entries(slowQueries).forEach(([queryName, count]) => {
      if (count > 5) {
        recommendations.push({
          type: 'QUERY_OPTIMIZATION',
          priority: 'HIGH',
          title: `تحسين استعلام: ${queryName}`,
          description: `الاستعلام ${queryName} بطيء ويحدث ${count} مرة في اليوم`,
          actions: [
            'إضافة فهارس مناسبة في Firestore',
            'تحسين شروط الاستعلام',
            'تنفيذ آلية cache',
            'تقسيم الاستعلام إلى أجزاء أصغر'
          ]
        });
      }
    });

    return recommendations;
  }
}
```

**3.5.2 Create Security Audit Service**
- **New File:** `services/securityAudit.ts`
- **Purpose:** Comprehensive security monitoring and auditing
- **Implementation:**
```typescript
export class SecurityAuditService extends BaseService {
  // Perform comprehensive security audit
  static async performSecurityAudit(shopId?: string): Promise<SecurityAuditReport> {
    try {
      const auditReport: SecurityAuditReport = {
        auditId: `AUDIT_${Date.now()}`,
        timestamp: new Date().toISOString(),
        shopId,
        overallScore: 0,
        categories: {
          authentication: await this.auditAuthentication(),
          authorization: await this.auditAuthorization(shopId),
          dataProtection: await this.auditDataProtection(shopId),
          activityMonitoring: await this.auditActivityMonitoring(shopId),
          firebaseRules: await this.auditFirebaseRules()
        },
        recommendations: [],
        criticalIssues: [],
        complianceStatus: {}
      };

      // Calculate overall score
      const categoryScores = Object.values(auditReport.categories).map(c => c.score);
      auditReport.overallScore = categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length;

      // Identify critical issues
      auditReport.criticalIssues = this.identifyCriticalIssues(auditReport);

      // Generate recommendations
      auditReport.recommendations = this.generateSecurityRecommendations(auditReport);

      // Log security audit
      await loggingService.logAction(
        'system',
        LogType.SECURITY_AUDIT,
        `تم تنفيذ مراجعة أمنية - النتيجة: ${auditReport.overallScore.toFixed(1)}/100`,
        shopId
      );

      return auditReport;
    } catch (error) {
      console.error('Error performing security audit:', error);
      throw new Error('فشل في تنفيذ المراجعة الأمنية');
    }
  }

  // Monitor suspicious activities
  static async monitorSuspiciousActivities(): Promise<SuspiciousActivity[]> {
    try {
      const suspiciousActivities: SuspiciousActivity[] = [];
      const timeframe = 24; // Last 24 hours

      // Check for unusual login patterns
      const unusualLogins = await this.detectUnusualLoginPatterns(timeframe);
      suspiciousActivities.push(...unusualLogins);

      // Check for rapid transaction creation
      const rapidTransactions = await this.detectRapidTransactionCreation(timeframe);
      suspiciousActivities.push(...rapidTransactions);

      // Check for permission escalation attempts
      const permissionAttempts = await this.detectPermissionEscalation(timeframe);
      suspiciousActivities.push(...permissionAttempts);

      // Check for data export anomalies
      const exportAnomalies = await this.detectDataExportAnomalies(timeframe);
      suspiciousActivities.push(...exportAnomalies);

      return suspiciousActivities;
    } catch (error) {
      console.error('Error monitoring suspicious activities:', error);
      throw new Error('فشل في مراقبة الأنشطة المشبوهة');
    }
  }

  // Generate security compliance report
  static async generateComplianceReport(
    standards: ComplianceStandard[]
  ): Promise<ComplianceReport> {
    try {
      const report: ComplianceReport = {
        generatedAt: new Date().toISOString(),
        standards: {},
        overallCompliance: 0,
        gaps: [],
        recommendations: []
      };

      for (const standard of standards) {
        const compliance = await this.assessCompliance(standard);
        report.standards[standard.name] = compliance;
      }

      // Calculate overall compliance
      const scores = Object.values(report.standards).map(s => s.score);
      report.overallCompliance = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      return report;
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw new Error('فشل في إنشاء تقرير الامتثال');
    }
  }
}
```

### **Task 3.6: Backup & Recovery System**
**Priority: HIGH | Estimated Time: 12-16 hours**

#### **Subtasks:**

**3.6.1 Create Backup Service**
- **New File:** `services/backupService.ts`
- **Purpose:** Automated backup and recovery system
- **Implementation:**
```typescript
export class BackupService extends BaseService {
  // Create full system backup
  static async createFullBackup(shopId?: string): Promise<BackupResult> {
    try {
      const backupId = `BACKUP_${Date.now()}`;
      const timestamp = new Date().toISOString();

      const backupData: FullBackup = {
        backupId,
        timestamp,
        shopId,
        version: '1.0',
        collections: {}
      };

      // Define collections to backup
      const collections = shopId
        ? ['shops', 'users', 'accounts', 'transactions', 'financialYears', 'logs']
        : ['shops', 'users', 'accounts', 'transactions', 'financialYears', 'logs', 'settings'];

      // Backup each collection
      for (const collectionName of collections) {
        console.log(`Backing up collection: ${collectionName}`);
        backupData.collections[collectionName] = await this.backupCollection(collectionName, shopId);
      }

      // Store backup metadata
      const backupMetadata: BackupMetadata = {
        backupId,
        timestamp,
        shopId,
        type: shopId ? 'SHOP' : 'FULL',
        status: 'COMPLETED',
        size: this.calculateBackupSize(backupData),
        collections: Object.keys(backupData.collections),
        retentionUntil: this.calculateRetentionDate(timestamp),
        checksums: this.generateChecksums(backupData)
      };

      // Store backup in secure location
      await this.storeBackup(backupData, backupMetadata);

      // Log backup creation
      await loggingService.logAction(
        'system',
        LogType.BACKUP_CREATED,
        `تم إنشاء نسخة احتياطية: ${backupId}`,
        shopId
      );

      return {
        backupId,
        success: true,
        timestamp,
        size: backupMetadata.size,
        collections: backupMetadata.collections
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      throw new Error('فشل في إنشاء النسخة الاحتياطية');
    }
  }

  // Restore from backup
  static async restoreFromBackup(
    backupId: string,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    try {
      // Validate backup exists and is accessible
      const backupMetadata = await this.getBackupMetadata(backupId);
      if (!backupMetadata) {
        throw new Error('النسخة الاحتياطية غير موجودة');
      }

      // Verify backup integrity
      const integrityCheck = await this.verifyBackupIntegrity(backupId);
      if (!integrityCheck.isValid) {
        throw new Error('النسخة الاحتياطية تالفة أو غير صالحة');
      }

      // Create restore point before restoration
      const restorePointId = await this.createRestorePoint(backupMetadata.shopId);

      // Load backup data
      const backupData = await this.loadBackup(backupId);

      const restoreResult: RestoreResult = {
        backupId,
        restorePointId,
        timestamp: new Date().toISOString(),
        restoredCollections: [],
        failedCollections: [],
        success: false
      };

      // Restore collections
      for (const [collectionName, data] of Object.entries(backupData.collections)) {
        try {
          if (!options.collectionsToRestore || options.collectionsToRestore.includes(collectionName)) {
            await this.restoreCollection(collectionName, data, options);
            restoreResult.restoredCollections.push(collectionName);
          }
        } catch (error) {
          console.error(`Error restoring collection ${collectionName}:`, error);
          restoreResult.failedCollections.push({
            collection: collectionName,
            error: error.message
          });
        }
      }

      restoreResult.success = restoreResult.failedCollections.length === 0;

      // Log restore operation
      await loggingService.logAction(
        'system',
        LogType.BACKUP_RESTORED,
        `تم استرداد النسخة الاحتياطية: ${backupId} - النتيجة: ${restoreResult.success ? 'نجح' : 'فشل جزئي'}`,
        backupMetadata.shopId
      );

      return restoreResult;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw new Error('فشل في استرداد النسخة الاحتياطية');
    }
  }

  // Schedule automatic backups
  static async scheduleAutomaticBackups(
    schedule: BackupSchedule
  ): Promise<ScheduledBackup> {
    try {
      const scheduleRef = doc(collection(this.db, 'scheduledBackups'));
      const scheduledBackup: Omit<ScheduledBackup, 'id'> = {
        ...schedule,
        isActive: true,
        lastExecuted: null,
        nextExecution: this.calculateNextBackupTime(schedule),
        createdAt: Timestamp.now(),
        executionCount: 0,
        lastResult: null
      };

      await setDoc(scheduleRef, scheduledBackup);

      // Register with scheduler
      await this.registerBackupSchedule(scheduleRef.id, schedule);

      return { id: scheduleRef.id, ...scheduledBackup };
    } catch (error) {
      console.error('Error scheduling automatic backups:', error);
      throw new Error('فشل في جدولة النسخ الاحتياطية التلقائية');
    }
  }
}
```

---

## 🎯 Success Criteria for Phase 3

### **Week 17-18 Completion Criteria:**
- [ ] Advanced daily entry form with validation and templates operational
- [ ] Transaction template system with smart generation functional
- [ ] Bulk transaction operations (import/export/edit) working
- [ ] Performance monitoring for all operations implemented

### **Week 19-20 Completion Criteria:**
- [ ] Executive dashboard with real-time KPIs functional
- [ ] Business intelligence analytics operational
- [ ] Predictive analytics for future trends working
- [ ] Alert system for business insights active

### **Week 21-22 Completion Criteria:**
- [ ] Custom report builder with drag-and-drop interface working
- [ ] Advanced export functionality (Excel, PDF, CSV) operational
- [ ] Scheduled reporting system functional
- [ ] Batch export operations working

### **Week 23-24 Completion Criteria:**
- [ ] Performance monitoring and optimization system active
- [ ] Security audit and compliance system operational
- [ ] Automated backup and recovery system functional
- [ ] Production deployment readiness achieved

### **Overall Phase 3 Success:**
- [ ] Production-ready user interface with advanced features
- [ ] Comprehensive business intelligence and analytics
- [ ] Advanced reporting and export capabilities
- [ ] Enterprise-grade security and compliance features
- [ ] Robust backup, recovery, and performance monitoring
- [ ] Full production deployment readiness

---

## 📚 Resources & Documentation

### **Production Standards:**
- Performance optimization best practices
- Security compliance requirements (GDPR, SOX, local regulations)
- Backup and disaster recovery protocols
- Enterprise deployment guidelines

### **Technical Implementation:**
- All code snippets above should be implemented following established patterns
- Maintain TypeScript strict mode compliance
- Continue Arabic RTL interface consistency
- Implement comprehensive error handling and user feedback
- Follow established service layer architecture with proper extension of BaseService

### **Quality Assurance:**
- Comprehensive testing of all new features
- Performance benchmarking and optimization
- Security vulnerability assessment
- User acceptance testing for all interfaces

This detailed breakdown provides clear, actionable tasks for completing Phase 3 of the production-ready accounting system. Each task includes specific implementations, code examples, and measurable success criteria to ensure enterprise-grade quality and functionality.