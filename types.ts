export enum Page {
    DASHBOARD = 'Dashboard',
    ACCOUNTS = 'Accounts',
    STATEMENT = 'Statement',
    TRANSACTIONS = 'Transactions',
    SETTINGS = 'Settings',
    PROFILE = 'Profile',
    NOTIFICATIONS = 'Notifications',
    SHOP_LOGS = 'Shop Logs',
    ANALYTICS = 'Analytics',
    USER_MANAGEMENT = 'User Management',
    SHOP_MANAGEMENT = 'Shop Management',
    FINANCIAL_YEARS = 'Financial Years',
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    shopId?: string;
    isActive: boolean;
    fcmToken?: string;
    fcmTokenUpdatedAt?: string;
}

export interface Shop {
    id: string;
    name: string;
    shopCode: string; // Added shop code field for account/financial year naming
    description: string;
    address?: string;
    contactPhone?: string;
    contactEmail?: string;
    businessType?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export enum AccountType {
    SALES = 'المبيعات',
    PURCHASES = 'المشتريات',
    EXPENSES = 'المصروفات',
    CUSTOMER = 'العملاء',
    SUPPLIER = 'الموردين',
    BANK = 'البنك',
    CASH = 'الصندوق',
    STOCK = 'المخزون',
    OPENING_STOCK = 'بضاعة أول المدة',
    ENDING_STOCK = 'بضاعة آخر المدة',
}

export enum AccountClassification {
    ASSETS = 'الأصول',
    LIABILITIES = 'الخصوم',
    EQUITY = 'حقوق الملكية',
    REVENUE = 'الإيرادات',
    EXPENSES = 'المصروفات',
}

export enum AccountNature {
    DEBIT = 'مدين',
    CREDIT = 'دائن',
}


export interface Account {
    id: string;
    shopId: string;
    accountCode: string;
    name: string;
    classification: AccountClassification;
    nature: AccountNature;
    type: AccountType;
    parentId?: string;
    isActive: boolean;
    openingBalance?: number;
    category?: string; // For expense categorization and analytics
}

export interface TransactionEntry {
    accountId: string;
    amount: number; // Positive for Debit, Negative for Credit
}

export enum TransactionType {
    SALE = 'بيع',
    PURCHASE = 'شراء',
    EXPENSE = 'صرف',
    TRANSFER = 'تحويل',
}

export interface Transaction {
    id: string;
    shopId: string;
    date: string; // ISO string
    type: TransactionType;
    description: string;
    totalAmount: number;
    entries: TransactionEntry[];
    categoryId?: string; // e.g., sales account, expense account
    partyId?: string; // e.g., customer, supplier
}

export interface FinancialYear {
    id: string;
    shopId: string;
    name: string;
    startDate: string; // ISO string
    endDate: string; // ISO string
    status: 'open' | 'closed';
    openingStockValue: number;
    closingStockValue?: number;
    openingStockAccountId?: string; // Reference to opening stock account
    closingStockAccountId?: string; // Reference to closing stock account
}

// Interface for profit calculation results
export interface ProfitCalculation {
    shopId?: string;
    shopName?: string;
    financialYearId?: string;
    financialYearName?: string;
    openingStock: number;
    purchases: number;
    closingStock: number;
    sales: number;
    expenses: number;
    grossProfit: number; // Sales - (Opening Stock + Purchases - Closing Stock)
    netProfit: number; // Gross Profit - Expenses
    costOfGoodsSold: number; // Opening Stock + Purchases - Closing Stock
}

// Interface for multi-dimensional profit queries
export interface ProfitQuery {
    shopIds?: string[]; // If empty, include all shops
    financialYearIds?: string[]; // If empty, include all years
    startDate?: string;
    endDate?: string;
    groupBy?: 'shop' | 'year' | 'both';
}

export enum LogType {
    // Authentication
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',

    // Shop Management
    SHOP_CREATED = 'SHOP_CREATED',
    SHOP_UPDATED = 'SHOP_UPDATED',
    SHOP_DELETED = 'SHOP_DELETED',
    SHOP_ACTIVATED = 'SHOP_ACTIVATED',
    SHOP_DEACTIVATED = 'SHOP_DEACTIVATED',

