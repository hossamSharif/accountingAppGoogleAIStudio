import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, Account, AccountType, TransactionEntry, FinancialYear, Shop } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, transactionTypeTranslations } from '../i18n/enumTranslations';
import { getBilingualText } from '../utils/bilingual';
import { useConnectionStatus } from '../hooks/useConnectionStatus';
import { OfflineManager } from '../services/offlineManager';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
);

// Transaction type icons
const SaleIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
);

const PurchaseIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
);

const ExpenseIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
);

const CustomerPaymentIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
);

const SupplierPaymentIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
);

const TransferIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
);

// New type to handle the UI-specific entry modes
type FormMode = TransactionType | 'Customer Payment' | 'Supplier Payment';

interface DailyEntryFormProps {
    isOpen: boolean;
    onClose: () => void;
    onAddTransaction: (transaction: Omit<Transaction, 'id' | 'shopId' | 'date'>) => void;
    onUpdateTransaction: (transaction: Transaction) => void;
    transactionToEdit: Transaction | null;
    accounts: Account[];
    openFinancialYear: FinancialYear | undefined;
    onAddAccount: (account: Omit<Account, 'id' | 'isActive' | 'shopId'>, forShopId?: string) => Account | null;
    selectedDate: Date;
    activeShopId?: string;
    currentUserId?: string;
}

