import React, { useState, useEffect } from 'react';
import { Account, AccountType, AccountClassification, AccountNature, User } from '../types';

interface AccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (accountData: Omit<Account, 'id' | 'shopId' | 'isActive'> | Account) => void;
    accountToEdit: Account | null;
    accounts: Account[];
    currentUser: User | null;
}

const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose, onSave, accountToEdit, accounts, currentUser }) => {
    const [name, setName] = useState('');
    const [accountCode, setAccountCode] = useState('');
    const [parentId, setParentId] = useState<string>('');
    const [isActive, setIsActive] = useState(true);
    const [openingBalance, setOpeningBalance] = useState('');

    // Derived state from parent selection
    const [classification, setClassification] = useState<AccountClassification | ''>('');
    const [nature, setNature] = useState<AccountNature | ''>('');
    const [type, setType] = useState<AccountType | ''>('');
    
    const parentAccountOptions = accounts.filter(acc => !acc.parentId).sort((a,b) => a.accountCode.localeCompare(b.accountCode));

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
                openingBalance: isNaN(parsedOpeningBalance) ? accountToEdit.openingBalance : parsedOpeningBalance
            };
            onSave({ ...accountData, id: accountToEdit.id, shopId: accountToEdit.shopId });
        } else {
            const newAccountData = {
                name,
                accountCode,
                classification,
                nature,
                type,
                parentId: isMainAccount ? undefined : parentId,
                openingBalance: isNaN(parsedOpeningBalance) ? undefined : parsedOpeningBalance
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
                <h2 className="text-2xl font-bold mb-6">{accountToEdit ? 'تعديل الحساب' : 'إضافة حساب جديد'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {!isMainAccount && (
                            <div>
                                <label htmlFor="parentId" className="block text-sm font-medium text-text-secondary mb-1">الحساب الرئيسي</label>
                                <select
                                    id="parentId"
                                    value={parentId}
                                    onChange={(e) => setParentId(e.target.value)}
                                    className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    required
                                >
                                    {parentAccountOptions.map(pAcc => (
                                        <option key={pAcc.id} value={pAcc.id}>{pAcc.name} ({pAcc.accountCode})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="accountCode" className="block text-sm font-medium text-text-secondary mb-1">رمز الحساب</label>
                                <input
                                    type="text"
                                    id="accountCode"
                                    value={accountCode}
                                    onChange={(e) => setAccountCode(e.target.value)}
                                    placeholder="e.g., 5101"
                                    className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    required
                                    disabled={isMainAccount && !isAdmin}
                                />
                            </div>
                            <div>
                                <label htmlFor="accountName" className="block text-sm font-medium text-text-secondary mb-1">اسم الحساب</label>
                                <input
                                    type="text"
                                    id="accountName"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Rent Expense"
                                    className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                    required
                                    disabled={isMainAccount && !isAdmin}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    التصنيف {canEditParentFields ? '' : '(تلقائي)'}
                                </label>
                                {canEditParentFields ? (
                                    <select
                                        value={classification}
                                        onChange={(e) => setClassification(e.target.value as AccountClassification)}
                                        className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                                        required
                                    >
                                        {Object.values(AccountClassification).map((classValue) => (
                                            <option key={classValue} value={classValue}>{classValue}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input type="text" value={classification} readOnly className="w-full bg-background/50 border border-gray-700 rounded-md p-2 text-text-secondary cursor-default" />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    الطبيعة {canEditParentFields ? '' : '(تلقائي)'}
                                </label>
                                {canEditParentFields ? (
                                    <select
                                        value={nature}
                                        onChange={(e) => setNature(e.target.value as AccountNature)}
                                        className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                                        required
                                    >
                                        {Object.values(AccountNature).map((natureValue) => (
                                            <option key={natureValue} value={natureValue}>{natureValue}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input type="text" value={nature} readOnly className="w-full bg-background/50 border border-gray-700 rounded-md p-2 text-text-secondary cursor-default" />
                                )}
                            </div>
                        </div>

                        {/* Account Type field - only for parent accounts when admin */}
                        {canEditParentFields && (
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    النوع
                                </label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as AccountType)}
                                    className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                                    required
                                >
                                    {Object.values(AccountType).map((typeValue) => (
                                        <option key={typeValue} value={typeValue}>{typeValue}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {!accountToEdit && (
                            <div>
                                <label htmlFor="openingBalance" className="block text-sm font-medium text-text-secondary mb-1">الرصيد الافتتاحي (اختياري)</label>
                                <input
                                    type="number"
                                    id="openingBalance"
                                    value={openingBalance}
                                    onChange={(e) => setOpeningBalance(e.target.value)}
                                    placeholder="e.g., 1500 for Debit, -500 for Credit"
                                    className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                                />
                            </div>
                        )}
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
                                    الحساب نشط
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
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isMainAccount}
                        >
                            {accountToEdit ? 'حفظ التعديلات' : 'إضافة الحساب'}
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