import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Shop, User, LogType, Transaction, Account, TransactionType, Page } from '../types';

const LogoutIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>;
const RefreshIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5M15 4h5v5M9 20H4v-5"></path></svg>;
const ShareIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path></svg>;
const ExportIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>;
const ProfileIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>;


interface HeaderProps {
    activeShop: Shop | null;
    currentUser: User;
    onLogout: () => void;
    shops: Shop[];
    onSelectShop: (shop: Shop) => void;
    onAddLog: (type: LogType, message: string) => void;
    dailyTransactions: Transaction[];
    accounts: Account[];
    selectedDate: Date;
    setPage: (page: Page) => void;
}

const generatePDFReport = (transactions: Transaction[], accounts: Account[], shopName: string, date: Date) => {
    const doc = new jsPDF();
    
    // The key to rendering Arabic: Specify a font that supports it.
    // 'Tajawal' is loaded via CDN in index.html. jsPDF-autotable can often
    // use fonts available in the document.
    const font = 'Tajawal';
    
    // --- Helper Functions ---
    const getAccountName = (accountId: string | undefined) => accounts.find(a => a.id === accountId)?.name || 'غير معروف';
    const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG').format(amount);
    
    // --- Report Header ---
    doc.setFont(font, 'bold');
    doc.setFontSize(18);
    doc.text(`تقرير الحركات اليومية - ${shopName}`, 105, 15, { align: 'center' });
    doc.setFont(font, 'normal');
    doc.setFontSize(12);
    const dateString = date.toLocaleDateString('ar-EG-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(dateString, 105, 22, { align: 'center' });

    // --- Summary Stats ---
    const totalSales = transactions.filter(t => t.type === TransactionType.SALE).reduce((sum, t) => sum + t.totalAmount, 0);
    const totalPurchases = transactions.filter(t => t.type === TransactionType.PURCHASE).reduce((sum, t) => sum + t.totalAmount, 0);
    const totalExpenses = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.totalAmount, 0);
    
    doc.setFontSize(11);
    doc.text(`إجمالي المبيعات: ${formatCurrency(totalSales)}`, 200, 35, { align: 'right' });
    doc.text(`إجمالي المشتريات: ${formatCurrency(totalPurchases)}`, 200, 42, { align: 'right' });
    doc.text(`إجمالي المصروفات: ${formatCurrency(totalExpenses)}`, 200, 49, { align: 'right' });
    
    // --- Table Data ---
    const tableData = transactions.map(t => {
        let context = '';
        if (t.type === TransactionType.TRANSFER) {
            const from = getAccountName(t.entries.find(e => e.amount < 0)?.accountId);
            const to = getAccountName(t.entries.find(e => e.amount > 0)?.accountId);
            context = `من ${from} إلى ${to}`;
        } else {
            context = getAccountName(t.partyId) || getAccountName(t.categoryId);
        }
        
        return [
            // The array needs to be reversed for RTL in jspdf-autotable
            formatCurrency(t.totalAmount),
            t.description || '-',
            context,
            t.type,
        ];
    });

    // --- Table Styling ---
    autoTable(doc, {
        startY: 55,
        head: [['المبلغ', 'الوصف', 'البيان', 'النوع']],
        body: tableData,
        theme: 'grid',
        styles: { font: font, fontStyle: 'normal', halign: 'right' },
        headStyles: { font: font, fontStyle: 'bold', fillColor: [13, 148, 136], halign: 'right' },
        columnStyles: {
            0: { halign: 'left' }, // Amount
        }
    });

    doc.save(`report_${date.toISOString().split('T')[0]}.pdf`);
};


