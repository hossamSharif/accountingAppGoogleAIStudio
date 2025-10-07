import React, { useState, useCallback, useRef } from 'react';
import {
  ImportTransactionData,
  BulkValidationResult,
  ImportProgress,
  ImportResult,
  ExportOptions,
  ExportResult,
  BulkEditOperation,
  ExportFormat,
  DateRange,
  EnhancedTransaction
} from '../types';
import { BulkOperationService } from '../services/bulkOperationService';
import { TransactionService } from '../services/transactionService';
import { Toast } from './Toast';
import { useToast } from '../hooks/useToast';
import { useLoading } from '../hooks/useLoading';
import { formatCurrency } from '../utils/formatting';

interface BulkTransactionManagerProps {
  shopId: string;
  financialYearId: string;
  onTransactionsUpdated?: () => void;
}

interface BulkImportPanelProps {
  onFileImport: (file: File) => void;
  importData: ImportTransactionData[];
  validationResults: BulkValidationResult[];
  importProgress: ImportProgress | null;
  onProcessImport: () => void;
  isProcessing: boolean;
}

interface BulkExportPanelProps {
  shopId: string;
  financialYearId: string;
  onExport: (format: ExportFormat, options: ExportOptions) => void;
  isProcessing: boolean;
}

interface BulkEditPanelProps {
  shopId: string;
  financialYearId: string;
  selectedTransactions: string[];
  onSelectionChange: (transactionIds: string[]) => void;
  onBulkEdit: (operations: BulkEditOperation[]) => void;
  isProcessing: boolean;
}

// File Uploader Component
const FileUploader: React.FC<{
  accept: string;
  onFileSelect: (file: File) => void;
  className?: string;
  children: React.ReactNode;
}> = ({ accept, onFileSelect, className, children }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className={className}
      >
        {children}
      </button>
    </>
  );
};

