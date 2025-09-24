import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, Account, AccountType, TransactionEntry, FinancialYear } from '../types';

const CloseIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
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
}

const DailyEntryForm: React.FC<DailyEntryFormProps> = ({ isOpen, onClose, onAddTransaction, onUpdateTransaction, transactionToEdit, accounts, openFinancialYear, onAddAccount, selectedDate }) => {
    const isEditMode = !!transactionToEdit;

    // Main state for the form
    const [formMode, setFormMode] = useState<FormMode>(TransactionType.SALE);
    const [description, setDescription] = useState('');
    const [error, setError] = useState('');

    // State for Sale/Purchase/Expense
    const [totalAmount, setTotalAmount] = useState('');
    const [paidAmount, setPaidAmount] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [partyId, setPartyId] = useState<string | 'cash'>('cash');
    const [paymentAccountId, setPaymentAccountId] = useState('');
    
    // State for internal transfers
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');

    // State for new payment types
    const [paymentForm, setPaymentForm] = useState({ partyId: '', paymentAccountId: '', amount: ''});

    // State for adding new customer/supplier on the fly
    const [isAddingParty, setIsAddingParty] = useState(false);
    const [newPartyName, setNewPartyName] = useState('');

    const { isFormDisabled, disabledMessage } = useMemo(() => {
        if (!openFinancialYear) {
            return { isFormDisabled: true, disabledMessage: 'لا توجد سنة مالية مفتوحة. لا يمكن إضافة حركات.' };
        }
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const dateToCheck = isEditMode ? new Date(transactionToEdit.date) : selectedDate;

        if (!isEditMode && dateToCheck > today) {
            return { isFormDisabled: true, disabledMessage: 'لا يمكن تسجيل حركات في تاريخ مستقبلي.' };
        }
        
        return { isFormDisabled: false, disabledMessage: '' };

    }, [openFinancialYear, selectedDate, transactionToEdit, isEditMode]);

    const {
        categoryAccounts,
        partyAccounts,
        paymentAccounts,
        customerAccounts,
        supplierAccounts,
    } = useMemo(() => {
        const leafAccounts = accounts.filter(acc => acc.isActive || (isEditMode && transactionToEdit.entries.some(e => e.accountId === acc.id)));
        const paymentAccs = leafAccounts.filter(a => a.type === AccountType.CASH || a.type === AccountType.BANK);
        let catAccounts: Account[] = [];
        let pAccounts: Account[] = [];

        // This switch now depends on the `formMode` which could be a plain transaction type
        switch (formMode as TransactionType) {
            case TransactionType.SALE:
                catAccounts = leafAccounts.filter(a => a.type === AccountType.SALES);
                pAccounts = leafAccounts.filter(a => a.type === AccountType.CUSTOMER);
                break;
            case TransactionType.PURCHASE:
                catAccounts = leafAccounts.filter(a => a.type === AccountType.PURCHASES);
                pAccounts = leafAccounts.filter(a => a.type === AccountType.SUPPLIER);
                break;
            case TransactionType.EXPENSE:
                catAccounts = leafAccounts.filter(a => a.type === AccountType.EXPENSES);
                break;
        }
        return { 
            categoryAccounts: catAccounts, 
            partyAccounts: pAccounts, 
            paymentAccounts: paymentAccs,
            customerAccounts: leafAccounts.filter(a => a.type === AccountType.CUSTOMER),
            supplierAccounts: leafAccounts.filter(a => a.type === AccountType.SUPPLIER),
        };
    }, [formMode, accounts, isEditMode, transactionToEdit]);
    
    useEffect(() => {
        if (!isOpen) return;
        setError('');
        setIsAddingParty(false);
        setNewPartyName('');
        
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
                setPartyId(transactionToEdit.partyId || 'cash');
                const paymentAccTypes = [AccountType.CASH, AccountType.BANK];
                const paymentAccIds = new Set(accounts.filter(a => paymentAccTypes.includes(a.type)).map(a => a.id));
                const paymentEntry = transactionToEdit.entries.find(e => paymentAccIds.has(e.accountId));
                if (paymentEntry) { setPaidAmount(String(Math.abs(paymentEntry.amount))); setPaymentAccountId(paymentEntry.accountId); } 
                else { setPaidAmount('0'); setPaymentAccountId(''); }
            }
        } else {
            // Reset form for new entry
            setFormMode(TransactionType.SALE);
            setTotalAmount(''); setPaidAmount(''); setDescription(''); setPartyId('cash');
            setCategoryId(categoryAccounts[0]?.id || '');
            setPaymentAccountId(cashAccount?.id || paymentAccounts[0]?.id || '');
            setFromAccountId(cashAccount?.id || paymentAccounts[0]?.id || '');
            setToAccountId(bankAccount?.id || paymentAccounts.find(a => a.id !== fromAccountId)?.id || '');
            setPaymentForm({ partyId: '', paymentAccountId: cashAccount?.id || '', amount: '' });
        }

    }, [isOpen, transactionToEdit, accounts]);

    useEffect(() => {
        if (isOpen && !isEditMode) {
            setError(''); setIsAddingParty(false); setNewPartyName('');
            setTotalAmount(''); setPaidAmount(''); setDescription('');
            if (formMode === TransactionType.SALE || formMode === TransactionType.PURCHASE || formMode === TransactionType.EXPENSE) {
                setPartyId('cash');
                setCategoryId(categoryAccounts[0]?.id || '');
            } else if (formMode === 'Customer Payment') {
                setPaymentForm({ partyId: customerAccounts[0]?.id || '', paymentAccountId: paymentAccounts.find(a => a.type === AccountType.CASH)?.id || '', amount: '' });
            } else if (formMode === 'Supplier Payment') {
                setPaymentForm({ partyId: supplierAccounts[0]?.id || '', paymentAccountId: paymentAccounts.find(a => a.type === AccountType.CASH)?.id || '', amount: '' });
            }
        }
    }, [formMode, isOpen, isEditMode, categoryAccounts, customerAccounts, supplierAccounts, paymentAccounts]);


    useEffect(() => {
        if(isOpen && !isEditMode && formMode !== TransactionType.TRANSFER && partyId === 'cash') {
            setPaidAmount(totalAmount);
        }
    }, [totalAmount, formMode, partyId, isOpen, isEditMode]);

    const handleAddNewParty = () => {
        if (!newPartyName.trim() || !onAddAccount) return;
        const partyType = formMode === TransactionType.SALE ? AccountType.CUSTOMER : AccountType.SUPPLIER;
        const parentAccount = accounts.find(a => !a.parentId && a.type === partyType);
        if (!parentAccount) {
            setError(`لا يوجد حساب رئيسي لـ "${partyType}". يرجى إضافته من شجرة الحسابات.`);
            return;
        }
        const newAccount = onAddAccount({ name: newPartyName.trim(), type: partyType, parentId: parentAccount.id });
        if (newAccount) {
            setPartyId(newAccount.id);
            setIsAddingParty(false);
            setNewPartyName('');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
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
                setError('الرجاء التأكد من اختيار الحسابات وإدخال مبلغ صحيح.'); return;
            }
            finalType = TransactionType.TRANSFER; // Both are handled as transfers
            finalTotalAmount = amountNum;
            const partyAccount = accounts.find(a => a.id === paymentForm.partyId);

            if (formMode === 'Customer Payment') { // تحصيل من عميل
                entries.push({ accountId: paymentForm.paymentAccountId, amount: amountNum }); // Dr. Bank/Cash
                entries.push({ accountId: paymentForm.partyId, amount: -amountNum }); // Cr. Customer
                if (!description) setDescription(`تحصيل دفعة من العميل: ${partyAccount?.name || ''}`);
            } else { // دفع لمورد
                entries.push({ accountId: paymentForm.partyId, amount: amountNum }); // Dr. Supplier
                entries.push({ accountId: paymentForm.paymentAccountId, amount: -amountNum }); // Cr. Bank/Cash
                if (!description) setDescription(`سداد دفعة للمورد: ${partyAccount?.name || ''}`);
            }
        } else if (formMode === TransactionType.TRANSFER) {
            const totalNum = parseFloat(totalAmount);
            if (!totalAmount || isNaN(totalNum) || totalNum <= 0 || !fromAccountId || !toAccountId) {
                setError('الرجاء التأكد من إدخال مبلغ صحيح واختيار حسابات التحويل.'); return;
            }
            if(fromAccountId === toAccountId) { setError('لا يمكن التحويل من وإلى نفس الحساب.'); return; }
            entries.push({ accountId: toAccountId, amount: totalNum }, { accountId: fromAccountId, amount: -totalNum });
            finalTotalAmount = totalNum;
        } else {
            const totalNum = parseFloat(totalAmount);
            const paidNum = parseFloat(paidAmount);
            if (!totalAmount || isNaN(totalNum) || totalNum <= 0 || !categoryId) { setError('الرجاء التأكد من إدخال مبلغ صحيح واختيار حساب الفئة.'); return; }
            if (isNaN(paidNum) || paidNum < 0 || paidNum > totalNum) { setError('المبلغ المدفوع يجب أن يكون رقماً صحيحاً بين 0 والمبلغ الإجمالي.'); return; }
            if (paidNum > 0 && !paymentAccountId) { setError('الرجاء اختيار حساب الدفع (الصندوق أو البنك).'); return; }
            if (partyId !== 'cash' && !partyId) { setError(`الرجاء اختيار ${getPartyLabel()}.`); return; }

            finalTotalAmount = totalNum;
            finalCategoryId = categoryId;
            finalPartyId = partyId === 'cash' ? undefined : partyId;
            const remainingAmount = totalNum - paidNum;

            switch (formMode) {
                case TransactionType.SALE:
                    entries.push({ accountId: categoryId, amount: -totalNum });
                    if (paidNum > 0) entries.push({ accountId: paymentAccountId, amount: paidNum });
                    if (remainingAmount > 0 && partyId !== 'cash') entries.push({ accountId: partyId, amount: remainingAmount });
                    break;
                case TransactionType.PURCHASE:
                    entries.push({ accountId: categoryId, amount: totalNum });
                    if (paidNum > 0) entries.push({ accountId: paymentAccountId, amount: -paidNum });
                    if (remainingAmount > 0 && partyId !== 'cash') entries.push({ accountId: partyId, amount: -remainingAmount });
                    break;
                case TransactionType.EXPENSE:
                    if(paidNum !== totalNum) { setError('في المصروفات، يجب أن يكون المبلغ المدفوع هو المبلغ الإجمالي.'); return; }
                    entries.push({ accountId: categoryId, amount: totalNum }, { accountId: paymentAccountId, amount: -totalNum });
                    break;
            }
        }
        
        if (Math.abs(entries.reduce((s, en) => s + en.amount, 0)) > 0.001) { setError("خطأ في النظام: القيد غير متوازن."); return; }
        
        if (isEditMode) {
            onUpdateTransaction({ ...transactionToEdit, type: finalType, description, entries, totalAmount: finalTotalAmount, categoryId: finalCategoryId, partyId: finalPartyId });
        } else {
            onAddTransaction({ type: finalType, description, entries, totalAmount: finalTotalAmount, categoryId: finalCategoryId, partyId: finalPartyId });
        }
        onClose();
    };
    
    const getPartyLabel = () => formMode === TransactionType.SALE ? 'العميل' : 'المورد';

    const renderTransactionFields = () => (
        <>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">حساب الفئة</label><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || categoryAccounts.length === 0} required><option value="" disabled>-- اختر حساب --</option>{categoryAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            {formMode !== TransactionType.EXPENSE && (isAddingParty ? (<div className="border border-gray-500 rounded-md p-3 space-y-2 bg-background/50"><label className="block text-sm font-medium text-text-secondary">اسم {getPartyLabel()} الجديد</label><input type="text" value={newPartyName} onChange={(e) => setNewPartyName(e.target.value)} placeholder={`أدخل اسم ${getPartyLabel()}`} className="w-full bg-background border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"/><div className="flex gap-2 justify-end pt-1"><button type="button" onClick={() => { setIsAddingParty(false); setNewPartyName('');}} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300">إلغاء</button><button type="button" onClick={handleAddNewParty} className="bg-primary hover:bg-primary-dark text-white font-bold py-1 px-3 rounded-md text-sm transition duration-300">حفظ</button></div></div>) : (<div><label className="block text-sm font-medium text-text-secondary mb-1">{getPartyLabel()}</label><div className="flex items-center gap-2"><select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled}><option value="cash">{formMode === TransactionType.SALE ? 'بيع نقدي مباشر' : 'شراء نقدي مباشر'}</option>{partyAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select><button type="button" title={`إضافة ${getPartyLabel()} جديد`} onClick={() => setIsAddingParty(true)} className="bg-accent hover:bg-blue-500 text-white font-bold p-2 rounded-md transition duration-300 flex-shrink-0 disabled:opacity-50" disabled={isFormDisabled}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></button></div></div>))}
            <div><label className="block text-sm font-medium text-text-secondary mb-1">المبلغ الإجمالي</label><input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="أدخل المبلغ الإجمالي" className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled} required min="0.01" step="any" /></div>
            {(formMode !== TransactionType.EXPENSE && partyId !== 'cash') && (<div><label className="block text-sm font-medium text-text-secondary mb-1">المبلغ المدفوع</label><input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} placeholder="أدخل المبلغ المدفوع الآن" className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled} /></div>)}
            {((formMode !== TransactionType.EXPENSE && parseFloat(paidAmount) > 0) || formMode === TransactionType.EXPENSE) && (<div><label className="block text-sm font-medium text-text-secondary mb-1">طريقة الدفع</label><select value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || paymentAccounts.length === 0} required><option value="" disabled>-- اختر طريقة الدفع --</option>{paymentAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>)}
        </>
    );

    const renderTransferFields = () => (
        <>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">من حساب</label><select value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || paymentAccounts.length < 2}>{paymentAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">إلى حساب</label><select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || paymentAccounts.length < 2}>{paymentAccounts.filter(acc => acc.id !== fromAccountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">المبلغ</label><input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="أدخل مبلغ التحويل" className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled} required min="0.01" step="any" /></div>
        </>
    );
    
    const renderCustomerPaymentFields = () => (
        <>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">العميل</label><select value={paymentForm.partyId} onChange={(e) => setPaymentForm(p => ({...p, partyId: e.target.value}))} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || customerAccounts.length === 0} required>{customerAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">حساب الاستلام</label><select value={paymentForm.paymentAccountId} onChange={(e) => setPaymentForm(p => ({...p, paymentAccountId: e.target.value}))} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || paymentAccounts.length === 0} required>{paymentAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">المبلغ المحصّل</label><input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm(p => ({...p, amount: e.target.value}))} placeholder="أدخل المبلغ" className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled} required min="0.01" step="any" /></div>
        </>
    );

    const renderSupplierPaymentFields = () => (
         <>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">المورد</label><select value={paymentForm.partyId} onChange={(e) => setPaymentForm(p => ({...p, partyId: e.target.value}))} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || supplierAccounts.length === 0} required>{supplierAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">حساب الدفع</label><select value={paymentForm.paymentAccountId} onChange={(e) => setPaymentForm(p => ({...p, paymentAccountId: e.target.value}))} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || paymentAccounts.length === 0} required>{paymentAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            <div><label className="block text-sm font-medium text-text-secondary mb-1">المبلغ المدفوع</label><input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm(p => ({...p, amount: e.target.value}))} placeholder="أدخل المبلغ" className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled} required min="0.01" step="any" /></div>
        </>
    );


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 transition-opacity duration-300" aria-modal="true" role="dialog">
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">{isEditMode ? 'تعديل حركة' : 'إدخال حركة يومية جديدة'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full" aria-label="إغلاق"><CloseIcon /></button>
                </div>

                {isFormDisabled && !openFinancialYear && (<div className="bg-yellow-500/20 text-yellow-300 text-sm p-3 rounded-md m-4 text-center">{disabledMessage}</div>)}
                
                <form id="daily-entry-form" onSubmit={handleSubmit} className="space-y-4 p-6 overflow-y-auto">
                    {isFormDisabled && openFinancialYear && (<div className="bg-yellow-500/20 text-yellow-300 text-sm p-3 rounded-md text-center">{disabledMessage}</div>)}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">نوع الحركة</label>
                        <select value={formMode} onChange={(e) => setFormMode(e.target.value as FormMode)} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled || isEditMode}>
                            <option value={TransactionType.SALE}>بيع</option>
                            <option value={TransactionType.PURCHASE}>شراء</option>
                            <option value={TransactionType.EXPENSE}>صرف</option>
                            <option value="Customer Payment">تحصيل من عميل</option>
                            <option value="Supplier Payment">دفع لمورد</option>
                            <option value={TransactionType.TRANSFER}>تحويل داخلي</option>
                        </select>
                    </div>
                    
                    {formMode === TransactionType.TRANSFER && renderTransferFields()}
                    {formMode === 'Customer Payment' && renderCustomerPaymentFields()}
                    {formMode === 'Supplier Payment' && renderSupplierPaymentFields()}
                    {[TransactionType.SALE, TransactionType.PURCHASE, TransactionType.EXPENSE].includes(formMode as TransactionType) && renderTransactionFields()}

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">الوصف (اختياري)</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف مختصر للحركة" rows={2} className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary disabled:opacity-50" disabled={isFormDisabled} />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded-md">{error}</p>}
                </form>

                <div className="flex justify-end space-x-4 space-x-reverse p-4 border-t border-gray-700 mt-auto">
                    <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300">إلغاء</button>
                    <button type="submit" form="daily-entry-form" className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isFormDisabled}>{isEditMode ? 'حفظ التعديلات' : 'إضافة الحركة'}</button>
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