    // User Management
    USER_CREATED = 'USER_CREATED',
    USER_UPDATED = 'USER_UPDATED',
    USER_ACTIVATED = 'USER_ACTIVATED',
    USER_DEACTIVATED = 'USER_DEACTIVATED',
    USER_ACTION = 'USER_ACTION',

    // Account Management
    ACCOUNT_CREATED = 'ACCOUNT_CREATED',
    ACCOUNT_UPDATED = 'ACCOUNT_UPDATED',
    DELETE_ACCOUNT = 'DELETE_ACCOUNT',

    // Transaction Management
    ADD_ENTRY = 'ADD_ENTRY',
    EDIT_ENTRY = 'EDIT_ENTRY',
    DELETE_ENTRY = 'DELETE_ENTRY',
    TRANSACTION_CREATED = 'TRANSACTION_CREATED',
    TRANSACTION_UPDATED = 'TRANSACTION_UPDATED',
    TRANSACTION_DELETED = 'TRANSACTION_DELETED',
    BALANCE_CHANGE = 'BALANCE_CHANGE',

    // Financial Year Management
    FINANCIAL_YEAR_CREATED = 'FINANCIAL_YEAR_CREATED',
    FINANCIAL_YEAR_CLOSED = 'FINANCIAL_YEAR_CLOSED',
    STOCK_TRANSITION = 'STOCK_TRANSITION',

    // Reporting
    SHARE_REPORT = 'SHARE_REPORT',
    EXPORT_REPORT = 'EXPORT_REPORT',
    REPORT_GENERATED = 'REPORT_GENERATED',
    REPORT_EXPORTED = 'REPORT_EXPORTED',

    // Data Management
    DATA_IMPORT = 'DATA_IMPORT',
    DATA_EXPORT = 'DATA_EXPORT',
    BACKUP_CREATED = 'BACKUP_CREATED',
    BACKUP_RESTORED = 'BACKUP_RESTORED',

