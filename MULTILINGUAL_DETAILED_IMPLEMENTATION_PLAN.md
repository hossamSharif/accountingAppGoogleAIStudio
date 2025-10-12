# Comprehensive Multi-Language Implementation Plan
## Detailed Section-by-Section Analysis & Testable Phases

> **Project Scope**: Add complete English/Arabic bilingual support to all 99 source files
> **Timeline**: 8-10 days of development
> **Approach**: Incremental phases with manual testing after each phase

---

## TABLE OF CONTENTS

1. [Application Structure Analysis](#application-structure-analysis)
2. [Phase 0: Foundation & Infrastructure](#phase-0-foundation--infrastructure)
3. [Phase 1: Core UI Components](#phase-1-core-ui-components)
4. [Phase 2: Authentication & User Management](#phase-2-authentication--user-management)
5. [Phase 3: Dashboard & Main Features](#phase-3-dashboard--main-features)
6. [Phase 4: Accounts Management](#phase-4-accounts-management)
7. [Phase 5: Transactions Management](#phase-5-transactions-management)
8. [Phase 6: Financial Years & Stock](#phase-6-financial-years--stock)
9. [Phase 7: Reports & Statements](#phase-7-reports--statements)
10. [Phase 8: Analytics & Dashboard](#phase-8-analytics--dashboard)
11. [Phase 9: Admin Features (Settings & Management)](#phase-9-admin-features-settings--management)
12. [Phase 10: Notifications & Logs](#phase-10-notifications--logs)
13. [Phase 11: Services Layer](#phase-11-services-layer)
14. [Phase 12: Export & Print Features](#phase-12-export--print-features)
15. [Phase 13: Testing & Migration](#phase-13-testing--migration)
16. [Testing Checklist](#testing-checklist)

---

## APPLICATION STRUCTURE ANALYSIS

### Current File Count
- **Total Source Files**: 99 files
- **Pages**: 16 files
- **Components**: 35+ files
- **Services**: 15+ files
- **Utilities**: 10+ files
- **Types**: 1 main types file

### User Roles & Sections

#### ADMIN ROLE
**Navigation**:
1. لوحة التحكم (Dashboard)
2. سجل الحركات (Transactions)
3. كشف حساب (Statement)
4. التحليلات (Analytics)
5. سجلات المتاجر (Shop Logs)
6. الإعدادات (Settings)
   - إدارة المتاجر (Shop Management)
   - إدارة المستخدمين (User Management)
   - السنوات المالية (Financial Years)
   - شجرة الحسابات (Accounts Tree)
7. الإشعارات (Notifications)
8. الملف الشخصي (Profile)

#### USER ROLE
**Navigation**:
1. لوحة التحكم (Dashboard)
2. شجرة الحسابات (Accounts)
3. سجل الحركات (Transactions)
4. كشف حساب (Statement)
5. التحليلات (Analytics)
6. الإشعارات (Notifications)
7. الملف الشخصي (Profile)

---

## PHASE 0: FOUNDATION & INFRASTRUCTURE
**Duration**: 1 day
**Files to Create**: 20 files
**Files to Modify**: 3 files

### 0.1 Create i18n System

#### Files to Create:

**`src/i18n/i18nContext.tsx`**
```typescript
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { translations } from './translations';

export type Language = 'ar' | 'en';
export type TranslationNamespace = keyof typeof translations.ar;

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>, namespace?: TranslationNamespace) => string;
  dir: 'rtl' | 'ltr';
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved === 'en' || saved === 'ar') ? saved : 'ar';
  });

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    localStorage.setItem('app_language', language);
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  const t = (key: string, params?: Record<string, any>, namespace?: TranslationNamespace): string => {
    const keys = key.split('.');
    let value: any = namespace
      ? translations[language][namespace]
      : translations[language];

    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }

    if (typeof value !== 'string') {
      console.warn(`Translation missing for key: ${key} in language: ${language}`);
      return key;
    }

    // Replace parameters
    if (params) {
      return Object.entries(params).reduce((str, [key, val]) => {
        return str.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
      }, value);
    }

    return value;
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = React.useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};
```

**`src/i18n/useTranslation.ts`**
```typescript
import { useI18n } from './i18nContext';

export const useTranslation = () => {
  const { t, language, dir } = useI18n();
  return { t, language, dir };
};
```

**`src/i18n/translations.ts`**
```typescript
import * as arCommon from './locales/ar/common.json';
import * as arAccounts from './locales/ar/accounts.json';
import * as arTransactions from './locales/ar/transactions.json';
// ... import all other namespaces

import * as enCommon from './locales/en/common.json';
import * as enAccounts from './locales/en/accounts.json';
import * as enTransactions from './locales/en/transactions.json';
// ... import all other namespaces

export const translations = {
  ar: {
    common: arCommon,
    accounts: arAccounts,
    transactions: arTransactions,
    // ... all other namespaces
  },
  en: {
    common: enCommon,
    accounts: enAccounts,
    transactions: enTransactions,
    // ... all other namespaces
  }
};
```

**`src/i18n/messageKeys.ts`**
```typescript
export const MessageKeys = {
  // Authentication
  LOGIN_SUCCESS: 'auth.messages.loginSuccess',
  LOGIN_FAILED: 'auth.messages.loginFailed',
  LOGOUT_SUCCESS: 'auth.messages.logoutSuccess',

  // Accounts
  ACCOUNT_CREATED: 'accounts.messages.created',
  ACCOUNT_UPDATED: 'accounts.messages.updated',
  ACCOUNT_DELETED: 'accounts.messages.deleted',
  ACCOUNT_DELETE_ERROR: 'accounts.messages.deleteError',

  // ... (200+ message keys)
} as const;
```

**`src/i18n/enumTranslations.ts`**
```typescript
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
  [LogType.LOGIN]: { ar: 'تسجيل دخول', en: 'Login' },
  [LogType.LOGOUT]: { ar: 'تسجيل خروج', en: 'Logout' },
  [LogType.SHOP_CREATED]: { ar: 'إنشاء متجر', en: 'Shop Created' },
  [LogType.SHOP_UPDATED]: { ar: 'تحديث متجر', en: 'Shop Updated' },
  [LogType.SHOP_DELETED]: { ar: 'حذف متجر', en: 'Shop Deleted' },
  // ... all other log types
};

// Helper function
export const translateEnum = <T extends string>(
  enumValue: T,
  translationMap: Record<T, BilingualEnum>,
  language: Language
): string => {
  return translationMap[enumValue]?.[language] || enumValue;
};
```

#### Create Translation Files (18 files)

Create directory structure:
```
src/i18n/locales/
├── ar/
│   ├── common.json
│   ├── accounts.json
│   ├── transactions.json
│   ├── shops.json
│   ├── users.json
│   ├── financialYears.json
│   ├── statements.json
│   ├── reports.json
│   ├── analytics.json
│   ├── notifications.json
│   ├── logs.json
│   ├── settings.json
│   ├── profile.json
│   ├── auth.json
│   ├── errors.json
│   ├── validation.json
│   └── messages.json
└── en/
    └── (same files as ar/)
```

**Sample: `src/i18n/locales/ar/common.json`**
```json
{
  "app": {
    "name": "نظام المحاسبة",
    "title": "نظام محاسبة محلات قطع الغيار"
  },
  "navigation": {
    "dashboard": "لوحة التحكم",
    "accounts": "شجرة الحسابات",
    "transactions": "سجل الحركات",
    "statement": "كشف حساب",
    "analytics": "التحليلات",
    "shopLogs": "سجلات المتاجر",
    "settings": "الإعدادات",
    "notifications": "الإشعارات",
    "profile": "الملف الشخصي"
  },
  "actions": {
    "create": "إنشاء",
    "add": "إضافة",
    "edit": "تعديل",
    "update": "تحديث",
    "delete": "حذف",
    "save": "حفظ",
    "cancel": "إلغاء",
    "confirm": "تأكيد",
    "close": "إغلاق",
    "search": "بحث",
    "filter": "تصفية",
    "export": "تصدير",
    "print": "طباعة",
    "download": "تحميل",
    "upload": "رفع",
    "refresh": "تحديث",
    "back": "رجوع",
    "next": "التالي",
    "previous": "السابق",
    "submit": "إرسال",
    "reset": "إعادة تعيين",
    "clear": "مسح",
    "apply": "تطبيق",
    "select": "اختر",
    "selectAll": "تحديد الكل",
    "deselectAll": "إلغاء تحديد الكل"
  },
  "status": {
    "active": "نشط",
    "inactive": "غير نشط",
    "open": "مفتوح",
    "closed": "مغلق",
    "pending": "معلق",
    "completed": "مكتمل",
    "draft": "مسودة",
    "posted": "منشور",
    "reversed": "معكوس"
  },
  "time": {
    "today": "اليوم",
    "yesterday": "أمس",
    "tomorrow": "غداً",
    "thisWeek": "هذا الأسبوع",
    "thisMonth": "هذا الشهر",
    "thisYear": "هذا العام",
    "lastWeek": "الأسبوع الماضي",
    "lastMonth": "الشهر الماضي",
    "lastYear": "العام الماضي"
  },
  "roles": {
    "admin": "مدير النظام",
    "user": "مستخدم"
  },
  "ui": {
    "loading": "جاري التحميل...",
    "noData": "لا توجد بيانات",
    "error": "حدث خطأ",
    "success": "تم بنجاح",
    "warning": "تحذير",
    "info": "معلومات",
    "confirmation": "تأكيد",
    "areYouSure": "هل أنت متأكد؟",
    "yes": "نعم",
    "no": "لا",
    "ok": "موافق",
    "required": "مطلوب",
    "optional": "اختياري",
    "total": "الإجمالي",
    "subtotal": "المجموع الفرعي",
    "balance": "الرصيد",
    "amount": "المبلغ",
    "date": "التاريخ",
    "description": "الوصف",
    "name": "الاسم",
    "code": "الرمز",
    "type": "النوع",
    "category": "الفئة",
    "details": "التفاصيل",
    "notes": "ملاحظات",
    "actions": "الإجراءات",
    "more": "المزيد",
    "less": "أقل",
    "showing": "عرض",
    "of": "من",
    "items": "عناصر",
    "page": "صفحة",
    "perPage": "لكل صفحة",
    "all": "الكل",
    "none": "لا شيء",
    "other": "أخرى"
  }
}
```

**Sample: `src/i18n/locales/en/common.json`**
```json
{
  "app": {
    "name": "Accounting System",
    "title": "Auto Parts Shop Accounting System"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "accounts": "Chart of Accounts",
    "transactions": "Transactions",
    "statement": "Statement",
    "analytics": "Analytics",
    "shopLogs": "Shop Logs",
    "settings": "Settings",
    "notifications": "Notifications",
    "profile": "Profile"
  },
  "actions": {
    "create": "Create",
    "add": "Add",
    "edit": "Edit",
    "update": "Update",
    "delete": "Delete",
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "close": "Close",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "print": "Print",
    "download": "Download",
    "upload": "Upload",
    "refresh": "Refresh",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "submit": "Submit",
    "reset": "Reset",
    "clear": "Clear",
    "apply": "Apply",
    "select": "Select",
    "selectAll": "Select All",
    "deselectAll": "Deselect All"
  },
  "status": {
    "active": "Active",
    "inactive": "Inactive",
    "open": "Open",
    "closed": "Closed",
    "pending": "Pending",
    "completed": "Completed",
    "draft": "Draft",
    "posted": "Posted",
    "reversed": "Reversed"
  },
  "time": {
    "today": "Today",
    "yesterday": "Yesterday",
    "tomorrow": "Tomorrow",
    "thisWeek": "This Week",
    "thisMonth": "This Month",
    "thisYear": "This Year",
    "lastWeek": "Last Week",
    "lastMonth": "Last Month",
    "lastYear": "Last Year"
  },
  "roles": {
    "admin": "System Administrator",
    "user": "User"
  },
  "ui": {
    "loading": "Loading...",
    "noData": "No data available",
    "error": "An error occurred",
    "success": "Successful",
    "warning": "Warning",
    "info": "Information",
    "confirmation": "Confirmation",
    "areYouSure": "Are you sure?",
    "yes": "Yes",
    "no": "No",
    "ok": "OK",
    "required": "Required",
    "optional": "Optional",
    "total": "Total",
    "subtotal": "Subtotal",
    "balance": "Balance",
    "amount": "Amount",
    "date": "Date",
    "description": "Description",
    "name": "Name",
    "code": "Code",
    "type": "Type",
    "category": "Category",
    "details": "Details",
    "notes": "Notes",
    "actions": "Actions",
    "more": "More",
    "less": "Less",
    "showing": "Showing",
    "of": "of",
    "items": "items",
    "page": "Page",
    "perPage": "per page",
    "all": "All",
    "none": "None",
    "other": "Other"
  }
}
```

### 0.2 Create Utility Functions

**`src/utils/bilingual.ts`**
```typescript
import { Language } from '../i18n/i18nContext';

export const getBilingualText = (
  textAr: string,
  textEn: string | undefined,
  language: Language
): string => {
  if (language === 'en' && textEn) return textEn;
  return textAr; // Fallback to Arabic
};

export const getBilingualField = (
  obj: any,
  fieldName: string,
  language: Language
): string => {
  const enField = `${fieldName}En`;
  if (language === 'en' && obj[enField]) {
    return obj[enField];
  }
  return obj[fieldName] || '';
};
```

### 0.3 Update TypeScript Types

**Modify `types.ts`**:
```typescript
// Add bilingual support to interfaces

export interface Account {
  id: string;
  shopId: string;
  accountCode: string;
  name: string;        // Arabic (primary)
  nameEn?: string;     // English (optional)
  classification: AccountClassification;
  nature: AccountNature;
  type: AccountType;
  parentId?: string;
  isActive: boolean;
  openingBalance?: number;
  category?: string;
}

export interface Shop {
  id: string;
  name: string;              // Arabic (primary)
  nameEn?: string;           // English (optional)
  shopCode: string;
  description: string;        // Arabic (primary)
  descriptionEn?: string;     // English (optional)
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
  businessType?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  originatingUserId?: string;
  shopId?: string;
  logType?: LogType;
  message: string;           // Deprecated - use messageKey
  messageKey?: string;       // Translation key
  messageParams?: Record<string, any>; // Parameters for translation
  messageAr?: string;        // Fallback Arabic
  messageEn?: string;        // Fallback English
  isRead: boolean;
  timestamp: string;
}

export interface Log {
  id: string;
  userId: string;
  shopId?: string;
  type: LogType;
  timestamp: string;
  message: string;           // Deprecated - use messageKey
  messageKey?: string;       // Translation key
  messageParams?: Record<string, any>;
  messageAr?: string;        // Fallback
  messageEn?: string;        // Fallback
}
```

### 0.4 Create Language Switcher Component

**`src/components/LanguageSwitcher.tsx`**
```typescript
import React from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useI18n } from '../i18n/i18nContext';

const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { language, setLanguage } = useI18n();
  const { t } = useTranslation();

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-gray-700 transition-colors ${className}`}
      title={t('common.actions.switchLanguage')}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
      <span className="font-medium">{language === 'ar' ? 'EN' : 'AR'}</span>
    </button>
  );
};

export default LanguageSwitcher;
```

### 0.5 Update App.tsx

**Modify `App.tsx`**:
```typescript
import { I18nProvider } from './i18n/i18nContext';

const App: React.FC = () => {
  // ... existing code

  return (
    <I18nProvider>
      {/* existing app content */}
    </I18nProvider>
  );
};
```

### ✅ Phase 0 Testing Checklist

**Manual Tests**:
- [ ] App loads without errors
- [ ] Language switcher appears in UI
- [ ] Clicking language switcher changes direction (RTL/LTR)
- [ ] Language preference persists in localStorage
- [ ] `t()` function returns correct translations
- [ ] Missing translation keys show key name (not crash)
- [ ] Translation with parameters works
- [ ] Document direction updates correctly

**Browser Console**:
- [ ] No console errors
- [ ] Warning for missing translation keys appears

---

## PHASE 1: CORE UI COMPONENTS
**Duration**: 1 day
**Focus**: Layout, Sidebar, Header - components that appear on every page

### Section 1.1: Layout Component

**File**: `components/Layout.tsx`

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';

const Layout: React.FC<LayoutProps> = (props) => {
  const { t, dir } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-text-primary flex" dir={dir}>
      {/* ... */}
    </div>
  );
};
```

### Section 1.2: Sidebar Component

**File**: `components/Sidebar.tsx`

**Translation Keys Needed** (`locales/*/common.json`):
```json
{
  "navigation": {
    "dashboard": "...",
    "accounts": "...",
    "transactions": "...",
    "statement": "...",
    "analytics": "...",
    "shopLogs": "...",
    "settings": "...",
    "notifications": "...",
    "profile": "..."
  }
}
```

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';

const Sidebar: React.FC<SidebarProps> = (props) => {
  const { t } = useTranslation();

  const userNavItems = [
    { icon: <DashboardIcon />, label: t('navigation.dashboard'), page: Page.DASHBOARD },
    { icon: <AccountsIcon />, label: t('navigation.accounts'), page: Page.ACCOUNTS },
    { icon: <TransactionsIcon />, label: t('navigation.transactions'), page: Page.TRANSACTIONS },
    { icon: <StatementIcon />, label: t('navigation.statement'), page: Page.STATEMENT },
    { icon: <AnalyticsIcon />, label: t('navigation.analytics'), page: Page.ANALYTICS },
    { icon: <ProfileIcon />, label: t('navigation.profile'), page: Page.PROFILE },
  ];

  const adminNavItems = [
    { icon: <DashboardIcon />, label: t('navigation.dashboard'), page: Page.DASHBOARD },
    { icon: <TransactionsIcon />, label: t('navigation.transactions'), page: Page.TRANSACTIONS },
    { icon: <StatementIcon />, label: t('navigation.statement'), page: Page.STATEMENT },
    { icon: <AnalyticsIcon />, label: t('navigation.analytics'), page: Page.ANALYTICS },
    { icon: <ShopLogsIcon />, label: t('navigation.shopLogs'), page: Page.SHOP_LOGS },
    { icon: <SettingsIcon />, label: t('navigation.settings'), page: Page.SETTINGS },
  ];

  return (
    <aside className="...">
      <div className="...">
        <h1 className="...">{t('app.name')}</h1>
      </div>
      <nav>
        {navItems.map(item => <NavItem {...item} />)}
        <NavItem
          icon={<NotificationIcon />}
          label={t('navigation.notifications')}
          targetPage={Page.NOTIFICATIONS}
          {/* ... */}
        />
      </nav>
    </aside>
  );
};
```

### Section 1.3: Header Component

**File**: `components/Header.tsx`

**Translation Keys** (`locales/*/common.json`):
```json
{
  "header": {
    "refresh": "تحديث",
    "profile": "الملف الشخصي",
    "logout": "تسجيل الخروج"
  },
  "roles": {
    "admin": "مدير النظام",
    "user": "مستخدم"
  }
}
```

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import LanguageSwitcher from './LanguageSwitcher';

const Header: React.FC<HeaderProps> = (props) => {
  const { t } = useTranslation();

  return (
    <header className="...">
      <div className="flex items-center gap-4">
        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Refresh Button for User */}
        {currentUser.role === 'user' && (
          <button
            onClick={handleRefresh}
            title={t('header.refresh')}
            className="..."
          >
            <RefreshIcon />
          </button>
        )}
      </div>

      {/* User Profile */}
      <div className="...">
        <button onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}>
          <div className="...">
            <p className="...">{currentUser.name}</p>
            <p className="...">{t(`roles.${currentUser.role}`)}</p>
            {/* ... */}
          </div>
          {/* ... */}
        </button>

        {isUserDropdownOpen && (
          <div className="...">
            <a href="#" onClick={...}>
              <ProfileIcon />
              <span>{t('header.profile')}</span>
            </a>
            <a href="#" onClick={...}>
              <LogoutIcon />
              <span>{t('header.logout')}</span>
            </a>
          </div>
        )}
      </div>
    </header>
  );
};
```

### Section 1.4: Common Components

**Files to Update**:
- `components/Toast.tsx` - notification toasts
- `components/ErrorBoundary.tsx` - error messages
- `components/ConfirmationModal.tsx` - confirmation dialogs
- `components/StatCard.tsx` - dashboard cards

**Example: `components/ConfirmationModal.tsx`**:
```typescript
import { useTranslation } from '../i18n/useTranslation';

const ConfirmationModal: React.FC<ConfirmationModalProps> = (props) => {
  const { t } = useTranslation();

  return (
    <div className="...">
      <h2>{title || t('ui.confirmation')}</h2>
      <p>{message}</p>
      <div className="...">
        <button onClick={onCancel}>{t('actions.cancel')}</button>
        <button onClick={onConfirm}>{t('actions.confirm')}</button>
      </div>
    </div>
  );
};
```

### ✅ Phase 1 Testing Checklist

**Test as Admin**:
- [ ] Sidebar shows: Dashboard, Transactions, Statement, Analytics, Shop Logs, Settings
- [ ] All navigation labels appear in selected language
- [ ] Language switcher works
- [ ] Header shows admin role label in both languages
- [ ] Profile dropdown shows translated options
- [ ] App direction changes (RTL/LTR)

**Test as User**:
- [ ] Sidebar shows: Dashboard, Accounts, Transactions, Statement, Analytics, Profile
- [ ] Shop name appears (will be Arabic only for now)
- [ ] Refresh button has tooltip in selected language

**Both Roles**:
- [ ] Confirmation modals show translated buttons
- [ ] Error messages use translation system
- [ ] Toast notifications work

---

## PHASE 2: AUTHENTICATION & USER MANAGEMENT
**Duration**: 0.5 day
**Focus**: Login page, user profile, password management

### Section 2.1: Login Page

**File**: `pages/LoginPage.tsx`

**Translation Keys** (`locales/*/auth.json`):
```json
{
  "login": {
    "title": "تسجيل الدخول",
    "subtitle": "نظام محاسبة محلات قطع الغيار",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "loginButton": "دخول",
    "forgotPassword": "نسيت كلمة المرور؟",
    "loggingIn": "جاري تسجيل الدخول..."
  },
  "errors": {
    "invalidCredentials": "البريد الإلكتروني أو كلمة المرور غير صالحة",
    "loginError": "حدث خطأ أثناء تسجيل الدخول",
    "emailRequired": "البريد الإلكتروني مطلوب",
    "passwordRequired": "كلمة المرور مطلوبة"
  },
  "messages": {
    "loginSuccess": "تم تسجيل الدخول بنجاح",
    "logoutSuccess": "تم تسجيل الخروج بنجاح"
  }
}
```

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import LanguageSwitcher from '../components/LanguageSwitcher';

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Validation
  const validate = () => {
    if (!email.trim()) {
      setError(t('auth.errors.emailRequired'));
      return false;
    }
    if (!password) {
      setError(t('auth.errors.passwordRequired'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setIsLoading(true);
    const result = await onLogin(email, password);
    setIsLoading(false);

    if (result !== true) {
      // Error message from backend (already translated in App.tsx)
      setError(result);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 left-4">
        <LanguageSwitcher />
      </div>

      <div className="bg-surface p-8 rounded-xl shadow-2xl w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            {t('auth.login.title')}
          </h1>
          <p className="text-text-secondary">
            {t('auth.login.subtitle')}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-text-secondary text-sm mb-2">
              {t('auth.login.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-background border border-gray-600 rounded-lg text-text-primary focus:outline-none focus:border-primary"
              dir="ltr"
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="mb-6">
            <label className="block text-text-secondary text-sm mb-2">
              {t('auth.login.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-background border border-gray-600 rounded-lg text-text-primary focus:outline-none focus:border-primary"
              dir="ltr"
              autoComplete="current-password"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t('auth.login.loggingIn') : t('auth.login.loginButton')}
          </button>
        </form>

        {/* Forgot Password Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowForgotPassword(true)}
            className="text-primary hover:text-primary-dark text-sm"
          >
            {t('auth.login.forgotPassword')}
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
        />
      )}
    </div>
  );
};
```

### Section 2.2: Profile Page

**File**: `pages/ProfilePage.tsx`

**Translation Keys** (`locales/*/profile.json`):
```json
{
  "title": "الملف الشخصي",
  "personalInfo": "المعلومات الشخصية",
  "accountSettings": "إعدادات الحساب",
  "form": {
    "name": "الاسم",
    "email": "البريد الإلكتروني",
    "role": "الدور",
    "shop": "المتجر",
    "currentPassword": "كلمة المرور الحالية",
    "newPassword": "كلمة المرور الجديدة",
    "confirmPassword": "تأكيد كلمة المرور",
    "changePassword": "تغيير كلمة المرور"
  },
  "messages": {
    "updated": "تم تحديث الملف الشخصي بنجاح",
    "passwordChanged": "تم تغيير كلمة المرور بنجاح",
    "passwordMismatch": "كلمات المرور غير متطابقة",
    "passwordTooShort": "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
  }
}
```

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum } from '../i18n/enumTranslations';

const ProfilePage: React.FC<ProfilePageProps> = (props) => {
  const { t, language } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{t('profile.title')}</h1>

      {/* Personal Info Section */}
      <div className="bg-surface rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">{t('profile.personalInfo')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="...">{t('profile.form.name')}</label>
            <input type="text" value={currentUser.name} disabled className="..." />
          </div>

          <div>
            <label className="...">{t('profile.form.email')}</label>
            <input type="email" value={currentUser.email} disabled className="..." />
          </div>

          <div>
            <label className="...">{t('profile.form.role')}</label>
            <input type="text" value={t(`roles.${currentUser.role}`)} disabled className="..." />
          </div>

          {currentUser.shopId && (
            <div>
              <label className="...">{t('profile.form.shop')}</label>
              <input
                type="text"
                value={getBilingualText(userShop?.name, userShop?.nameEn, language)}
                disabled
                className="..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Password Change Section */}
      <div className="bg-surface rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">{t('profile.form.changePassword')}</h2>
        {/* ... password form */}
      </div>
    </div>
  );
};
```

### Section 2.3: Forgot Password Modal

**File**: `components/ForgotPasswordModal.tsx`

**Translation Keys** (`locales/*/auth.json`):
```json
{
  "forgotPassword": {
    "title": "نسيت كلمة المرور",
    "description": "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور",
    "email": "البريد الإلكتروني",
    "sendLink": "إرسال رابط إعادة التعيين",
    "backToLogin": "العودة لتسجيل الدخول",
    "emailSent": "تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني",
    "emailNotFound": "البريد الإلكتروني غير موجود",
    "error": "حدث خطأ أثناء إرسال البريد"
  }
}
```

### ✅ Phase 2 Testing Checklist

**Login Page**:
- [ ] Login page shows in selected language
- [ ] Language switcher works on login page
- [ ] Email/password labels translated
- [ ] Error messages translated
- [ ] Login button text changes during loading
- [ ] Forgot password link translated

**Profile Page (Admin)**:
- [ ] Profile title translated
- [ ] Form labels translated
- [ ] Role shows "System Administrator" in English
- [ ] Success/error messages translated

**Profile Page (User)**:
- [ ] Shop name shows in selected language (Arabic or English if available)
- [ ] All other fields translated

---

## PHASE 3: DASHBOARD & MAIN FEATURES
**Duration**: 1 day
**Focus**: Dashboard page for both admin and user

### Section 3.1: Dashboard - Date Navigator

**File**: `components/Dashboard.tsx`

**Translation Keys** (`locales/*/dashboard.json`):
```json
{
  "title": "لوحة التحكم",
  "dateNavigator": {
    "today": "اليوم",
    "selectDate": "اختر التاريخ"
  },
  "stats": {
    "sales": "المبيعات",
    "purchases": "المشتريات",
    "expenses": "المصروفات",
    "profit": "الربح",
    "loss": "خسارة",
    "cashBalance": "رصيد الصندوق",
    "bankBalance": "رصيد البنك",
    "daily": "يومي",
    "total": "إجمالي"
  },
  "actions": {
    "addTransaction": "إضافة معاملة",
    "addAccount": "إضافة حساب",
    "viewTransactions": "عرض جميع المعاملات",
    "viewAccounts": "عرض جميع الحسابات"
  },
  "recentTransactions": {
    "title": "المعاملات الأخيرة",
    "noTransactions": "لا توجد معاملات لهذا اليوم",
    "viewAll": "عرض الكل"
  },
  "warnings": {
    "noFinancialYear": "لا توجد سنة مالية مفتوحة",
    "createFinancialYear": "يرجى إنشاء سنة مالية للبدء"
  }
}
```

**Changes to Dashboard.tsx**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum } from '../i18n/enumTranslations';

const DateNavigator: React.FC<DateNavigatorProps> = ({ selectedDate, setSelectedDate }) => {
  const { t, language } = useTranslation();

  // Arabic or English weekday
  const weekdayOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  const locale = language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';

  return (
    <div className="bg-surface p-3 rounded-lg shadow-md flex items-center justify-between mb-6">
      <button onClick={() => handleDateChange(-1)} className="...">
        <ChevronRightIcon />
      </button>

      <div className="flex items-center gap-4 flex-grow justify-center">
        <h3 className="font-bold hidden md:block">
          {selectedDate.toLocaleDateString(locale, weekdayOptions)}
        </h3>
        <input
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={handleDateSelect}
          max={new Date().toISOString().split('T')[0]}
          className="..."
        />
        <button onClick={() => setSelectedDate(new Date())} className="...">
          {t('dashboard.dateNavigator.today')}
        </button>
      </div>

      <button onClick={() => handleDateChange(1)} disabled={isFuture} className="...">
        <ChevronLeftIcon />
      </button>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = (props) => {
  const { t, language } = useTranslation();

  // Warning when no financial year
  if (!openFinancialYear) {
    return (
      <div className="p-6">
        <div className="bg-yellow-500/10 border border-yellow-500 text-yellow-400 p-4 rounded-lg">
          <p className="font-bold">{t('dashboard.warnings.noFinancialYear')}</p>
          <p className="text-sm mt-2">{t('dashboard.warnings.createFinancialYear')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Date Navigator */}
      <DateNavigator selectedDate={selectedDate} setSelectedDate={setSelectedDate} />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t('dashboard.stats.sales')}
          value={formatCurrency(totalSales)}
          icon={<DollarSignIcon />}
          trend="up"
        />
        <StatCard
          title={t('dashboard.stats.purchases')}
          value={formatCurrency(totalPurchases)}
          icon={<ShoppingCartIcon />}
          trend="neutral"
        />
        <StatCard
          title={t('dashboard.stats.expenses')}
          value={formatCurrency(totalExpenses)}
          icon={<CreditCardIcon />}
          trend="neutral"
        />
        <StatCard
          title={profit >= 0 ? t('dashboard.stats.profit') : t('dashboard.stats.loss')}
          value={formatCurrency(Math.abs(profit))}
          icon={<ProfitIcon />}
          trend={profit >= 0 ? 'up' : 'down'}
        />
      </div>

      {/* Cash & Bank Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatCard
          title={t('dashboard.stats.cashBalance')}
          value={formatCurrency(totalCashBalance)}
          icon={<CashIcon />}
          subtitle={t('dashboard.stats.total')}
        />
        <StatCard
          title={t('dashboard.stats.bankBalance')}
          value={formatCurrency(totalBankBalance)}
          icon={<BankIcon />}
          subtitle={t('dashboard.stats.total')}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setIsEntryModalOpen(true)}
          className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center transition"
        >
          <PlusIcon />
          {t('dashboard.actions.addTransaction')}
        </button>

        {/* More action buttons */}
      </div>

      {/* Recent Transactions */}
      <div className="bg-surface rounded-lg p-4">
        <h2 className="text-xl font-bold mb-4">
          {t('dashboard.recentTransactions.title')}
        </h2>

        {dailyTransactions.length === 0 ? (
          <p className="text-text-secondary text-center py-8">
            {t('dashboard.recentTransactions.noTransactions')}
          </p>
        ) : (
          <RecentTransactions
            transactions={dailyTransactions}
            accounts={accounts}
            onEdit={handleStartEdit}
            onDelete={onDeleteTransaction}
          />
        )}
      </div>

      {/* Transaction Form Modal */}
      {isEntryModalOpen && (
        <DailyEntryForm
          isOpen={isEntryModalOpen}
          onClose={handleCloseModal}
          onSave={...}
          accounts={accounts}
          transactionToEdit={editingTransaction}
          openFinancialYear={openFinancialYear}
        />
      )}
    </div>
  );
};
```

### Section 3.2: Stat Cards

**File**: `components/StatCard.tsx`

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, subtitle }) => {
  const { t } = useTranslation();

  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    neutral: 'text-gray-400'
  };

  return (
    <div className="bg-surface p-4 rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-text-secondary text-sm font-medium">{title}</h3>
        <div className={trendColors[trend] || 'text-gray-400'}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {subtitle && (
        <p className="text-xs text-text-secondary mt-1">{subtitle}</p>
      )}
    </div>
  );
};
```

### Section 3.3: Recent Transactions Component

**File**: `components/RecentTransactions.tsx`

**Translation Keys** (`locales/*/transactions.json`):
```json
{
  "list": {
    "columns": {
      "date": "التاريخ",
      "type": "النوع",
      "description": "الوصف",
      "amount": "المبلغ",
      "actions": "الإجراءات"
    },
    "actions": {
      "edit": "تعديل",
      "delete": "حذف",
      "view": "عرض"
    },
    "empty": "لا توجد معاملات",
    "deleteConfirm": "هل تريد حذف هذه المعاملة؟"
  }
}
```

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, transactionTypeTranslations } from '../i18n/enumTranslations';

const RecentTransactions: React.FC<RecentTransactionsProps> = (props) => {
  const { t, language } = useTranslation();

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="...">{t('transactions.list.columns.date')}</th>
            <th className="...">{t('transactions.list.columns.type')}</th>
            <th className="...">{t('transactions.list.columns.description')}</th>
            <th className="...">{t('transactions.list.columns.amount')}</th>
            <th className="...">{t('transactions.list.columns.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.id} className="border-b border-gray-700 hover:bg-gray-800/50">
              <td className="...">{new Date(tx.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
              <td className="...">
                {translateEnum(tx.type, transactionTypeTranslations, language)}
              </td>
              <td className="...">{tx.description}</td>
              <td className="...">{formatCurrency(tx.totalAmount)}</td>
              <td className="...">
                <button
                  onClick={() => onEdit(tx)}
                  className="..."
                  title={t('transactions.list.actions.edit')}
                >
                  <EditIcon />
                </button>
                <button
                  onClick={() => handleDelete(tx.id)}
                  className="..."
                  title={t('transactions.list.actions.delete')}
                >
                  <DeleteIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### ✅ Phase 3 Testing Checklist

**Dashboard (Admin)**:
- [ ] Title "Dashboard" translated
- [ ] Date navigator shows weekday in selected language
- [ ] "Today" button translated
- [ ] All stat cards show translated titles
- [ ] "Sales", "Purchases", "Expenses", "Profit/Loss" translated
- [ ] "Cash Balance", "Bank Balance" translated
- [ ] Action buttons translated
- [ ] "Add Transaction" button translated
- [ ] Recent transactions table headers translated
- [ ] Transaction types show in selected language (Sale/Purchase/Expense)
- [ ] Empty state message translated

**Dashboard (User)**:
- [ ] Same tests as admin
- [ ] Shop name displays correctly

**Date Formatting**:
- [ ] Dates show in Arabic format when Arabic selected
- [ ] Dates show in English format when English selected

---

## PHASE 4: ACCOUNTS MANAGEMENT
**Duration**: 1 day
**Focus**: Accounts page, account modals, account tree

### Section 4.1: Accounts Page

**File**: `pages/AccountsPage.tsx`

**Translation Keys** (`locales/*/accounts.json`):
```json
{
  "title": "شجرة الحسابات",
  "subtitle": "إدارة دليل الحسابات والأرصدة",
  "search": {
    "placeholder": "ابحث عن حساب...",
    "byCode": "بالرمز",
    "byName": "بالاسم"
  },
  "filters": {
    "all": "الكل",
    "active": "النشطة",
    "inactive": "غير النشطة",
    "classification": "التصنيف",
    "type": "النوع"
  },
  "actions": {
    "create": "إنشاء حساب",
    "createSub": "إنشاء حساب فرعي",
    "edit": "تعديل",
    "delete": "حذف",
    "activate": "تفعيل",
    "deactivate": "إلغاء التفعيل",
    "export": "تصدير",
    "print": "طباعة"
  },
  "table": {
    "columns": {
      "code": "الرمز",
      "name": "اسم الحساب",
      "nameArabic": "اسم الحساب (عربي)",
      "nameEnglish": "اسم الحساب (إنجليزي)",
      "classification": "التصنيف",
      "nature": "الطبيعة",
      "type": "النوع",
      "balance": "الرصيد",
      "status": "الحالة",
      "actions": "الإجراءات"
    }
  },
  "status": {
    "active": "نشط",
    "inactive": "غير نشط"
  },
  "messages": {
    "created": "تم إنشاء الحساب بنجاح",
    "updated": "تم تحديث الحساب بنجاح",
    "deleted": "تم حذف الحساب بنجاح",
    "activated": "تم تفعيل الحساب",
    "deactivated": "تم إلغاء تفعيل الحساب",
    "deleteError": "لا يمكن حذف حساب مرتبط بمعاملات",
    "deleteConfirm": "هل تريد حذف هذا الحساب؟",
    "deleteWarning": "سيتم حذف الحساب وجميع الحسابات الفرعية"
  },
  "validation": {
    "nameRequired": "اسم الحساب مطلوب",
    "codeRequired": "رمز الحساب مطلوب",
    "classificationRequired": "التصنيف مطلوب",
    "natureRequired": "الطبيعة مطلوبة",
    "typeRequired": "النوع مطلوب",
    "parentRequired": "الحساب الأب مطلوب للحسابات الفرعية",
    "duplicateCode": "رمز الحساب موجود بالفعل",
    "duplicateName": "اسم الحساب موجود بالفعل"
  },
  "form": {
    "title": {
      "create": "إنشاء حساب جديد",
      "edit": "تعديل حساب",
      "createSub": "إنشاء حساب فرعي"
    },
    "accountCode": "رمز الحساب",
    "accountName": "اسم الحساب",
    "accountNameArabic": "اسم الحساب (عربي)",
    "accountNameEnglish": "اسم الحساب (إنجليزي)",
    "classification": "التصنيف",
    "nature": "الطبيعة",
    "type": "النوع",
    "parentAccount": "الحساب الأب",
    "selectParent": "اختر الحساب الأب",
    "noParent": "حساب رئيسي",
    "openingBalance": "الرصيد الافتتاحي",
    "category": "الفئة",
    "isActive": "نشط",
    "notes": "ملاحظات"
  },
  "classifications": {
    "ASSETS": "الأصول",
    "LIABILITIES": "الخصوم",
    "EQUITY": "حقوق الملكية",
    "REVENUE": "الإيرادات",
    "EXPENSES": "المصروفات"
  },
  "natures": {
    "DEBIT": "مدين",
    "CREDIT": "دائن"
  },
  "types": {
    "SALES": "المبيعات",
    "PURCHASES": "المشتريات",
    "EXPENSES": "المصروفات",
    "CUSTOMER": "العملاء",
    "SUPPLIER": "الموردين",
    "BANK": "البنك",
    "CASH": "الصندوق",
    "STOCK": "المخزون",
    "OPENING_STOCK": "بضاعة أول المدة",
    "ENDING_STOCK": "بضاعة آخر المدة"
  }
}
```

**Changes to AccountsPage.tsx**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import { getBilingualText } from '../utils/bilingual';

const AccountsPage: React.FC = () => {
  const { t, language } = useTranslation();
  // ... state

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('accounts.title')}</h1>
        <p className="text-text-secondary">{t('accounts.subtitle')}</p>
      </div>

      {/* Actions & Filters */}
      <div className="bg-surface p-4 rounded-lg mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Search */}
          <input
            type="text"
            placeholder={t('accounts.search.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] p-2 bg-background border border-gray-600 rounded-lg"
          />

          {/* Add Account Button */}
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center"
          >
            <PlusIcon />
            {t('accounts.actions.create')}
          </button>

          {/* Export Button */}
          <button className="...">
            {t('accounts.actions.export')}
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-primary' : 'bg-background'}`}
          >
            {t('accounts.filters.all')}
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded ${filter === 'active' ? 'bg-primary' : 'bg-background'}`}
          >
            {t('accounts.filters.active')}
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-3 py-1 rounded ${filter === 'inactive' ? 'bg-primary' : 'bg-background'}`}
          >
            {t('accounts.filters.inactive')}
          </button>
        </div>
      </div>

      {/* Accounts List */}
      <AccountList
        accounts={filteredAccounts}
        transactions={transactions}
        onEdit={handleEdit}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        accountBalances={accountBalances}
        currentUser={currentUser}
      />

      {/* Account Modal */}
      {isAccountModalOpen && (
        <AccountModal
          isOpen={isAccountModalOpen}
          onClose={() => { setIsAccountModalOpen(false); setEditingAccount(null); }}
          onSave={handleSaveAccount}
          accountToEdit={editingAccount}
          accounts={accounts}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
```

### Section 4.2: Account List Component

**File**: `components/AccountList.tsx`

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, accountTypeTranslations, accountClassificationTranslations, accountNatureTranslations } from '../i18n/enumTranslations';
import { getBilingualText } from '../utils/bilingual';

const AccountList: React.FC<AccountListProps> = (props) => {
  const { t, language } = useTranslation();

  const renderAccountRow = (account: Account, isParent: boolean = false) => {
    const balance = accountBalances[account.id] || 0;
    const displayBalance = account.nature === AccountNature.CREDIT ? -balance : balance;
    const hasTransactions = accountsWithTransactions.has(account.id);
    const isAdmin = currentUser?.role === 'admin';

    const canEdit = isAdmin || !isParent;
    const canToggleStatus = isAdmin || !isParent;
    const canDelete = (isAdmin || !isParent) && !hasTransactions;

    // Get bilingual name
    const accountName = getBilingualText(account.name, account.nameEn, language);

    return (
      <tr key={account.id} className={isParent ? "bg-gray-800 hover:bg-gray-700/50" : "..."}>
        <td className="p-3 text-text-secondary font-mono">{account.accountCode}</td>
        <td className={`p-3 font-medium ${isParent ? 'font-bold text-text-primary' : 'text-gray-300'}`}>
          {!isParent && <span className="text-gray-500 mr-2">—</span>}
          {accountName}
        </td>
        <td className="p-3 text-text-secondary">
          {translateEnum(account.classification, accountClassificationTranslations, language)}
        </td>
        <td className="p-3 text-text-secondary">
          {translateEnum(account.nature, accountNatureTranslations, language)}
        </td>
        <td className={`p-3 font-mono ${isParent ? 'font-bold text-accent' : 'text-gray-300'}`}>
          {formatCurrency(displayBalance)}
        </td>
        <td className="p-3">
          <span className={`px-2 py-1 text-xs rounded-full ${account.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {account.isActive ? t('accounts.status.active') : t('accounts.status.inactive')}
          </span>
        </td>
        <td className="p-3 text-left">
          <div className="flex items-center justify-end space-x-1 space-x-reverse">
            <button
              onClick={() => canEdit && onEdit(account)}
              disabled={!canEdit}
              className="..."
              aria-label={t('accounts.actions.edit')}
            >
              <EditIcon />
            </button>
            <button
              onClick={() => canToggleStatus && onToggleStatus(account)}
              disabled={!canToggleStatus}
              className="..."
              aria-label={account.isActive ? t('accounts.actions.deactivate') : t('accounts.actions.activate')}
            >
              {account.isActive ? <ToggleOffIcon /> : <ToggleOnIcon />}
            </button>
            <button
              onClick={() => canDelete && onDelete(account)}
              disabled={!canDelete}
              className="..."
              aria-label={t('accounts.actions.delete')}
              title={hasTransactions ? t('accounts.messages.deleteError') : t('accounts.actions.delete')}
            >
              <DeleteIcon />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-surface rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-800">
          <tr>
            <th className="p-3 text-right">{t('accounts.table.columns.code')}</th>
            <th className="p-3 text-right">{t('accounts.table.columns.name')}</th>
            <th className="p-3 text-right">{t('accounts.table.columns.classification')}</th>
            <th className="p-3 text-right">{t('accounts.table.columns.nature')}</th>
            <th className="p-3 text-right">{t('accounts.table.columns.balance')}</th>
            <th className="p-3 text-right">{t('accounts.table.columns.status')}</th>
            <th className="p-3 text-right">{t('accounts.table.columns.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {parentAccounts.map(parent => (
            <React.Fragment key={parent.id}>
              {renderAccountRow(parent, true)}
              {getChildAccounts(parent.id).map(child => renderAccountRow(child, false))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### Section 4.3: Account Modal

**File**: `components/AccountModal.tsx`

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, accountTypeTranslations, accountClassificationTranslations, accountNatureTranslations } from '../i18n/enumTranslations';
import { getBilingualText } from '../utils/bilingual';

const AccountModal: React.FC<AccountModalProps> = (props) => {
  const { t, language } = useTranslation();

  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState(''); // NEW: English name
  const [accountCode, setAccountCode] = useState('');
  const [parentId, setParentId] = useState<string>('');
  // ... other state

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast.error(t('accounts.validation.nameRequired'));
      return;
    }

    if (!accountCode.trim()) {
      toast.error(t('accounts.validation.codeRequired'));
      return;
    }

    // ... more validation

    const accountData = {
      name: name.trim(),
      nameEn: nameEn.trim() || undefined, // NEW
      accountCode: accountCode.trim(),
      classification,
      nature,
      type,
      parentId: isMainAccount ? undefined : parentId,
      openingBalance: parsedOpeningBalance,
      // ...
    };

    onSave(accountToEdit ? { ...accountData, id: accountToEdit.id } : accountData);
    onClose();
  };

  if (!isOpen) return null;

  const modalTitle = accountToEdit
    ? t('accounts.form.title.edit')
    : t('accounts.form.title.create');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{modalTitle}</h2>
            <button onClick={onClose} className="...">
              <CloseIcon />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Account Code */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {t('accounts.form.accountCode')} *
              </label>
              <input
                type="text"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                required
                dir="ltr"
              />
            </div>

            {/* Account Name (Arabic) */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {t('accounts.form.accountNameArabic')} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                required
                dir="rtl"
              />
            </div>

            {/* Account Name (English) */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {t('accounts.form.accountNameEnglish')}
                <span className="text-text-secondary text-xs ml-2">({t('ui.optional')})</span>
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                dir="ltr"
                placeholder="Enter English name (optional)"
              />
            </div>

            {/* Parent Account (for sub-accounts) */}
            {!isMainAccount && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  {t('accounts.form.parentAccount')} *
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                  required
                >
                  <option value="">{t('accounts.form.selectParent')}</option>
                  {parentAccountOptions.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountCode} - {getBilingualText(acc.name, acc.nameEn, language)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Classification (Read-only for sub-accounts) */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {t('accounts.form.classification')} *
              </label>
              <select
                value={classification}
                onChange={(e) => setClassification(e.target.value as AccountClassification)}
                className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                required
                disabled={!isMainAccount || !!accountToEdit}
              >
                <option value="">{t('ui.select')}</option>
                {Object.values(AccountClassification).map(c => (
                  <option key={c} value={c}>
                    {translateEnum(c, accountClassificationTranslations, language)}
                  </option>
                ))}
              </select>
            </div>

            {/* Nature (Read-only for sub-accounts) */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {t('accounts.form.nature')} *
              </label>
              <select
                value={nature}
                onChange={(e) => setNature(e.target.value as AccountNature)}
                className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                required
                disabled={!isMainAccount || !!accountToEdit}
              >
                <option value="">{t('ui.select')}</option>
                {Object.values(AccountNature).map(n => (
                  <option key={n} value={n}>
                    {translateEnum(n, accountNatureTranslations, language)}
                  </option>
                ))}
              </select>
            </div>

            {/* Type (Read-only for sub-accounts) */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {t('accounts.form.type')} *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                required
                disabled={!isMainAccount || !!accountToEdit}
              >
                <option value="">{t('ui.select')}</option>
                {Object.values(AccountType).map(tp => (
                  <option key={tp} value={tp}>
                    {translateEnum(tp, accountTypeTranslations, language)}
                  </option>
                ))}
              </select>
            </div>

            {/* Opening Balance */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {t('accounts.form.openingBalance')}
              </label>
              <input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                dir="ltr"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg"
              >
                {t('actions.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
```

### ✅ Phase 4 Testing Checklist

**Accounts Page**:
- [ ] Title "Chart of Accounts" / "شجرة الحسابات" appears
- [ ] Search placeholder translated
- [ ] Filter buttons translated (All/Active/Inactive)
- [ ] "Create Account" button translated
- [ ] Table headers all translated
- [ ] Account names show in selected language (with fallback to Arabic)
- [ ] Classifications show translated (Assets, Liabilities, etc.)
- [ ] Natures show translated (Debit, Credit)
- [ ] Types show translated (Sales, Purchases, etc.)
- [ ] Status badges translated (Active/Inactive)
- [ ] Action buttons have correct tooltips in selected language

**Account Modal**:
- [ ] Modal title shows "Create Account" or "Edit Account"
- [ ] All form labels translated
- [ ] Both Arabic and English name fields appear
- [ ] English name field marked as "(Optional)"
- [ ] Parent account dropdown shows bilingual names
- [ ] Classification dropdown translated
- [ ] Nature dropdown translated
- [ ] Type dropdown translated
- [ ] Save/Cancel buttons translated
- [ ] Validation messages in selected language

**Creating Account**:
- [ ] Can create account with Arabic name only
- [ ] Can create account with both Arabic and English names
- [ ] English name persists to database
- [ ] Account list shows correct name based on language

**Switching Languages**:
- [ ] Account names update to show English when available
- [ ] Fall back to Arabic when English not available
- [ ] Enums (types, classifications, natures) update

---

## PHASE 5: TRANSACTIONS MANAGEMENT
**Duration**: 1 day
**Focus**: Transactions page, transaction forms, daily entry

### Section 5.1: Transactions Page

**File**: `pages/TransactionsPage.tsx`

**Translation Keys** (`locales/*/transactions.json`):
```json
{
  "title": "سجل الحركات",
  "subtitle": "عرض وإدارة جميع المعاملات المالية",
  "filters": {
    "dateRange": "نطاق التاريخ",
    "from": "من",
    "to": "إلى",
    "type": "نوع المعاملة",
    "allTypes": "جميع الأنواع",
    "account": "الحساب",
    "allAccounts": "جميع الحسابات",
    "search": "ابحث في الوصف...",
    "apply": "تطبيق",
    "clear": "مسح"
  },
  "actions": {
    "add": "إضافة معاملة",
    "edit": "تعديل",
    "delete": "حذف",
    "export": "تصدير",
    "import": "استيراد",
    "bulkEdit": "تحرير جماعي"
  },
  "list": {
    "columns": {
      "date": "التاريخ",
      "type": "النوع",
      "description": "الوصف",
      "amount": "المبلغ",
      "entries": "القيود",
      "actions": "الإجراءات"
    },
    "empty": "لا توجد معاملات",
    "showing": "عرض {count} من {total} معاملة"
  },
  "types": {
    "SALE": "بيع",
    "PURCHASE": "شراء",
    "EXPENSE": "صرف",
    "TRANSFER": "تحويل"
  },
  "messages": {
    "created": "تم إنشاء المعاملة بنجاح",
    "updated": "تم تحديث المعاملة بنجاح",
    "deleted": "تم حذف المعاملة بنجاح",
    "deleteConfirm": "هل تريد حذف هذه المعاملة؟",
    "bulkDeleteConfirm": "هل تريد حذف {count} معاملة؟"
  }
}
```

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, transactionTypeTranslations } from '../i18n/enumTranslations';
import { getBilingualText } from '../utils/bilingual';

const TransactionsPage: React.FC<TransactionsPageProps> = (props) => {
  const { t, language } = useTranslation();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('transactions.title')}</h1>
        <p className="text-text-secondary">{t('transactions.subtitle')}</p>
      </div>

      {/* Filters & Actions */}
      <div className="bg-surface p-4 rounded-lg mb-6">
        {/* Date Range Filter */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-2">{t('transactions.filters.from')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 bg-background border border-gray-600 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">{t('transactions.filters.to')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 bg-background border border-gray-600 rounded-lg"
            />
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm mb-2">{t('transactions.filters.type')}</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full p-2 bg-background border border-gray-600 rounded-lg"
            >
              <option value="">{t('transactions.filters.allTypes')}</option>
              {Object.values(TransactionType).map(type => (
                <option key={type} value={type}>
                  {translateEnum(type, transactionTypeTranslations, language)}
                </option>
              ))}
            </select>
          </div>

          {/* Account Filter */}
          <div>
            <label className="block text-sm mb-2">{t('transactions.filters.account')}</label>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full p-2 bg-background border border-gray-600 rounded-lg"
            >
              <option value="">{t('transactions.filters.allAccounts')}</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountCode} - {getBilingualText(acc.name, acc.nameEn, language)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder={t('transactions.filters.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-[200px] p-2 bg-background border border-gray-600 rounded-lg"
          />

          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg flex items-center"
          >
            <PlusIcon />
            {t('transactions.actions.add')}
          </button>

          <button className="...">
            {t('transactions.actions.export')}
          </button>
        </div>

        {/* Info Bar */}
        <div className="mt-4 text-sm text-text-secondary">
          {t('transactions.list.showing', {
            count: filteredTransactions.length,
            total: allTransactions.length
          })}
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-surface rounded-lg p-8 text-center text-text-secondary">
          {t('transactions.list.empty')}
        </div>
      ) : (
        <div className="bg-surface rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-3 text-right">{t('transactions.list.columns.date')}</th>
                <th className="p-3 text-right">{t('transactions.list.columns.type')}</th>
                <th className="p-3 text-right">{t('transactions.list.columns.description')}</th>
                <th className="p-3 text-right">{t('transactions.list.columns.amount')}</th>
                <th className="p-3 text-right">{t('transactions.list.columns.entries')}</th>
                <th className="p-3 text-right">{t('transactions.list.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                  <td className="p-3">
                    {new Date(tx.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded bg-primary/20 text-primary text-sm">
                      {translateEnum(tx.type, transactionTypeTranslations, language)}
                    </span>
                  </td>
                  <td className="p-3">{tx.description}</td>
                  <td className="p-3 font-mono">{formatCurrency(tx.totalAmount)}</td>
                  <td className="p-3 text-sm">
                    {tx.entries.map((entry, idx) => {
                      const account = accounts.find(a => a.id === entry.accountId);
                      return (
                        <div key={idx} className="text-text-secondary">
                          {account && getBilingualText(account.name, account.nameEn, language)}: {formatCurrency(entry.amount)}
                        </div>
                      );
                    })}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(tx)}
                        className="..."
                        title={t('transactions.actions.edit')}
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="..."
                        title={t('transactions.actions.delete')}
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction Modal */}
      {isTransactionModalOpen && (
        <TransactionForm
          isOpen={isTransactionModalOpen}
          onClose={() => { setIsTransactionModalOpen(false); setEditingTransaction(null); }}
          onSave={handleSaveTransaction}
          accounts={accounts}
          transactionToEdit={editingTransaction}
          openFinancialYear={openFinancialYear}
        />
      )}
    </div>
  );
};
```

### Section 5.2: Daily Entry Form

**File**: `components/DailyEntryForm.tsx`

**Translation Keys** (`locales/*/transactions.json` - add to existing):
```json
{
  "form": {
    "title": {
      "create": "إضافة معاملة جديدة",
      "edit": "تعديل معاملة"
    },
    "date": "التاريخ",
    "type": "نوع المعاملة",
    "description": "الوصف",
    "amount": "المبلغ",
    "fromAccount": "من حساب",
    "toAccount": "إلى حساب",
    "selectAccount": "اختر حساب",
    "salesAccount": "حساب المبيعات",
    "purchasesAccount": "حساب المشتريات",
    "expenseAccount": "حساب المصروفات",
    "paymentAccount": "حساب الدفع",
    "receiptAccount": "حساب القبض",
    "notes": "ملاحظات",
    "addEntry": "إضافة قيد",
    "removeEntry": "حذف قيد",
    "entries": "القيود",
    "debit": "مدين",
    "credit": "دائن",
    "total": "الإجمالي",
    "balance": "التوازن"
  },
  "validation": {
    "dateRequired": "التاريخ مطلوب",
    "typeRequired": "نوع المعاملة مطلوب",
    "amountRequired": "المبلغ مطلوب",
    "amountPositive": "المبلغ يجب أن يكون أكبر من صفر",
    "accountRequired": "الحساب مطلوب",
    "descriptionRequired": "الوصف مطلوب",
    "entriesRequired": "يجب إضافة قيد واحد على الأقل",
    "entriesBalanced": "مجموع المدين يجب أن يساوي مجموع الدائن",
    "duplicateAccount": "لا يمكن اختيار نفس الحساب مرتين"
  }
}
```

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, transactionTypeTranslations } from '../i18n/enumTranslations';
import { getBilingualText } from '../utils/bilingual';

const DailyEntryForm: React.FC<DailyEntryFormProps> = (props) => {
  const { t, language } = useTranslation();

  // ... state

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!selectedType) {
      toast.error(t('transactions.validation.typeRequired'));
      return;
    }

    if (!amount || amount <= 0) {
      toast.error(t('transactions.validation.amountPositive'));
      return;
    }

    if (!description.trim()) {
      toast.error(t('transactions.validation.descriptionRequired'));
      return;
    }

    // ... more validation

    const transactionData = {
      type: selectedType,
      description: description.trim(),
      totalAmount: amount,
      entries: entries,
      date: selectedDate.toISOString(),
      // ...
    };

    onSave(transactionToEdit ? { ...transactionData, id: transactionToEdit.id } : transactionData);
    onClose();
  };

  if (!isOpen) return null;

  const modalTitle = transactionToEdit
    ? t('transactions.form.title.edit')
    : t('transactions.form.title.create');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{modalTitle}</h2>
            <button onClick={onClose} className="...">
              <CloseIcon />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Date */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {t('transactions.form.date')} *
              </label>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                required
              />
            </div>

            {/* Transaction Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {t('transactions.form.type')} *
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as TransactionType)}
                className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                required
              >
                <option value="">{t('ui.select')}</option>
                {Object.values(TransactionType).map(type => (
                  <option key={type} value={type}>
                    {translateEnum(type, transactionTypeTranslations, language)}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {t('transactions.form.description')} *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                required
              />
            </div>

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                {t('transactions.form.amount')} *
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                required
                dir="ltr"
              />
            </div>

            {/* Account Selections (depends on type) */}
            {selectedType === TransactionType.SALE && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    {t('transactions.form.salesAccount')} *
                  </label>
                  <select
                    value={creditAccountId}
                    onChange={(e) => setCreditAccountId(e.target.value)}
                    className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                    required
                  >
                    <option value="">{t('transactions.form.selectAccount')}</option>
                    {salesAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountCode} - {getBilingualText(acc.name, acc.nameEn, language)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    {t('transactions.form.receiptAccount')} *
                  </label>
                  <select
                    value={debitAccountId}
                    onChange={(e) => setDebitAccountId(e.target.value)}
                    className="w-full p-2 bg-background border border-gray-600 rounded-lg"
                    required
                  >
                    <option value="">{t('transactions.form.selectAccount')}</option>
                    {cashBankAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountCode} - {getBilingualText(acc.name, acc.nameEn, language)}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Similar for PURCHASE, EXPENSE, etc. */}

            {/* Buttons */}
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg"
              >
                {t('actions.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary hover:bg-primary-dark rounded-lg"
              >
                {t('actions.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
```

### ✅ Phase 5 Testing Checklist

**Transactions Page**:
- [ ] Title "Transactions" / "سجل الحركات" appears
- [ ] Date range filter labels translated
- [ ] Type filter dropdown shows translated types
- [ ] Account filter shows bilingual account names
- [ ] Search placeholder translated
- [ ] "Add Transaction" button translated
- [ ] Table headers translated
- [ ] Transaction types in table show in selected language
- [ ] Account names in entries show in selected language
- [ ] Dates format correctly for selected language
- [ ] Empty state message translated

**Daily Entry Form**:
- [ ] Modal title shows "Add Transaction" or "Edit Transaction"
- [ ] All form labels translated
- [ ] Transaction type dropdown translated
- [ ] Account dropdowns show bilingual names
- [ ] Validation messages in selected language
- [ ] Save/Cancel buttons translated

**Creating Transactions**:
- [ ] Can create sale transaction
- [ ] Can create purchase transaction
- [ ] Can create expense transaction
- [ ] Transaction appears in list with correct translations

---

## PHASE 6: FINANCIAL YEARS & STOCK
**Duration**: 1 day
**Focus**: Financial year management, stock transitions, closing procedures

### Section 6.1: Financial Year Management Page

**File**: `pages/FinancialYearManagementPage.tsx`

**Translation Keys** (`locales/*/financialYears.json`):
```json
{
  "title": "إدارة السنوات المالية",
  "subtitle": "إنشاء وإدارة السنوات المالية وإغلاق الحسابات",
  "list": {
    "title": "السنوات المالية",
    "columns": {
      "name": "اسم السنة",
      "period": "الفترة",
      "status": "الحالة",
      "openingStock": "مخزون أول المدة",
      "closingStock": "مخزون آخر المدة",
      "actions": "الإجراءات"
    },
    "empty": "لا توجد سنوات مالية"
  },
  "status": {
    "open": "مفتوحة",
    "closed": "مغلقة"
  },
  "actions": {
    "create": "إنشاء سنة مالية",
    "edit": "تعديل",
    "close": "إغلاق السنة",
    "viewReport": "عرض التقرير",
    "transition": "نقل المخزون"
  },
  "form": {
    "title": {
      "create": "إنشاء سنة مالية جديدة",
      "edit": "تعديل سنة مالية"
    },
    "name": "اسم السنة المالية",
    "startDate": "تاريخ البداية",
    "endDate": "تاريخ النهاية",
    "openingStockValue": "قيمة مخزون أول المدة",
    "closingStockValue": "قيمة مخزون آخر المدة",
    "notes": "ملاحظات"
  },
  "messages": {
    "created": "تم إنشاء السنة المالية بنجاح",
    "updated": "تم تحديث السنة المالية بنجاح",
    "closed": "تم إغلاق السنة المالية بنجاح",
    "closeConfirm": "هل تريد إغلاق هذه السنة المالية؟ لا يمكن التراجع عن هذا الإجراء",
    "closeWarning": "سيتم إنشاء حسابات مخزون آخر المدة وبداية المدة للسنة القادمة",
    "alreadyOpen": "يوجد سنة مالية مفتوحة بالفعل",
    "cannotEdit": "لا يمكن تعديل سنة مالية مغلقة"
  },
  "validation": {
    "nameRequired": "اسم السنة المالية مطلوب",
    "startDateRequired": "تاريخ البداية مطلوب",
    "endDateRequired": "تاريخ النهاية مطلوب",
    "endAfterStart": "تاريخ النهاية يجب أن يكون بعد تاريخ البداية",
    "openingStockRequired": "قيمة مخزون أول المدة مطلوبة",
    "closingStockRequired": "قيمة مخزون آخر المدة مطلوبة لإغلاق السنة"
  },
  "stockTransition": {
    "title": "نقل المخزون",
    "description": "نقل مخزون آخر المدة إلى بداية المدة للسنة القادمة",
    "fromYear": "من السنة",
    "toYear": "إلى السنة",
    "closingValue": "قيمة المخزون",
    "execute": "تنفيذ النقل",
    "success": "تم نقل المخزون بنجاح",
    "confirm": "هل تريد نقل المخزون من {fromYear} إلى {toYear}؟"
  }
}
```

**Changes to FinancialYearManagementPage.tsx**:
```typescript
import { useTranslation } from '../i18n/useTranslation';

const FinancialYearManagementPage: React.FC<FinancialYearManagementPageProps> = (props) => {
  const { t, language } = useTranslation();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('financialYears.title')}</h1>
        <p className="text-text-secondary">{t('financialYears.subtitle')}</p>
      </div>

      {/* Actions */}
      <div className="mb-6">
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg flex items-center"
        >
          <PlusIcon />
          {t('financialYears.actions.create')}
        </button>
      </div>

      {/* Financial Years List */}
      <div className="bg-surface rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-3 text-right">{t('financialYears.list.columns.name')}</th>
              <th className="p-3 text-right">{t('financialYears.list.columns.period')}</th>
              <th className="p-3 text-right">{t('financialYears.list.columns.status')}</th>
              <th className="p-3 text-right">{t('financialYears.list.columns.openingStock')}</th>
              <th className="p-3 text-right">{t('financialYears.list.columns.closingStock')}</th>
              <th className="p-3 text-right">{t('financialYears.list.columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {financialYears.map(fy => (
              <tr key={fy.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                <td className="p-3 font-medium">{fy.name}</td>
                <td className="p-3">
                  {new Date(fy.startDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                  {' - '}
                  {new Date(fy.endDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${fy.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {t(`financialYears.status.${fy.status}`)}
                  </span>
                </td>
                <td className="p-3 font-mono">{formatCurrency(fy.openingStockValue)}</td>
                <td className="p-3 font-mono">
                  {fy.closingStockValue ? formatCurrency(fy.closingStockValue) : '-'}
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {fy.status === 'open' && (
                      <button
                        onClick={() => handleClose(fy)}
                        className="text-yellow-400 hover:text-yellow-300"
                        title={t('financialYears.actions.close')}
                      >
                        <CloseIcon />
                      </button>
                    )}
                    <button
                      onClick={() => handleViewReport(fy)}
                      className="text-accent hover:text-blue-400"
                      title={t('financialYears.actions.viewReport')}
                    >
                      <ReportIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {financialYears.length === 0 && (
          <div className="p-8 text-center text-text-secondary">
            {t('financialYears.list.empty')}
          </div>
        )}
      </div>

      {/* Modals */}
      {isModalOpen && (
        <FinancialYearModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          yearToEdit={editingYear}
        />
      )}

      {isStockTransitionOpen && (
        <StockTransitionModal
          isOpen={isStockTransitionOpen}
          onClose={() => setIsStockTransitionOpen(false)}
          fromYear={closingYear}
          toYear={nextYear}
          onExecute={handleStockTransition}
        />
      )}
    </div>
  );
};
```

### Section 6.2: Stock Transition Modal

**File**: `components/StockTransitionModal.tsx`

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';

const StockTransitionModal: React.FC<StockTransitionModalProps> = (props) => {
  const { t, language } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg max-w-lg w-full p-6">
        <h2 className="text-2xl font-bold mb-4">{t('financialYears.stockTransition.title')}</h2>

        <p className="text-text-secondary mb-6">
          {t('financialYears.stockTransition.description')}
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm mb-2">{t('financialYears.stockTransition.fromYear')}</label>
            <input type="text" value={fromYear.name} disabled className="..." />
          </div>

          <div>
            <label className="block text-sm mb-2">{t('financialYears.stockTransition.toYear')}</label>
            <input type="text" value={toYear.name} disabled className="..." />
          </div>

          <div>
            <label className="block text-sm mb-2">{t('financialYears.stockTransition.closingValue')}</label>
            <input
              type="number"
              value={closingStockValue}
              onChange={(e) => setClosingStockValue(parseFloat(e.target.value))}
              className="..."
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="...">
            {t('actions.cancel')}
          </button>
          <button onClick={handleExecute} className="...">
            {t('financialYears.stockTransition.execute')}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### ✅ Phase 6 Testing Checklist

**Financial Years Page**:
- [ ] Title "Financial Year Management" translated
- [ ] Table headers translated
- [ ] Status badges show "Open" / "Closed" in selected language
- [ ] Dates format correctly
- [ ] Action buttons have correct labels
- [ ] Empty state message translated

**Creating Financial Year**:
- [ ] Modal title translated
- [ ] All form labels translated
- [ ] Validation messages in selected language
- [ ] Success message translated

**Stock Transition**:
- [ ] Modal title translated
- [ ] All fields labeled correctly
- [ ] Execute button translated
- [ ] Confirmation message translated

---

## PHASE 7: REPORTS & STATEMENTS
**Duration**: 1 day
**Focus**: Statement page, trial balance, profit/loss reports

### Section 7.1: Statement Page

**File**: `pages/StatementPage.tsx`

**Translation Keys** (`locales/*/statements.json`):
```json
{
  "title": "كشف الحساب",
  "subtitle": "عرض كشف حساب تفصيلي لأي حساب",
  "selectAccount": {
    "label": "اختر الحساب",
    "placeholder": "ابحث عن حساب...",
    "all": "جميع الحسابات"
  },
  "dateRange": {
    "label": "الفترة",
    "from": "من",
    "to": "إلى",
    "thisMonth": "هذا الشهر",
    "thisYear": "هذا العام",
    "custom": "مخصص"
  },
  "table": {
    "columns": {
      "date": "التاريخ",
      "description": "البيان",
      "reference": "المرجع",
      "debit": "مدين",
      "credit": "دائن",
      "balance": "الرصيد"
    }
  },
  "summary": {
    "title": "ملخص الحساب",
    "openingBalance": "الرصيد الافتتاحي",
    "totalDebits": "إجمالي المدين",
    "totalCredits": "إجمالي الدائن",
    "closingBalance": "الرصيد الختامي",
    "periodMovement": "الحركة خلال الفترة"
  },
  "actions": {
    "print": "طباعة",
    "export": "تصدير",
    "email": "إرسال بالبريد"
  },
  "messages": {
    "noAccount": "يرجى اختيار حساب",
    "noTransactions": "لا توجد حركات خلال هذه الفترة"
  }
}
```

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import { getBilingualText } from '../utils/bilingual';

const StatementPage: React.FC<StatementPageProps> = (props) => {
  const { t, language } = useTranslation();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('statements.title')}</h1>
        <p className="text-text-secondary">{t('statements.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="bg-surface p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Account Selection */}
          <div>
            <label className="block text-sm mb-2">{t('statements.selectAccount.label')}</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full p-2 bg-background border border-gray-600 rounded-lg"
            >
              <option value="">{t('statements.selectAccount.placeholder')}</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.accountCode} - {getBilingualText(acc.name, acc.nameEn, language)}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm mb-2">{t('statements.dateRange.from')}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 bg-background border border-gray-600 rounded-lg"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm mb-2">{t('statements.dateRange.to')}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 bg-background border border-gray-600 rounded-lg"
            />
          </div>
        </div>

        {/* Quick Date Filters */}
        <div className="flex gap-2 mt-4">
          <button onClick={() => setDateRange('thisMonth')} className="...">
            {t('statements.dateRange.thisMonth')}
          </button>
          <button onClick={() => setDateRange('thisYear')} className="...">
            {t('statements.dateRange.thisYear')}
          </button>
        </div>
      </div>

      {selectedAccount ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface p-4 rounded-lg">
              <h3 className="text-sm text-text-secondary mb-2">
                {t('statements.summary.openingBalance')}
              </h3>
              <p className="text-2xl font-bold">{formatCurrency(openingBalance)}</p>
            </div>

            <div className="bg-surface p-4 rounded-lg">
              <h3 className="text-sm text-text-secondary mb-2">
                {t('statements.summary.totalDebits')}
              </h3>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(totalDebits)}</p>
            </div>

            <div className="bg-surface p-4 rounded-lg">
              <h3 className="text-sm text-text-secondary mb-2">
                {t('statements.summary.totalCredits')}
              </h3>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(totalCredits)}</p>
            </div>

            <div className="bg-surface p-4 rounded-lg">
              <h3 className="text-sm text-text-secondary mb-2">
                {t('statements.summary.closingBalance')}
              </h3>
              <p className="text-2xl font-bold text-accent">{formatCurrency(closingBalance)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button onClick={handlePrint} className="...">
              <PrintIcon />
              {t('statements.actions.print')}
            </button>
            <button onClick={handleExport} className="...">
              <ExportIcon />
              {t('statements.actions.export')}
            </button>
          </div>

          {/* Statement Table */}
          <div className="bg-surface rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-3 text-right">{t('statements.table.columns.date')}</th>
                  <th className="p-3 text-right">{t('statements.table.columns.description')}</th>
                  <th className="p-3 text-right">{t('statements.table.columns.debit')}</th>
                  <th className="p-3 text-right">{t('statements.table.columns.credit')}</th>
                  <th className="p-3 text-right">{t('statements.table.columns.balance')}</th>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance Row */}
                <tr className="bg-gray-800/50 font-bold">
                  <td className="p-3">-</td>
                  <td className="p-3">{t('statements.summary.openingBalance')}</td>
                  <td className="p-3">-</td>
                  <td className="p-3">-</td>
                  <td className="p-3 font-mono">{formatCurrency(openingBalance)}</td>
                </tr>

                {/* Transaction Rows */}
                {statementEntries.map((entry, idx) => (
                  <tr key={idx} className="border-b border-gray-700 hover:bg-gray-800/30">
                    <td className="p-3">
                      {new Date(entry.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                    <td className="p-3">{entry.description}</td>
                    <td className="p-3 font-mono text-green-400">
                      {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                    </td>
                    <td className="p-3 font-mono text-red-400">
                      {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                    </td>
                    <td className="p-3 font-mono font-bold">{formatCurrency(entry.balance)}</td>
                  </tr>
                ))}

                {/* Closing Balance Row */}
                <tr className="bg-gray-800/50 font-bold">
                  <td className="p-3">-</td>
                  <td className="p-3">{t('statements.summary.closingBalance')}</td>
                  <td className="p-3 font-mono text-green-400">{formatCurrency(totalDebits)}</td>
                  <td className="p-3 font-mono text-red-400">{formatCurrency(totalCredits)}</td>
                  <td className="p-3 font-mono">{formatCurrency(closingBalance)}</td>
                </tr>
              </tbody>
            </table>

            {statementEntries.length === 0 && (
              <div className="p-8 text-center text-text-secondary">
                {t('statements.messages.noTransactions')}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-surface rounded-lg p-8 text-center text-text-secondary">
          {t('statements.messages.noAccount')}
        </div>
      )}
    </div>
  );
};
```

### Section 7.2: Report Components

**Files to Update**:
- `components/ReportBuilder.tsx` - Custom report builder
- `components/StockContinuityReport.tsx` - Stock continuity
- `components/MultiDimensionalProfitReport.tsx` - Profit reports
- `components/MultiShopProfitComparison.tsx` - Shop comparison

**Translation Keys** (`locales/*/reports.json`):
```json
{
  "title": "التقارير",
  "types": {
    "trialBalance": "ميزان المراجعة",
    "profitLoss": "قائمة الدخل",
    "balanceSheet": "الميزانية العمومية",
    "stockContinuity": "استمرارية المخزون",
    "shopComparison": "مقارنة المتاجر",
    "custom": "تقرير مخصص"
  },
  "builder": {
    "title": "منشئ التقارير",
    "selectFields": "اختر الحقول",
    "addFilter": "إضافة تصفية",
    "groupBy": "تجميع حسب",
    "sortBy": "ترتيب حسب",
    "preview": "معاينة",
    "generate": "إنشاء التقرير"
  },
  "filters": {
    "dateRange": "نطاق التاريخ",
    "shop": "المتجر",
    "account": "الحساب",
    "transactionType": "نوع المعاملة"
  },
  "columns": {
    "add": "إضافة عمود",
    "remove": "حذف عمود",
    "reorder": "إعادة الترتيب",
    "customize": "تخصيص"
  },
  "export": {
    "pdf": "تصدير PDF",
    "excel": "تصدير Excel",
    "csv": "تصدير CSV",
    "print": "طباعة"
  }
}
```

### ✅ Phase 7 Testing Checklist

**Statement Page**:
- [ ] Title "Account Statement" translated
- [ ] Account dropdown shows bilingual names
- [ ] Date range labels translated
- [ ] Quick date filters translated
- [ ] Summary cards translated
- [ ] Table headers translated
- [ ] Opening/closing balance rows translated
- [ ] Dates format correctly
- [ ] Print/Export buttons translated
- [ ] Empty states translated

**Reports**:
- [ ] Report type names translated
- [ ] Report builder UI translated
- [ ] Filter labels translated
- [ ] Column headers translated
- [ ] Export options translated

---

## PHASE 8: ANALYTICS & DASHBOARDS
**Duration**: 0.5 day
**Focus**: Analytics page, executive dashboard, charts

### Section 8.1: Analytics Page

**File**: `pages/AnalyticsPage.tsx` (Admin) and `pages/UserAnalyticsPage.tsx` (User)

**Translation Keys** (`locales/*/analytics.json`):
```json
{
  "title": "التحليلات",
  "subtitle": "تحليل الأداء المالي والتوجهات",
  "periods": {
    "7days": "آخر 7 أيام",
    "30days": "آخر 30 يوم",
    "90days": "آخر 90 يوم",
    "1year": "آخر سنة",
    "custom": "مخصص"
  },
  "charts": {
    "revenue": "الإيرادات",
    "expenses": "المصروفات",
    "profit": "الربح",
    "trend": "الاتجاه",
    "breakdown": "التوزيع",
    "comparison": "المقارنة"
  },
  "metrics": {
    "totalRevenue": "إجمالي الإيرادات",
    "totalExpenses": "إجمالي المصروفات",
    "netProfit": "صافي الربح",
    "profitMargin": "هامش الربح",
    "growth": "النمو",
    "avgTransaction": "متوسط المعاملة"
  },
  "insights": {
    "title": "الرؤى",
    "positive": "إيجابي",
    "warning": "تحذير",
    "critical": "حرج",
    "noInsights": "لا توجد رؤى متاحة"
  },
  "filters": {
    "shop": "المتجر",
    "allShops": "جميع المتاجر",
    "period": "الفترة",
    "metric": "المقياس"
  }
}
```

**Changes**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import { getBilingualText } from '../utils/bilingual';

const AnalyticsPage: React.FC<AnalyticsPageProps> = (props) => {
  const { t, language } = useTranslation();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('analytics.title')}</h1>
        <p className="text-text-secondary">{t('analytics.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="bg-surface p-4 rounded-lg mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Shop Filter (Admin only) */}
          {isAdmin && (
            <div>
              <label className="block text-sm mb-2">{t('analytics.filters.shop')}</label>
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="p-2 bg-background border border-gray-600 rounded-lg"
              >
                <option value="">{t('analytics.filters.allShops')}</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>
                    {getBilingualText(shop.name, shop.nameEn, language)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Period Filter */}
          <div>
            <label className="block text-sm mb-2">{t('analytics.filters.period')}</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="p-2 bg-background border border-gray-600 rounded-lg"
            >
              <option value="7days">{t('analytics.periods.7days')}</option>
              <option value="30days">{t('analytics.periods.30days')}</option>
              <option value="90days">{t('analytics.periods.90days')}</option>
              <option value="1year">{t('analytics.periods.1year')}</option>
              <option value="custom">{t('analytics.periods.custom')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface p-4 rounded-lg">
          <h3 className="text-sm text-text-secondary mb-2">
            {t('analytics.metrics.totalRevenue')}
          </h3>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-text-secondary mt-1">
            {growth > 0 ? '↑' : '↓'} {Math.abs(growth)}% {t('analytics.metrics.growth')}
          </p>
        </div>

        <div className="bg-surface p-4 rounded-lg">
          <h3 className="text-sm text-text-secondary mb-2">
            {t('analytics.metrics.totalExpenses')}
          </h3>
          <p className="text-2xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
        </div>

        <div className="bg-surface p-4 rounded-lg">
          <h3 className="text-sm text-text-secondary mb-2">
            {t('analytics.metrics.netProfit')}
          </h3>
          <p className="text-2xl font-bold text-accent">{formatCurrency(netProfit)}</p>
        </div>

        <div className="bg-surface p-4 rounded-lg">
          <h3 className="text-sm text-text-secondary mb-2">
            {t('analytics.metrics.profitMargin')}
          </h3>
          <p className="text-2xl font-bold">{profitMargin.toFixed(1)}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue Trend Chart */}
        <div className="bg-surface p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-4">{t('analytics.charts.revenue')} - {t('analytics.charts.trend')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              {/* Chart configuration */}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-surface p-4 rounded-lg">
          <h3 className="text-lg font-bold mb-4">{t('analytics.charts.expenses')} - {t('analytics.charts.breakdown')}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart data={expenseBreakdown}>
              {/* Chart configuration */}
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-surface rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">{t('analytics.insights.title')}</h2>

        {insights.length > 0 ? (
          <div className="space-y-3">
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg ${
                  insight.type === 'positive' ? 'bg-green-500/10 text-green-400' :
                  insight.type === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-red-500/10 text-red-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold">{t(`analytics.insights.${insight.type}`)}</span>
                  <span>•</span>
                  <span>{insight.message}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary text-center py-4">
            {t('analytics.insights.noInsights')}
          </p>
        )}
      </div>
    </div>
  );
};
```

### Section 8.2: Executive Dashboard

**File**: `pages/ExecutiveDashboard.tsx`

Similar approach with comprehensive translations for all dashboard widgets, KPIs, and charts.

### ✅ Phase 8 Testing Checklist

**Analytics Page (Admin)**:
- [ ] Title and subtitle translated
- [ ] Shop filter shows bilingual names
- [ ] Period filter options translated
- [ ] All metric labels translated
- [ ] Chart titles translated
- [ ] Insight types translated (Positive/Warning/Critical)
- [ ] Empty states translated

**Analytics Page (User)**:
- [ ] Same as admin (without shop filter)

---

## PHASE 9: ADMIN FEATURES (SETTINGS & MANAGEMENT)
**Duration**: 1 day
**Focus**: Shop management, user management, settings

### Section 9.1: Shop Management

**File**: `pages/ShopManagementPage.tsx`

**Translation Keys** (`locales/*/shops.json`):
```json
{
  "title": "إدارة المتاجر",
  "subtitle": "إدارة المتاجر وحساباتها",
  "list": {
    "columns": {
      "code": "الرمز",
      "name": "اسم المتجر",
      "nameArabic": "الاسم بالعربي",
      "nameEnglish": "الاسم بالإنجليزي",
      "description": "الوصف",
      "status": "الحالة",
      "actions": "الإجراءات"
    },
    "empty": "لا توجد متاجر"
  },
  "actions": {
    "create": "إنشاء متجر",
    "edit": "تعديل",
    "delete": "حذف",
    "activate": "تفعيل",
    "deactivate": "إلغاء التفعيل",
    "viewAccounts": "عرض الحسابات",
    "viewStats": "عرض الإحصائيات"
  },
  "form": {
    "title": {
      "create": "إنشاء متجر جديد",
      "edit": "تعديل متجر"
    },
    "shopCode": "رمز المتجر",
    "nameArabic": "اسم المتجر (عربي)",
    "nameEnglish": "اسم المتجر (إنجليزي)",
    "descriptionArabic": "الوصف (عربي)",
    "descriptionEnglish": "الوصف (إنجليزي)",
    "address": "العنوان",
    "contactPhone": "رقم الهاتف",
    "contactEmail": "البريد الإلكتروني",
    "businessType": "نوع النشاط",
    "openingStockValue": "قيمة المخزون الافتتاحي"
  },
  "messages": {
    "created": "تم إنشاء المتجر بنجاح",
    "updated": "تم تحديث المتجر بنجاح",
    "deleted": "تم حذف المتجر بنجاح",
    "deleteConfirm": "هل تريد حذف هذا المتجر؟ سيتم حذف جميع البيانات المرتبطة به",
    "cannotDelete": "لا يمكن حذف متجر يحتوي على بيانات"
  },
  "validation": {
    "codeRequired": "رمز المتجر مطلوب",
    "nameRequired": "اسم المتجر (عربي) مطلوب",
    "descriptionRequired": "الوصف (عربي) مطلوب"
  }
}
```

**Changes to ShopModal.tsx**:
```typescript
import { useTranslation } from '../i18n/useTranslation';

const ShopModal: React.FC<ShopModalProps> = (props) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: '',
    nameEn: '',  // NEW
    shopCode: '',
    description: '',
    descriptionEn: '',  // NEW
    // ... other fields
  });

  return (
    <div className="...">
      <form onSubmit={handleSubmit}>
        {/* Shop Code */}
        <div className="mb-4">
          <label>{t('shops.form.shopCode')} *</label>
          <input
            value={formData.shopCode}
            onChange={(e) => setFormData({...formData, shopCode: e.target.value})}
            required
            dir="ltr"
          />
        </div>

        {/* Name (Arabic) */}
        <div className="mb-4">
          <label>{t('shops.form.nameArabic')} *</label>
          <input
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
            dir="rtl"
          />
        </div>

        {/* Name (English) */}
        <div className="mb-4">
          <label>
            {t('shops.form.nameEnglish')}
            <span className="text-xs text-text-secondary ml-2">({t('ui.optional')})</span>
          </label>
          <input
            value={formData.nameEn}
            onChange={(e) => setFormData({...formData, nameEn: e.target.value})}
            dir="ltr"
            placeholder="Enter English name (optional)"
          />
        </div>

        {/* Description (Arabic) */}
        <div className="mb-4">
          <label>{t('shops.form.descriptionArabic')} *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            required
            dir="rtl"
          />
        </div>

        {/* Description (English) */}
        <div className="mb-4">
          <label>
            {t('shops.form.descriptionEnglish')}
            <span className="text-xs text-text-secondary ml-2">({t('ui.optional')})</span>
          </label>
          <textarea
            value={formData.descriptionEn}
            onChange={(e) => setFormData({...formData, descriptionEn: e.target.value})}
            dir="ltr"
            placeholder="Enter English description (optional)"
          />
        </div>

        {/* Other fields... */}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose}>{t('actions.cancel')}</button>
          <button type="submit">{t('actions.save')}</button>
        </div>
      </form>
    </div>
  );
};
```

### Section 9.2: User Management

**File**: `pages/UserManagementPage.tsx`

**Translation Keys** (`locales/*/users.json`):
```json
{
  "title": "إدارة المستخدمين",
  "subtitle": "إدارة حسابات المستخدمين والصلاحيات",
  "list": {
    "columns": {
      "name": "الاسم",
      "email": "البريد الإلكتروني",
      "role": "الدور",
      "shop": "المتجر",
      "status": "الحالة",
      "actions": "الإجراءات"
    },
    "empty": "لا يوجد مستخدمين"
  },
  "actions": {
    "create": "إضافة مستخدم",
    "edit": "تعديل",
    "delete": "حذف",
    "activate": "تفعيل",
    "deactivate": "إلغاء التفعيل",
    "resetPassword": "إعادة تعيين كلمة المرور"
  },
  "form": {
    "title": {
      "create": "إضافة مستخدم جديد",
      "edit": "تعديل مستخدم"
    },
    "name": "الاسم",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "confirmPassword": "تأكيد كلمة المرور",
    "shop": "المتجر المخصص",
    "selectShop": "اختر متجر"
  },
  "messages": {
    "created": "تم إضافة المستخدم بنجاح",
    "updated": "تم تحديث المستخدم بنجاح",
    "deleted": "تم حذف المستخدم بنجاح",
    "deleteConfirm": "هل تريد حذف هذا المستخدم؟",
    "activated": "تم تفعيل المستخدم",
    "deactivated": "تم إلغاء تفعيل المستخدم"
  },
  "validation": {
    "nameRequired": "الاسم مطلوب",
    "emailRequired": "البريد الإلكتروني مطلوب",
    "emailInvalid": "البريد الإلكتروني غير صالح",
    "emailExists": "هذا البريد الإلكتروني مستخدم بالفعل",
    "passwordRequired": "كلمة المرور مطلوبة",
    "passwordTooShort": "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    "passwordMismatch": "كلمات المرور غير متطابقة",
    "shopRequired": "يجب اختيار متجر للمستخدم"
  }
}
```

**Changes to UserModal.tsx**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import { getBilingualText } from '../utils/bilingual';

const UserModal: React.FC<UserModalProps> = (props) => {
  const { t, language } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(t('users.validation.nameRequired'));
      return;
    }

    if (!email.trim()) {
      setError(t('users.validation.emailRequired'));
      return;
    }

    if (!shopId) {
      setError(t('users.validation.shopRequired'));
      return;
    }

    if (!userToEdit) {
      if (!password.trim()) {
        setError(t('users.validation.passwordRequired'));
        return;
      }
      if (password.length < 6) {
        setError(t('users.validation.passwordTooShort'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('users.validation.passwordMismatch'));
        return;
      }
    }

    const isEmailTaken = allUsers.some(
      u => u.email.toLowerCase() === email.trim().toLowerCase() && u.id !== userToEdit?.id
    );

    if (isEmailTaken) {
      setError(t('users.validation.emailExists'));
      return;
    }

    // Save user...
  };

  const modalTitle = userToEdit
    ? t('users.form.title.edit')
    : t('users.form.title.create');

  return (
    <div className="...">
      <h2>{modalTitle}</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Name */}
        <div className="mb-4">
          <label>{t('users.form.name')} *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label>{t('users.form.email')} *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            dir="ltr"
          />
        </div>

        {/* Shop */}
        <div className="mb-4">
          <label>{t('users.form.shop')} *</label>
          <select
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
            required
          >
            <option value="">{t('users.form.selectShop')}</option>
            {shops.map(shop => (
              <option key={shop.id} value={shop.id}>
                {getBilingualText(shop.name, shop.nameEn, language)}
              </option>
            ))}
          </select>
        </div>

        {/* Password (for new users only) */}
        {!userToEdit && (
          <>
            <div className="mb-4">
              <label>{t('users.form.password')} *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>

            <div className="mb-4">
              <label>{t('users.form.confirmPassword')} *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>
          </>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose}>{t('actions.cancel')}</button>
          <button type="submit" disabled={isLoading}>
            {isLoading ? t('ui.loading') : t('actions.save')}
          </button>
        </div>
      </form>
    </div>
  );
};
```

### Section 9.3: Settings Page

**File**: `pages/SettingsPage.tsx`

**Translation Keys** (`locales/*/settings.json`):
```json
{
  "title": "الإعدادات",
  "tabs": {
    "shops": "إدارة المتاجر",
    "users": "إدارة المستخدمين",
    "financialYears": "السنوات المالية",
    "accounts": "شجرة الحسابات",
    "adminTools": "أدوات الإدارة"
  },
  "adminTools": {
    "title": "أدوات الإدارة",
    "backup": {
      "title": "النسخ الاحتياطي",
      "description": "إنشاء نسخة احتياطية من البيانات",
      "create": "إنشاء نسخة احتياطية",
      "restore": "استعادة نسخة احتياطية"
    },
    "maintenance": {
      "title": "الصيانة",
      "clearCache": "مسح ذاكرة التخزين المؤقت",
      "cleanupLogs": "تنظيف السجلات القديمة",
      "optimizeDatabase": "تحسين قاعدة البيانات"
    }
  }
}
```

### ✅ Phase 9 Testing Checklist

**Shop Management**:
- [ ] Page title translated
- [ ] Table headers translated
- [ ] Action buttons translated
- [ ] Create/Edit modal shows correct title
- [ ] Both Arabic and English name fields appear
- [ ] Both Arabic and English description fields appear
- [ ] Validation messages in selected language
- [ ] Shop names display in selected language throughout app

**User Management**:
- [ ] Page title translated
- [ ] Table headers translated
- [ ] Shop dropdown shows bilingual names
- [ ] Create/Edit modal translated
- [ ] Validation messages in selected language
- [ ] Success/error messages translated

**Settings Page**:
- [ ] Tab names translated
- [ ] Content within each tab translated

---

## PHASE 10: NOTIFICATIONS & LOGS
**Duration**: 0.5 day
**Focus**: Notifications page, logs page, notification system

### Section 10.1: Notifications Page

**File**: `pages/NotificationsPage.tsx`

**Translation Keys** (`locales/*/notifications.json`):
```json
{
  "title": "الإشعارات",
  "subtitle": "إشعارات النظام والتحديثات",
  "filters": {
    "all": "الكل",
    "unread": "غير المقروءة",
    "read": "المقروءة",
    "type": "النوع"
  },
  "actions": {
    "markAllRead": "تحديد الكل كمقروء",
    "deleteAll": "حذف الكل",
    "deleteSelected": "حذف المحدد",
    "refresh": "تحديث"
  },
  "list": {
    "empty": "لا توجد إشعارات",
    "noUnread": "لا توجد إشعارات غير مقروءة",
    "showing": "عرض {count} إشعار"
  },
  "item": {
    "delete": "حذف",
    "markRead": "تحديد كمقروء",
    "markUnread": "تحديد كغير مقروء"
  },
  "types": {
    "system": "نظام",
    "transaction": "معاملة",
    "user": "مستخدم",
    "shop": "متجر",
    "account": "حساب"
  },
  "messages": {
    "deleteConfirm": "هل تريد حذف هذا الإشعار؟",
    "deleteAllConfirm": "هل تريد حذف جميع الإشعارات؟",
    "markedRead": "تم تحديد الإشعارات كمقروءة",
    "deleted": "تم حذف الإشعارات"
  }
}
```

**Update Notification Types in types.ts**:
```typescript
// In types.ts - Update Notification interface
export interface Notification {
  id: string;
  userId: string;
  originatingUserId?: string;
  shopId?: string;
  logType?: LogType;
  message: string;           // Deprecated - kept for backwards compatibility
  messageKey?: string;       // NEW: Translation key
  messageParams?: Record<string, any>; // NEW: Parameters for translation
  messageAr?: string;        // NEW: Fallback Arabic
  messageEn?: string;        // NEW: Fallback English
  isRead: boolean;
  timestamp: string;
}
```

**Changes to NotificationsPage.tsx**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, logTypeTranslations } from '../i18n/enumTranslations';

const NotificationsPage: React.FC<NotificationsPageProps> = (props) => {
  const { t, language } = useTranslation();

  // Render notification message with translation
  const renderMessage = (notification: Notification) => {
    // If has messageKey, translate it
    if (notification.messageKey) {
      return t(notification.messageKey, notification.messageParams);
    }

    // Otherwise use stored message in current language
    if (language === 'en' && notification.messageEn) {
      return notification.messageEn;
    }

    return notification.messageAr || notification.message;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('notifications.title')}</h1>
        <p className="text-text-secondary">{t('notifications.subtitle')}</p>
      </div>

      {/* Filters & Actions */}
      <div className="bg-surface p-4 rounded-lg mb-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          {/* Filters */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded ${filter === 'all' ? 'bg-primary' : 'bg-background'}`}
            >
              {t('notifications.filters.all')}
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded ${filter === 'unread' ? 'bg-primary' : 'bg-background'}`}
            >
              {t('notifications.filters.unread')} ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-3 py-1 rounded ${filter === 'read' ? 'bg-primary' : 'bg-background'}`}
            >
              {t('notifications.filters.read')}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={handleMarkAllRead} className="...">
              {t('notifications.actions.markAllRead')}
            </button>
            <button onClick={handleDeleteAll} className="text-red-500...">
              {t('notifications.actions.deleteAll')}
            </button>
          </div>
        </div>

        {/* Count */}
        <p className="text-sm text-text-secondary mt-2">
          {t('notifications.list.showing', { count: filteredNotifications.length })}
        </p>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              className={`bg-surface p-4 rounded-lg ${!notification.isRead ? 'border-r-4 border-primary' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Notification Type Badge */}
                  {notification.logType && (
                    <span className="inline-block px-2 py-1 text-xs rounded bg-primary/20 text-primary mb-2">
                      {translateEnum(notification.logType, logTypeTranslations, language)}
                    </span>
                  )}

                  {/* Message */}
                  <p className="text-text-primary mb-2">
                    {renderMessage(notification)}
                  </p>

                  {/* Timestamp */}
                  <p className="text-xs text-text-secondary">
                    {new Date(notification.timestamp).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleToggleRead(notification)}
                    className="text-accent hover:text-blue-400"
                    title={notification.isRead ? t('notifications.item.markUnread') : t('notifications.item.markRead')}
                  >
                    {notification.isRead ? <UnreadIcon /> : <ReadIcon />}
                  </button>
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="text-red-500 hover:text-red-400"
                    title={t('notifications.item.delete')}
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-surface rounded-lg p-8 text-center text-text-secondary">
            {filter === 'unread' ? t('notifications.list.noUnread') : t('notifications.list.empty')}
          </div>
        )}
      </div>
    </div>
  );
};
```

### Section 10.2: Logs Page

**File**: `pages/LogsPage.tsx` and `pages/ShopLogsPage.tsx`

**Translation Keys** (`locales/*/logs.json`):
```json
{
  "title": "سجلات النظام",
  "shopLogsTitle": "سجلات المتاجر",
  "subtitle": "عرض سجل جميع الأنشطة في النظام",
  "filters": {
    "type": "النوع",
    "allTypes": "جميع الأنواع",
    "user": "المستخدم",
    "allUsers": "جميع المستخدمين",
    "shop": "المتجر",
    "allShops": "جميع المتاجر",
    "dateRange": "الفترة",
    "search": "ابحث في السجلات..."
  },
  "list": {
    "columns": {
      "timestamp": "التوقيت",
      "user": "المستخدم",
      "shop": "المتجر",
      "type": "النوع",
      "message": "الرسالة"
    },
    "empty": "لا توجد سجلات",
    "showing": "عرض {count} من {total} سجل"
  },
  "actions": {
    "export": "تصدير",
    "clear": "مسح السجلات القديمة",
    "refresh": "تحديث"
  },
  "types": {
    "LOGIN": "تسجيل دخول",
    "LOGOUT": "تسجيل خروج",
    "SHOP_CREATED": "إنشاء متجر",
    "SHOP_UPDATED": "تحديث متجر",
    "SHOP_DELETED": "حذف متجر",
    "USER_CREATED": "إنشاء مستخدم",
    "USER_UPDATED": "تحديث مستخدم",
    "ACCOUNT_CREATED": "إنشاء حساب",
    "ACCOUNT_UPDATED": "تحديث حساب",
    "DELETE_ACCOUNT": "حذف حساب",
    "ADD_ENTRY": "إضافة قيد",
    "EDIT_ENTRY": "تعديل قيد",
    "DELETE_ENTRY": "حذف قيد",
    "FINANCIAL_YEAR_CREATED": "إنشاء سنة مالية",
    "FINANCIAL_YEAR_CLOSED": "إغلاق سنة مالية"
  },
  "messages": {
    "clearConfirm": "هل تريد حذف السجلات الأقدم من {days} يوم؟",
    "cleared": "تم حذف {count} سجل"
  }
}
```

**Changes to ShopLogsPage.tsx**:
```typescript
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, logTypeTranslations } from '../i18n/enumTranslations';
import { getBilingualText } from '../utils/bilingual';

const ShopLogsPage: React.FC<ShopLogsPageProps> = (props) => {
  const { t, language } = useTranslation();

  // Render log message with translation
  const renderMessage = (log: Log) => {
    if (log.messageKey) {
      return t(log.messageKey, log.messageParams);
    }

    if (language === 'en' && log.messageEn) {
      return log.messageEn;
    }

    return log.messageAr || log.message;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{t('logs.shopLogsTitle')}</h1>
        <p className="text-text-secondary">{t('logs.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="bg-surface p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Shop Filter (Admin only) */}
          {isAdmin && (
            <div>
              <label className="block text-sm mb-2">{t('logs.filters.shop')}</label>
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="w-full p-2 bg-background border border-gray-600 rounded-lg"
              >
                <option value="">{t('logs.filters.allShops')}</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>
                    {getBilingualText(shop.name, shop.nameEn, language)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Type Filter */}
          <div>
            <label className="block text-sm mb-2">{t('logs.filters.type')}</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full p-2 bg-background border border-gray-600 rounded-lg"
            >
              <option value="">{t('logs.filters.allTypes')}</option>
              {Object.values(LogType).map(type => (
                <option key={type} value={type}>
                  {translateEnum(type, logTypeTranslations, language)}
                </option>
              ))}
            </select>
          </div>

          {/* User Filter */}
          <div>
            <label className="block text-sm mb-2">{t('logs.filters.user')}</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full p-2 bg-background border border-gray-600 rounded-lg"
            >
              <option value="">{t('logs.filters.allUsers')}</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder={t('logs.filters.search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 bg-background border border-gray-600 rounded-lg"
        />

        {/* Info */}
        <p className="text-sm text-text-secondary mt-2">
          {t('logs.list.showing', { count: filteredLogs.length, total: allLogs.length })}
        </p>
      </div>

      {/* Logs Table */}
      <div className="bg-surface rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-3 text-right">{t('logs.list.columns.timestamp')}</th>
              <th className="p-3 text-right">{t('logs.list.columns.user')}</th>
              {isAdmin && <th className="p-3 text-right">{t('logs.list.columns.shop')}</th>}
              <th className="p-3 text-right">{t('logs.list.columns.type')}</th>
              <th className="p-3 text-right">{t('logs.list.columns.message')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => {
              const user = users.find(u => u.id === log.userId);
              const shop = shops.find(s => s.id === log.shopId);

              return (
                <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-800/30">
                  <td className="p-3 text-sm">
                    {new Date(log.timestamp).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                  </td>
                  <td className="p-3">{user?.name || 'System'}</td>
                  {isAdmin && (
                    <td className="p-3">
                      {shop ? getBilingualText(shop.name, shop.nameEn, language) : '-'}
                    </td>
                  )}
                  <td className="p-3">
                    <span className="px-2 py-1 text-xs rounded bg-primary/20 text-primary">
                      {translateEnum(log.type, logTypeTranslations, language)}
                    </span>
                  </td>
                  <td className="p-3 text-sm">{renderMessage(log)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="p-8 text-center text-text-secondary">
            {t('logs.list.empty')}
          </div>
        )}
      </div>
    </div>
  );
};
```

### ✅ Phase 10 Testing Checklist

**Notifications Page**:
- [ ] Title translated
- [ ] Filter buttons translated
- [ ] Actions translated
- [ ] Notification types show in selected language
- [ ] Messages display in selected language (with fallback)
- [ ] Timestamps format correctly
- [ ] Empty states translated
- [ ] Confirmation dialogs translated

**Logs Page**:
- [ ] Title translated
- [ ] All filter labels translated
- [ ] Table headers translated
- [ ] Log types show translated names
- [ ] Shop names show in selected language
- [ ] Log messages display in selected language
- [ ] Timestamps format correctly
- [ ] Empty state translated

---

## PHASE 11: SERVICES LAYER
**Duration**: 1 day
**Focus**: Update all services to support bilingual messages

### Section 11.1: Update Service Messages

**Files to Update**:
- All service files in `services/` directory

**Strategy**:
Instead of hardcoded messages like:
```typescript
throw new Error('فشل في إنشاء الحساب');
```

Use message keys:
```typescript
throw new Error(t('accounts.errors.createFailed'));
```

**However**, services don't have access to React hooks. So we need a different approach:

**Create Translation Utility** (`utils/translate.ts`):
```typescript
import { translations } from '../i18n/translations';

export const translate = (
  key: string,
  language: 'ar' | 'en' = 'ar',
  params?: Record<string, any>
): string => {
  const keys = key.split('.');
  let value: any = translations[language];

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) break;
  }

  if (typeof value !== 'string') {
    console.warn(`Translation missing: ${key}`);
    return key;
  }

  // Replace parameters
  if (params) {
    return Object.entries(params).reduce((str, [k, v]) => {
      return str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }, value);
  }

  return value;
};
```

**Update Services to Store Message Keys**:

Instead of throwing errors directly, services should return structured data or store bilingual messages in the database.

For **NotificationService** and **LoggingService**:

**Updated** `services/notificationService.ts`:
```typescript
export class NotificationService extends BaseService {
  static async createNotification(data: {
    userId: string;
    originatingUserId: string;
    shopId?: string;
    messageKey: string;  // NEW: Translation key
    messageParams?: Record<string, any>;  // NEW: Parameters
    messageAr?: string;  // Fallback
    messageEn?: string;  // Fallback
    logType?: LogType;
  }): Promise<void> {
    try {
      const newNotification: Omit<Notification, 'id'> = {
        userId: data.userId,
        originatingUserId: data.originatingUserId,
        shopId: data.shopId,
        messageKey: data.messageKey,
        messageParams: data.messageParams,
        messageAr: data.messageAr || '',
        messageEn: data.messageEn || '',
        message: data.messageAr || data.messageKey,  // Backwards compatibility
        logType: data.logType,
        isRead: false,
        timestamp: Timestamp.now().toDate().toISOString()
      };

      await addDoc(collection(this.db, 'notifications'), newNotification);
    } catch (error: any) {
      this.handleError(error, 'createNotification');
    }
  }
}
```

**Updated** `services/loggingService.ts`:
```typescript
export class LoggingService extends BaseService {
  static async logAction(
    user: User,
    action: LogType,
    messageKey: string,  // NEW: Translation key
    messageParams?: Record<string, any>,  // NEW: Parameters
    shopId?: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Generate fallback messages in both languages
      const messageAr = translate(messageKey, 'ar', messageParams);
      const messageEn = translate(messageKey, 'en', messageParams);

      const logData: Omit<Log, 'id'> = {
        userId: user.id,
        shopId: shopId || user.shopId,
        type: action,
        messageKey,
        messageParams,
        messageAr,
        messageEn,
        message: messageAr,  // Backwards compatibility
        timestamp: Timestamp.now().toDate().toISOString(),
        ...(metadata && { metadata: JSON.stringify(metadata) })
      };

      await addDoc(collection(this.db, 'logs'), logData);

      // Auto-create notifications if needed
      if (user.role !== 'admin') {
        await NotificationService.notifyAdminsOfUserAction(user, messageKey, messageParams, shopId);
      }
    } catch (error: any) {
      this.handleError(error, 'logAction');
    }
  }
}
```

### Section 11.2: Update App.tsx to Use Message Keys

**Update handlers in App.tsx**:
```typescript
const handleAddTransaction = async (transaction: Omit<Transaction, 'id' | 'shopId' | 'date'>) => {
  if (!activeShop || !currentUser) return;
  const newTransaction = { ...transaction, shopId: activeShop.id, date: selectedDate.toISOString() };
  const docRef = await addDoc(collection(db, 'transactions'), newTransaction);

  // Log with message key
  await LoggingService.logAction(
    currentUser,
    LogType.ADD_ENTRY,
    'logs.messages.transactionAdded',  // Message key
    {  // Parameters
      type: transaction.type,
      amount: transaction.totalAmount,
      description: transaction.description || ''
    },
    activeShop.id
  );

  // Notify admins (if user)
  if (currentUser.role !== 'admin') {
    await NotificationService.createNotification({
      // Get list of admins...
      userId: adminId,
      originatingUserId: currentUser.id,
      shopId: activeShop.id,
      messageKey: 'notifications.transactionAdded',
      messageParams: {
        userName: currentUser.name,
        shopName: activeShop.name,
        type: transaction.type,
        amount: transaction.totalAmount
      },
      logType: LogType.ADD_ENTRY
    });
  }
};
```

**Add Translation Keys** (`locales/*/logs.json` and `locales/*/notifications.json`):
```json
// logs.json
{
  "messages": {
    "transactionAdded": "Added {type} transaction for {amount} - {description}",
    "transactionUpdated": "Updated transaction from {oldAmount} to {newAmount}",
    "transactionDeleted": "Deleted {type} transaction: {description} - {amount}",
    "accountCreated": "Created account: {accountName}",
    "accountUpdated": "Updated account: {accountName}",
    "accountDeleted": "Deleted account: {accountName}",
    "shopCreated": "Created shop: {shopName}",
    "userCreated": "Created user: {userName}"
  }
}

// notifications.json
{
  "transactionAdded": "{userName} added a new transaction in {shopName}: ({type}) - {amount}",
  "transactionUpdated": "{userName} updated a transaction in {shopName}",
  "transactionDeleted": "{userName} deleted a transaction in {shopName}",
  "accountCreated": "{userName} created a new account: {accountName}",
  "shopCreated": "New shop created: {shopName}"
}
```

### ✅ Phase 11 Testing Checklist

**Logging**:
- [ ] New logs store message keys
- [ ] Log messages display correctly in both languages
- [ ] Parameters substitute correctly

**Notifications**:
- [ ] New notifications store message keys
- [ ] Notification messages display correctly in both languages
- [ ] Parameters substitute correctly

---

## PHASE 12: EXPORT & PRINT FEATURES
**Duration**: 1 day
**Focus**: PDF/Excel exports with language selection

### Section 12.1: Update PDF Export

**File**: `utils/pdfExportWithArabic.ts`

**Add Language Parameter**:
```typescript
export const generatePDF = (
  data: any,
  config: PDFConfig,
  language: 'ar' | 'en' = 'ar'  // NEW
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Set direction based on language
  const isRTL = language === 'ar';

  // Set font based on language
  if (isRTL) {
    doc.addFont(amiriFont, 'Amiri', 'normal');
    doc.setFont('Amiri');
  } else {
    doc.setFont('helvetica');
  }

  // Add title in selected language
  const title = language === 'ar'
    ? config.titleAr || config.title
    : config.titleEn || config.title;

  doc.text(title, isRTL ? 200 : 10, 20, { align: isRTL ? 'right' : 'left' });

  // Add content with proper alignment
  // ...
};
```

**Translation Keys** (`locales/*/exports.json`):
```json
{
  "pdf": {
    "title": "تقرير",
    "generatedOn": "تاريخ الإنشاء",
    "page": "صفحة",
    "of": "من",
    "total": "الإجمالي",
    "subtotal": "المجموع الفرعي"
  },
  "excel": {
    "sheet1": "البيانات",
    "sheet2": "الملخص"
  },
  "options": {
    "includeHeader": "تضمين الرأس",
    "includeFooter": "تضمين التذييل",
    "landscape": "أفقي",
    "portrait": "عمودي"
  }
}
```

### Section 12.2: Update Excel Export

**File**: `services/exportService.ts`

**Add Language Support**:
```typescript
static async exportToExcel(
  data: any[],
  config: ExportConfiguration,
  language: 'ar' | 'en' = 'ar'
): Promise<Blob> {
  try {
    // Translate headers based on language
    const headers = config.columns.map(col => {
      if (col.headerKey) {
        return translate(col.headerKey, language);
      }
      return language === 'ar' ? col.headerAr || col.header : col.headerEn || col.header;
    });

    // Create CSV content
    const csvContent = this.convertToCSV(data, { ...config, headers });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    return blob;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error(translate('exports.errors.excelFailed', language));
  }
}
```

### ✅ Phase 12 Testing Checklist

**PDF Exports**:
- [ ] Can export in Arabic
- [ ] Can export in English
- [ ] Headers appear in correct language
- [ ] Text direction correct (RTL/LTR)
- [ ] Fonts render correctly
- [ ] Numbers format correctly

**Excel/CSV Exports**:
- [ ] Column headers in selected language
- [ ] Data exports correctly
- [ ] Unicode characters preserved

---

## PHASE 13: TESTING & MIGRATION
**Duration**: 1 day
**Focus**: Comprehensive testing, data migration, bug fixes

### Section 13.1: Data Migration Script

**Create** `scripts/migrateToMultilingual.ts`:
```typescript
import { db } from '../firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

/**
 * Migration script to add English fields to existing data
 * Run this ONCE after deploying schema changes
 */

export async function migrateAccounts() {
  console.log('🔄 Migrating accounts...');

  const accountsSnap = await getDocs(collection(db, 'accounts'));
  const batch = writeBatch(db);
  let count = 0;

  accountsSnap.forEach(docSnap => {
    const account = docSnap.data();

    // Add empty nameEn field if doesn't exist
    if (!account.nameEn) {
      batch.update(docSnap.ref, { nameEn: '' });
      count++;
    }
  });

  await batch.commit();
  console.log(`✅ Migrated ${count} accounts`);
}

export async function migrateShops() {
  console.log('🔄 Migrating shops...');

  const shopsSnap = await getDocs(collection(db, 'shops'));
  const batch = writeBatch(db);
  let count = 0;

  shopsSnap.forEach(docSnap => {
    const shop = docSnap.data();

    // Add empty nameEn and descriptionEn fields
    const updates: any = {};
    if (!shop.nameEn) updates.nameEn = '';
    if (!shop.descriptionEn) updates.descriptionEn = '';

    if (Object.keys(updates).length > 0) {
      batch.update(docSnap.ref, updates);
      count++;
    }
  });

  await batch.commit();
  console.log(`✅ Migrated ${count} shops`);
}

export async function migrateNotifications() {
  console.log('🔄 Migrating notifications...');

  const notificationsSnap = await getDocs(collection(db, 'notifications'));
  const batch = writeBatch(db);
  let count = 0;

  notificationsSnap.forEach(docSnap => {
    const notification = docSnap.data();

    // Add message fields if they don't exist
    const updates: any = {};
    if (!notification.messageAr && notification.message) {
      updates.messageAr = notification.message;
    }
    if (!notification.messageEn) {
      updates.messageEn = '';
    }

    if (Object.keys(updates).length > 0) {
      batch.update(docSnap.ref, updates);
      count++;
    }
  });

  await batch.commit();
  console.log(`✅ Migrated ${count} notifications`);
}

export async function migrateLogs() {
  console.log('🔄 Migrating logs...');

  const logsSnap = await getDocs(collection(db, 'logs'));
  const batch = writeBatch(db);
  let count = 0;

  logsSnap.forEach(docSnap => {
    const log = docSnap.data();

    const updates: any = {};
    if (!log.messageAr && log.message) {
      updates.messageAr = log.message;
    }
    if (!log.messageEn) {
      updates.messageEn = '';
    }

    if (Object.keys(updates).length > 0) {
      batch.update(docSnap.ref, updates);
      count++;
    }
  });

  await batch.commit();
  console.log(`✅ Migrated ${count} logs`);
}

// Run all migrations
export async function runAllMigrations() {
  try {
    console.log('🚀 Starting multilingual migration...\n');

    await migrateAccounts();
    await migrateShops();
    await migrateNotifications();
    await migrateLogs();

    console.log('\n✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}
```

**Add Migration Button** (temporary, in SettingsPage):
```typescript
<button
  onClick={async () => {
    if (confirm('Run multilingual migration? This is a one-time operation.')) {
      await runAllMigrations();
      alert('Migration complete!');
    }
  }}
  className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded"
>
  Run Multilingual Migration
</button>
```

### Section 13.2: Testing Checklist

**Comprehensive Testing**:

**Cross-Language Testing**:
- [ ] Switch language multiple times - no errors
- [ ] Direction changes correctly (RTL ↔ LTR)
- [ ] All UI text updates
- [ ] Cached translations work

**Admin Role - Complete Flow**:
1. **Login**: [ ] Page in both languages
2. **Dashboard**: [ ] All cards, charts, labels
3. **Shops**: [ ] Create shop with both names, list shows correct name
4. **Users**: [ ] Create user, shop dropdown shows bilingual names
5. **Accounts**: [ ] Create account with both names, tree shows correct name
6. **Transactions**: [ ] Create transaction, accounts show correct names
7. **Financial Years**: [ ] Create FY, manage stock
8. **Statements**: [ ] Generate statement, account names correct
9. **Analytics**: [ ] Charts, metrics all translated
10. **Logs**: [ ] View logs, types and messages translated
11. **Notifications**: [ ] View notifications, messages translated
12. **Exports**: [ ] PDF in both languages, Excel headers correct

**User Role - Complete Flow**:
1. **Login**: [ ] Page in both languages
2. **Dashboard**: [ ] All features work
3. **Accounts**: [ ] View only their shop's accounts
4. **Transactions**: [ ] Create/view transactions
5. **Statements**: [ ] Generate statements
6. **Analytics**: [ ] View their analytics
7. **Profile**: [ ] View/edit profile
8. **Notifications**: [ ] Receive and view notifications

**Edge Cases**:
- [ ] Account without English name shows Arabic
- [ ] Shop without English name shows Arabic
- [ ] Mix of English/Arabic names works
- [ ] Special characters in names
- [ ] Very long names
- [ ] Empty English fields don't break UI

**Data Migration**:
- [ ] Migration script runs without errors
- [ ] All accounts have nameEn field (even if empty)
- [ ] All shops have nameEn and descriptionEn fields
- [ ] All notifications have messageAr and messageEn
- [ ] All logs have messageAr and messageEn
- [ ] Existing data still works
- [ ] No data loss

---

## FINAL TESTING CHECKLIST

### Functional Testing

**Authentication** ✅
- [ ] Login in Arabic
- [ ] Login in English
- [ ] Error messages translated
- [ ] Forgot password flow
- [ ] Logout confirmation

**Navigation** ✅
- [ ] All menu items translated
- [ ] Active states work
- [ ] Breadcrumbs (if any) translated
- [ ] Page titles in browser tab

**Forms** ✅
- [ ] All labels translated
- [ ] Placeholders translated
- [ ] Validation messages translated
- [ ] Success/error toasts translated
- [ ] Required field indicators

**Tables & Lists** ✅
- [ ] All column headers translated
- [ ] Status badges translated
- [ ] Action button tooltips translated
- [ ] Empty states translated
- [ ] Pagination (if any) translated

**Modals & Dialogs** ✅
- [ ] All titles translated
- [ ] Button labels translated
- [ ] Confirmation messages translated

**Reports & Exports** ✅
- [ ] Report titles translated
- [ ] Column headers translated
- [ ] PDF exports in both languages
- [ ] Excel exports with correct headers
- [ ] Print previews correct

### Visual Testing

**RTL/LTR** ✅
- [ ] Page direction switches correctly
- [ ] Icons mirror appropriately
- [ ] Margins/padding correct
- [ ] Text alignment correct
- [ ] Forms aligned correctly

**Typography** ✅
- [ ] Arabic font readable
- [ ] English font readable
- [ ] Font sizes appropriate
- [ ] Line heights correct
- [ ] No text overflow

**Layout** ✅
- [ ] No layout shifts when switching languages
- [ ] Components stay in place
- [ ] Responsive design works in both languages
- [ ] Mobile view correct

### Performance Testing

**Load Times** ✅
- [ ] Initial load time acceptable
- [ ] Language switch instantaneous
- [ ] No lag when rendering translations
- [ ] Translation files optimized

**Memory** ✅
- [ ] No memory leaks
- [ ] Translation cache working
- [ ] LocalStorage usage acceptable

### Browser Compatibility

**Desktop** ✅
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Mobile** ✅
- [ ] Chrome Mobile
- [ ] Safari iOS
- [ ] Samsung Internet

### Accessibility

**Screen Readers** ✅
- [ ] ARIA labels translated
- [ ] Alt text translated
- [ ] Form labels associated correctly

**Keyboard Navigation** ✅
- [ ] Tab order correct in RTL
- [ ] Tab order correct in LTR
- [ ] Focus indicators visible

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] All translation files complete
- [ ] No console errors
- [ ] All tests passing
- [ ] Code review completed
- [ ] Migration script tested
- [ ] Backup created

### Deployment Steps

1. **Deploy Code**:
   - [ ] Build production bundle
   - [ ] Deploy to hosting
   - [ ] Verify deployment

2. **Run Migration**:
   - [ ] Run migration script in production
   - [ ] Verify data migrated correctly
   - [ ] Check for errors

3. **Smoke Test**:
   - [ ] Login as admin
   - [ ] Login as user
   - [ ] Switch languages
   - [ ] Create test data
   - [ ] Verify exports

### Post-Deployment

- [ ] Monitor error logs
- [ ] Check user feedback
- [ ] Verify performance metrics
- [ ] Document any issues

---

## MAINTENANCE GUIDE

### Adding New Translations

1. Add keys to translation files
2. Use keys in components
3. Test in both languages
4. Commit changes

### Adding New Features

1. Design with i18n in mind
2. Add translation keys first
3. Use `useTranslation()` hook
4. Support bilingual data entry
5. Test switching languages
6. Update documentation

### Troubleshooting

**Translation not appearing**:
- Check translation key exists
- Verify namespace correct
- Check fallback to key name
- Look for console warnings

**Wrong language displayed**:
- Check language state
- Verify localStorage
- Check default language
- Inspect component re-render

**Direction issues**:
- Check dir attribute on html element
- Verify CSS supports RTL
- Check icon mirroring
- Test layout in both directions

---

## SUMMARY

### Total Implementation

- **Duration**: 8-10 days
- **New Files**: ~20 files
- **Modified Files**: ~80 files
- **Translation Keys**: ~800-1000 keys
- **Languages Supported**: Arabic (primary), English (secondary)

### Key Achievements

✅ Complete bilingual UI
✅ Bilingual database fields
✅ Translation system with fallbacks
✅ RTL/LTR support
✅ Bilingual reports and exports
✅ Translated notifications and logs
✅ Language persistence
✅ Enum translations
✅ Date/number formatting

### Future Enhancements

- Add more languages (French, Spanish, etc.)
- Translation management UI
- Automatic translation suggestions
- Language-specific number formatting
- Pluralization support
- Context-aware translations

---

**END OF DETAILED IMPLEMENTATION PLAN**