// Bulk Import Panel Component
const BulkImportPanel: React.FC<BulkImportPanelProps> = ({
  onFileImport,
  importData,
  validationResults,
  importProgress,
  onProcessImport,
  isProcessing
}) => {
  const downloadTemplate = () => {
    // Create and download Excel template
    const templateData = [
      ['التاريخ', 'البيان', 'المرجع', 'حساب المدين', 'مبلغ المدين', 'حساب الدائن', 'مبلغ الدائن', 'ملاحظات'],
      ['2024-01-01', 'مبيعات نقدية', 'INV001', 'الصندوق', '1000', 'المبيعات', '1000', ''],
      ['2024-01-02', 'شراء بضاعة', 'PUR001', 'المشتريات', '500', 'الموردين', '500', '']
    ];

    const csvContent = templateData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'template_bulk_transactions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderValidationSummary = () => {
    const validCount = validationResults.filter(r => r.isValid).length;
    const invalidCount = validationResults.filter(r => !r.isValid).length;

    return (
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{importData.length}</div>
          <div className="text-blue-800 text-sm">إجمالي المعاملات</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{validCount}</div>
          <div className="text-green-800 text-sm">صحيحة</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{invalidCount}</div>
          <div className="text-red-800 text-sm">بها أخطاء</div>
        </div>
      </div>
    );
  };

  const renderImportProgress = () => {
    if (!importProgress) return null;

    const progressPercentage = (importProgress.processed / importProgress.total) * 100;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">جاري الاستيراد...</span>
          <span className="text-sm">
            {importProgress.processed} / {importProgress.total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        {importProgress.currentItem && (
          <div className="text-sm text-gray-600">
            المعاملة الحالية: {importProgress.currentItem}
          </div>
        )}
        {importProgress.failed > 0 && (
          <div className="text-sm text-red-600 mt-1">
            فشل: {importProgress.failed} معاملة
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">استيراد المعاملات</h3>
        <p className="text-blue-700 text-sm mb-4">
          يمكنك استيراد المعاملات من ملف Excel أو CSV. تأكد من أن الملف يتبع القالب المحدد.
        </p>
        <div className="flex space-x-4 space-x-reverse">
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            تحميل القالب
          </button>
          <FileUploader
            accept=".xlsx,.csv,.xls"
            onFileSelect={onFileImport}
            className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-100"
          >
            اختر ملف للاستيراد
          </FileUploader>
        </div>
      </div>

      {importProgress && renderImportProgress()}

      {importData.length > 0 && !importProgress && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-4">معاينة الاستيراد</h3>

          {renderValidationSummary()}

          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-right">التاريخ</th>
                  <th className="px-4 py-2 text-right">البيان</th>
                  <th className="px-4 py-2 text-right">المرجع</th>
                  <th className="px-4 py-2 text-right">المبلغ</th>
                  <th className="px-4 py-2 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {importData.map((transaction, index) => {
                  const validation = validationResults[index];
                  const totalAmount = transaction.entries.reduce((sum, e) => sum + e.amount, 0) / 2;

                  return (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-2">{transaction.date}</td>
                      <td className="px-4 py-2">{transaction.description}</td>
                      <td className="px-4 py-2">{transaction.reference || '-'}</td>
                      <td className="px-4 py-2">{formatCurrency(totalAmount)}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          validation?.isValid
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {validation?.isValid ? 'صحيح' : 'خطأ'}
                        </span>
                        {validation && !validation.isValid && (
                          <div className="text-xs text-red-600 mt-1">
                            {validation.errors.slice(0, 2).join(', ')}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={onProcessImport}
              disabled={isProcessing || !validationResults.some(r => r.isValid)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isProcessing ? 'جاري الاستيراد...' : 'تنفيذ الاستيراد'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Bulk Export Panel Component
const BulkExportPanel: React.FC<BulkExportPanelProps> = ({
  shopId,
  financialYearId,
  onExport,
  isProcessing
}) => {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [includeAccounts, setIncludeAccounts] = useState(true);
  const [includeBalances, setIncludeBalances] = useState(false);
  const [groupBy, setGroupBy] = useState<'date' | 'account' | 'shop'>('date');

  const handleExport = () => {
    const options: ExportOptions = {
      format: exportFormat,
      dateRange,
      includeAccounts,
      includeBalances,
      groupBy
    };

    onExport(exportFormat, options);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">إعدادات التصدير</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              صيغة التصدير
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="excel">Excel (.xlsx)</option>
              <option value="csv">CSV (.csv)</option>
              <option value="pdf">PDF (.pdf)</option>
            </select>
          </div>

          {/* Group By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تجميع البيانات حسب
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">التاريخ</option>
              <option value="account">الحساب</option>
              <option value="shop">المتجر</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              من تاريخ
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              إلى تاريخ
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Additional Options */}
        <div className="space-y-3 mt-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeAccounts}
              onChange={(e) => setIncludeAccounts(e.target.checked)}
              className="ml-2"
            />
            <span className="text-sm">تضمين تفاصيل الحسابات</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeBalances}
              onChange={(e) => setIncludeBalances(e.target.checked)}
              className="ml-2"
            />
            <span className="text-sm">تضمين أرصدة الحسابات</span>
          </label>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleExport}
            disabled={isProcessing}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isProcessing ? 'جاري التصدير...' : 'تصدير البيانات'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Bulk Edit Panel Component
const BulkEditPanel: React.FC<BulkEditPanelProps> = ({
  shopId,
  financialYearId,
  selectedTransactions,
  onSelectionChange,
  onBulkEdit,
  isProcessing
}) => {
  const [transactions, setTransactions] = useState<EnhancedTransaction[]>([]);
  const [editOperations, setEditOperations] = useState<BulkEditOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const transactionList = await TransactionService.getTransactionsByShop(shopId, financialYearId);
      setTransactions(transactionList);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [shopId, financialYearId]);

  React.useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleSelectAll = () => {
    if (selectedTransactions.length === transactions.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(transactions.map(t => t.id));
    }
  };

  const handleTransactionSelect = (transactionId: string) => {
    if (selectedTransactions.includes(transactionId)) {
      onSelectionChange(selectedTransactions.filter(id => id !== transactionId));
    } else {
      onSelectionChange([...selectedTransactions, transactionId]);
    }
  };

  const addEditOperation = () => {
    setEditOperations([...editOperations, {
      type: 'UPDATE_DESCRIPTION',
      value: ''
    }]);
  };

  const removeEditOperation = (index: number) => {
    setEditOperations(editOperations.filter((_, i) => i !== index));
  };

  const updateEditOperation = (index: number, operation: BulkEditOperation) => {
    const newOperations = [...editOperations];
    newOperations[index] = operation;
    setEditOperations(newOperations);
  };

  const handleBulkEdit = () => {
    if (editOperations.length > 0 && selectedTransactions.length > 0) {
      onBulkEdit(editOperations);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-64 rounded-lg"></div>;
  }

  return (
    <div className="space-y-6">
      {/* Selection Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="font-medium">
            تم اختيار {selectedTransactions.length} من {transactions.length} معاملة
          </span>
          <button
            onClick={handleSelectAll}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {selectedTransactions.length === transactions.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
          </button>
        </div>
      </div>

      {/* Edit Operations */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">العمليات المجمعة</h3>
          <button
            onClick={addEditOperation}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            إضافة عملية
          </button>
        </div>

        {editOperations.map((operation, index) => (
          <div key={index} className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg mb-3">
            <div className="col-span-4">
              <select
                value={operation.type}
                onChange={(e) => updateEditOperation(index, { ...operation, type: e.target.value as any })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="UPDATE_DESCRIPTION">تحديث البيان</option>
                <option value="UPDATE_DATE">تحديث التاريخ</option>
                <option value="UPDATE_REFERENCE">تحديث المرجع</option>
                <option value="ADD_TAG">إضافة علامة</option>
                <option value="REMOVE_TAG">إزالة علامة</option>
              </select>
            </div>

            <div className="col-span-7">
              <input
                type={operation.type === 'UPDATE_DATE' ? 'date' : 'text'}
                value={operation.value}
                onChange={(e) => updateEditOperation(index, { ...operation, value: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="القيمة الجديدة"
              />
            </div>

            <div className="col-span-1">
              <button
                onClick={() => removeEditOperation(index)}
                className="text-red-600 hover:text-red-800 p-1"
              >
                ❌
              </button>
            </div>
          </div>
        ))}

        {editOperations.length > 0 && selectedTransactions.length > 0 && (
          <div className="flex justify-end mt-4">
            <button
              onClick={handleBulkEdit}
              disabled={isProcessing}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {isProcessing ? 'جاري التطبيق...' : 'تطبيق العمليات المجمعة'}
            </button>
          </div>
        )}
      </div>

      {/* Transactions List */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">قائمة المعاملات</h3>
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.length === transactions.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-2 text-right">التاريخ</th>
                <th className="px-4 py-2 text-right">البيان</th>
                <th className="px-4 py-2 text-right">المرجع</th>
                <th className="px-4 py-2 text-right">المبلغ</th>
                <th className="px-4 py-2 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.includes(transaction.id)}
                      onChange={() => handleTransactionSelect(transaction.id)}
                    />
                  </td>
                  <td className="px-4 py-2">{transaction.date}</td>
                  <td className="px-4 py-2">{transaction.description}</td>
                  <td className="px-4 py-2">{transaction.reference || '-'}</td>
                  <td className="px-4 py-2">
                    {formatCurrency(transaction.entries.reduce((sum, e) => sum + e.amount, 0) / 2)}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      transaction.status === 'posted'
                        ? 'bg-green-100 text-green-800'
                        : transaction.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.status === 'posted' ? 'مرحل' :
                       transaction.status === 'draft' ? 'مسودة' : 'ملغي'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main Bulk Transaction Manager Component
export const BulkTransactionManager: React.FC<BulkTransactionManagerProps> = ({
  shopId,
  financialYearId,
  onTransactionsUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'edit'>('import');
  const [importData, setImportData] = useState<ImportTransactionData[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [validationResults, setValidationResults] = useState<BulkValidationResult[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  const { isLoading, setLoading } = useLoading();
  const { showToast } = useToast();

  // Excel/CSV Import Handler
  const handleFileImport = async (file: File) => {
    try {
      setLoading(true);
      const data = await BulkOperationService.parseTransactionFile(file);

      // Validate imported data
      const validationResults = await BulkOperationService.validateBulkTransactions(
        data,
        shopId,
        financialYearId
      );

      setImportData(data);
      setValidationResults(validationResults);
      showToast(`تم تحليل ${data.length} معاملة من الملف`, 'success');
    } catch (error) {
      console.error('Import error:', error);
      showToast('خطأ في استيراد الملف', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Process bulk import with progress tracking
  const processBulkImport = async () => {
    try {
      setLoading(true);

      const validTransactions = importData.filter((_, index) =>
        validationResults[index]?.isValid
      );

      setImportProgress({
        total: validTransactions.length,
        processed: 0,
        failed: 0,
        currentItem: null
      });

      const results = await BulkOperationService.importTransactions(
        validTransactions,
        shopId,
        financialYearId,
        {
          onProgress: (progress) => setImportProgress(progress),
          batchSize: 10, // Process 10 transactions at a time
          validateBeforeImport: true
        }
      );

      showToast(`تم استيراد ${results.successful} معاملة بنجاح`, 'success');

      if (results.failed > 0) {
        showToast(`فشل في استيراد ${results.failed} معاملة`, 'warning');
      }

      // Clear import data
      setImportData([]);
      setValidationResults([]);
      setImportProgress(null);

      if (onTransactionsUpdated) {
        onTransactionsUpdated();
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      showToast('خطأ في المعالجة المجمعة', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Bulk export with format options
  const handleBulkExport = async (format: ExportFormat, options: ExportOptions) => {
    try {
      setLoading(true);

      const exportData = await BulkOperationService.exportTransactions(
        shopId,
        financialYearId,
        options
      );

      // Download file
      const blob = new Blob([exportData.content], { type: exportData.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('تم تصدير البيانات بنجاح', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('خطأ في تصدير البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Bulk edit operations
  const handleBulkEdit = async (operations: BulkEditOperation[]) => {
    try {
      setLoading(true);

      const results = await BulkOperationService.applyBulkEdits(
        selectedTransactions,
        operations,
        shopId,
        financialYearId
      );

      showToast(`تم تحديث ${results.successful} معاملة`, 'success');

      if (results.failed > 0) {
        showToast(`فشل في تحديث ${results.failed} معاملة`, 'warning');
      }

      // Refresh transaction list
      setSelectedTransactions([]);

      if (onTransactionsUpdated) {
        onTransactionsUpdated();
      }
    } catch (error) {
      console.error('Bulk edit error:', error);
      showToast('خطأ في التحديث المجمع', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'import', name: 'استيراد المعاملات', icon: '📥' },
              { id: 'export', name: 'تصدير البيانات', icon: '📤' },
              { id: 'edit', name: 'تحرير مجمع', icon: '✏️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="ml-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'import' && (
            <BulkImportPanel
              onFileImport={handleFileImport}
              importData={importData}
              validationResults={validationResults}
              importProgress={importProgress}
              onProcessImport={processBulkImport}
              isProcessing={isLoading}
            />
          )}

          {activeTab === 'export' && (
            <BulkExportPanel
              shopId={shopId}
              financialYearId={financialYearId}
              onExport={handleBulkExport}
              isProcessing={isLoading}
            />
          )}

          {activeTab === 'edit' && (
            <BulkEditPanel
              shopId={shopId}
              financialYearId={financialYearId}
              selectedTransactions={selectedTransactions}
              onSelectionChange={setSelectedTransactions}
              onBulkEdit={handleBulkEdit}
              isProcessing={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};