    // System Events
    SYNC = 'SYNC',
    SECURITY_EVENT = 'SECURITY_EVENT',
    SYSTEM_ERROR = 'SYSTEM_ERROR',
    SYSTEM_MAINTENANCE = 'SYSTEM_MAINTENANCE',
    TEMPLATE_CREATED = 'TEMPLATE_CREATED',
    SETTINGS_UPDATED = 'SETTINGS_UPDATED',
    DATA_CORRUPTION = 'DATA_CORRUPTION',
    BACKUP_FAILED = 'BACKUP_FAILED',
    SECURITY_VIOLATION = 'SECURITY_VIOLATION'
}


export interface Log {
    id: string;
    userId: string;
    shopId?: string;
    type: LogType;
    timestamp: string; // ISO string
    message: string;
}

export interface Notification {
    id: string;
    userId: string; // The user who receives the notification
    originatingUserId?: string; // The user who caused the notification
    shopId?: string;
    logType?: LogType;
    message: string;
    isRead: boolean;
    timestamp: string; // ISO string
}

// ========== PHASE 2: Enhanced Accounting Engine Interfaces ==========

// Enhanced Transaction interfaces
export interface CreateTransactionData {
    shopId: string;
    date: string;
    type: TransactionType;
    description: string;
    entries: EnhancedTransactionEntry[];
    reference?: string;
    notes?: string;
}

export interface EnhancedTransactionEntry {
    accountId: string;
    amount: number;
    type: 'debit' | 'credit';
    description?: string;
}

export interface EnhancedTransaction extends CreateTransactionData {
    id: string;
    financialYearId: string;
    status: 'draft' | 'posted' | 'reversed';
    createdAt: string;
    updatedAt: string;
    createdBy: string;
}

// Validation interfaces
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

// Account Balance interfaces
export interface AccountBalance {
    accountId: string;
    financialYearId: string;
    balance: number;
    lastUpdated: string;
}

// Multi-dimensional balance and profit interfaces
export interface BalanceMatrix {
    perShopPerYear: { [shopId: string]: { [financialYearId: string]: number } };
    perShopAllYears: { [shopId: string]: number };
    allShopsPerYear: { [financialYearId: string]: number };
    grandTotal: number;
}

export interface ProfitMatrix extends BalanceMatrix {}

export interface DetailedProfitCalculation {
    shopId: string;
    financialYearId: string;
    calculatedAt: string;
    components: {
        sales: number;
        openingStock: number;
        purchases: number;
        closingStock: number;
        expenses: number;
    };
    derivedValues: {
        costOfGoodsSold: number;
        grossProfit: number;
        netProfit: number;
        profitMargin: number;
    };
    breakdown: {
        salesByCategory: { [category: string]: number };
        expensesByCategory: { [category: string]: number };
        monthlyTrend: Array<{
            month: string;
            sales: number;
            expenses: number;
            profit: number;
        }>;
    };
}

// Comparative analysis interfaces
export interface ComparativeProfitAnalysis {
    shopId: string;
    comparedYears: string[];
    yearlyResults: { [financialYearId: string]: DetailedProfitCalculation };
    trends: {
        salesGrowth: Array<{ year: string; growth: number }>;
        profitGrowth: Array<{ year: string; growth: number }>;
        marginTrend: Array<{ year: string; margin: number }>;
    };
    insights: string[];
}

// Stock continuity interfaces
export interface StockContinuityReport {
    shopId: string;
    checkedAt: string;
    years: YearContinuityCheck[];
    discrepancies: StockDiscrepancy[];
    isValid: boolean;
}

export interface YearContinuityCheck {
    fromYear: string;
    toYear: string;
    closingStock: number;
    openingStock: number;
    difference: number;
    isValid: boolean;
}

export interface StockDiscrepancy {
    description: string;
    amount: number;
    suggestedAction: string;
}

// Financial statement interfaces
export interface TrialBalance {
    metadata: {
        generatedAt: string;
        shopId?: string;
        financialYearId?: string;
        asOfDate: string;
    };
    accounts: TrialBalanceAccount[];
    totals: {
        debits: number;
        credits: number;
    };
}

export interface TrialBalanceAccount {
    accountId: string;
    accountCode: string;
    accountName: string;
    debitBalance: number;
    creditBalance: number;
}

export interface ProfitLossStatement {
    metadata: {
        dimension: ProfitLossDimension;
        generatedAt: string;
        period: string;
    };
    revenue: { [category: string]: number };
    costOfGoodsSold: { [category: string]: number };
    grossProfit: { [category: string]: number };
    expenses: { [category: string]: number };
    netProfit: { [category: string]: number };
}

export interface BalanceSheet {
    metadata: {
        shopId: string;
        financialYearId: string;
        asOfDate: string;
        generatedAt: string;
    };
    assets: {
        current: { [accountName: string]: number };
        nonCurrent: { [accountName: string]: number };
        total: number;
    };
    liabilities: {
        current: { [accountName: string]: number };
        nonCurrent: { [accountName: string]: number };
        total: number;
    };
    equity: {
        capital: number;
        retainedEarnings: number;
        total: number;
    };
}

// Dimension types for multi-dimensional reporting
export type DimensionType = 'PER_SHOP_PER_YEAR' | 'PER_SHOP_ALL_YEARS' | 'ALL_SHOPS_PER_YEAR' | 'GRAND_TOTAL';

export interface ProfitLossDimension {
    type: DimensionType;
    shopId?: string;
    financialYearId?: string;
}

// Shop comparison interfaces
export interface ShopProfitComparison {
    shopData: { [shopId: string]: ShopComparisonData };
    shopNames: { [shopId: string]: string };
    yearNames: { [financialYearId: string]: string };
}

export interface ShopComparisonData {
    yearlyProfits: { [financialYearId: string]: number };
    averageProfit: number;
    growthRate: number;
}

// Enhanced log types for Phase 2
export enum EnhancedLogType {
    TRANSACTION_CREATED = 'TRANSACTION_CREATED',
    TRANSACTION_EDITED = 'TRANSACTION_EDITED',
    TRANSACTION_DELETED = 'TRANSACTION_DELETED',
    TRANSACTION_REVERSED = 'TRANSACTION_REVERSED',
    FINANCIAL_YEAR_CREATED = 'FINANCIAL_YEAR_CREATED',
    FINANCIAL_YEAR_UPDATED = 'FINANCIAL_YEAR_UPDATED',
    FINANCIAL_YEAR_CLOSED = 'FINANCIAL_YEAR_CLOSED',
    STOCK_TRANSITION_EXECUTED = 'STOCK_TRANSITION_EXECUTED',
    STOCK_TRANSITION_REVERSED = 'STOCK_TRANSITION_REVERSED',
    PROFIT_CALCULATION_GENERATED = 'PROFIT_CALCULATION_GENERATED',
    FINANCIAL_STATEMENT_GENERATED = 'FINANCIAL_STATEMENT_GENERATED',
}

// Stock transition interfaces (enhanced)
export interface StockTransitionExecution {
    fromFinancialYearId: string;
    toFinancialYearId: string;
    closingStockValue: number;
    executedBy: string;
    executedAt?: string;
    notes?: string;
}

// Account creation for financial year
export interface CreateFinancialYearData {
    shopId: string;
    name: string;
    startDate: string;
    endDate: string;
    openingStockValue: number;
    notes?: string;
}

// ========== PHASE 3: Production Features & Advanced Operations ==========

// Transaction Template System interfaces
export interface TransactionTemplate {
    id: string;
    name: string;
    description: string;
    category: TemplateCategory;
    shopId: string;
    financialYearId?: string;
    entryTemplate: TransactionEntryTemplate[];
    defaultTags?: string[];
    isActive: boolean;
    isSmartGenerated?: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    usageCount: number;
    applicableFinancialYears?: string[];
}

export type TemplateCategory = 'SALES' | 'PURCHASES' | 'EXPENSES' | 'TRANSFERS' | 'ADJUSTMENTS' | 'SMART_GENERATED' | 'CUSTOM';

export interface TransactionEntryTemplate {
    accountId: string;
    type: 'debit' | 'credit';
    defaultAmount?: number;
    description?: string;
    isRequired: boolean;
}

export interface CreateTransactionTemplateData {
    name: string;
    description: string;
    category: TemplateCategory;
    shopId: string;
    financialYearId?: string;
    entryTemplate: TransactionEntryTemplate[];
    defaultTags?: string[];
    createdBy: string;
}

export interface SmartTemplateOptions {
    minOccurrences?: number;
    analysisWindow?: number; // days
    includeAmounts?: boolean;
}

export interface GeneratedTemplate {
    template: TransactionTemplate;
    confidence: number;
    basedOnTransactions: number;
    pattern: TransactionPattern;
}

export interface TransactionPattern {
    key: string;
    description: string;
    accountIds: string[];
    entryTypes: string[];
    occurrences: number;
    transactions: EnhancedTransaction[];
    confidence: number;
}

export interface AccountSuggestion {
    account: Account;
    type: 'debit' | 'credit';
    confidence: number;
    usageCount: number;
    reason: string;
}

// Advanced Daily Entry Form interfaces
export interface TransactionEntryInput {
    accountId: string;
    type: 'debit' | 'credit';
    amount: number;
    description?: string;
}

export interface TemplateOverrides {
    date?: string;
    description?: string;
    amounts?: { [accountId: string]: number };
    descriptions?: { [accountId: string]: string };
}

// Bulk Operations interfaces
export interface ImportTransactionData {
    date: string;
    description: string;
    reference?: string;
    entries: TransactionEntryInput[];
    tags?: string[];
}

export interface BulkValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    rowIndex: number;
}

