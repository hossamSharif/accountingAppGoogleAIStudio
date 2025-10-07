import { Account, AccountType, AccountClassification, AccountNature } from './types';

export const MAIN_ACCOUNT_DEFINITIONS: Omit<Account, 'id' | 'shopId' | 'isActive' | 'parentId' | 'openingBalance'>[] = [
    // Assets
    { accountCode: '1100', name: 'الصندوق', classification: AccountClassification.ASSETS, nature: AccountNature.DEBIT, type: AccountType.CASH },
    { accountCode: '1200', name: 'البنك', classification: AccountClassification.ASSETS, nature: AccountNature.DEBIT, type: AccountType.BANK },
    { accountCode: '1300', name: 'العملاء', classification: AccountClassification.ASSETS, nature: AccountNature.DEBIT, type: AccountType.CUSTOMER },
    { accountCode: '1400', name: 'المخزون', classification: AccountClassification.ASSETS, nature: AccountNature.DEBIT, type: AccountType.STOCK },
    { accountCode: '1410', name: 'بضاعة أول المدة', classification: AccountClassification.ASSETS, nature: AccountNature.DEBIT, type: AccountType.OPENING_STOCK },
    { accountCode: '1420', name: 'بضاعة آخر المدة', classification: AccountClassification.ASSETS, nature: AccountNature.DEBIT, type: AccountType.ENDING_STOCK },
    // Liabilities
    { accountCode: '2100', name: 'الموردين', classification: AccountClassification.LIABILITIES, nature: AccountNature.CREDIT, type: AccountType.SUPPLIER },
    // Revenue
    { accountCode: '4100', name: 'المبيعات', classification: AccountClassification.REVENUE, nature: AccountNature.CREDIT, type: AccountType.SALES },
    // Expenses - Cost of Goods Sold
    { accountCode: '5100', name: 'المشتريات', classification: AccountClassification.EXPENSES, nature: AccountNature.DEBIT, type: AccountType.PURCHASES },
    // Expenses - Operating Expenses
    { accountCode: '5200', name: 'المصروفات', classification: AccountClassification.EXPENSES, nature: AccountNature.DEBIT, type: AccountType.EXPENSES },
];

// Sub-accounts that should be created for each shop under main accounts
// SIMPLIFIED VERSION: Only single account for sales and purchases
export const DEFAULT_SUB_ACCOUNTS: { [parentCode: string]: Omit<Account, 'id' | 'shopId' | 'isActive' | 'parentId' | 'openingBalance'>[] } = {
    '1300': [ // العملاء (Customers) - Mandatory default account
        { accountCode: '1301', name: 'مبيعات مباشرة', classification: AccountClassification.ASSETS, nature: AccountNature.DEBIT, type: AccountType.CUSTOMER },
    ],
    '2100': [ // الموردين (Suppliers) - Mandatory default account
        { accountCode: '2101', name: 'مشتريات مباشرة', classification: AccountClassification.LIABILITIES, nature: AccountNature.CREDIT, type: AccountType.SUPPLIER },
    ],
    '5100': [ // المشتريات (Purchases) - Single account only
        { accountCode: '5101', name: 'المشتريات', classification: AccountClassification.EXPENSES, nature: AccountNature.DEBIT, type: AccountType.PURCHASES },
    ],
    '4100': [ // المبيعات (Sales) - Single account only
        { accountCode: '4101', name: 'المبيعات', classification: AccountClassification.REVENUE, nature: AccountNature.CREDIT, type: AccountType.SALES },
    ],
    '5200': [ // المصروفات (Operating Expenses)
        { accountCode: '5201', name: 'إيجار المحل', classification: AccountClassification.EXPENSES, nature: AccountNature.DEBIT, type: AccountType.EXPENSES, category: 'مصروفات تشغيلية' },
        { accountCode: '5202', name: 'رواتب الموظفين', classification: AccountClassification.EXPENSES, nature: AccountNature.DEBIT, type: AccountType.EXPENSES, category: 'الرواتب' },
        { accountCode: '5203', name: 'فواتير الكهرباء والماء', classification: AccountClassification.EXPENSES, nature: AccountNature.DEBIT, type: AccountType.EXPENSES, category: 'مصروفات المرافق' },
        { accountCode: '5204', name: 'مصروفات التسويق', classification: AccountClassification.EXPENSES, nature: AccountNature.DEBIT, type: AccountType.EXPENSES, category: 'التسويق' },
        { accountCode: '5205', name: 'مصروفات أخرى', classification: AccountClassification.EXPENSES, nature: AccountNature.DEBIT, type: AccountType.EXPENSES, category: 'متنوعة' },
    ],
};

// Account types that users cannot create sub-accounts from (admin-only)
export const RESTRICTED_ACCOUNT_TYPES = [
    AccountType.CASH,
    AccountType.BANK,
    AccountType.OPENING_STOCK,
    AccountType.ENDING_STOCK,
    AccountType.STOCK,
    AccountType.SALES,       // Only admin can create sales sub-accounts
    AccountType.PURCHASES    // Only admin can create purchase sub-accounts
];

// Account types that users can create sub-accounts from
export const USER_ALLOWED_ACCOUNT_TYPES = [
    AccountType.CUSTOMER,
    AccountType.SUPPLIER,
    AccountType.EXPENSES     // Users can only create expense sub-accounts
];

// Expense categories for analytics and reporting
export const EXPENSE_CATEGORIES = [
    'الرواتب', // Salaries
    'مصروفات تشغيلية', // Operating expenses
    'مصروفات المرافق', // Utilities
    'التسويق', // Marketing
    'متنوعة', // Miscellaneous
    'الإفطار', // Breakfast
    'المواصلات', // Transportation
    'الصيانة', // Maintenance
];
