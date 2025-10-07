import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  TransactionEntryInput,
  TransactionTemplate,
  ValidationResult,
  CreateTransactionData,
  EnhancedTransaction,
  TransactionType,
  Account,
  AccountSuggestion,
  TemplateCategory
} from '../types';
import { TransactionTemplateService } from '../services/transactionTemplateService';
import { TransactionValidator } from '../services/transactionValidator';
import { TransactionService } from '../services/transactionService';
import { AccountService } from '../services/accountService';
import { LoggingService } from '../services/loggingService';
import { BalanceCalculator } from '../services/balanceCalculator';
import { Toast } from './Toast';
import { useToast } from '../hooks/useToast';
import { useLoading } from '../hooks/useLoading';
import { formatNumber, formatCurrency } from '../utils/formatting';

interface AdvancedDailyEntryFormProps {
  shopId: string;
  financialYearId: string;
  onTransactionCreated: (transaction: EnhancedTransaction) => void;
  preloadedTemplate?: TransactionTemplate;
  onClose?: () => void;
}

interface TransactionEntryRow extends TransactionEntryInput {
  id: string;
  balance?: number;
  account?: Account;
  isLoadingBalance?: boolean;
}

interface ValidationResultDisplay {
  results: ValidationResult[];
}

interface TemplateSelector {
  shopId: string;
  financialYearId: string;
  selectedTemplate: TransactionTemplate | null;
  onTemplateSelected: (template: TransactionTemplate) => void;
}

interface TransactionBalanceSummary {
  entries: TransactionEntryInput[];
  isCalculating?: boolean;
}

