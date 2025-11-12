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

    // Helper function to get account depth for visual styling (optimized to use stored level field)
    const getAccountDepth = (account: Account): number => {
        // Use stored level if available (performance optimization)
        if (account.level) {
            return account.level;
        }

        // Fallback to calculation for backwards compatibility with existing data
        let depth = 1;
        let current = account;
        while (current.parentId) {
            depth++;
            const parent = accounts.find(a => a.id === current.parentId);
            if (!parent) break;
            current = parent;
        }
        return depth;
    };

    const accountsWithTransactions = useMemo(() => {
        const accountIds = new Set<string>();
        transactions.forEach(t => {
            t.entries.forEach(e => {
                accountIds.add(e.accountId);
            });
        });
        return accountIds;
    }, [transactions]);

    const renderAccountRow = (account: Account, depth: number = 1) => {
        const balance = accountBalances[account.id] || 0;
        // Display balance as a positive number for the user, reflecting its nature.
        const displayBalance = account.nature === AccountNature.CREDIT ? -balance : balance;
        const hasTransactions = accountsWithTransactions.has(account.id);
        const isAdmin = currentUser?.role === 'admin';

        const isMainAccount = depth === 1;

        // Check if admin can edit (always true for admin, restricted for parent accounts for non-admin)
        const canEdit = isAdmin || !isMainAccount;
        const canToggleStatus = isAdmin || !isMainAccount;
        const canDelete = (isAdmin || !isMainAccount) && !hasTransactions;

        // Get bilingual account name
        const accountName = getBilingualText(account.name, account.nameEn, language);

        // Visual hierarchy based on depth
        const indentSymbol = depth === 1 ? '' : depth === 2 ? '— ' : '—— ';
        const rowBgClass = depth === 1
            ? "border-b transition-colors duration-200"
            : depth === 2
            ? "border-b transition-colors duration-200"
            : "border-b transition-colors duration-200";
        const textClass = depth === 1
            ? 'font-bold text-text-primary'
            : depth === 2
            ? 'text-text-secondary'
            : 'text-text-tertiary';
        const balanceClass = depth === 1 ? 'font-bold text-accent' : 'text-text-secondary';

        // Inline styles for depth-based background and hover
        const rowStyle: React.CSSProperties = {
            backgroundColor: depth === 1
                ? 'var(--color-table-row-depth-1)'
                : depth === 2
                ? 'var(--color-table-row-depth-2)'
                : 'var(--color-table-row-depth-3)',
            borderColor: 'var(--color-border)',
        };

        return (
             <tr
                key={account.id}
                className={`${rowBgClass} transition-all duration-200`}
                style={rowStyle}
                onMouseEnter={(e) => {
                    e.currentTarget.style.filter = 'brightness(0.95)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'brightness(1)';
                }}
            >
                <td className="p-3 text-text-secondary font-mono">{account.accountCode}</td>
                <td className={`p-3 font-medium ${textClass}`}>
                    {/* Add visual hierarchy with dashes based on depth */}
                    {indentSymbol && <span className="text-text-tertiary mr-2">{indentSymbol}</span>}
                    {accountName}
                </td>
                <td className="p-3 text-text-secondary">
                    {translateEnum(account.classification, accountClassificationTranslations, language)}
                </td>
                <td className="p-3 text-text-secondary">
                    {translateEnum(account.nature, accountNatureTranslations, language)}
                </td>
                <td className={`p-3 font-mono ${depth === 1 ? 'font-bold text-accent' : 'text-text-secondary'}`}>
                    {formatCurrency(account.openingBalance || 0)}
                </td>
                <td className={`p-3 font-mono ${balanceClass}`}>{formatCurrency(displayBalance)}</td>
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

    // Recursive function to render account and all its children
    const renderAccountWithChildren = (account: Account, depth: number = 1): JSX.Element[] => {
        const children = getChildAccounts(account.id);
        return [
            renderAccountRow(account, depth),
            ...children.flatMap(child => renderAccountWithChildren(child, depth + 1))
        ];
    };

    return (
        <div className="bg-surface p-6 rounded-lg shadow-lg">
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="border-2 text-base font-semibold" style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                        <tr>
                            <th className="p-3">{t('accounts.table.columns.code')}</th>
                            <th className="p-3">{t('accounts.table.columns.name')}</th>
                            <th className="p-3">{t('accounts.table.columns.classification')}</th>
                            <th className="p-3">{t('accounts.table.columns.nature')}</th>
                            <th className="p-3">{t('accounts.table.columns.openingBalance')}</th>
                            <th className="p-3">{t('accounts.table.columns.balance')}</th>
                            <th className="p-3">{t('accounts.table.columns.status')}</th>
                            <th className="p-3 text-left">{t('accounts.table.columns.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parentAccounts.map(parent => (
                            <React.Fragment key={parent.id}>
                                {renderAccountWithChildren(parent, 1)}
                            </React.Fragment>
                        ))}
                         {accounts.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center p-6 text-text-secondary">
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