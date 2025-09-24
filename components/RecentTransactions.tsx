import React from 'react';
import { Transaction, TransactionType, Account } from '../types';

interface RecentTransactionsProps {
    transactions: Transaction[];
    accounts: Account[];
    onDelete: (transactionId: string) => void;
    onStartEdit: (transaction: Transaction) => void;
}

const getTransactionTypeStyle = (type: TransactionType) => {
    switch (type) {
        case TransactionType.SALE:
            return 'bg-green-500/20 text-green-400';
        case TransactionType.PURCHASE:
            return 'bg-yellow-500/20 text-yellow-400';
        case TransactionType.EXPENSE:
            return 'bg-red-500/20 text-red-400';
        case TransactionType.TRANSFER:
            return 'bg-blue-500/20 text-blue-400';
        default:
            return 'bg-gray-500/20 text-gray-400';
    }
};

const EditIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
);

const DeleteIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
);

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions, accounts, onDelete, onStartEdit }) => {
    
    const getAccountName = (accountId: string | undefined) => {
        if (!accountId) return 'غير محدد';
        return accounts.find(a => a.id === accountId)?.name || 'غير معروف';
    };

    const getTransactionContextName = (t: Transaction) => {
        if (t.type === TransactionType.TRANSFER) {
            const fromAccount = getAccountName(t.entries.find(e => e.amount < 0)?.accountId);
            const toAccount = getAccountName(t.entries.find(e => e.amount > 0)?.accountId);
            return `من ${fromAccount} إلى ${toAccount}`;
        }
        if (t.partyId) return getAccountName(t.partyId);
        if (t.categoryId) return getAccountName(t.categoryId);
        return 'حركة عامة'
    };
    
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ar-SD', { style: 'currency', currency: 'SDG', minimumFractionDigits: 0 }).format(amount);
    };

    return (
        <div className="bg-surface p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4">آخر الحركات المسجلة</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead>
                        <tr className="border-b border-gray-700 text-text-secondary">
                            <th className="p-3">التاريخ</th>
                            <th className="p-3">النوع</th>
                            <th className="p-3">البيان</th>
                            <th className="p-3">الوصف</th>
                            <th className="p-3 text-left">المبلغ</th>
                            <th className="p-3 text-center">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.slice(0, 10).map((t, index) => (
                            <tr key={t.id} className={`border-b border-gray-700 ${index % 2 === 0 ? 'bg-background/50' : ''}`}>
                                <td className="p-3 whitespace-nowrap text-text-secondary">{new Date(t.date).toLocaleDateString('ar-EG', { day: '2-digit', month: 'short' })}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeStyle(t.type)}`}>
                                        {t.type}
                                    </span>
                                </td>
                                <td className="p-3 text-sm">{getTransactionContextName(t)}</td>
                                <td className="p-3">{t.description}</td>
                                <td className={`p-3 text-left font-mono font-bold ${t.type === TransactionType.SALE ? 'text-green-400' : t.type === TransactionType.TRANSFER ? 'text-blue-300' : 'text-red-400'}`}>
                                    {formatCurrency(t.totalAmount)}
                                </td>
                                <td className="p-3 text-center">
                                    <button
                                        onClick={() => onStartEdit(t)}
                                        className="text-accent hover:text-blue-400 p-2 transition-colors duration-200"
                                        aria-label={`تعديل حركة ${t.description}`}
                                    >
                                        <EditIcon />
                                    </button>
                                    <button
                                        onClick={() => onDelete(t.id)}
                                        className="text-red-500 hover:text-red-400 p-2 transition-colors duration-200"
                                        aria-label={`حذف حركة ${t.description}`}
                                    >
                                        <DeleteIcon />
                                    </button>
                                </td>
                            </tr>
                        ))}
                         {transactions.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center p-6 text-text-secondary">
                                    لا توجد حركات مسجلة. قم بإضافة حركة جديدة للبدء.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RecentTransactions;