// Template Selector Component
const TemplateSelector: React.FC<TemplateSelector> = ({
  shopId,
  financialYearId,
  selectedTemplate,
  onTemplateSelected
}) => {
  const [templates, setTemplates] = useState<TransactionTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [shopId, financialYearId, selectedCategory]);

  const loadTemplates = async () => {
    try {
      setIsLoading(true);
      const templateList = await TransactionTemplateService.getTemplatesForShop(
        shopId,
        financialYearId,
        selectedCategory === 'ALL' ? undefined : selectedCategory
      );
      setTemplates(templateList);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-10 rounded"></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2 space-x-reverse">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">جميع الفئات</option>
          <option value="SALES">مبيعات</option>
          <option value="PURCHASES">مشتريات</option>
          <option value="EXPENSES">مصروفات</option>
          <option value="TRANSFERS">تحويلات</option>
          <option value="ADJUSTMENTS">تسويات</option>
          <option value="SMART_GENERATED">قوالب ذكية</option>
        </select>

        <select
          value={selectedTemplate?.id || ''}
          onChange={(e) => {
            const template = templates.find(t => t.id === e.target.value);
            if (template) onTemplateSelected(template);
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">اختر قالب معاملة</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.usageCount} استخدام)
            </option>
          ))}
        </select>
      </div>

      {selectedTemplate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800 font-medium">{selectedTemplate.name}</p>
          <p className="text-xs text-blue-600">{selectedTemplate.description}</p>
          <div className="flex space-x-2 space-x-reverse mt-2">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {selectedTemplate.category}
            </span>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
              {selectedTemplate.usageCount} استخدام
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Transaction Entry Row Component
const TransactionEntryRow: React.FC<{
  entry: TransactionEntryRow;
  index: number;
  shopId: string;
  financialYearId: string;
  onChange: (entry: TransactionEntryRow) => void;
  onRemove: () => void;
  suggestions?: AccountSuggestion[];
}> = ({ entry, index, shopId, financialYearId, onChange, onRemove, suggestions = [] }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, [shopId]);

  const loadAccounts = async () => {
    try {
      const accountList = await AccountService.getAccountsByShop(shopId);
      setAccounts(accountList);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleAccountChange = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    const updatedEntry = {
      ...entry,
      accountId,
      account,
      isLoadingBalance: true
    };
    onChange(updatedEntry);

    // Load account balance
    try {
      const balance = await BalanceCalculator.calculateAccountBalanceForFY(
        accountId,
        financialYearId
      );
      onChange({
        ...updatedEntry,
        balance,
        isLoadingBalance: false
      });
    } catch (error) {
      console.error('Error loading balance:', error);
      onChange({
        ...updatedEntry,
        isLoadingBalance: false
      });
    }
  };

  return (
    <div className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg bg-gray-50">
      {/* Account Selector */}
      <div className="col-span-4 relative">
        <select
          value={entry.accountId}
          onChange={(e) => handleAccountChange(e.target.value)}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">اختر الحساب</option>
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.accountCode})
            </option>
          ))}
        </select>

        {/* Account Balance Display */}
        {entry.accountId && (
          <div className="text-xs text-gray-600 mt-1">
            الرصيد الحالي: {' '}
            {entry.isLoadingBalance ? (
              <span className="animate-pulse">جاري التحميل...</span>
            ) : (
              <span className={`font-medium ${entry.balance && entry.balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(entry.balance || 0)}
              </span>
            )}
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && showSuggestions && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 mt-1">
            <div className="p-2 border-b bg-gray-50">
              <span className="text-xs font-medium text-gray-700">اقتراحات ذكية:</span>
            </div>
            {suggestions.slice(0, 3).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => {
                  handleAccountChange(suggestion.account.id);
                  setShowSuggestions(false);
                }}
                className="w-full text-left p-2 hover:bg-blue-50 border-b last:border-b-0"
              >
                <div className="text-sm font-medium">{suggestion.account.name}</div>
                <div className="text-xs text-gray-600">{suggestion.reason}</div>
                <div className="text-xs text-blue-600">
                  ثقة: {(suggestion.confidence * 100).toFixed(0)}%
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Amount Input */}
      <div className="col-span-2">
        <input
          type="number"
          step="0.01"
          min="0"
          placeholder="المبلغ"
          value={entry.amount || ''}
          onChange={(e) => onChange({
            ...entry,
            amount: parseFloat(e.target.value) || 0
          })}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Entry Type */}
      <div className="col-span-2">
        <select
          value={entry.type}
          onChange={(e) => onChange({
            ...entry,
            type: e.target.value as 'debit' | 'credit'
          })}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="debit">مدين</option>
          <option value="credit">دائن</option>
        </select>
      </div>

      {/* Description */}
      <div className="col-span-3">
        <input
          type="text"
          placeholder="البيان"
          value={entry.description || ''}
          onChange={(e) => onChange({
            ...entry,
            description: e.target.value
          })}
          onFocus={() => setShowSuggestions(suggestions.length > 0)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Actions */}
      <div className="col-span-1 flex justify-center">
        <button
          onClick={onRemove}
          className="text-red-600 hover:text-red-800 p-1"
          title="حذف القيد"
        >
          ❌
        </button>
      </div>
    </div>
  );
};

// Balance Summary Component
const TransactionBalanceSummary: React.FC<TransactionBalanceSummary> = ({ entries, isCalculating }) => {
  const totalDebits = useMemo(() =>
    entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + (e.amount || 0), 0),
    [entries]
  );

  const totalCredits = useMemo(() =>
    entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + (e.amount || 0), 0),
    [entries]
  );

  const difference = totalDebits - totalCredits;
  const isBalanced = Math.abs(difference) < 0.01;

  return (
    <div className="bg-white border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">ملخص التوازن</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-600">إجمالي المدين</p>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(totalDebits)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">إجمالي الدائن</p>
          <p className="text-xl font-bold text-blue-600">
            {formatCurrency(totalCredits)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">الفرق</p>
          <p className={`text-xl font-bold ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(Math.abs(difference))}
          </p>
          {isCalculating ? (
            <span className="text-xs text-gray-500 animate-pulse">جاري الحساب...</span>
          ) : isBalanced ? (
            <span className="text-green-600 text-sm">✓ متوازن</span>
          ) : (
            <span className="text-red-600 text-sm">⚠ غير متوازن</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Validation Results Display Component
const ValidationResultsDisplay: React.FC<ValidationResultDisplay> = ({ results }) => {
  if (!results.length) return null;

  return (
    <div className="space-y-3">
      {results.map((result, index) => (
        <div key={index} className="border rounded-lg p-4">
          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <h4 className="font-semibold text-red-800 mb-2">أخطاء التحقق:</h4>
              <ul className="text-red-700 text-sm space-y-1">
                {result.errors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="font-semibold text-yellow-800 mb-2">تحذيرات:</h4>
              <ul className="text-yellow-700 text-sm space-y-1">
                {result.warnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {result.isValid && result.errors.length === 0 && result.warnings.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 font-medium">✓ المعاملة صحيحة ومتوازنة</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Main Advanced Daily Entry Form Component
export const AdvancedDailyEntryForm: React.FC<AdvancedDailyEntryFormProps> = ({
  shopId,
  financialYearId,
  onTransactionCreated,
  preloadedTemplate,
  onClose
}) => {
  const [entries, setEntries] = useState<TransactionEntryRow[]>([
    { id: '1', accountId: '', type: 'debit', amount: 0, description: '' },
    { id: '2', accountId: '', type: 'credit', amount: 0, description: '' }
  ]);

  const [transactionData, setTransactionData] = useState<Partial<CreateTransactionData>>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    shopId,
    type: TransactionType.TRANSFER
  });

  const [selectedTemplate, setSelectedTemplate] = useState<TransactionTemplate | null>(preloadedTemplate || null);
  const [isAutoBalanceEnabled, setIsAutoBalanceEnabled] = useState(true);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [accountSuggestions, setAccountSuggestions] = useState<AccountSuggestion[]>([]);

  const { isLoading, setLoading } = useLoading();
  const { showToast } = useToast();

  // Load draft on component mount
  useEffect(() => {
    loadDraft();
  }, [shopId, financialYearId]);

  // Real-time validation when entries change
  useEffect(() => {
    if (entries.length >= 2 && entries.some(e => e.accountId && e.amount > 0)) {
      validateTransaction();
    }
  }, [entries, transactionData]);

  // Apply preloaded template
  useEffect(() => {
    if (preloadedTemplate) {
      applyTemplate(preloadedTemplate);
    }
  }, [preloadedTemplate]);

  const loadDraft = useCallback(() => {
    try {
      const draftData = localStorage.getItem(`transaction-draft-${shopId}-${financialYearId}`);
      if (draftData) {
        const parsed = JSON.parse(draftData);
        setEntries(parsed.entries || entries);
        setTransactionData(parsed.transactionData || transactionData);
        setIsDraftMode(true);
        showToast('تم تحميل المسودة المحفوظة', 'info');
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, [shopId, financialYearId]);

  const saveDraft = useCallback(async () => {
    try {
      const draftData = {
        entries,
        transactionData,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(`transaction-draft-${shopId}-${financialYearId}`, JSON.stringify(draftData));
      setIsDraftMode(true);
      showToast('تم حفظ المسودة', 'success');
    } catch (error) {
      console.error('Error saving draft:', error);
      showToast('خطأ في حفظ المسودة', 'error');
    }
  }, [entries, transactionData, shopId, financialYearId]);

  const applyTemplate = useCallback(async (template: TransactionTemplate) => {
    try {
      setLoading(true);
      const appliedData = await TransactionTemplateService.applyTemplate(template.id, {
        shopId,
        financialYearId,
        date: transactionData.date
      });

      const templateEntries: TransactionEntryRow[] = appliedData.entries.map((entry, index) => ({
        id: `template-${index}`,
        ...entry
      }));

      setEntries(templateEntries);
      setTransactionData({
        ...transactionData,
        description: appliedData.description,
        reference: appliedData.reference
      });
      setSelectedTemplate(template);

      showToast(`تم تطبيق القالب: ${template.name}`, 'success');
    } catch (error) {
      console.error('Error applying template:', error);
      showToast('خطأ في تطبيق القالب', 'error');
    } finally {
      setLoading(false);
    }
  }, [shopId, financialYearId, transactionData]);

  const validateTransaction = useCallback(async () => {
    if (entries.length < 2 || !entries.some(e => e.accountId && e.amount > 0)) {
      setValidationResults([]);
      return;
    }

    try {
      const createTransactionData: CreateTransactionData = {
        date: transactionData.date!,
        description: transactionData.description || 'معاملة يومية',
        shopId,
        entries: entries.filter(e => e.accountId && e.amount > 0),
        type: transactionData.type || TransactionType.TRANSFER,
        reference: transactionData.reference
      };

      const validation = await TransactionValidator.validateTransaction(createTransactionData);
      setValidationResults([validation]);
    } catch (error) {
      console.error('Validation error:', error);
    }
  }, [entries, transactionData, shopId]);

  const handleAutoBalance = useCallback(() => {
    const totalDebits = entries
      .filter(e => e.type === 'debit')
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalCredits = entries
      .filter(e => e.type === 'credit')
      .reduce((sum, e) => sum + (e.amount || 0), 0);

    const difference = totalDebits - totalCredits;

    if (Math.abs(difference) > 0.01) {
      const newEntries = [...entries];
      const lastEntry = newEntries[newEntries.length - 1];

      if (difference > 0) {
        // Need more credits
        if (lastEntry.type === 'credit') {
          lastEntry.amount = (lastEntry.amount || 0) + difference;
        } else {
          newEntries.push({
            id: `auto-${Date.now()}`,
            accountId: '',
            type: 'credit',
            amount: difference,
            description: 'توازن تلقائي'
          });
        }
      } else {
        // Need more debits
        if (lastEntry.type === 'debit') {
          lastEntry.amount = (lastEntry.amount || 0) + Math.abs(difference);
        } else {
          newEntries.push({
            id: `auto-${Date.now()}`,
            accountId: '',
            type: 'debit',
            amount: Math.abs(difference),
            description: 'توازن تلقائي'
          });
        }
      }

      setEntries(newEntries);
      showToast('تم التوازن التلقائي', 'info');
    }
  }, [entries]);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const createTransactionData: CreateTransactionData = {
        date: transactionData.date!,
        description: transactionData.description || 'معاملة يومية',
        shopId,
        entries: entries.filter(e => e.accountId && e.amount > 0),
        type: transactionData.type || TransactionType.TRANSFER,
        reference: transactionData.reference
      };

      const transaction = await TransactionService.createTransaction(createTransactionData);

      // Clear form
      setEntries([
        { id: '1', accountId: '', type: 'debit', amount: 0, description: '' },
        { id: '2', accountId: '', type: 'credit', amount: 0, description: '' }
      ]);
      setTransactionData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        reference: '',
        shopId,
        type: TransactionType.TRANSFER
      });

      // Clear draft
      localStorage.removeItem(`transaction-draft-${shopId}-${financialYearId}`);
      setIsDraftMode(false);
      setValidationResults([]);

      // Log success
      await LoggingService.logAction(
        'current-user', // Should be passed from props in real implementation
        'ADD_ENTRY' as any,
        `تم إنشاء معاملة جديدة: ${transaction.description}`,
        shopId
      );

      onTransactionCreated(transaction);
      showToast('تم إنشاء المعاملة بنجاح', 'success');

      if (onClose) onClose();
    } catch (error) {
      console.error('Error creating transaction:', error);
      showToast('خطأ في إنشاء المعاملة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addEntry = useCallback(() => {
    setEntries([...entries, {
      id: `entry-${Date.now()}`,
      accountId: '',
      type: 'debit',
      amount: 0,
      description: ''
    }]);
  }, [entries]);

  const removeEntry = useCallback((index: number) => {
    if (entries.length > 2) {
      setEntries(entries.filter((_, i) => i !== index));
    }
  }, [entries]);

  const updateEntry = useCallback((index: number, updatedEntry: TransactionEntryRow) => {
    const newEntries = [...entries];
    newEntries[index] = updatedEntry;
    setEntries(newEntries);
  }, [entries]);

  const isFormValid = useMemo(() => {
    const hasValidEntries = entries.filter(e => e.accountId && e.amount > 0).length >= 2;
    const isBalanced = Math.abs(
      entries.filter(e => e.type === 'debit').reduce((sum, e) => sum + (e.amount || 0), 0) -
      entries.filter(e => e.type === 'credit').reduce((sum, e) => sum + (e.amount || 0), 0)
    ) < 0.01;
    const hasValidationErrors = validationResults.some(r => r.errors.length > 0);

    return hasValidEntries && isBalanced && !hasValidationErrors;
  }, [entries, validationResults]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">نموذج القيد اليومي المتقدم</h2>
          <div className="flex space-x-2 space-x-reverse">
            {isDraftMode && (
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                مسودة محفوظة
              </span>
            )}
            <button
              onClick={saveDraft}
              disabled={isLoading}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              حفظ مسودة
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                إغلاق
              </button>
            )}
          </div>
        </div>

        {/* Template Selector */}
        <TemplateSelector
          shopId={shopId}
          financialYearId={financialYearId}
          selectedTemplate={selectedTemplate}
          onTemplateSelected={applyTemplate}
        />
      </div>

      {/* Transaction Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">تفاصيل المعاملة</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">التاريخ</label>
            <input
              type="date"
              value={transactionData.date}
              onChange={(e) => setTransactionData({ ...transactionData, date: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">رقم المرجع</label>
            <input
              type="text"
              value={transactionData.reference || ''}
              onChange={(e) => setTransactionData({ ...transactionData, reference: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="رقم الفاتورة أو المرجع"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">البيان العام</label>
            <input
              type="text"
              value={transactionData.description || ''}
              onChange={(e) => setTransactionData({ ...transactionData, description: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="وصف المعاملة"
            />
          </div>
        </div>
      </div>

      {/* Transaction Entries */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">قيود المعاملة</h3>
          <div className="flex items-center space-x-4 space-x-reverse">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isAutoBalanceEnabled}
                onChange={(e) => setIsAutoBalanceEnabled(e.target.checked)}
                className="ml-2"
              />
              <span className="text-sm">توازن تلقائي</span>
            </label>
            {isAutoBalanceEnabled && !isFormValid && (
              <button
                onClick={handleAutoBalance}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                توازن الآن
              </button>
            )}
            <button
              onClick={addEntry}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              إضافة قيد
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {entries.map((entry, index) => (
            <TransactionEntryRow
              key={entry.id}
              entry={entry}
              index={index}
              shopId={shopId}
              financialYearId={financialYearId}
              onChange={(updatedEntry) => updateEntry(index, updatedEntry)}
              onRemove={() => removeEntry(index)}
              suggestions={accountSuggestions}
            />
          ))}
        </div>
      </div>

      {/* Balance Summary */}
      <TransactionBalanceSummary entries={entries} isCalculating={isLoading} />

      {/* Validation Results */}
      {validationResults.length > 0 && (
        <ValidationResultsDisplay results={validationResults} />
      )}

      {/* Submit Actions */}
      <div className="flex justify-end space-x-4 space-x-reverse">
        <button
          onClick={handleSubmit}
          disabled={!isFormValid || isLoading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'جاري الحفظ...' : 'حفظ وترحيل المعاملة'}
        </button>
      </div>
    </div>
  );
};