const DailyEntryForm: React.FC<DailyEntryFormProps> = ({ isOpen, onClose, onAddTransaction, onUpdateTransaction, transactionToEdit, accounts, openFinancialYear, onAddAccount, selectedDate, activeShopId, currentUserId }) => {
    const { t, language } = useTranslation();
    const isEditMode = !!transactionToEdit;
    const connectionStatus = useConnectionStatus();

    // Main state for the form
    const [formMode, setFormMode] = useState<FormMode>(TransactionType.SALE);
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');

    // State for Sale/Purchase/Expense
    const [totalAmount, setTotalAmount] = useState('');
    const [paidAmount, setPaidAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [partyId, setPartyId] = useState<string>('');
    const [paymentAccountId, setPaymentAccountId] = useState('');
    
    // State for internal transfers
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');

    // State for new payment types
    const [paymentForm, setPaymentForm] = useState({ partyId: '', paymentAccountId: '', amount: ''});

    // State for adding new customer/supplier on the fly
    const [isAddingParty, setIsAddingParty] = useState(false);
    const [newPartyName, setNewPartyName] = useState('');

    // State for adding new category accounts (sales/purchase/expense sub-accounts)
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // State for current shop (for appending shop code to account names)
    const [currentShop, setCurrentShop] = useState<Shop | null>(null);

    // Fetch shop data when activeShopId changes
    useEffect(() => {
        const fetchShop = async () => {
            if (!activeShopId) {
                setCurrentShop(null);
                return;
            }

            try {
                const shopDoc = await getDoc(doc(db, 'shops', activeShopId));
                if (shopDoc.exists()) {
                    setCurrentShop({ id: shopDoc.id, ...shopDoc.data() } as Shop);
                }
            } catch (error) {
                console.error('Error fetching shop:', error);
                setCurrentShop(null);
            }
        };

        fetchShop();
    }, [activeShopId]);

    const { isFormDisabled, disabledMessage } = useMemo(() => {
        if (!openFinancialYear) {
            return { isFormDisabled: true, disabledMessage: t('transactions.validation.noFinancialYear') };
        }
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const dateToCheck = isEditMode ? new Date(transactionToEdit.date) : selectedDate;

        if (!isEditMode && dateToCheck > today) {
            return { isFormDisabled: true, disabledMessage: t('transactions.validation.futureDate') };
        }

        return { isFormDisabled: false, disabledMessage: '' };

    }, [openFinancialYear, selectedDate, transactionToEdit, isEditMode, t]);

    const {
        categoryAccounts,
        partyAccounts,
        paymentAccounts,
        customerAccounts,
        supplierAccounts,
    } = useMemo(() => {
        const leafAccounts = accounts.filter(acc => acc.isActive || (isEditMode && transactionToEdit.entries.some(e => e.accountId === acc.id)));

        // Filter to get only sub-accounts (accounts that have a parentId)
        const subAccountsOnly = leafAccounts.filter(a => a.parentId);

        const paymentAccs = leafAccounts.filter(a => a.type === AccountType.CASH || a.type === AccountType.BANK);
        let catAccounts: Account[] = [];
        let pAccounts: Account[] = [];

        // This switch now depends on the `formMode` which could be a plain transaction type
        switch (formMode as TransactionType) {
            case TransactionType.SALE:
                // For sales, show only sub-accounts of SALES type
                catAccounts = subAccountsOnly.filter(a => a.type === AccountType.SALES);
                // For customers, show only sub-accounts
                pAccounts = subAccountsOnly.filter(a => a.type === AccountType.CUSTOMER);
                break;
            case TransactionType.PURCHASE:
                // For purchases, show only sub-accounts of PURCHASES type
                catAccounts = subAccountsOnly.filter(a => a.type === AccountType.PURCHASES);
                // For suppliers, show only sub-accounts
                pAccounts = subAccountsOnly.filter(a => a.type === AccountType.SUPPLIER);
                break;
            case TransactionType.EXPENSE:
                // For expenses, show only sub-accounts of EXPENSES type
                catAccounts = subAccountsOnly.filter(a => a.type === AccountType.EXPENSES);
                break;
        }
        return {
            categoryAccounts: catAccounts,
            partyAccounts: pAccounts,
            paymentAccounts: paymentAccs,
            customerAccounts: subAccountsOnly.filter(a => a.type === AccountType.CUSTOMER),
            supplierAccounts: subAccountsOnly.filter(a => a.type === AccountType.SUPPLIER),
        };
    }, [formMode, accounts, isEditMode, transactionToEdit]);

    // Track if modal was just opened to prevent reset on re-renders
    const wasOpenRef = React.useRef(false);

    useEffect(() => {
        // Only run initialization when modal actually opens (isOpen changes from false to true)
        const justOpened = isOpen && !wasOpenRef.current;
        wasOpenRef.current = isOpen;

        if (!justOpened) return;

        // Reset the prevFormMode ref when modal opens
        prevFormMode.current = formMode;

        setError('');
        setIsAddingParty(false);
        setNewPartyName('');
        setIsAddingCategory(false);
        setNewCategoryName('');

        const cashAccount = paymentAccounts.find(a => a.type === AccountType.CASH);
        const bankAccount = paymentAccounts.find(a => a.type === AccountType.BANK);

        if (isEditMode) {
            // Populate form for editing
            setDescription(transactionToEdit.description || '');

            if (transactionToEdit.type === TransactionType.TRANSFER) {
                const fromEntry = transactionToEdit.entries.find(e => e.amount < 0);
                const toEntry = transactionToEdit.entries.find(e => e.amount > 0);
                const fromAccount = accounts.find(a => a.id === fromEntry?.accountId);
                const toAccount = accounts.find(a => a.id === toEntry?.accountId);

                const isCustomerPayment = fromAccount?.type === AccountType.CUSTOMER && (toAccount?.type === AccountType.CASH || toAccount?.type === AccountType.BANK);
                const isSupplierPayment = (fromAccount?.type === AccountType.CASH || fromAccount?.type === AccountType.BANK) && toAccount?.type === AccountType.SUPPLIER;

                if (isCustomerPayment) {
                    setFormMode('Customer Payment');
                    setPaymentForm({ partyId: fromAccount.id, paymentAccountId: toAccount!.id, amount: String(transactionToEdit.totalAmount) });
                } else if (isSupplierPayment) {
                    setFormMode('Supplier Payment');
                    setPaymentForm({ partyId: toAccount.id, paymentAccountId: fromAccount!.id, amount: String(transactionToEdit.totalAmount) });
                } else {
                    setFormMode(TransactionType.TRANSFER);
                    setFromAccountId(fromEntry?.accountId || '');
                    setToAccountId(toEntry?.accountId || '');
                    setTotalAmount(String(transactionToEdit.totalAmount));
                }
            } else {
                setFormMode(transactionToEdit.type);
                setTotalAmount(String(transactionToEdit.totalAmount));
                setCategoryId(transactionToEdit.categoryId || '');
                setPartyId(transactionToEdit.partyId || '');
                const paymentAccTypes = [AccountType.CASH, AccountType.BANK];
                const paymentAccIds = new Set(accounts.filter(a => paymentAccTypes.includes(a.type)).map(a => a.id));
                const paymentEntry = transactionToEdit.entries.find(e => paymentAccIds.has(e.accountId));
                if (paymentEntry) { setPaidAmount(String(Math.abs(paymentEntry.amount))); setPaymentAccountId(paymentEntry.accountId); } 
                else { setPaidAmount('0'); setPaymentAccountId(''); }
            }
        } else {
            // Reset form for new entry
            setFormMode(TransactionType.SALE);
            setTotalAmount(''); setPaidAmount(''); setDescription(''); setPartyId('');
            setCategoryId(categoryAccounts[0]?.id || '');
            setPaymentAccountId(cashAccount?.id || paymentAccounts[0]?.id || '');
            setFromAccountId(cashAccount?.id || paymentAccounts[0]?.id || '');
            setToAccountId(bankAccount?.id || paymentAccounts.find(a => a.id !== fromAccountId)?.id || '');
            setPaymentForm({ partyId: '', paymentAccountId: cashAccount?.id || '', amount: '' });
        }

    }, [isOpen, transactionToEdit]);

    // Track the previous formMode to detect actual changes
    const prevFormMode = React.useRef<FormMode>(TransactionType.SALE);

    useEffect(() => {
        // Only run this effect when formMode actually changes (not on every render)
        if (isOpen && !isEditMode && prevFormMode.current !== formMode) {
            prevFormMode.current = formMode;

            // Reset only add party/category UI states
            setError('');
            setIsAddingParty(false);
            setNewPartyName('');
            setIsAddingCategory(false);
            setNewCategoryName('');

            // Only reset amounts and description when switching transaction type
            setTotalAmount('');
            setPaidAmount('');
            setDescription('');

            // Set default account selections based on form mode
            if (formMode === TransactionType.SALE || formMode === TransactionType.PURCHASE) {
                setPartyId(partyAccounts[0]?.id || '');
                setCategoryId(categoryAccounts[0]?.id || '');
            } else if (formMode === TransactionType.EXPENSE) {
                setCategoryId(categoryAccounts[0]?.id || '');
            } else if (formMode === 'Customer Payment') {
                setPaymentForm({
                    partyId: customerAccounts[0]?.id || '',
                    paymentAccountId: paymentAccounts.find(a => a.type === AccountType.CASH)?.id || '',
                    amount: ''
                });
            } else if (formMode === 'Supplier Payment') {
                setPaymentForm({
                    partyId: supplierAccounts[0]?.id || '',
                    paymentAccountId: paymentAccounts.find(a => a.type === AccountType.CASH)?.id || '',
                    amount: ''
                });
            }
        }
    }, [formMode, isOpen, isEditMode]);


    useEffect(() => {
        // Auto-fill paid amount with total amount for sales/purchase (cash by default)
        if(isOpen && !isEditMode && (formMode === TransactionType.SALE || formMode === TransactionType.PURCHASE)) {
            setPaidAmount(totalAmount);
        }
    }, [totalAmount, formMode, isOpen, isEditMode]);

    const handleAddNewParty = () => {
        if (!newPartyName.trim() || !onAddAccount) return;
        const partyType = formMode === TransactionType.SALE ? AccountType.CUSTOMER : AccountType.SUPPLIER;
        const parentAccount = accounts.find(a => !a.parentId && a.type === partyType);
        if (!parentAccount) {
            setError(t('transactions.validation.noParentAccount', { type: partyType }));
            return;
        }

        // Append shop code to the name
        let finalAccountName = newPartyName.trim();
        if (currentShop && currentShop.shopCode) {
            const shopCodeSuffix = ` - ${currentShop.shopCode}`;
            if (!finalAccountName.endsWith(shopCodeSuffix)) {
                finalAccountName = `${finalAccountName}${shopCodeSuffix}`;
            }
        }

        const newAccount = onAddAccount({
            name: finalAccountName,
            type: partyType,
            parentId: parentAccount.id,
            accountCode: `${parentAccount.accountCode}-${Date.now().toString().slice(-6)}`, // Generate unique code
            classification: parentAccount.classification,
            nature: parentAccount.nature
        });
        if (newAccount) {
            setPartyId(newAccount.id);
            setIsAddingParty(false);
            setNewPartyName('');
        }
    };

    const handleAddNewCategory = () => {
        if (!newCategoryName.trim() || !onAddAccount) return;

        let categoryType: AccountType;
        let parentCode: string;

        switch (formMode as TransactionType) {
            case TransactionType.SALE:
                categoryType = AccountType.SALES;
                parentCode = '4100'; // Sales parent account
                break;
            case TransactionType.PURCHASE:
                categoryType = AccountType.PURCHASES;
                parentCode = '5100'; // Purchases parent account
                break;
            case TransactionType.EXPENSE:
                categoryType = AccountType.EXPENSES;
                parentCode = '5200'; // Expenses parent account
                break;
            default:
                return;
        }

        const parentAccount = accounts.find(a => !a.parentId && a.accountCode === parentCode && a.type === categoryType);
        if (!parentAccount) {
            setError(t('transactions.validation.noParentAccount', { type: categoryType }));
            return;
        }

        // Append shop code to the name
        let finalAccountName = newCategoryName.trim();
        if (currentShop && currentShop.shopCode) {
            const shopCodeSuffix = ` - ${currentShop.shopCode}`;
            if (!finalAccountName.endsWith(shopCodeSuffix)) {
                finalAccountName = `${finalAccountName}${shopCodeSuffix}`;
            }
        }

        const newAccount = onAddAccount({
            name: finalAccountName,
            type: categoryType,
            parentId: parentAccount.id,
            accountCode: `${parentAccount.accountCode}-${Date.now().toString().slice(-6)}`, // Generate unique code
            classification: parentAccount.classification,
            nature: parentAccount.nature,
            category: formMode === TransactionType.EXPENSE ? 'متنوعة' : undefined
        });

        if (newAccount) {
            setCategoryId(newAccount.id);
            setIsAddingCategory(false);
            setNewCategoryName('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (isFormDisabled) { setError(disabledMessage); return; }

        const entries: TransactionEntry[] = [];
        let finalType: TransactionType = formMode as TransactionType;
        let finalTotalAmount: number = 0;
        let finalCategoryId: string | undefined = undefined;
        let finalPartyId: string | undefined = undefined;

        if (formMode === 'Customer Payment' || formMode === 'Supplier Payment') {
            const amountNum = parseFloat(paymentForm.amount);
            if (!paymentForm.amount || isNaN(amountNum) || amountNum <= 0 || !paymentForm.partyId || !paymentForm.paymentAccountId) {
                setError(t('transactions.validation.selectAccountsAndAmount')); return;
            }
            finalType = TransactionType.TRANSFER; // Both are handled as transfers
            finalTotalAmount = amountNum;
            finalPartyId = paymentForm.partyId; // Link payment to customer/supplier
            const partyAccount = accounts.find(a => a.id === paymentForm.partyId);

            if (formMode === 'Customer Payment') {
                entries.push({ accountId: paymentForm.paymentAccountId, amount: amountNum }); // Dr. Bank/Cash
                entries.push({ accountId: paymentForm.partyId, amount: -amountNum }); // Cr. Customer
                if (!description) setDescription(t('transactions.validation.customerCollectionDescription', { name: partyAccount?.name || '' }));
            } else {
                entries.push({ accountId: paymentForm.partyId, amount: amountNum }); // Dr. Supplier
                entries.push({ accountId: paymentForm.paymentAccountId, amount: -amountNum }); // Cr. Bank/Cash
                if (!description) setDescription(t('transactions.validation.supplierPaymentDescription', { name: partyAccount?.name || '' }));
            }
        } else if (formMode === TransactionType.TRANSFER) {
            const totalNum = parseFloat(totalAmount);
            if (!totalAmount || isNaN(totalNum) || totalNum <= 0 || !fromAccountId || !toAccountId) {
                setError(t('transactions.validation.selectAccountsAndAmount')); return;
            }
            if(fromAccountId === toAccountId) { setError(t('transactions.validation.sameAccount')); return; }
            entries.push({ accountId: toAccountId, amount: totalNum }, { accountId: fromAccountId, amount: -totalNum });
            finalTotalAmount = totalNum;
        } else {
            const totalNum = parseFloat(totalAmount);
            const paidNum = parseFloat(paidAmount);
            if (!totalAmount || isNaN(totalNum) || totalNum <= 0 || !categoryId) { setError(t('transactions.validation.selectCategoryAndAmount')); return; }
            if (isNaN(paidNum) || paidNum < 0 || paidNum > totalNum) { setError(t('transactions.validation.paidAmountInvalid')); return; }
            if (paidNum > 0 && !paymentAccountId) { setError(t('transactions.validation.selectPaymentAccount')); return; }

            // If partyId is empty, it's a cash transaction
            // If partyId has value, it's a credit transaction with a customer/supplier

            finalTotalAmount = totalNum;
            finalCategoryId = categoryId;
            const remainingAmount = totalNum - paidNum;

            switch (formMode) {
                case TransactionType.SALE:
                    finalPartyId = partyId || undefined;
                    entries.push({ accountId: categoryId, amount: -totalNum });
                    if (paidNum > 0) entries.push({ accountId: paymentAccountId, amount: paidNum });
                    if (remainingAmount > 0 && partyId) entries.push({ accountId: partyId, amount: remainingAmount });
                    break;
                case TransactionType.PURCHASE:
                    finalPartyId = partyId || undefined;
                    entries.push({ accountId: categoryId, amount: totalNum });
                    if (paidNum > 0) entries.push({ accountId: paymentAccountId, amount: -paidNum });
                    if (remainingAmount > 0 && partyId) entries.push({ accountId: partyId, amount: -remainingAmount });
                    break;
                case TransactionType.EXPENSE:
                    // Expenses don't have associated parties
                    finalPartyId = undefined;
                    if(paidNum !== totalNum) { setError(t('transactions.validation.expenseFullPayment')); return; }
                    entries.push({ accountId: categoryId, amount: totalNum }, { accountId: paymentAccountId, amount: -totalNum });
                    break;
            }
        }

        if (Math.abs(entries.reduce((s, en) => s + en.amount, 0)) > 0.001) { setError(t('transactions.validation.unbalancedEntry')); return; }

        // Build transaction object
        const newTransaction: Omit<Transaction, 'id' | 'shopId' | 'date'> = {
            type: finalType,
            description,
            entries,
            totalAmount: finalTotalAmount
        };
        if (finalCategoryId) newTransaction.categoryId = finalCategoryId;
        if (finalPartyId) newTransaction.partyId = finalPartyId;

        // Check if offline
        if (!connectionStatus.isFullyOnline && !isEditMode) {
            try {
                // Queue transaction for later sync
                await OfflineManager.addPendingTransaction(
                    {
                        ...newTransaction,
                        date: selectedDate.toISOString(),
                        shopId: activeShopId || accounts[0]?.shopId || ''
                    } as any,
                    currentUserId || '',
                    activeShopId || accounts[0]?.shopId || ''
                );

                console.log('📥 Transaction queued for offline sync');

                // Show success message
                setError('');
                onClose();

                // Alert user
                alert('تم حفظ المعاملة محلياً. سيتم المزامنة عند استعادة الاتصال.');
            } catch (error) {
                console.error('Error queuing transaction:', error);
                setError('فشل في حفظ المعاملة محلياً');
            }
            return;
        }

        // Original online flow
        if (isEditMode) {
            const updatedTransaction: Transaction = {
                ...transactionToEdit,
                type: finalType,
                description,
                entries,
                totalAmount: finalTotalAmount
            };
            // Only add categoryId and partyId if they have valid values
            if (finalCategoryId) updatedTransaction.categoryId = finalCategoryId;
            if (finalPartyId) updatedTransaction.partyId = finalPartyId;

            onUpdateTransaction(updatedTransaction);
        } else {
            onAddTransaction(newTransaction);
        }
        onClose();
    };
    
    const getPartyLabel = () => formMode === TransactionType.SALE ? t('transactions.form.customer') : t('transactions.form.supplier');

    const renderTransactionFields = () => (
        <>
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.categoryAccount')}</label>
                {/* Only show add category form for EXPENSE type */}
                {formMode === TransactionType.EXPENSE && isAddingCategory ? (
                    <div className="border border-gray-500 rounded-md p-3 space-y-2 bg-background/50">
                        <label className="block text-sm font-medium text-text-secondary">{t('transactions.form.newCategoryName')}</label>
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder={t('transactions.form.enterCategoryName')}
                            className="w-full bg-background border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                        />
                        <div className="flex gap-2 justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300"
                            >
                                {t('transactions.form.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={handleAddNewCategory}
                                className="bg-primary hover:bg-primary-dark text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300"
                            >
                                {t('transactions.form.save')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={formMode === TransactionType.EXPENSE ? "flex items-center gap-2" : ""}>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                            disabled={isFormDisabled || categoryAccounts.length === 0}
                            required
                        >
                            <option value="" disabled>{t('transactions.form.selectAccount')}</option>
                            {categoryAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                        {/* Only show + button for EXPENSE transactions */}
                        {formMode === TransactionType.EXPENSE && (
                            <button
                                type="button"
                                title={t('transactions.form.addNewCategory')}
                                onClick={() => setIsAddingCategory(true)}
                                className="bg-accent hover:bg-blue-500 text-white font-bold p-2 rounded-md transition duration-300 flex-shrink-0 disabled:opacity-50"
                                disabled={isFormDisabled}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                                </svg>
                            </button>
                        )}
                    </div>
                )}
            </div>
            {formMode !== TransactionType.EXPENSE && (isAddingParty ? (<div className="border border-gray-500 rounded-md p-3 space-y-2 bg-background/50"><label className="block text-sm font-medium text-text-secondary">{formMode === TransactionType.SALE ? t('transactions.form.newCustomerName') : t('transactions.form.newSupplierName')}</label><input type="text" value={newPartyName} onChange={(e) => setNewPartyName(e.target.value)} placeholder={formMode === TransactionType.SALE ? t('transactions.form.enterCustomerName') : t('transactions.form.enterSupplierName')} className="w-full bg-background border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"/><div className="flex gap-2 justify-end pt-1"><button type="button" onClick={() => { setIsAddingParty(false); setNewPartyName('');}} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300">{t('transactions.form.cancel')}</button><button type="button" onClick={handleAddNewParty} className="bg-primary hover:bg-primary-dark text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300">{t('transactions.form.save')}</button></div></div>) : (<div><label className="block text-sm font-medium text-text-secondary mb-1">{getPartyLabel()}</label><div className="flex items-center gap-2"><select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled} required><option value="" disabled>{formMode === TransactionType.SALE ? t('transactions.form.selectCustomer') : t('transactions.form.selectSupplier')}</option>{partyAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select><button type="button" title={formMode === TransactionType.SALE ? t('transactions.form.addNewCustomer') : t('transactions.form.addNewSupplier')} onClick={() => setIsAddingParty(true)} className="bg-accent hover:bg-blue-500 text-white font-bold p-2 rounded-md transition duration-300 flex-shrink-0 disabled:opacity-50" disabled={isFormDisabled}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></button></div></div>))}
            <div className={formMode === TransactionType.EXPENSE ? "" : "grid grid-cols-2 gap-3"}>
                <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.totalAmount')}</label>
                    <input
                        type="number"
                        value={totalAmount}
                        onChange={(e) => {
                            setTotalAmount(e.target.value);
                            // For expenses, automatically set paid amount equal to total amount
                            if (formMode === TransactionType.EXPENSE) {
                                setPaidAmount(e.target.value);
                            }
                        }}
                        placeholder={t('transactions.form.enterTotalAmount')}
                        className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                        disabled={isFormDisabled}
                        required
                        min="0.01"
                        step="any"
                    />
                </div>
                {formMode !== TransactionType.EXPENSE && (
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.paidAmount')}</label>
                        <input
                            type="number"
                            value={paidAmount}
                            onChange={(e) => setPaidAmount(e.target.value)}
                            placeholder={t('transactions.form.enterPaidAmount')}
                            className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                            disabled={isFormDisabled}
                            min="0"
                            step="any"
                        />
                    </div>
                )}
            </div>
            {((formMode !== TransactionType.EXPENSE && parseFloat(paidAmount) > 0) || formMode === TransactionType.EXPENSE) && (<div><label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.paymentMethod')}</label><select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || paymentAccounts.length === 0} required><option value="" disabled>{t('transactions.form.selectPaymentMethod')}</option>{paymentAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>)}
        </>
    );

    const renderTransferFields = () => (
        <>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.fromAccount')}</label><select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || paymentAccounts.length < 2}>{paymentAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.toAccount')}</label><select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || paymentAccounts.length < 2}>{paymentAccounts.filter(acc => acc.id !== fromAccountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.amount')}</label><input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder={t('transactions.form.enterTransferAmount')} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled} required min="0.01" step="any" /></div>
        </>
    );
    
    const renderCustomerPaymentFields = () => (
        <>
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.customer')}</label>
                {isAddingParty ? (
                    <div className="border border-gray-500 rounded-md p-3 space-y-2 bg-background/50">
                        <label className="block text-sm font-medium text-text-secondary">{t('transactions.form.newCustomerName')}</label>
                        <input
                            type="text"
                            value={newPartyName}
                            onChange={(e) => setNewPartyName(e.target.value)}
                            placeholder={t('transactions.form.enterCustomerName')}
                            className="w-full bg-background border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                        />
                        <div className="flex gap-2 justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => { setIsAddingParty(false); setNewPartyName(''); }}
                                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300"
                            >
                                {t('transactions.form.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!newPartyName.trim() || !onAddAccount) return;
                                    const parentAccount = accounts.find(a => !a.parentId && a.type === AccountType.CUSTOMER);
                                    if (!parentAccount) {
                                        setError(t('transactions.validation.noParentAccount', { type: AccountType.CUSTOMER }));
                                        return;
                                    }

                                    // Append shop code to the name
                                    let finalAccountName = newPartyName.trim();
                                    if (currentShop && currentShop.shopCode) {
                                        const shopCodeSuffix = ` - ${currentShop.shopCode}`;
                                        if (!finalAccountName.endsWith(shopCodeSuffix)) {
                                            finalAccountName = `${finalAccountName}${shopCodeSuffix}`;
                                        }
                                    }

                                    const newAccount = onAddAccount({
                                        name: finalAccountName,
                                        type: AccountType.CUSTOMER,
                                        parentId: parentAccount.id,
                                        accountCode: `${parentAccount.accountCode}-${Date.now().toString().slice(-6)}`,
                                        classification: parentAccount.classification,
                                        nature: parentAccount.nature
                                    });
                                    if (newAccount) {
                                        setPaymentForm(p => ({...p, partyId: newAccount.id}));
                                        setIsAddingParty(false);
                                        setNewPartyName('');
                                    }
                                }}
                                className="bg-primary hover:bg-primary-dark text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300"
                            >
                                {t('transactions.form.save')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <select
                            value={paymentForm.partyId}
                            onChange={(e) => setPaymentForm(p => ({...p, partyId: e.target.value}))}
                            className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                            disabled={isFormDisabled || customerAccounts.length === 0}
                            required
                        >
                            <option value="" disabled>{t('transactions.form.selectCustomer')}</option>
                            {customerAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                        <button
                            type="button"
                            title={t('transactions.form.addNewCustomer')}
                            onClick={() => setIsAddingParty(true)}
                            className="bg-accent hover:bg-blue-500 text-white font-bold p-2 rounded-md transition duration-300 flex-shrink-0 disabled:opacity-50"
                            disabled={isFormDisabled}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                        </button>
                    </div>
                )}
            </div>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.receiptAccount')}</label><select value={paymentForm.paymentAccountId} onChange={(e) => setPaymentForm(p => ({...p, paymentAccountId: e.target.value}))} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || paymentAccounts.length === 0} required>{paymentAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.collectedAmount')}</label><input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm(p => ({...p, amount: e.target.value}))} placeholder={t('transactions.form.enterAmount')} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled} required min="0.01" step="any" /></div>
        </>
    );

    const renderSupplierPaymentFields = () => (
         <>
            <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.supplier')}</label>
                {isAddingParty ? (
                    <div className="border border-gray-500 rounded-md p-3 space-y-2 bg-background/50">
                        <label className="block text-sm font-medium text-text-secondary">{t('transactions.form.newSupplierName')}</label>
                        <input
                            type="text"
                            value={newPartyName}
                            onChange={(e) => setNewPartyName(e.target.value)}
                            placeholder={t('transactions.form.enterSupplierName')}
                            className="w-full bg-background border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                        />
                        <div className="flex gap-2 justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => { setIsAddingParty(false); setNewPartyName(''); }}
                                className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300"
                            >
                                {t('transactions.form.cancel')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!newPartyName.trim() || !onAddAccount) return;
                                    const parentAccount = accounts.find(a => !a.parentId && a.type === AccountType.SUPPLIER);
                                    if (!parentAccount) {
                                        setError(t('transactions.validation.noParentAccount', { type: AccountType.SUPPLIER }));
                                        return;
                                    }

                                    // Append shop code to the name
                                    let finalAccountName = newPartyName.trim();
                                    if (currentShop && currentShop.shopCode) {
                                        const shopCodeSuffix = ` - ${currentShop.shopCode}`;
                                        if (!finalAccountName.endsWith(shopCodeSuffix)) {
                                            finalAccountName = `${finalAccountName}${shopCodeSuffix}`;
                                        }
                                    }

                                    const newAccount = onAddAccount({
                                        name: finalAccountName,
                                        type: AccountType.SUPPLIER,
                                        parentId: parentAccount.id,
                                        accountCode: `${parentAccount.accountCode}-${Date.now().toString().slice(-6)}`,
                                        classification: parentAccount.classification,
                                        nature: parentAccount.nature
                                    });
                                    if (newAccount) {
                                        setPaymentForm(p => ({...p, partyId: newAccount.id}));
                                        setIsAddingParty(false);
                                        setNewPartyName('');
                                    }
                                }}
                                className="bg-primary hover:bg-primary-dark text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300"
                            >
                                {t('transactions.form.save')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <select
                            value={paymentForm.partyId}
                            onChange={(e) => setPaymentForm(p => ({...p, partyId: e.target.value}))}
                            className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                            disabled={isFormDisabled || supplierAccounts.length === 0}
                            required
                        >
                            <option value="" disabled>{t('transactions.form.selectSupplier')}</option>
                            {supplierAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                        <button
                            type="button"
                            title={t('transactions.form.addNewSupplier')}
                            onClick={() => setIsAddingParty(true)}
                            className="bg-accent hover:bg-blue-500 text-white font-bold p-2 rounded-md transition duration-300 flex-shrink-0 disabled:opacity-50"
                            disabled={isFormDisabled}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                        </button>
                    </div>
                )}
            </div>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.paymentAccount')}</label><select value={paymentForm.paymentAccountId} onChange={(e) => setPaymentForm(p => ({...p, paymentAccountId: e.target.value}))} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || paymentAccounts.length === 0} required>{paymentAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.paidAmount')}</label><input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm(p => ({...p, amount: e.target.value}))} placeholder={t('transactions.form.enterAmount')} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled} required min="0.01" step="any" /></div>
        </>
    );


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300" aria-modal="true" role="dialog">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">{isEditMode ? t('transactions.form.title.edit') : t('transactions.form.title.create')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full" aria-label={t('transactions.form.cancel')}><CloseIcon /></button>
                </div>

                {isFormDisabled && !openFinancialYear && (<div className="bg-yellow-500/20 text-yellow-300 text-sm p-3 rounded-md m-4 text-center">{disabledMessage}</div>)}
                
                <form id="daily-entry-form" onSubmit={handleSubmit} className="space-y-4 p-6 overflow-y-auto">
                    {isFormDisabled && openFinancialYear && (<div className="bg-yellow-500/20 text-yellow-300 text-sm p-3 rounded-md text-center">{disabledMessage}</div>)}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">{t('transactions.form.type')}</label>
                        <div className="overflow-x-auto pb-2">
                            <div className="flex gap-2 min-w-max">
                                {[
                                    { value: TransactionType.SALE, labelKey: 'transactions.types.SALE', Icon: SaleIcon, color: 'from-green-500 to-green-600', hoverColor: 'hover:from-green-600 hover:to-green-700' },
                                    { value: TransactionType.PURCHASE, labelKey: 'transactions.types.PURCHASE', Icon: PurchaseIcon, color: 'from-blue-500 to-blue-600', hoverColor: 'hover:from-blue-600 hover:to-blue-700' },
                                    { value: TransactionType.EXPENSE, labelKey: 'transactions.types.EXPENSE', Icon: ExpenseIcon, color: 'from-red-500 to-red-600', hoverColor: 'hover:from-red-600 hover:to-red-700' },
                                    { value: 'Customer Payment' as FormMode, labelKey: 'transactions.form.customerPayment', Icon: CustomerPaymentIcon, color: 'from-yellow-500 to-yellow-600', hoverColor: 'hover:from-yellow-600 hover:to-yellow-700' },
                                    { value: 'Supplier Payment' as FormMode, labelKey: 'transactions.form.supplierPayment', Icon: SupplierPaymentIcon, color: 'from-orange-500 to-orange-600', hoverColor: 'hover:from-orange-600 hover:to-orange-700' },
                                    { value: TransactionType.TRANSFER, labelKey: 'transactions.form.internalTransfer', Icon: TransferIcon, color: 'from-purple-500 to-purple-600', hoverColor: 'hover:from-purple-600 hover:to-purple-700' },
                                ].map(({ value, labelKey, Icon, color, hoverColor }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setFormMode(value)}
                                        disabled={isFormDisabled || isEditMode}
                                        className={`
                                            relative flex-shrink-0 w-20 h-16 rounded-lg transition-all duration-300
                                            ${formMode === value
                                                ? `bg-gradient-to-br ${color} shadow-lg scale-105 ring-2 ring-white ring-opacity-50`
                                                : `bg-gradient-to-br ${color} opacity-60 ${hoverColor}`
                                            }
                                            disabled:opacity-30 disabled:cursor-not-allowed
                                            flex flex-col items-center justify-center gap-1 p-1.5
                                        `}
                                    >
                                        <Icon />
                                        <span className="text-[10px] font-medium text-white text-center leading-tight">{t(labelKey)}</span>
                                        {formMode === value && (
                                            <div className="absolute top-0.5 right-0.5">
                                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {formMode === TransactionType.TRANSFER && renderTransferFields()}
                    {formMode === 'Customer Payment' && renderCustomerPaymentFields()}
                    {formMode === 'Supplier Payment' && renderSupplierPaymentFields()}
                    {[TransactionType.SALE, TransactionType.PURCHASE, TransactionType.EXPENSE].includes(formMode as TransactionType) && renderTransactionFields()}

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">{t('transactions.form.description')}</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('transactions.form.descriptionPlaceholder')} rows={2} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled} />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-md">{error}</p>}
                </form>

                <div className="flex justify-end space-x-4 space-x-reverse p-4 border-t border-gray-700 mt-auto">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300">{t('transactions.form.cancel')}</button>
                    <button type="submit" form="daily-entry-form" className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isFormDisabled}>{isEditMode ? t('transactions.form.saveChanges') : t('transactions.form.addTransaction')}</button>
                </div>
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

export default DailyEntryForm;
