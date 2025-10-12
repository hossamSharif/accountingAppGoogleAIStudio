# Multi-Language Support Implementation Plan

## Overview
Add comprehensive English/Arabic bilingual support to the entire accounting application, including UI labels, database fields, notification messages, log messages, and generated reports.

## Current State Analysis

### What's Already in Arabic
- All UI labels, buttons, titles
- Hardcoded enum values (AccountType, TransactionType, AccountNature, AccountClassification)
- Success/error messages in services
- Notification messages
- Log messages
- PDF/Excel report content
- Account names in database
- Shop names and descriptions

### What Needs Bilingual Support
1. **UI Layer**: All labels, buttons, titles, messages, tooltips
2. **Database Fields**:
   - Account names
   - Shop names and descriptions
   - Categories/classifications
3. **Dynamic Messages**:
   - Notification messages
   - Log messages
   - Success/error toasts
   - Validation messages
4. **Reports**:
   - Transaction statements
   - Financial statements
   - Profit/loss reports
   - Trial balance
   - Account statements

## Architecture Approach

### Strategy: Hybrid i18n System

**Simple to Use**:
- Single hook: `useTranslation()`
- Simple syntax: `t('accounts.create')`
- Component: `<LanguageSwitcher />`

**Comprehensive in Scope**:
- Covers all UI text
- Bilingual database fields
- Dynamic message translation
- Report language selection
- Enum translations

### Folder Structure
```
src/
├── i18n/
│   ├── locales/
│   │   ├── ar/
│   │   │   ├── common.json
│   │   │   ├── accounts.json
│   │   │   ├── transactions.json
│   │   │   ├── reports.json
│   │   │   ├── notifications.json
│   │   │   ├── logs.json
│   │   │   ├── shops.json
│   │   │   ├── users.json
│   │   │   ├── errors.json
│   │   │   └── validation.json
│   │   └── en/
│   │       ├── common.json
│   │       ├── accounts.json
│   │       ├── transactions.json
│   │       ├── reports.json
│   │       ├── notifications.json
│   │       ├── logs.json
│   │       ├── shops.json
│   │       ├── users.json
│   │       ├── errors.json
│   │       └── validation.json
│   ├── i18nContext.tsx
│   ├── useTranslation.ts
│   ├── translations.ts
│   └── messageKeys.ts
```

## Implementation Phases

### Phase 1: Foundation Setup (2-3 hours)

#### 1.1 Create i18n Context and Hooks
**File**: `src/i18n/i18nContext.tsx`
```typescript
interface I18nContextType {
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => void;
  t: (key: string, params?: Record<string, any>) => string;
  dir: 'rtl' | 'ltr';
}
```

**File**: `src/i18n/useTranslation.ts`
```typescript
// Simple hook for components
export const useTranslation = () => {
  const context = useContext(I18nContext);
  return { t: context.t, language: context.language, dir: context.dir };
};
```

#### 1.2 Create Translation Files Structure
- Create all JSON files with organized namespaces
- Start with common translations (buttons, labels, etc.)

#### 1.3 Create Language Switcher Component
**File**: `src/components/LanguageSwitcher.tsx`
- Toggle between Arabic/English
- Update document direction (RTL/LTR)
- Persist preference in localStorage

### Phase 2: Database Schema Extensions (1-2 hours)

#### 2.1 Update TypeScript Interfaces

**File**: `types.ts`
```typescript
// Before
export interface Account {
  id: string;
  shopId: string;
  accountCode: string;
  name: string;  // Arabic only
  classification: AccountClassification;
  // ...
}

// After
export interface Account {
  id: string;
  shopId: string;
  accountCode: string;
  name: string;      // Arabic (primary)
  nameEn?: string;   // English (optional)
  classification: AccountClassification;
  // ...
}

// Before
export interface Shop {
  id: string;
  name: string;        // Arabic only
  description: string; // Arabic only
  // ...
}

// After
export interface Shop {
  id: string;
  name: string;         // Arabic (primary)
  nameEn?: string;      // English (optional)
  description: string;  // Arabic (primary)
  descriptionEn?: string; // English (optional)
  // ...
}

// Add interface for bilingual enums
export interface BilingualEnum {
  ar: string;
  en: string;
}
```

#### 2.2 Create Enum Translation Maps

