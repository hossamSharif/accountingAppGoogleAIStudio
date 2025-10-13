import React, { useState, useEffect } from 'react';
import { OfflineManager } from '../services/offlineManager';
import { SyncService } from '../services/syncService';
import { User, Shop } from '../types';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { translate, getCurrentLanguage } from '../utils/translate';
import { formatCurrency } from '../utils/formatting';

// Icons
const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const SyncIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface PendingTransaction {
  id: string;
  transaction: any;
  timestamp: number;
  userId: string;
  shopId: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  errorMessage?: string;
}

interface OfflineTransactionsViewProps {
  user: User;
  activeShop: Shop;
  onUpdate?: () => void;
}

const OfflineTransactionsView: React.FC<OfflineTransactionsViewProps> = ({
  user,
  activeShop,
  onUpdate
}) => {
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<PendingTransaction | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isOnline } = useConnectionStatus();
  const lang = getCurrentLanguage();

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    amount: 0,
    type: 'income' as 'income' | 'expense',
    category: '',
    description: '',
    accountName: ''
  });

  // Load pending transactions
  const loadPendingTransactions = async () => {
    setLoading(true);
    try {
      const transactions = await OfflineManager.getPendingTransactions(activeShop.id);
      setPendingTransactions(transactions);
    } catch (error) {
      console.error('Error loading pending transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingTransactions();
  }, [activeShop.id]);

  // Handle edit
  const handleEdit = (transaction: PendingTransaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      amount: transaction.transaction.amount || 0,
      type: transaction.transaction.type || 'income',
      category: transaction.transaction.category || '',
      description: transaction.transaction.description || '',
      accountName: transaction.transaction.accountName || ''
    });
  };

  // Save edited transaction
  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    try {
      const updatedTransaction = {
        ...editingTransaction.transaction,
        ...editFormData,
        updatedAt: new Date().toISOString()
      };

      await OfflineManager.editPendingTransaction(editingTransaction.id, updatedTransaction);
      await loadPendingTransactions();
      setEditingTransaction(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert(translate('Error updating transaction', 'خطأ في تحديث المعاملة', lang));
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await OfflineManager.deletePendingTransaction(id);
      await loadPendingTransactions();
      setShowDeleteConfirm(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert(translate('Error deleting transaction', 'خطأ في حذف المعاملة', lang));
    }
  };

  // Sync single transaction
  const syncSingleTransaction = async (transaction: PendingTransaction) => {
    if (!isOnline) {
      alert(translate('Cannot sync while offline', 'لا يمكن المزامنة أثناء عدم الاتصال', lang));
      return;
    }

    setIsSyncing(true);
    try {
      await SyncService.syncPendingTransactions(user, activeShop.id);
      await loadPendingTransactions();
      onUpdate?.();
    } catch (error) {
      console.error('Error syncing transaction:', error);
      alert(translate('Error syncing transaction', 'خطأ في مزامنة المعاملة', lang));
    } finally {
      setIsSyncing(false);
    }
  };

  // Sync all transactions
  const syncAllTransactions = async () => {
    if (!isOnline) {
      alert(translate('Cannot sync while offline', 'لا يمكن المزامنة أثناء عدم الاتصال', lang));
      return;
    }

    setIsSyncing(true);
    try {
      await SyncService.syncPendingTransactions(user, activeShop.id);
      await loadPendingTransactions();
      onUpdate?.();
    } catch (error) {
      console.error('Error syncing transactions:', error);
      alert(translate('Error syncing transactions', 'خطأ في مزامنة المعاملات', lang));
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string, errorMessage?: string) => {
    const statusClasses = {
      pending: 'bg-yellow-100 text-yellow-800',
      syncing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800'
    };

    const statusText = {
      pending: translate('Pending', 'معلق', lang),
      syncing: translate('Syncing', 'يتم المزامنة', lang),
      failed: translate('Failed', 'فشل', lang)
    };

    return (
      <div className="flex items-center">
        <span className={`px-2 py-1 text-xs rounded-full ${statusClasses[status as keyof typeof statusClasses]}`}>
          {statusText[status as keyof typeof statusText]}
        </span>
        {status === 'failed' && errorMessage && (
          <span className="ml-2 text-xs text-red-600" title={errorMessage}>
            ⚠️
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-300">
            {translate('Loading offline transactions...', 'جارٍ تحميل المعاملات غير المتصلة...', lang)}
          </span>
        </div>
      </div>
    );
  }

  if (pendingTransactions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{translate('No offline transactions', 'لا توجد معاملات غير متصلة', lang)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {translate('Offline Transactions', 'المعاملات غير المتصلة', lang)} ({pendingTransactions.length})
          </h3>
          {isOnline && pendingTransactions.length > 0 && (
            <button
              onClick={syncAllTransactions}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SyncIcon />
              {isSyncing ? (
                <span className="animate-spin">⏳</span>
              ) : (
                translate('Sync All', 'مزامنة الكل', lang)
              )}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {translate('Date', 'التاريخ', lang)}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {translate('Type', 'النوع', lang)}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {translate('Category', 'الفئة', lang)}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {translate('Amount', 'المبلغ', lang)}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {translate('Account', 'الحساب', lang)}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {translate('Status', 'الحالة', lang)}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {translate('Actions', 'الإجراءات', lang)}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {pendingTransactions.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(item.timestamp)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    item.transaction.type === 'income'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.transaction.type === 'income'
                      ? translate('Income', 'دخل', lang)
                      : translate('Expense', 'مصروف', lang)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {item.transaction.category || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  <span className={item.transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(item.transaction.amount || 0)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {item.transaction.accountName || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getStatusBadge(item.status, item.errorMessage)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title={translate('Edit', 'تعديل', lang)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(item.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      title={translate('Delete', 'حذف', lang)}
                    >
                      <DeleteIcon />
                    </button>
                    {isOnline && (
                      <button
                        onClick={() => syncSingleTransaction(item)}
                        disabled={isSyncing}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                        title={translate('Sync', 'مزامنة', lang)}
                      >
                        <SyncIcon />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {translate('Edit Transaction', 'تعديل المعاملة', lang)}
              </h3>
              <button
                onClick={() => setEditingTransaction(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {translate('Type', 'النوع', lang)}
                </label>
                <select
                  value={editFormData.type}
                  onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value as 'income' | 'expense' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-200"
                >
                  <option value="income">{translate('Income', 'دخل', lang)}</option>
                  <option value="expense">{translate('Expense', 'مصروف', lang)}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {translate('Amount', 'المبلغ', lang)}
                </label>
                <input
                  type="number"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {translate('Category', 'الفئة', lang)}
                </label>
                <input
                  type="text"
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {translate('Description', 'الوصف', lang)}
                </label>
                <input
                  type="text"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {translate('Account', 'الحساب', lang)}
                </label>
                <input
                  type="text"
                  value={editFormData.accountName}
                  onChange={(e) => setEditFormData({ ...editFormData, accountName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingTransaction(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {translate('Cancel', 'إلغاء', lang)}
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {translate('Save', 'حفظ', lang)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
              {translate('Confirm Delete', 'تأكيد الحذف', lang)}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {translate(
                'Are you sure you want to delete this transaction?',
                'هل أنت متأكد من رغبتك في حذف هذه المعاملة؟',
                lang
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                {translate('Cancel', 'إلغاء', lang)}
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {translate('Delete', 'حذف', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineTransactionsView;