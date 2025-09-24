import { Account, AccountType, AccountClassification, AccountNature } from './types';

export const MAIN_ACCOUNT_DEFINITIONS: Omit<Account, 'id' | 'shopId' | 'isActive' | 'parentId' | 'openingBalance'>[] = [
    // Assets
    { accountCode: '1100', name: 'الصندوق', classification: AccountClassification.ASSETS, nature: AccountNature.DEBIT, type: AccountType.CASH },
    { accountCode: '1200', name: 'البنك', classification: AccountClassification.ASSETS, nature: AccountNature.DEBIT, type: AccountType.BANK },
    { accountCode: '1300', name: 'العملاء', classification: AccountClassification.ASSETS, nature: AccountNature.DEBIT, type: AccountType.CUSTOMER },
    { accountCode: '1400', name: 'المخزون', classification: AccountClassification.ASSETS, nature: AccountNature.DEBIT, type: AccountType.STOCK },
    // Liabilities
    { accountCode: '2100', name: 'الموردين', classification: AccountClassification.LIABILITIES, nature: AccountNature.CREDIT, type: AccountType.SUPPLIER },
    // Revenue
    { accountCode: '4100', name: 'المبيعات', classification: AccountClassification.REVENUE, nature: AccountNature.CREDIT, type: AccountType.SALES },
    // Expenses
    { accountCode: '5100', name: 'المصروفات', classification: AccountClassification.EXPENSES, nature: AccountNature.DEBIT, type: AccountType.EXPENSES },
];
