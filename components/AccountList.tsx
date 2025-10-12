import React, { useMemo } from 'react';
import { Account, AccountNature, Transaction, User } from '../types';
import { formatCurrency } from '../utils/formatting';
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, accountClassificationTranslations, accountNatureTranslations } from '../i18n/enumTranslations';
import { getBilingualText } from '../utils/bilingual';

const EditIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
);
const ToggleOnIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"></path></svg>
);
const ToggleOffIcon = () => (
     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
);
const DeleteIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
);


interface AccountListProps {
    accounts: Account[];
    transactions: Transaction[];
    onEdit: (account: Account) => void;
    onToggleStatus: (account: Account) => void;
    onDelete: (account: Account) => void;
    accountBalances: { [key: string]: number };
    currentUser: User | null;
}

const AccountList: React.FC<AccountListProps> = ({ accounts, transactions, onEdit, onToggleStatus, onDelete, accountBalances, currentUser }) => {
    const { t, language } = useTranslation();
    const parentAccounts = accounts.filter(a => !a.parentId).sort((a,b) => a.accountCode.localeCompare(b.accountCode));
    const getChildAccounts = (parentId: string) => accounts.filter(a => a.parentId === parentId).sort((a,b) => a.accountCode.localeCompare(b.accountCode));

    const accountsWithTransactions = useMemo(() => {
        const accountIds = new Set<string>();
        transactions.forEach(t => {
            t.entries.forEach(e => {
                accountIds.add(e.accountId);
            });
        });
        return accountIds;
    }, [transactions]);

    const renderAccountRow = (account: Account, isParent: boolean = false) => {
        const balance = accountBalances[account.id] || 0;
        // Display balance as a positive number for the user, reflecting its nature.
        const displayBalance = account.nature === AccountNature.CREDIT ? -balance : balance;
        const hasTransactions = accountsWithTransactions.has(account.id);
        const isAdmin = currentUser?.role === 'admin';

        // Check if admin can edit (always true for admin, restricted for parent accounts for non-admin)
        const canEdit = isAdmin || !isParent;
        const canToggleStatus = isAdmin || !isParent;
        const canDelete = (isAdmin || !isParent) && !hasTransactions;

        // Get bilingual account name
        const accountName = getBilingualText(account.name, account.nameEn, language);

        return (
             <tr key={account.id} className={isParent ? "bg-gray-800 hover:bg-gray-700/50" : "bg-gray-800/30 border-b border-gray-700 transition-colors duration-200 hover:bg-background/50"}>
                <td className="p-3 text-text-secondary font-mono">{account.accountCode}</td>
                <td className={`p-3 font-medium ${isParent ? 'font-bold text-text-primary' : 'text-gray-300'}`}>
                    {/* Add visual hierarchy with dash for sub-accounts */}
                    {!isParent && <span className="text-gray-500 mr-2">—</span>}
                    {accountName}
                </td>
                <td className="p-3 text-text-secondary">
                    {translateEnum(account.classification, accountClassificationTranslations, language)}
                </td>
                <td className="p-3 text-text-secondary">
                    {translateEnum(account.nature, accountNatureTranslations, language)}
                </td>
                <td className={`p-3 font-mono ${isParent ? 'font-bold text-accent' : 'text-gray-300'}`}>{formatCurrency(displayBalance)}</td>
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
                            className="text-accent hover:text-blue-400 p-2 transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`${t('accounts.actions.edit')} ${accountName}`}
                        >
                            <EditIcon />
                        </button>
                        <button
                            onClick={() => canToggleStatus && onToggleStatus(account)}
                            disabled={!canToggleStatus}
                            className={`p-2 transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${account.isActive ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
                            aria-label={`${account.isActive ? t('accounts.actions.deactivate') : t('accounts.actions.activate')} ${accountName}`}
                        >
                            {account.isActive ? <ToggleOffIcon /> : <ToggleOnIcon />}
                        </button>
                        <button
                            onClick={() => canDelete && onDelete(account)}
                            disabled={!canDelete}
                            className="text-red-500 hover:text-red-400 p-2 transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`${t('accounts.actions.delete')} ${accountName}`}
                            title={hasTransactions ? t('accounts.messages.deleteError') : !canDelete ? '' : `${t('accounts.actions.delete')} ${accountName}`}
                        >
                            <DeleteIcon />
                        </button>
                    </div>
                </td>
            </tr>
        )
    };

    return (
        <div className="bg-surface p-6 rounded-lg shadow-lg">
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead>
                        <tr className="border-b border-gray-700 text-text-secondary">
                            <th className="p-3">{t('accounts.table.columns.code')}</th>
                            <th className="p-3">{t('accounts.table.columns.name')}</th>
                            <th className="p-3">{t('accounts.table.columns.classification')}</th>
                            <th className="p-3">{t('accounts.table.columns.nature')}</th>
                            <th className="p-3">{t('accounts.table.columns.balance')}</th>
                            <th className="p-3">{t('accounts.table.columns.status')}</th>
                            <th className="p-3 text-left">{t('accounts.table.columns.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parentAccounts.map(parent => (
                            <React.Fragment key={parent.id}>
                                {renderAccountRow(parent, true)}
                                {getChildAccounts(parent.id).map(child => renderAccountRow(child))}
                            </React.Fragment>
                        ))}
                         {accounts.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center p-6 text-text-secondary">
                                    {t('accounts.table.empty')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AccountList;