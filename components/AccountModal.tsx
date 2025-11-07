import React, { useState, useEffect } from 'react';
import { Account, AccountType, AccountClassification, AccountNature, User, Shop } from '../types';
import MobileSelect from './MobileSelect';
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, accountTypeTranslations, accountClassificationTranslations, accountNatureTranslations } from '../i18n/enumTranslations';
import { getBilingualText } from '../utils/bilingual';

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (accountData: Omit<Account, 'id' | 'shopId' | 'isActive'> | Account) => void;
    accountToEdit: Account | null;
    accounts: Account[];
    currentUser: User | null;
    currentShop?: Shop | null;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSave, accountToEdit, accounts, currentUser, currentShop }) => {
    const { t, language } = useTranslation();
    const [name, setName] = useState('');
    const [accountCode, setAccountCode] = useState('');
    const [parentId, setParentId] = useState<string>('');
    const [isActive, setIsActive] = useState(true);
    const [openingBalance, setOpeningBalance] = useState('');

    // Derived state from parent selection
    const [classification, setClassification] = useState<AccountClassification | ''>('');
    const [nature, setNature] = useState<AccountNature | ''>('');
    const [type, setType] = useState<AccountType | ''>('');

    // Helper function to get account depth (optimized to use stored level field)
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

    // Get all accounts that can be parents (depth <= 2, so we can create level 3 under them)
    const parentAccountOptions = accounts
        .filter(acc => {
            const depth = getAccountDepth(acc);
            return depth <= 2; // Allow main accounts (1) and sub1 accounts (2) as parents
        })
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

    useEffect(() => {
        if (!isOpen) return;

        if (accountToEdit) {
            setName(accountToEdit.name);
            setAccountCode(accountToEdit.accountCode);
            setParentId(accountToEdit.parentId || '');
            setClassification(accountToEdit.classification);
            setNature(accountToEdit.nature);
            setType(accountToEdit.type);
            setIsActive(accountToEdit.isActive);
            setOpeningBalance(accountToEdit.openingBalance?.toString() || '');
        } else {
            // Reset for new account
            setName('');
            setAccountCode('');
            setIsActive(true);
            setOpeningBalance('');
            // Default to the first main account if it exists
            if (parentAccountOptions.length > 0) {
                const defaultParent = parentAccountOptions[0];
                setParentId(defaultParent.id);
                setClassification(defaultParent.classification);
                setNature(defaultParent.nature);
                setType(defaultParent.type);
            } else {
                setParentId('');
                setClassification('');
                setNature('');
                setType('');
            }
        }
    }, [accountToEdit, isOpen, accounts]);
    
    // Update derived fields automatically when parent selection changes for a new account
    useEffect(() => {
        if (isOpen && !accountToEdit) {
            const selectedParent = parentAccountOptions.find(p => p.id === parentId);
            if (selectedParent) {
                setClassification(selectedParent.classification);
                setNature(selectedParent.nature);
                setType(selectedParent.type);
            }
        }
    }, [parentId, isOpen, accountToEdit, parentAccountOptions]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Admin can edit parent accounts
        const isAdmin = currentUser?.role === 'admin';

        // For parent accounts being edited by admin
        if (isMainAccount && isAdmin) {
            if (!name.trim() || !accountCode.trim() || !classification || !nature || !type) return;
        } else if (isMainAccount && !isAdmin) {
            // Non-admin cannot edit parent accounts
            return;
        } else {
            // For sub-accounts
            if (!name.trim() || !accountCode.trim() || !parentId || !classification || !nature || !type) return;
        }

        const parsedOpeningBalance = parseFloat(openingBalance);

        if (accountToEdit) {
            const accountData = {
                name,
                accountCode,
                classification,
                nature,
                type,
                parentId: isMainAccount ? undefined : parentId,
                isActive,
                openingBalance: isNaN(parsedOpeningBalance) ? (accountToEdit.openingBalance || 0) : parsedOpeningBalance
            };
            onSave({ ...accountData, id: accountToEdit.id, shopId: accountToEdit.shopId });
        } else {
            // For new accounts, append shop code to the name
            let finalAccountName = name.trim();
            if (currentShop && currentShop.shopCode) {
                // Check if the name doesn't already have the shop code suffix
                const shopCodeSuffix = ` - ${currentShop.shopCode}`;
                if (!finalAccountName.endsWith(shopCodeSuffix)) {
                    finalAccountName = `${finalAccountName}${shopCodeSuffix}`;
                }
            }

            const newAccountData = {
                name: finalAccountName,
                accountCode,
                classification,
                nature,
                type,
                parentId: isMainAccount ? undefined : parentId,
                openingBalance: isNaN(parsedOpeningBalance) ? 0 : parsedOpeningBalance
            };
            onSave(newAccountData);
        }
    };
    
    if (!isOpen) return null;

    const isMainAccount = accountToEdit ? !accountToEdit.parentId : false;
    const isAdmin = currentUser?.role === 'admin';
    const canEditParentFields = isMainAccount && isAdmin;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300"
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
                <h2 className="text-2xl font-bold mb-6">
                    {accountToEdit ? t('accounts.form.title.edit') : t('accounts.form.title.create')}
                </h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {!isMainAccount && (
                            <div>
                                <MobileSelect
                                    label={t('accounts.form.parentAccount')}
                                    value={parentId}
                                    onChange={(value) => setParentId(value)}
                                    options={parentAccountOptions.map(pAcc => {
                                        const depth = getAccountDepth(pAcc);
                                        const indent = depth > 1 ? '— '.repeat(depth - 1) : '';
                                        return {
                                            value: pAcc.id,
                                            label: `${indent}${getBilingualText(pAcc.name, pAcc.nameEn, language)} (${pAcc.accountCode})`
                                        };
                                    })}
                                />
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="accountCode" className="block text-sm font-medium text-text-secondary mb-1">
                                    {t('accounts.form.accountCode')}
                                </label>
                                <input
                                    type="text"
                                    id="accountCode"
                                    value={accountCode}
                                    onChange={(e) => setAccountCode(e.target.value)}
                                    placeholder={t('accounts.form.accountCodePlaceholder')}
                                    className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    required
                                    disabled={isMainAccount && !isAdmin}
                                />
                            </div>
                            <div>
                                <label htmlFor="accountName" className="block text-sm font-medium text-text-secondary mb-1">
                                    {t('accounts.form.accountName')}
                                </label>
                                <input
                                    type="text"
                                    id="accountName"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('accounts.form.accountNamePlaceholder')}
                                    className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    required
                                    disabled={isMainAccount && !isAdmin}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    {t('accounts.form.classification')} {canEditParentFields ? '' : `(${t('accounts.form.automatic')})`}
                                </label>
                                {canEditParentFields ? (
                                    <MobileSelect
                                        value={classification}
                                        onChange={(value) => setClassification(value as AccountClassification)}
                                        options={Object.values(AccountClassification).map((classValue) => ({
                                            value: classValue,
                                            label: translateEnum(classValue, accountClassificationTranslations, language)
                                        }))}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={translateEnum(classification as AccountClassification, accountClassificationTranslations, language)}
                                        readOnly
                                        className="w-full bg-background/50 border border-gray-700 rounded-md p-2 text-text-secondary cursor-default"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    {t('accounts.form.nature')} {canEditParentFields ? '' : `(${t('accounts.form.automatic')})`}
                                </label>
                                {canEditParentFields ? (
                                    <MobileSelect
                                        value={nature}
                                        onChange={(value) => setNature(value as AccountNature)}
                                        options={Object.values(AccountNature).map((natureValue) => ({
                                            value: natureValue,
                                            label: translateEnum(natureValue, accountNatureTranslations, language)
                                        }))}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={translateEnum(nature as AccountNature, accountNatureTranslations, language)}
                                        readOnly
                                        className="w-full bg-background/50 border border-gray-700 rounded-md p-2 text-text-secondary cursor-default"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Account Type field - only for parent accounts when admin */}
                        {canEditParentFields && (
                            <div>
                                <MobileSelect
                                    label={t('accounts.form.type')}
                                    value={type}
                                    onChange={(value) => setType(value as AccountType)}
                                    options={Object.values(AccountType).map((typeValue) => ({
                                        value: typeValue,
                                        label: translateEnum(typeValue, accountTypeTranslations, language)
                                    }))}
                                />
                            </div>
                        )}

                        <div>
                            <label htmlFor="openingBalance" className="block text-sm font-medium text-text-secondary mb-1">
                                {t('accounts.form.openingBalance')}
                                {accountToEdit && !isAdmin && (
                                    <span className="mr-2 text-xs text-yellow-400">
                                        ({t('accounts.openingBalanceAdminOnly')})
                                    </span>
                                )}
                            </label>
                            <input
                                type="number"
                                id="openingBalance"
                                value={openingBalance}
                                onChange={(e) => setOpeningBalance(e.target.value)}
                                placeholder={t('accounts.form.openingBalancePlaceholder')}
                                className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={accountToEdit && !isAdmin}
                            />
                        </div>
                        {accountToEdit && !isMainAccount && (
                             <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="isActive" className="mr-2 block text-sm text-text-primary">
                                    {t('accounts.form.isActive')}
                                </label>
                            </div>
                        )}
                    </div>
                    <div className="mt-8 flex justify-end space-x-4 space-x-reverse">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                            {t('accounts.form.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isMainAccount}
                        >
                            {accountToEdit ? t('accounts.form.saveChanges') : t('accounts.form.addAccount')}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`
                @keyframes fade-in-scale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-fade-in-scale { animation: fade-in-scale 0.2s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default AccountModal;