const Header: React.FC<HeaderProps> = ({ activeShop, currentUser, onLogout, shops, onSelectShop, onAddLog, dailyTransactions, accounts, selectedDate, setPage }) => {
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const userDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleShopChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const shopId = event.target.value;
        const selectedShop = shops.find(s => s.id === shopId);
        if (selectedShop) {
            onSelectShop(selectedShop);
        }
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    const handleShare = async () => {
        if (!activeShop) return;
        const dateString = selectedDate.toLocaleDateString('ar-EG');
        const reportTitle = `ملخص يومية ${activeShop.name} - ${dateString}`;
        const totalSales = dailyTransactions.filter(t => t.type === TransactionType.SALE).reduce((s, t) => s + t.totalAmount, 0);
        const reportText = `${reportTitle}\n\nإجمالي المبيعات: ${totalSales.toLocaleString()}\nإجمالي الحركات: ${dailyTransactions.length}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: reportTitle,
                    text: reportText,
                });
                onAddLog(LogType.SHARE_REPORT, 'تمت مشاركة ملخص اليومية بنجاح.');
            } catch (error) {
                console.error('Error sharing:', error);
                onAddLog(LogType.SHARE_REPORT, 'فشلت عملية المشاركة.');
            }
        } else {
            alert('خاصية المشاركة غير مدعومة في هذا المتصفح.');
        }
    };

    const handleExport = () => {
        if (!activeShop) return;
        generatePDFReport(dailyTransactions, accounts, activeShop.name, selectedDate);
        onAddLog(LogType.EXPORT_REPORT, `تم تصدير تقرير يوم ${selectedDate.toLocaleDateString('ar-EG')} كملف PDF.`);
    };

    const activeShops = shops.filter(s => s.isActive);

    return (
        <header className="bg-surface shadow-md p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                {/* For Admin: Show Shop Dropdown */}
                {currentUser.role === 'admin' && activeShop ? (
                    <div className="relative">
                        <select
                            value={activeShop.id}
                            onChange={handleShopChange}
                            className="bg-background border border-gray-600 rounded-lg py-2 px-4 text-text-primary focus:ring-primary focus:border-primary appearance-none pr-8"
                            aria-label="Select Shop"
                        >
                            {activeShops.map(shop => (
                                <option key={shop.id} value={shop.id}>{shop.name}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-gray-400">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                ) : null}

                {/* For User: Show Toolbar */}
                {currentUser.role === 'user' && (
                    <div className="flex items-center gap-2 bg-background p-2 rounded-lg border border-gray-700">
                        <button onClick={handleRefresh} title="تحديث" className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-700 rounded-md transition-colors"><RefreshIcon /></button>
                        <button onClick={handleShare} title="مشاركة" className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-700 rounded-md transition-colors"><ShareIcon /></button>
                        <button onClick={handleExport} title="تصدير PDF" className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-700 rounded-md transition-colors"><ExportIcon /></button>
                    </div>
                )}
            </div>

            {/* User Profile Section */}
            <div className="flex items-center" ref={userDropdownRef}>
                <div className="relative">
                     <button onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} className="flex items-center focus:outline-none">
                        <div className="text-left mr-4">
                            <p className="font-bold text-text-primary">{currentUser.name}</p>
                            <p className="text-sm text-text-secondary">{currentUser.role === 'admin' ? 'مدير النظام' : 'مستخدم'}</p>
                            {/* For User: Show Shop Label */}
                            {currentUser.role === 'user' && activeShop && (
                                <p className="text-xs text-primary mt-1">{activeShop.name}</p>
                            )}
                        </div>
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">
                            {currentUser.name.charAt(0)}
                        </div>
                    </button>
                     {isUserDropdownOpen && (
                        <div className="absolute start-0 mt-2 w-48 rounded-md shadow-lg bg-gray-700 ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-options-menu">
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setPage(Page.PROFILE);
                                        setIsUserDropdownOpen(false);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-text-primary hover:bg-gray-600 hover:text-white"
                                    role="menuitem"
                                >
                                    <ProfileIcon />
                                    <span className="mr-2">الملف الشخصي</span>
                                </a>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); onLogout(); }}
                                    className="flex items-center px-4 py-2 text-sm text-text-primary hover:bg-red-600/50 hover:text-white"
                                    role="menuitem"
                                >
                                    <LogoutIcon />
                                    <span className="mr-2">تسجيل الخروج</span>
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;