**File**: `i18n/enumTranslations.ts`
```typescript
export const accountTypeTranslations: Record<AccountType, BilingualEnum> = {
  [AccountType.SALES]: { ar: 'المبيعات', en: 'Sales' },
  [AccountType.PURCHASES]: { ar: 'المشتريات', en: 'Purchases' },
  [AccountType.EXPENSES]: { ar: 'المصروفات', en: 'Expenses' },
  // ... all other types
};

export const accountClassificationTranslations: Record<AccountClassification, BilingualEnum> = {
  [AccountClassification.ASSETS]: { ar: 'الأصول', en: 'Assets' },
  [AccountClassification.LIABILITIES]: { ar: 'الخصوم', en: 'Liabilities' },
  // ... all other classifications
};
```

### Phase 3: Update Services for Bilingual Messages (3-4 hours)

#### 3.1 Create Message Key System

**File**: `i18n/messageKeys.ts`
```typescript
export const MessageKeys = {
  // Accounts
  ACCOUNT_CREATED: 'accounts.messages.created',
  ACCOUNT_UPDATED: 'accounts.messages.updated',
  ACCOUNT_DELETED: 'accounts.messages.deleted',

  // Transactions
  TRANSACTION_CREATED: 'transactions.messages.created',
  TRANSACTION_UPDATED: 'transactions.messages.updated',

  // Notifications
  SHOP_USER_ACTION: 'notifications.shopUserAction',
  TRANSACTION_APPROVED: 'notifications.transactionApproved',

  // Logs
  LOG_LOGIN: 'logs.login',
  LOG_LOGOUT: 'logs.logout',
  LOG_ACCOUNT_CREATED: 'logs.accountCreated',

  // Errors
  ERROR_NETWORK: 'errors.network',
  ERROR_PERMISSION: 'errors.permission',
  ERROR_VALIDATION: 'errors.validation',
};
```

#### 3.2 Update Notification Service

**File**: `services/notificationService.ts`
```typescript
// Before
message: `قام ${user.name} بإنشاء حساب جديد`

// After - store translation key with parameters
interface NotificationData {
  messageKey: string;
  messageParams?: Record<string, any>;
  messageAr?: string; // Fallback
  messageEn?: string; // Fallback
}

// Store both
await this.createNotification({
  userId,
  messageKey: 'notifications.accountCreated',
  messageParams: { userName: user.name, accountName: account.name },
  messageAr: `قام ${user.name} بإنشاء حساب جديد: ${account.name}`,
  messageEn: `${user.name} created a new account: ${account.nameEn || account.name}`,
});
```

#### 3.3 Update Logging Service

**File**: `services/loggingService.ts`
```typescript
// Similar approach - store translation keys
interface LogData {
  type: LogType;
  messageKey: string;
  messageParams?: Record<string, any>;
  messageAr?: string;
  messageEn?: string;
}
```

### Phase 4: Update UI Components (5-6 hours)

#### 4.1 Update Common Components

**Pattern for all components**:
```typescript
// Before
<button>إنشاء حساب</button>

// After
import { useTranslation } from '../i18n/useTranslation';

const MyComponent = () => {
  const { t } = useTranslation();

  return <button>{t('accounts.create')}</button>;
};
```

**Components to Update** (~60 files):
- All page components (AccountsPage, TransactionsPage, etc.)
- All form components (AccountModal, TransactionForm, etc.)
- All list components (AccountList, RecentTransactions, etc.)
- Header, Sidebar, Layout
- All modals and dialogs

#### 4.2 Update Forms for Bilingual Input

**File**: `components/AccountModal.tsx`
```typescript
// Add English name field
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    {t('accounts.form.nameArabic')}
  </label>
  <input
    type="text"
    value={formData.name}
    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
    className="w-full p-2 border rounded"
    required
  />
</div>

<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    {t('accounts.form.nameEnglish')}
  </label>
  <input
    type="text"
    value={formData.nameEn || ''}
    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
    className="w-full p-2 border rounded"
    dir="ltr"
  />
</div>
```

#### 4.3 Create Bilingual Display Utility

**File**: `utils/bilingual.ts`
```typescript
export const getBilingualText = (
  textAr: string,
  textEn: string | undefined,
  language: 'ar' | 'en'
): string => {
  if (language === 'en' && textEn) return textEn;
  return textAr; // Fallback to Arabic
};

export const getBilingualEnum = (
  enumValue: string,
  translationMap: Record<string, BilingualEnum>,
  language: 'ar' | 'en'
): string => {
  return translationMap[enumValue]?.[language] || enumValue;
};
```

### Phase 5: Update Reports & Exports (3-4 hours)

#### 5.1 Update Financial Statement Service

**File**: `services/financialStatementService.ts`
```typescript
static async generateTrialBalance(
  shopId?: string,
  financialYearId?: string,
  asOfDate?: string,
  language: 'ar' | 'en' = 'ar' // Add language parameter
): Promise<TrialBalance> {
  // ... existing code

  const tbAccount: TrialBalanceAccount = {
    accountId: account.id,
    accountCode: account.accountCode,
    accountName: getBilingualText(account.name, account.nameEn, language),
    // ...
  };
}
```

