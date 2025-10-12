
import React, { useState, useMemo, useEffect } from 'react';
import { Account, AccountNature, AccountClassification, Transaction, User, Shop } from '../types';
import { AccountService } from '../services/AccountService';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import AccountList from '../components/AccountList';
import AccountModal from '../components/AccountModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, accountClassificationTranslations, accountNatureTranslations } from '../i18n/enumTranslations';
import { getBilingualText } from '../utils/bilingual';

interface AccountsPageProps {
    // No props needed - component will be self-contained
}

const PlusIcon = () => (
    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
);
const ExportIcon = () => (
    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
);
const SearchIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
);

const AccountsPage: React.FC<AccountsPageProps> = () => {
    const { t, language } = useTranslation();

    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [togglingStatusAccount, setTogglingStatusAccount] = useState<Account | null>(null);
    const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedShop, setSelectedShop] = useState<string>('all');
    const [selectedClassification, setSelectedClassification] = useState<string>('all');
    const [selectedNature, setSelectedNature] = useState<string>('all');

    // Data State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState<string>('');

    // Auto-clear messages
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Firebase Authentication Effect
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data() as User;
                        setCurrentUser({ id: firebaseUser.uid, ...userData });
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setError(t('accounts.messages.errorLoading'));
                }
            } else {
                setCurrentUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Real-time Data Listeners
    useEffect(() => {
        if (!currentUser) return;

        const unsubscribers: (() => void)[] = [];

        try {
            // Get user's shop ID
            const shopId = currentUser.role === 'admin' ? null : currentUser.shopId;

            // Listen to shops (for admin only)
            if (currentUser.role === 'admin') {
                const shopsUnsubscribe = onSnapshot(
                    query(collection(db, 'shops'), orderBy('name')),
                    (snapshot) => {
                        const shopsData = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        })) as Shop[];
                        setShops(shopsData);
                    },
                    (error) => {
                        console.error('Error listening to shops:', error);
                    }
                );
                unsubscribers.push(shopsUnsubscribe);
            }

            // Listen to accounts
            const accountsQuery = shopId
                ? query(collection(db, 'accounts'), where('shopId', '==', shopId), orderBy('accountCode'))
                : query(collection(db, 'accounts'), orderBy('accountCode'));

            const accountsUnsubscribe = onSnapshot(accountsQuery, (snapshot) => {
                const accountsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Account[];
                setAccounts(accountsData);
            }, (error) => {
                console.error('Error listening to accounts:', error);
                setError(t('accounts.messages.errorLoadingAccounts'));
            });
            unsubscribers.push(accountsUnsubscribe);

            // Listen to transactions
            const transactionsQuery = shopId
                ? query(collection(db, 'transactions'), where('shopId', '==', shopId), orderBy('date', 'desc'))
                : query(collection(db, 'transactions'), orderBy('date', 'desc'));

            const transactionsUnsubscribe = onSnapshot(transactionsQuery, (snapshot) => {
                const transactionsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Transaction[];
                setTransactions(transactionsData);
            }, (error) => {
                console.error('Error listening to transactions:', error);
                setError(t('accounts.messages.errorLoadingTransactions'));
            });
            unsubscribers.push(transactionsUnsubscribe);

        } catch (error) {
            console.error('Error setting up listeners:', error);
            setError(t('accounts.messages.errorDatabase'));
        }

        return () => {
            unsubscribers.forEach(unsubscribe => unsubscribe());
        };
    }, [currentUser]);

    const handleOpenModal = (account: Account | null = null) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAccount(null);
        setError('');
    };

    const handleSaveAccount = async (accountData: Omit<Account, 'id' | 'isActive' | 'shopId'> | Account) => {
        if (!currentUser) {
            setError(t('accounts.messages.loginRequired'));
            return;
        }

        try {
            setIsLoading(true);
            setError('');

            if ('id' in accountData) {
                // Update existing account
                const { id, isActive, shopId, createdAt, ...updateData } = accountData;
                await AccountService.updateAccount(id, updateData);
                setSuccessMessage(t('accounts.messages.updated'));
            } else {
                // Create new account
                const shopId = currentUser.role === 'admin'
                    ? currentUser.shopId || '' // Admin might not have shopId
                    : currentUser.shopId || '';

                if (!shopId) {
                    throw new Error(t('accounts.messages.shopNotFound'));
                }

                await AccountService.createAccount({
                    name: accountData.name,
                    nameEnglish: accountData.nameEnglish || accountData.name,
                    accountCode: accountData.accountCode,
                    parentAccountCode: accountData.parentAccountCode,
                    type: accountData.type,
                    description: accountData.description,
                    shopId
                });
                setSuccessMessage(t('accounts.messages.created'));
            }
            handleCloseModal();
        } catch (error: any) {
            console.error('Error saving account:', error);
            setError(error.message || t('accounts.messages.errorSaving'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmToggleStatus = async () => {
        if (!togglingStatusAccount) return;

        try {
            setIsLoading(true);
            setError('');
            await AccountService.toggleAccountStatus(togglingStatusAccount.id);
            setSuccessMessage(togglingStatusAccount.isActive ? t('accounts.messages.deactivated') : t('accounts.messages.activated'));
            setTogglingStatusAccount(null);
        } catch (error: any) {
            console.error('Error toggling account status:', error);
            setError(error.message || t('accounts.messages.errorToggling'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deletingAccount) return;

        try {
            setIsLoading(true);
            setError('');
            await AccountService.deleteAccount(deletingAccount.id);
            setSuccessMessage(t('accounts.messages.deleted'));
            setDeletingAccount(null);
        } catch (error: any) {
            console.error('Error deleting account:', error);
            setError(error.message || t('accounts.messages.errorDeleting'));
        } finally {
            setIsLoading(false);
        }
    };

    const accountBalances = useMemo(() => {
        const balances: { [key: string]: number } = {};
        
        accounts.forEach(acc => {
            balances[acc.id] = acc.openingBalance || 0;
        });

        transactions.forEach(t => {
            t.entries.forEach(entry => {
                if (balances[entry.accountId] !== undefined) {
                    balances[entry.accountId] += entry.amount;
                }
            });
        });
        
        const parentIds = new Set(accounts.filter(a => a.parentId).map(a => a.parentId));
        const childBalances: { [key: string]: number } = {};

        for(const acc of accounts){
             if(!parentIds.has(acc.id)){ // It's a leaf node
                let current = acc;
                let balance = balances[acc.id];
                while(current.parentId){
                    if(!childBalances[current.parentId]) childBalances[current.parentId] = 0;
                    childBalances[current.parentId] += balance;
                    const parent = accounts.find(a => a.id === current.parentId);
                    if(!parent) break;
                    current = parent;
                }
             }
        }
        
        const finalBalances = {...balances};
        for(const accId in childBalances){
            finalBalances[accId] += childBalances[accId];
        }

        return finalBalances;

    }, [accounts, transactions]);

    const handleExportCSV = () => {
        const parentAccounts = accounts.filter(a => !a.parentId).sort((a,b) => a.accountCode.localeCompare(b.accountCode));
        const getChildAccounts = (parentId: string) => accounts.filter(a => a.parentId === parentId).sort((a,b) => a.accountCode.localeCompare(b.accountCode));

        let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // \uFEFF for BOM
        csvContent += "الرمز,الحساب الرئيسي,الحساب الفرعي,التصنيف,الطبيعة,الرصيد,الحالة\n";

        parentAccounts.forEach(parent => {
            const balance = accountBalances[parent.id] || 0;
            const displayBalance = parent.nature === AccountNature.CREDIT ? -balance : balance;
            csvContent += `${parent.accountCode},"${parent.name}","",${parent.classification},${parent.nature},${displayBalance},${parent.isActive ? 'نشط' : 'غير نشط'}\n`;
            
            getChildAccounts(parent.id).forEach(child => {
                const childBalance = accountBalances[child.id] || 0;
                const childDisplayBalance = child.nature === AccountNature.CREDIT ? -childBalance : childBalance;
                csvContent += `${child.accountCode},"${parent.name}","${child.name}",${child.classification},${child.nature},${childDisplayBalance},${child.isActive ? 'نشط' : 'غير نشط'}\n`;
            });
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "shajarat_alhisabat.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredAccounts = useMemo(() => {
        let filtered = [...accounts];

        // Apply search filter
        const query = searchQuery.toLowerCase().trim();
        if (query) {
            const matchingAccounts = filtered.filter(acc =>
                acc.name.toLowerCase().includes(query) ||
                acc.accountCode.includes(query)
            );
            const matchingAccountIds = new Set(matchingAccounts.map(acc => acc.id));

            // Also include parents of matched children
            matchingAccounts.forEach(acc => {
                if (acc.parentId) {
                     matchingAccountIds.add(acc.parentId);
                }
            });

            filtered = filtered.filter(acc => matchingAccountIds.has(acc.id));
        }

        // Apply shop filter
        if (selectedShop !== 'all') {
            filtered = filtered.filter(acc => acc.shopId === selectedShop);
        }

        // Apply classification filter
        if (selectedClassification !== 'all') {
            filtered = filtered.filter(acc => acc.classification === selectedClassification);
        }

        // Apply nature filter
        if (selectedNature !== 'all') {
            filtered = filtered.filter(acc => acc.nature === selectedNature);
        }

        return filtered;
    }, [accounts, searchQuery, selectedShop, selectedClassification, selectedNature]);

    // Loading state
    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <span className="mr-3 text-lg">{t('accounts.loading')}</span>
            </div>
        );
    }

    // No user state
    if (!currentUser) {
        return (
            <div className="flex justify-center items-center min-h-96">
                <div className="text-center">
                    <h2 className="text-xl text-red-500 mb-2">{t('accounts.noUser.title')}</h2>
                    <p className="text-gray-600">{t('accounts.noUser.description')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                    <span className="block sm:inline">{successMessage}</span>
                    <button
                        className="absolute top-0 bottom-0 left-0 px-4 py-3"
                        onClick={() => setSuccessMessage('')}
                    >
                        <span className="sr-only">إغلاق</span>
                        ×
                    </button>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                    <span className="block sm:inline">{error}</span>
                    <button
                        className="absolute top-0 bottom-0 left-0 px-4 py-3"
                        onClick={() => setError('')}
                    >
                        <span className="sr-only">إغلاق</span>
                        ×
                    </button>
                </div>
            )}

            <div className="flex justify-between items-center gap-4 flex-wrap">
                <h1 className="text-3xl font-bold">{t('accounts.title')}</h1>
                <div className="flex gap-2 flex-wrap">
                     <button
                        onClick={handleExportCSV}
                        disabled={isLoading || accounts.length === 0}
                        className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ExportIcon />
                        <span>{t('accounts.actions.export')}</span>
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        disabled={isLoading}
                        className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        <PlusIcon />
                        <span>{t('accounts.actions.create')}</span>
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <SearchIcon />
                    </div>
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('accounts.search.placeholder')}
                        className="w-full bg-surface border border-gray-600 rounded-lg p-3 pr-10 text-text-primary focus:ring-primary focus:border-primary placeholder-gray-400"
                    />
                </div>

                {/* Filters Row */}
                <div className="flex gap-4 flex-wrap">
                    {/* Shop Filter - Only show for admin */}
                    {currentUser?.role === 'admin' && shops.length > 0 && (
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm font-medium text-text-secondary mb-2">
                                {t('accounts.filters.shop')}
                            </label>
                            <select
                                value={selectedShop}
                                onChange={(e) => setSelectedShop(e.target.value)}
                                className="w-full bg-surface border border-gray-600 rounded-lg p-2 text-text-primary focus:ring-primary focus:border-primary"
                            >
                                <option value="all">{t('accounts.filters.allShops')}</option>
                                {shops.map((shop) => (
                                    <option key={shop.id} value={shop.id}>
                                        {getBilingualText(shop.name, shop.nameEn, language)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Classification Filter */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            {t('accounts.filters.classification')}
                        </label>
                        <select
                            value={selectedClassification}
                            onChange={(e) => setSelectedClassification(e.target.value)}
                            className="w-full bg-surface border border-gray-600 rounded-lg p-2 text-text-primary focus:ring-primary focus:border-primary"
                        >
                            <option value="all">{t('accounts.filters.allClassifications')}</option>
                            {Object.values(AccountClassification).map((classification) => (
                                <option key={classification} value={classification}>
                                    {translateEnum(classification, accountClassificationTranslations, language)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Nature Filter */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                            {t('accounts.filters.nature')}
                        </label>
                        <select
                            value={selectedNature}
                            onChange={(e) => setSelectedNature(e.target.value)}
                            className="w-full bg-surface border border-gray-600 rounded-lg p-2 text-text-primary focus:ring-primary focus:border-primary"
                        >
                            <option value="all">{t('accounts.filters.allNatures')}</option>
                            {Object.values(AccountNature).map((nature) => (
                                <option key={nature} value={nature}>
                                    {translateEnum(nature, accountNatureTranslations, language)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <AccountList
                accounts={filteredAccounts}
                transactions={transactions}
                onEdit={(account) => handleOpenModal(account)}
                onToggleStatus={(account) => setTogglingStatusAccount(account)}
                onDelete={(account) => setDeletingAccount(account)}
                accountBalances={accountBalances}
                currentUser={currentUser}
            />

            <AccountModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveAccount}
                accountToEdit={editingAccount}
                accounts={accounts}
                currentUser={currentUser}
            />

            {togglingStatusAccount && (
                <ConfirmationModal
                    isOpen={!!togglingStatusAccount}
                    onClose={() => setTogglingStatusAccount(null)}
                    onConfirm={handleConfirmToggleStatus}
                    title={t('accounts.messages.confirmToggleTitle', { action: togglingStatusAccount.isActive ? t('accounts.messages.toggleActive') : t('accounts.messages.toggleInactive') })}
                    message={t('accounts.messages.toggleConfirm', {
                        action: togglingStatusAccount.isActive ? t('accounts.messages.toggleActive') : t('accounts.messages.toggleInactive'),
                        name: getBilingualText(togglingStatusAccount.name, togglingStatusAccount.nameEn, language)
                    })}
                    confirmText={togglingStatusAccount.isActive ? t('accounts.actions.deactivate') : t('accounts.actions.activate')}
                    isDestructive={togglingStatusAccount.isActive}
                />
            )}

            {deletingAccount && (
                <ConfirmationModal
                    isOpen={!!deletingAccount}
                    onClose={() => setDeletingAccount(null)}
                    onConfirm={handleConfirmDelete}
                    title={t('accounts.messages.confirmDeleteTitle')}
                    message={t('accounts.messages.deleteConfirm', { name: getBilingualText(deletingAccount.name, deletingAccount.nameEn, language) })}
                    confirmText={t('accounts.actions.delete')}
                    isDestructive={true}
                />
            )}
        </div>
    );
};

export default AccountsPage;