export interface ImportProgress {
    total: number;
    processed: number;
    failed: number;
    currentItem: string | null;
}

export interface ImportOptions {
    batchSize?: number;
    onProgress?: (progress: ImportProgress) => void;
    validateBeforeImport?: boolean;
}

export interface ImportResult {
    successful: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
}

export interface ExportOptions {
    format: ExportFormat;
    dateRange?: DateRange;
    includeAccounts?: boolean;
    includeBalances?: boolean;
    groupBy?: 'date' | 'account' | 'shop';
}

export type ExportFormat = 'excel' | 'csv' | 'pdf';

export interface ExportResult {
    content: string;
    mimeType: string;
    filename: string;
}

export interface BulkEditOperation {
    type: 'UPDATE_DESCRIPTION' | 'UPDATE_DATE' | 'UPDATE_REFERENCE' | 'ADD_TAG' | 'REMOVE_TAG';
    value: any;
}

export interface DateRange {
    startDate: string;
    endDate: string;
}

// Executive Dashboard interfaces
export interface DashboardData {
    totalRevenue: number;
    previousRevenue?: number;
    netProfit: number;
    previousProfit?: number;
    profitMargin: number;
    previousMargin?: number;
    monthlyGrowth: number;
    revenueTrend?: TrendDirection;
    profitTrend?: TrendDirection;
    marginTrend?: TrendDirection;
    revenueTrendData?: TimeSeriesPoint[];
    profitAnalysisData?: ProfitAnalysisData;
    profitBreakdown?: { [category: string]: number };
    shopPerformance?: ShopPerformanceData[];
    forecasts?: ForecastData;
    forecastConfidence?: number;
    healthScore?: number;
    healthFactors?: HealthFactor[];
    alerts?: BusinessAlert[];
    generatedAt: string;
}

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'custom';
export type TrendDirection = 'up' | 'down' | 'neutral';

