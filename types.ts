export enum Page {
    DASHBOARD = 'Dashboard',
    ACCOUNTS = 'Accounts',
    STATEMENT = 'Statement',
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
}

export interface Shop {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
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
}

export enum LogType {
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    SYNC = 'SYNC',
    SHARE_REPORT = 'SHARE_REPORT',
    EXPORT_REPORT = 'EXPORT_REPORT',
    ADD_ENTRY = 'ADD_ENTRY',
    EDIT_ENTRY = 'EDIT_ENTRY',
    DELETE_ENTRY = 'DELETE_ENTRY',
    DELETE_ACCOUNT = 'DELETE_ACCOUNT',
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