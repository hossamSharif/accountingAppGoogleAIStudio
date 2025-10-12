import { AccountType, AccountClassification, AccountNature, TransactionType, LogType } from '../types';
import { Language } from './i18nContext';

export interface BilingualEnum {
  ar: string;
  en: string;
}

export const accountTypeTranslations: Record<AccountType, BilingualEnum> = {
  [AccountType.SALES]: { ar: 'المبيعات', en: 'Sales' },
  [AccountType.PURCHASES]: { ar: 'المشتريات', en: 'Purchases' },
  [AccountType.EXPENSES]: { ar: 'المصروفات', en: 'Expenses' },
  [AccountType.CUSTOMER]: { ar: 'العملاء', en: 'Customers' },
  [AccountType.SUPPLIER]: { ar: 'الموردين', en: 'Suppliers' },
  [AccountType.BANK]: { ar: 'البنك', en: 'Bank' },
  [AccountType.CASH]: { ar: 'الصندوق', en: 'Cash' },
  [AccountType.STOCK]: { ar: 'المخزون', en: 'Stock' },
  [AccountType.OPENING_STOCK]: { ar: 'بضاعة أول المدة', en: 'Opening Stock' },
  [AccountType.ENDING_STOCK]: { ar: 'بضاعة آخر المدة', en: 'Ending Stock' },
};

export const accountClassificationTranslations: Record<AccountClassification, BilingualEnum> = {
  [AccountClassification.ASSETS]: { ar: 'الأصول', en: 'Assets' },
  [AccountClassification.LIABILITIES]: { ar: 'الخصوم', en: 'Liabilities' },
  [AccountClassification.EQUITY]: { ar: 'حقوق الملكية', en: 'Equity' },
  [AccountClassification.REVENUE]: { ar: 'الإيرادات', en: 'Revenue' },
  [AccountClassification.EXPENSES]: { ar: 'المصروفات', en: 'Expenses' },
};

export const accountNatureTranslations: Record<AccountNature, BilingualEnum> = {
  [AccountNature.DEBIT]: { ar: 'مدين', en: 'Debit' },
  [AccountNature.CREDIT]: { ar: 'دائن', en: 'Credit' },
};

export const transactionTypeTranslations: Record<TransactionType, BilingualEnum> = {
  [TransactionType.SALE]: { ar: 'بيع', en: 'Sale' },
  [TransactionType.PURCHASE]: { ar: 'شراء', en: 'Purchase' },
  [TransactionType.EXPENSE]: { ar: 'صرف', en: 'Expense' },
  [TransactionType.TRANSFER]: { ar: 'تحويل', en: 'Transfer' },
};

export const logTypeTranslations: Record<LogType, BilingualEnum> = {
  // Authentication
  [LogType.LOGIN]: { ar: 'تسجيل دخول', en: 'Login' },
  [LogType.LOGOUT]: { ar: 'تسجيل خروج', en: 'Logout' },

  // Shop Management
  [LogType.SHOP_CREATED]: { ar: 'إنشاء متجر', en: 'Shop Created' },
  [LogType.SHOP_UPDATED]: { ar: 'تحديث متجر', en: 'Shop Updated' },
  [LogType.SHOP_DELETED]: { ar: 'حذف متجر', en: 'Shop Deleted' },
  [LogType.SHOP_ACTIVATED]: { ar: 'تفعيل متجر', en: 'Shop Activated' },
  [LogType.SHOP_DEACTIVATED]: { ar: 'إلغاء تفعيل متجر', en: 'Shop Deactivated' },

  // User Management
  [LogType.USER_CREATED]: { ar: 'إنشاء مستخدم', en: 'User Created' },
  [LogType.USER_UPDATED]: { ar: 'تحديث مستخدم', en: 'User Updated' },
  [LogType.USER_ACTIVATED]: { ar: 'تفعيل مستخدم', en: 'User Activated' },
  [LogType.USER_DEACTIVATED]: { ar: 'إلغاء تفعيل مستخدم', en: 'User Deactivated' },
  [LogType.USER_ACTION]: { ar: 'إجراء مستخدم', en: 'User Action' },

  // Account Management
  [LogType.ACCOUNT_CREATED]: { ar: 'إنشاء حساب', en: 'Account Created' },
  [LogType.ACCOUNT_UPDATED]: { ar: 'تحديث حساب', en: 'Account Updated' },
  [LogType.DELETE_ACCOUNT]: { ar: 'حذف حساب', en: 'Account Deleted' },

  // Transaction Management
  [LogType.ADD_ENTRY]: { ar: 'إضافة قيد', en: 'Entry Added' },
  [LogType.EDIT_ENTRY]: { ar: 'تعديل قيد', en: 'Entry Edited' },
  [LogType.DELETE_ENTRY]: { ar: 'حذف قيد', en: 'Entry Deleted' },
  [LogType.TRANSACTION_CREATED]: { ar: 'إنشاء حركة', en: 'Transaction Created' },
  [LogType.TRANSACTION_UPDATED]: { ar: 'تحديث حركة', en: 'Transaction Updated' },
  [LogType.TRANSACTION_DELETED]: { ar: 'حذف حركة', en: 'Transaction Deleted' },
  [LogType.BALANCE_CHANGE]: { ar: 'تغيير الرصيد', en: 'Balance Change' },

  // Financial Year Management
  [LogType.FINANCIAL_YEAR_CREATED]: { ar: 'إنشاء سنة مالية', en: 'Financial Year Created' },
  [LogType.FINANCIAL_YEAR_CLOSED]: { ar: 'إغلاق سنة مالية', en: 'Financial Year Closed' },
  [LogType.STOCK_TRANSITION]: { ar: 'انتقال المخزون', en: 'Stock Transition' },

  // Reporting
  [LogType.SHARE_REPORT]: { ar: 'مشاركة تقرير', en: 'Report Shared' },
  [LogType.EXPORT_REPORT]: { ar: 'تصدير تقرير', en: 'Report Exported' },
  [LogType.REPORT_GENERATED]: { ar: 'إنشاء تقرير', en: 'Report Generated' },
  [LogType.REPORT_EXPORTED]: { ar: 'تصدير تقرير', en: 'Report Exported' },

  // Data Management
  [LogType.DATA_IMPORT]: { ar: 'استيراد بيانات', en: 'Data Imported' },
  [LogType.DATA_EXPORT]: { ar: 'تصدير بيانات', en: 'Data Exported' },
  [LogType.BACKUP_CREATED]: { ar: 'إنشاء نسخة احتياطية', en: 'Backup Created' },
  [LogType.BACKUP_RESTORED]: { ar: 'استعادة نسخة احتياطية', en: 'Backup Restored' },

  // System Events
  [LogType.SYNC]: { ar: 'مزامنة', en: 'Synchronization' },
  [LogType.SECURITY_EVENT]: { ar: 'حدث أمني', en: 'Security Event' },
  [LogType.SYSTEM_ERROR]: { ar: 'خطأ في النظام', en: 'System Error' },
  [LogType.SYSTEM_MAINTENANCE]: { ar: 'صيانة النظام', en: 'System Maintenance' },
  [LogType.TEMPLATE_CREATED]: { ar: 'إنشاء قالب', en: 'Template Created' },
};

// Helper function to translate enum values
export const translateEnum = <T extends string>(
  enumValue: T,
  translationMap: Record<T, BilingualEnum>,
  language: Language
): string => {
  return translationMap[enumValue]?.[language] || enumValue;
};