export interface DashboardOptions {
    timeRange: TimeRange;
    shopIds?: string[];
    includeForecasts?: boolean;
    includeTrends?: boolean;
}

export interface KPITargets {
    revenue?: number;
    profit?: number;
    profitMargin?: number;
    growth?: number;
}

export interface TimeSeriesPoint {
    date: string;
    value: number;
}

export interface ProfitAnalysisData {
    grossProfit: number;
    operatingExpenses: number;
    netProfit: number;
    breakdown: { [category: string]: number };
}

export interface ShopPerformanceData {
    shopId: string;
    shopName: string;
    revenue: number;
    profit: number;
    growth: number;
    ranking: number;
}

export interface ForecastData {
    revenue: TimeSeriesPoint[];
    profit: TimeSeriesPoint[];
    confidence: number;
    scenarios: {
        optimistic: TimeSeriesPoint[];
        realistic: TimeSeriesPoint[];
        pessimistic: TimeSeriesPoint[];
    };
}

export interface HealthFactor {
    name: string;
    score: number;
    weight: number;
    status: 'excellent' | 'good' | 'needs_attention';
}

export interface HealthScore {
    score: number;
    factors: HealthFactor[];
    grade: 'A' | 'B' | 'C' | 'D';
}

export interface BusinessAlert {
    id: string;
    type: 'REVENUE_DROP' | 'EXPENSE_SPIKE' | 'LOW_MARGIN' | 'SEASONAL_ANOMALY' | 'OPPORTUNITY';
    severity: 'low' | 'medium' | 'high';
    title: string;
    message: string;
    actionable: boolean;
    createdAt: string;
    shopId?: string;
}

// Analytics Service interfaces
export interface RevenueData {
    total: number;
    trend: TimeSeriesPoint[];
    historical: TimeSeriesPoint[];
}

export interface ProfitData {
    net: number;
    breakdown: ProfitAnalysisData;
    categoryBreakdown: { [category: string]: number };
    historical: TimeSeriesPoint[];
}

export interface ExpenseData {
    total: number;
    breakdown: { [category: string]: number };
}

export interface FinancialMetrics {
    revenue: number;
    profit: number;
    margin: number;
    growth: number;
    expenses: number;
}

export interface ForecastOptions {
    method: 'linear_regression' | 'exponential_smoothing' | 'arima';
    seasonality: boolean;
}

export interface BusinessInsight {
    type: 'POSITIVE' | 'WARNING' | 'CRITICAL' | 'OPPORTUNITY';
    category: 'REVENUE' | 'PROFITABILITY' | 'INVENTORY' | 'EXPENSES' | 'GROWTH';
    title: string;
    description: string;
    actionable: boolean;
    recommendations?: string[];
}

export interface PredictiveAnalytics {
    forecastPeriod: number;
    salesForecast: TimeSeriesPoint[];
    profitForecast: TimeSeriesPoint[];
    cashFlowForecast: TimeSeriesPoint[];
    confidence: number;
    generatedAt: string;
}

