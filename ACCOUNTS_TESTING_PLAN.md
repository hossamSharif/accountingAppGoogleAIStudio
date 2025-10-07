# Accounts Chart Management Testing Plan

## 📋 Analysis Summary

**Phase Location**: Chart of Accounts Management is part of **Phase 1: Week 3-4 (Core Data Operations)** as detailed in Task 1.4.

**Current Implementation Status**:
✅ **Well Implemented** - The AccountsPage.tsx and AccountService.ts are comprehensive with:
- Real-time Firebase integration with role-based access
- Hierarchical account structure support
- Complete CRUD operations with validation
- Balance calculations and CSV export
- Search functionality and status management

## 🧪 Testing Plan

### 1. **Launch Browser & Login**
- Start Puppeteer browser
- Navigate to the app
- Login as admin user
- Verify authentication success

### 2. **Verify Default System Accounts**
Navigate to Accounts page and validate all main account types exist:
- Cash (الصندوق - 1100)
- Bank (البنك - 1200)
- Customers (العملاء - 1300)
- Stock (المخزون - 1400)
- Opening Stock (بضاعة أول المدة - 1410)
- Ending Stock (بضاعة آخر المدة - 1420)
- Suppliers (الموردين - 2100)
- Sales (المبيعات - 4100)
- Purchases (المشتريات - 5100)
- Expenses (المصروفات - 5200)

### 3. **Add Missing System Accounts** (if any found)
Programmatically add any missing main accounts from constants.ts

### 4. **Clear Shop Sub-Accounts**
- Query and identify all sub-accounts for test shop
- Delete sub-accounts to start fresh testing
- Preserve main system accounts

### 5. **Create Shop-Specific Accounts via UI**
Using Puppeteer to create essential accounts per shop with shop name suffix:

**For each shop (e.g., shop1):**

**Cash Account (under 1100):**
- Create "صندوق-shop1" (1101-shop1)

**Bank Account (under 1200):**
- Create "بنك-shop1" (1201-shop1)

**Customer Sub-Account (under 1300):**
- Create "مبيعات مباشرة-shop1" (1301-shop1)

**Supplier Sub-Account (under 2100):**
- Create "مشتريات مباشرة-shop1" (2101-shop1)

**One Sales Account (under 4100):**
- Create "مبيعات-shop1" (4101-shop1)

**One Purchase Account (under 5100):**
- Create "مشتريات-shop1" (5101-shop1)

**Essential Expense Sub-Accounts (under 5200):**
- Create "إيجار المحل-shop1" (5201-shop1)
- Create "رواتب الموظفين-shop1" (5202-shop1)
- Create "مصروفات أخرى-shop1" (5203-shop1)

**Total: 9 shop-specific accounts per shop (complete operational structure)**

### 6. **Test CRUD Operations via UI**
Test operations on selected accounts:
- **Create**: Add new sub-account via modal form
- **Read**: Verify account appears in hierarchy
- **Update**: Edit account name/description
- **Delete**: Remove test account
- **Toggle Status**: Activate/deactivate account
- **Validation Testing**:
  - Duplicate account codes
  - Parent account selection
  - Role-based permissions
  - Circular reference prevention

### 7. **Real-time Updates & Verification**
- Verify account hierarchy display
- Test search functionality with shop suffix
- Export CSV validation
- Check balance calculations
- Multi-session sync testing

### 8. **Create Testing Summary Report**
Generate comprehensive markdown file: `ACCOUNTS_TESTING_REPORT.md` containing:
- **Test Execution Summary** (pass/fail status for each test)
- **Default Accounts Verification Results** (which accounts exist/missing)
- **Shop-Specific Accounts Creation Results** (9 accounts per shop)
- **CRUD Operations Test Results** (detailed results for each operation)
- **UI/UX Validation Results** (interface responsiveness, error handling)
- **Firebase Integration Test Results** (real-time sync, permissions)
- **Account Structure Validation** (proper hierarchy, naming conventions)
- **Issues Found** (bugs, missing features, improvements needed)
- **Recommendations** (next steps, optimizations)
- **Screenshots** (key UI states during testing)

## 🎯 Success Criteria

- ✅ All 10 main system accounts verified
- ✅ Complete shop-specific account structure created (9 accounts per shop)
- ✅ All CRUD operations working correctly
- ✅ Real-time Firebase synchronization functioning
- ✅ Role-based permissions enforced
- ✅ Search and export functionality validated
- ✅ Comprehensive test report generated

## 🔧 Technical Requirements

- Puppeteer browser automation
- Firebase Firestore access
- Admin user credentials
- Test shop data
- Screenshot capture capability

This complete operational structure ensures each shop has all essential accounts: cash, bank, customers, suppliers, sales, purchases, and key expense categories.