#### 5.2 Update PDF Export Utilities

**File**: `utils/pdfExportEnhanced.ts`
```typescript
export const generatePDF = (
  data: any,
  config: PDFConfig,
  language: 'ar' | 'en'
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

  // Add content with proper alignment
  // ...
};
```

#### 5.3 Update Excel Export

**File**: `services/exportService.ts`
```typescript
static async exportToExcel(
  data: any[],
  config: ExportConfiguration,
  language: 'ar' | 'en' = 'ar'
): Promise<Blob> {
  // Translate headers based on language
  const headers = config.columns.map(col =>
    t(col.headerKey, language)
  );

  // ...
}
```

### Phase 6: Update Notification & Log Display (2 hours)

#### 6.1 Update NotificationsPage

**File**: `pages/NotificationsPage.tsx`
```typescript
const NotificationsPage = () => {
  const { t, language } = useTranslation();

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

  // ...
};
```

#### 6.2 Update LogsPage

Similar pattern to NotificationsPage for displaying translated log messages.

### Phase 7: Data Migration (1-2 hours)

#### 7.1 Create Migration Scripts

**File**: `scripts/addEnglishFields.ts`
```typescript
/**
 * Migration script to add English name fields to existing accounts
 * Run this once after deploying the schema changes
 */
export async function migrateAccountsAddEnglishNames() {
  const accounts = await getDocs(collection(db, 'accounts'));

  const batch = writeBatch(db);
  let count = 0;

  accounts.forEach(docSnap => {
    const account = docSnap.data();

    // Add empty nameEn field if doesn't exist
    if (!account.nameEn) {
      batch.update(docSnap.ref, { nameEn: '' });
      count++;
    }
  });

  await batch.commit();
  console.log(`Migration complete: ${count} accounts updated`);
}
```

**File**: `scripts/addEnglishShopFields.ts`
- Similar migration for shops

## Translation File Examples

### common.json (Arabic)
```json
{
  "app": {
    "name": "نظام المحاسبة",
    "title": "نظام محاسبة محلات قطع الغيار"
  },
  "navigation": {
    "dashboard": "لوحة التحكم",
    "accounts": "الحسابات",
    "transactions": "المعاملات",
    "reports": "التقارير",
    "settings": "الإعدادات"
  },
  "actions": {
    "create": "إنشاء",
    "edit": "تعديل",
    "delete": "حذف",
    "save": "حفظ",
    "cancel": "إلغاء",
    "search": "بحث",
    "filter": "تصفية",
    "export": "تصدير",
    "print": "طباعة"
  },
  "status": {
    "active": "نشط",
    "inactive": "غير نشط",
    "pending": "معلق",
    "completed": "مكتمل"
  }
}
```

### common.json (English)
```json
{
  "app": {
    "name": "Accounting System",
    "title": "Auto Parts Shop Accounting System"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "accounts": "Accounts",
    "transactions": "Transactions",
    "reports": "Reports",
    "settings": "Settings"
  },
  "actions": {
    "create": "Create",
    "edit": "Edit",
    "delete": "Delete",
    "save": "Save",
    "cancel": "Cancel",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "print": "Print"
  },
  "status": {
    "active": "Active",
    "inactive": "Inactive",
    "pending": "Pending",
    "completed": "Completed"
  }
}
```

### accounts.json (Arabic)
```json
{
  "title": "الحسابات",
  "create": "إنشاء حساب",
  "edit": "تعديل حساب",
  "delete": "حذف حساب",
  "form": {
    "accountCode": "رمز الحساب",
    "nameArabic": "اسم الحساب (عربي)",
    "nameEnglish": "اسم الحساب (إنجليزي)",
    "classification": "التصنيف",
    "nature": "الطبيعة",
    "type": "النوع",
    "parentAccount": "الحساب الأب",
    "openingBalance": "الرصيد الافتتاحي"
  },
  "messages": {
    "created": "تم إنشاء الحساب بنجاح",
    "updated": "تم تحديث الحساب بنجاح",
    "deleted": "تم حذف الحساب بنجاح",
    "deleteError": "لا يمكن حذف حساب مرتبط بمعاملات"
  },
  "types": {
    "sales": "المبيعات",
    "purchases": "المشتريات",
    "expenses": "المصروفات"
  }
}
```