// Report Builder interfaces
export interface ReportConfiguration {
    name: string;
    description: string;
    type: 'FINANCIAL' | 'OPERATIONAL' | 'ANALYTICAL';
    dataSource: 'TRANSACTIONS' | 'ACCOUNTS' | 'FINANCIAL_YEARS' | 'SHOPS';
    filters: ReportFilter[];
    grouping: ReportGrouping[];
    sorting: ReportSorting[];
    columns: ReportColumn[];
    calculations: ReportCalculation[];
    formatting: ReportFormatting;
}

export interface ReportField {
    id: string;
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    description: string;
    category: string;
}

export interface ReportFilter {
    fieldId: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'between';
    value: any;
    values?: any[];
}

export interface ReportGrouping {
    fieldId: string;
    order: number;
}

export interface ReportSorting {
    fieldId: string;
    direction: 'asc' | 'desc';
    order: number;
}

export interface ReportColumn {
    id: string;
    fieldId: string;
    label: string;
    width?: number;
    aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
    formatting?: ColumnFormatting;
}

export interface ReportCalculation {
    id: string;
    name: string;
    formula: string;
    type: 'derived' | 'aggregate';
}

export interface ReportFormatting {
    currency: string;
    dateFormat: string;
    numberFormat: string;
}

export interface ColumnFormatting {
    type: 'currency' | 'percentage' | 'number' | 'date';
    decimals?: number;
    prefix?: string;
    suffix?: string;
}

export interface CustomReport {
    id: string;
    config: ReportConfiguration;
    data: any[];
    metadata: {
        generatedAt: string;
        recordCount: number;
        executionTime: number;
    };
}

// Export Service interfaces
export interface ExportConfiguration {
    fileName: string;
    sheetName?: string;
    includeHeader: boolean;
    includeFooter?: boolean;
    columns: ExportColumn[];
    formatting: ExportFormatting;
}

export interface ExportColumn {
    fieldId: string;
    header: string;
    width?: number;
    format?: string;
}

export interface ExportFormatting {
    headerStyle?: ExcelStyle;
    dataStyle?: ExcelStyle;
    footerStyle?: ExcelStyle;
}

export interface ExcelStyle {
    font?: { bold?: boolean; size?: number; color?: string };
    fill?: { type: 'pattern'; pattern: string; fgColor: string };
    border?: { top?: any; left?: any; bottom?: any; right?: any };
    alignment?: { horizontal?: string; vertical?: string };
}

export interface PDFExportConfiguration extends ExportConfiguration {
    orientation: 'portrait' | 'landscape';
    pageSize: 'a4' | 'a3' | 'letter';
    margins?: { top: number; right: number; bottom: number; left: number };
}

export interface ScheduledReportConfig {
    name: string;
    description: string;
    reportConfig: ReportConfiguration;
    exportConfig: ExportConfiguration;
    schedule: ReportSchedule;
    recipients: string[];
    createdBy: string;
}

export interface ReportSchedule {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    time: string; // HH:MM format
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    timezone: string;
}

export interface ScheduledReport extends ScheduledReportConfig {
    id: string;
    isActive: boolean;
    lastExecuted: string | null;
    nextExecution: string;
    createdAt: string;
    executionCount: number;
}

export interface BatchExportItem {
    reportConfig: ReportConfiguration;
    exportConfig: ExportConfiguration;
}

export interface BatchExportResult {
    successful: Array<{
        reportName: string;
        fileName: string;
        format: string;
        size: number;
    }>;
    failed: Array<{
        reportName: string;
        error: string;
    }>;
    totalCount: number;
    executedAt: string;
}

// Performance Monitor interfaces
export interface PerformanceMetric {
    type: 'QUERY' | 'RENDER' | 'LOAD' | 'EXPORT';
    name: string;
    duration: number;
    timestamp: string;
    success: boolean;
    details: {
        threshold: number;
        exceeded: boolean;
        metadata?: any;
    };
}

export interface OptimizationRecommendation {
    type: 'QUERY_OPTIMIZATION' | 'COMPONENT_OPTIMIZATION' | 'BUNDLE_OPTIMIZATION' | 'MEMORY_OPTIMIZATION';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    actions: string[];
    estimatedImpact?: string;
}