### accounts.json (English)
```json
{
  "title": "Accounts",
  "create": "Create Account",
  "edit": "Edit Account",
  "delete": "Delete Account",
  "form": {
    "accountCode": "Account Code",
    "nameArabic": "Account Name (Arabic)",
    "nameEnglish": "Account Name (English)",
    "classification": "Classification",
    "nature": "Nature",
    "type": "Type",
    "parentAccount": "Parent Account",
    "openingBalance": "Opening Balance"
  },
  "messages": {
    "created": "Account created successfully",
    "updated": "Account updated successfully",
    "deleted": "Account deleted successfully",
    "deleteError": "Cannot delete account with transactions"
  },
  "types": {
    "sales": "Sales",
    "purchases": "Purchases",
    "expenses": "Expenses"
  }
}
```

## Files to Create

### New Files (~15 files)
1. `i18n/i18nContext.tsx`
2. `i18n/useTranslation.ts`
3. `i18n/translations.ts`
4. `i18n/messageKeys.ts`
5. `i18n/enumTranslations.ts`
6. `i18n/locales/ar/common.json`
7. `i18n/locales/ar/accounts.json`
8. `i18n/locales/ar/transactions.json`
9. `i18n/locales/ar/reports.json`
10. `i18n/locales/ar/notifications.json`
11. `i18n/locales/ar/logs.json`
12. `i18n/locales/ar/errors.json`
13. `i18n/locales/en/*` (mirror of ar/)
14. `components/LanguageSwitcher.tsx`
15. `utils/bilingual.ts`
16. `scripts/addEnglishFields.ts`

## Files to Modify

### Core Files (~10 files)
- `types.ts` - Add nameEn fields to interfaces
- `App.tsx` - Wrap with I18nProvider
- `firebase.ts` - No changes needed

### Service Files (~15 files)
- `services/accountService.ts`
- `services/transactionService.ts`
- `services/notificationService.ts`
- `services/loggingService.ts`
- `services/shopService.ts`
- `services/financialStatementService.ts`
- `services/exportService.ts`
- `services/analyticsService.ts`
- All other service files

### Component Files (~40 files)
- All page components (15 files)
- All form/modal components (10 files)
- All list components (5 files)
- All report components (5 files)
- Header, Sidebar, Layout (3 files)
- Other components (2 files)

### Utility Files (~5 files)
- `utils/formatting.ts`
- `utils/pdfExportEnhanced.ts`
- `utils/pdfExportWithArabic.ts`

## Testing Strategy

### 1. Unit Testing
- Test translation hook
- Test bilingual text utility
- Test enum translations

### 2. Integration Testing
- Create account with both Arabic/English names
- Switch language and verify UI updates
- Generate reports in both languages
- Test notifications in both languages

### 3. Manual Testing Checklist
- [ ] Language switcher works
- [ ] All UI text translates
- [ ] Forms accept bilingual input
- [ ] Account names display correctly
- [ ] Shop names display correctly
- [ ] Notifications translate properly
- [ ] Logs translate properly
- [ ] Reports generate in correct language
- [ ] PDF exports in correct language
- [ ] Excel exports with correct headers
- [ ] Enums display translated values
- [ ] Direction (RTL/LTR) switches properly

## Rollout Plan

### Stage 1: Core Infrastructure (Day 1)
- Create i18n system
- Add translation files
- Update types
- Create LanguageSwitcher

### Stage 2: Database Extensions (Day 1-2)
- Update interfaces
- Update forms for bilingual input
- Create migration scripts

### Stage 3: UI Translation (Day 2-3)
- Update all components
- Update all pages
- Test language switching

### Stage 4: Services & Messages (Day 3-4)
- Update notification system
- Update logging system
- Update all service messages

### Stage 5: Reports & Export (Day 4-5)
- Update report generation
- Update PDF/Excel exports
- Test in both languages

### Stage 6: Testing & Polish (Day 5-6)
- Comprehensive testing
- Fix any issues
- Documentation

## Estimated Effort
- **Total Time**: 5-6 days
- **Files Created**: ~15
- **Files Modified**: ~70
- **Translation Keys**: ~500-800

## Benefits
1. ✅ **Simple to use**: Single hook, clean API
2. ✅ **Comprehensive**: Covers entire application
3. ✅ **Flexible**: Easy to add more languages
4. ✅ **Maintainable**: Centralized translations
5. ✅ **Type-safe**: TypeScript support
6. ✅ **Performance**: Minimal overhead
7. ✅ **User-friendly**: Seamless language switching
8. ✅ **Professional**: Proper i18n best practices

## Future Enhancements
- Add more languages (French, Spanish, etc.)
- Automatic translation suggestions
- Translation management UI
- Export/import translations
- Crowdsource translations
- Language-specific number/date formatting