// Security Audit interfaces
export interface SecurityAuditReport {
    auditId: string;
    timestamp: string;
    shopId?: string;
    overallScore: number;
    categories: {
        authentication: SecurityCategory;
        authorization: SecurityCategory;
        dataProtection: SecurityCategory;
        activityMonitoring: SecurityCategory;
        firebaseRules: SecurityCategory;
    };
    recommendations: SecurityRecommendation[];
    criticalIssues: SecurityIssue[];
    complianceStatus: { [standard: string]: ComplianceResult };
}

export interface SecurityCategory {
    name: string;
    score: number;
    issues: SecurityIssue[];
    recommendations: SecurityRecommendation[];
}

export interface SecurityIssue {
    id: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    impact: string;
    remediation: string;
}

export interface SecurityRecommendation {
    id: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description: string;
    actions: string[];
    estimatedEffort: string;
}

export interface SuspiciousActivity {
    id: string;
    type: 'UNUSUAL_LOGIN' | 'RAPID_TRANSACTIONS' | 'PERMISSION_ESCALATION' | 'DATA_EXPORT_ANOMALY';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    userId: string;
    shopId?: string;
    description: string;
    detectedAt: string;
    details: any;
}

export interface ComplianceStandard {
    name: string;
    version: string;
    requirements: ComplianceRequirement[];
}

export interface ComplianceRequirement {
    id: string;
    title: string;
    description: string;
    category: string;
    mandatory: boolean;
}

export interface ComplianceResult {
    score: number;
    compliantRequirements: string[];
    nonCompliantRequirements: string[];
    gaps: ComplianceGap[];
}

export interface ComplianceGap {
    requirementId: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
    remediation: string;
}

export interface ComplianceReport {
    generatedAt: string;
    standards: { [standardName: string]: ComplianceResult };
    overallCompliance: number;
    gaps: ComplianceGap[];
    recommendations: SecurityRecommendation[];
}

// Backup Service interfaces
export interface BackupResult {
    backupId: string;
    success: boolean;
    timestamp: string;
    size: number;
    collections: string[];
}

export interface FullBackup {
    backupId: string;
    timestamp: string;
    shopId?: string;
    version: string;
    collections: { [collectionName: string]: any[] };
}

export interface BackupMetadata {
    backupId: string;
    timestamp: string;
    shopId?: string;
    type: 'FULL' | 'SHOP' | 'INCREMENTAL';
    status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    size: number;
    collections: string[];
    retentionUntil: string;
    checksums: { [collection: string]: string };
}

export interface RestoreOptions {
    collectionsToRestore?: string[];
    overwriteExisting?: boolean;
    validateIntegrity?: boolean;
    createBackupBeforeRestore?: boolean;
}

export interface RestoreResult {
    backupId: string;
    restorePointId?: string;
    timestamp: string;
    restoredCollections: string[];
    failedCollections: Array<{
        collection: string;
        error: string;
    }>;
    success: boolean;
}

export interface BackupSchedule {
    name: string;
    description: string;
    shopId?: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:MM format
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    retentionDays: number;
    includeCollections: string[];
    excludeCollections?: string[];
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
}

export interface ScheduledBackup extends BackupSchedule {
    id: string;
    isActive: boolean;
    lastExecuted: string | null;
    nextExecution: string;
    createdAt: string;
    executionCount: number;
    lastResult: BackupResult | null;
}

// Enhanced Log Types for Phase 3
export enum Phase3LogType {
    TEMPLATE_CREATED = 'TEMPLATE_CREATED',
    TEMPLATE_APPLIED = 'TEMPLATE_APPLIED',
    BULK_IMPORT_EXECUTED = 'BULK_IMPORT_EXECUTED',
    BULK_EXPORT_EXECUTED = 'BULK_EXPORT_EXECUTED',
    REPORT_GENERATED = 'REPORT_GENERATED',
    DASHBOARD_ACCESSED = 'DASHBOARD_ACCESSED',
    SECURITY_AUDIT = 'SECURITY_AUDIT',
    BACKUP_CREATED = 'BACKUP_CREATED',
    BACKUP_RESTORED = 'BACKUP_RESTORED',
    PERFORMANCE_ALERT = 'PERFORMANCE_ALERT',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
}