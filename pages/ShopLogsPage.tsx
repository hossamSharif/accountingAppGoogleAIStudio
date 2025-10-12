import React, { useState, useMemo, useEffect } from 'react';
import { Log, LogType, User, Shop } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, logTypeTranslations } from '../i18n/enumTranslations';
import { getBilingualText } from '../utils/bilingual';

const LogTypeIcon: React.FC<{ type: LogType }> = ({ type }) => {
    const baseClasses = "w-6 h-6 p-1 rounded-full text-white flex items-center justify-center";
    switch (type) {
        case LogType.LOGIN:
            return <div className={`${baseClasses} bg-green-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg></div>;
        case LogType.LOGOUT:
            return <div className={`${baseClasses} bg-red-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg></div>;
        case LogType.SYNC:
            return <div className={`${baseClasses} bg-blue-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5"></path></svg></div>;
        case LogType.SHARE_REPORT:
            return <div className={`${baseClasses} bg-purple-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367 2.684z"></path></svg></div>;
        case LogType.EXPORT_REPORT:
            return <div className={`${baseClasses} bg-yellow-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg></div>;
        case LogType.ADD_ENTRY:
            return <div className={`${baseClasses} bg-green-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></div>;
        case LogType.EDIT_ENTRY:
            return <div className={`${baseClasses} bg-accent`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg></div>;
        case LogType.DELETE_ENTRY:
            return <div className={`${baseClasses} bg-orange-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></div>;
        default:
            return null;
    }
};

const formatRelativeTime = (isoString: string, language: 'ar' | 'en' = 'ar') => {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (language === 'ar') {
        if (seconds < 60) return `منذ ${seconds} ثوان`;
        if (minutes < 60) return `منذ ${minutes} دقائق`;
        if (hours < 24) return `منذ ${hours} ساعات`;
        if (days <= 7) return `منذ ${days} أيام`;
        return date.toLocaleDateString('ar-EG');
    } else {
        if (seconds < 60) return `${seconds}s ago`;
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days <= 7) return `${days}d ago`;
        return date.toLocaleDateString('en-US');
    }
};

interface ShopLogsPageProps {
    logs: Log[];
    users: User[];
    activeShop: Shop | null;
    shops: Shop[];
    currentUser: User;
    onDeleteLogs: (logIds: string[]) => Promise<void>;
}

const ShopLogsPage: React.FC<ShopLogsPageProps> = ({ logs, users, activeShop, shops, currentUser, onDeleteLogs }) => {
    const { t, language } = useTranslation();
    const [logFilter, setLogFilter] = useState<LogType | 'ALL'>('ALL');
    const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
    const [showAllShops, setShowAllShops] = useState(false);
    const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // Initialize selected shops with active shop when it changes
    useEffect(() => {
        if (activeShop && !showAllShops) {
            setSelectedShopIds([activeShop.id]);
        }
    }, [activeShop, showAllShops]);

    const filteredLogs = useMemo(() => {
        let result = logs;

        // Filter by shops
        if (!showAllShops && selectedShopIds.length > 0) {
            result = result.filter(log => log.shopId && selectedShopIds.includes(log.shopId));
        }

        // Filter by log type
        if (logFilter !== 'ALL') {
            result = result.filter(log => log.type === logFilter);
        }

        return result;
    }, [logs, logFilter, selectedShopIds, showAllShops]);
    
    // FIX: Cast Object.values to string array to resolve type inference issue.
    const logTypes = Object.values(LogType) as string[];

    const getUserName = (userId: string) => {
        return users.find(u => u.id === userId)?.name || (language === 'ar' ? 'مستخدم غير معروف' : 'Unknown User');
    };

    const getShopName = (shopId?: string) => {
        if (!shopId) return language === 'ar' ? 'غير محدد' : 'Not Specified';
        const shop = shops.find(s => s.id === shopId);
        if (!shop) return language === 'ar' ? 'متجر غير معروف' : 'Unknown Shop';
        return getBilingualText(shop.name, shop.nameEn, language);
    };

    // Render log message with translation
    const renderMessage = (log: Log) => {
        if (log.messageKey) {
            return t(log.messageKey, log.messageParams);
        }

        if (language === 'en' && log.messageEn) {
            return log.messageEn;
        }

        return log.messageAr || log.message;
    };

    const toggleShopSelection = (shopId: string) => {
        setSelectedShopIds(prev => {
            if (prev.includes(shopId)) {
                return prev.filter(id => id !== shopId);
            } else {
                return [...prev, shopId];
            }
        });
    };

    const handleShowAllShopsToggle = () => {
        setShowAllShops(prev => !prev);
        if (!showAllShops) {
            setSelectedShopIds([]);
        }
    };

    // Show shop column when viewing multiple shops
    const showShopColumn = showAllShops || selectedShopIds.length > 1;

    const isAdmin = currentUser.role === 'admin';

    // Check if all filtered logs are selected
    const allSelected = useMemo(() => {
        return filteredLogs.length > 0 && filteredLogs.every(log => selectedLogIds.has(log.id));
    }, [filteredLogs, selectedLogIds]);

    // Toggle individual log selection
    const handleToggleLogSelection = (logId: string) => {
        setSelectedLogIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(logId)) {
                newSet.delete(logId);
            } else {
                newSet.add(logId);
            }
            return newSet;
        });
    };

    // Toggle select all filtered logs
    const handleToggleSelectAll = () => {
        if (allSelected) {
            setSelectedLogIds(new Set());
        } else {
            setSelectedLogIds(new Set(filteredLogs.map(log => log.id)));
        }
    };

    // Handle delete selected logs
    const handleDeleteSelected = async () => {
        if (selectedLogIds.size === 0 || !isAdmin) return;

        const confirmMessage = language === 'ar'
            ? `هل أنت متأكد من حذف ${selectedLogIds.size} سجل(ات)؟ لا يمكن التراجع عن هذا الإجراء.`
            : `Are you sure you want to delete ${selectedLogIds.size} log(s)? This action cannot be undone.`;

        if (window.confirm(confirmMessage)) {
            setIsDeleting(true);
            try {
                await onDeleteLogs(Array.from(selectedLogIds));
                setSelectedLogIds(new Set()); // Clear selection after successful deletion
            } catch (error) {
                console.error('Failed to delete logs:', error);
                const errorMessage = language === 'ar'
                    ? 'فشل حذف السجلات. يرجى المحاولة مرة أخرى.'
                    : 'Failed to delete logs. Please try again.';
                alert(errorMessage);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    if (!activeShop) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center bg-surface p-8 rounded-lg">
                    <h2 className="text-2xl font-bold mb-2">
                        {language === 'ar' ? 'لا يوجد متجر محدد' : 'No Shop Selected'}
                    </h2>
                    <p className="text-text-secondary">
                        {language === 'ar'
                            ? 'الرجاء اختيار متجر من القائمة في الأعلى لعرض سجل النشاطات الخاص به.'
                            : 'Please select a shop from the list above to view its activity log.'}
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold">
                        {t('logs.shopLogsTitle')}
                    </h1>
                    <p className="text-text-secondary text-sm mt-1">
                        {showAllShops
                            ? language === 'ar'
                                ? `عرض جميع المتاجر (${filteredLogs.length} سجل)`
                                : `Viewing all shops (${filteredLogs.length} logs)`
                            : selectedShopIds.length === 1
                                ? language === 'ar'
                                    ? `${getShopName(selectedShopIds[0])} (${filteredLogs.length} سجل)`
                                    : `${getShopName(selectedShopIds[0])} (${filteredLogs.length} logs)`
                                : language === 'ar'
                                    ? `${selectedShopIds.length} متاجر محددة (${filteredLogs.length} سجل)`
                                    : `${selectedShopIds.length} shops selected (${filteredLogs.length} logs)`
                        }
                    </p>
                </div>

                <div className="flex gap-3 flex-wrap items-center">
                    {/* Delete Selected Button - Only show for admin */}
                    {isAdmin && selectedLogIds.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDeleting ? t('common.ui.loading') : `${t('logs.actions.clear')} (${selectedLogIds.size})`}
                        </button>
                    )}

                    {/* Toggle All Shops */}
                    <button
                        onClick={handleShowAllShopsToggle}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            showAllShops
                                ? 'bg-primary text-white'
                                : 'bg-surface border border-gray-600 text-text-primary hover:border-primary'
                        }`}
                    >
                        {showAllShops
                            ? (language === 'ar' ? '✓ جميع المتاجر' : '✓ All Shops')
                            : (language === 'ar' ? 'عرض جميع المتاجر' : 'Show All Shops')}
                    </button>

                    {/* Log Type Filter */}
                    <div className="flex gap-2 items-center">
                        <label htmlFor="logFilterAdmin" className="text-text-secondary">{t('logs.filters.type')}:</label>
                        <select
                            id="logFilterAdmin"
                            value={logFilter}
                            onChange={(e) => setLogFilter(e.target.value as LogType | 'ALL')}
                            className="bg-surface border border-gray-600 rounded-lg py-2 px-4 text-text-primary focus:ring-primary focus:border-primary"
                        >
                            <option value="ALL">{t('logs.filters.allTypes')}</option>
                            {logTypes.map(type => (
                                <option key={type} value={type}>{translateEnum(type as LogType, logTypeTranslations, language)}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Shop Filter Section - Only show when not showing all shops */}
            {!showAllShops && (
                <div className="bg-surface p-4 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        {language === 'ar' ? 'تصفية حسب المتجر' : 'Filter by Shop'}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {shops.filter(shop => shop.isActive).map(shop => (
                            <button
                                key={shop.id}
                                onClick={() => toggleShopSelection(shop.id)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    selectedShopIds.includes(shop.id)
                                        ? 'bg-primary text-white shadow-lg scale-105'
                                        : 'bg-background border border-gray-600 text-text-secondary hover:border-primary hover:text-text-primary'
                                }`}
                            >
                                {selectedShopIds.includes(shop.id) && '✓ '}
                                {getBilingualText(shop.name, shop.nameEn, language)}
                            </button>
                        ))}
                        {shops.filter(shop => shop.isActive).length === 0 && (
                            <p className="text-text-secondary">
                                {language === 'ar' ? 'لا توجد متاجر نشطة' : 'No active shops'}
                            </p>
                        )}
                    </div>
                    {selectedShopIds.length > 1 && (
                        <div className="mt-3 text-sm text-text-secondary">
                            {language === 'ar'
                                ? `تم اختيار ${selectedShopIds.length} متجر`
                                : `${selectedShopIds.length} shops selected`}
                        </div>
                    )}
                </div>
            )}

            <div className="bg-surface p-6 rounded-lg shadow-lg">
                <div className="overflow-x-auto">
                    {isAdmin && filteredLogs.length > 0 && (
                        <div className="mb-4 pb-4 border-b border-gray-700">
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-background/30 p-2 rounded transition-colors w-fit">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={handleToggleSelectAll}
                                    className="w-4 h-4 rounded border-gray-600 bg-background text-accent focus:ring-2 focus:ring-accent cursor-pointer"
                                />
                                <span className="text-text-primary font-medium">
                                    {allSelected ? t('common.actions.deselectAll') : t('common.actions.selectAll')}
                                </span>
                            </label>
                        </div>
                    )}
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b border-gray-700 text-text-secondary">
                                {isAdmin && <th className="p-3 w-12"></th>}
                                <th className="p-3 w-12"></th>
                                <th className="p-3">{t('logs.list.columns.user')}</th>
                                {showShopColumn && <th className="p-3">{t('logs.list.columns.shop')}</th>}
                                <th className="p-3">{t('logs.list.columns.type')}</th>
                                <th className="p-3">{t('logs.list.columns.message')}</th>
                                <th className="p-3">{t('logs.list.columns.timestamp')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log, index) => (
                                <tr key={log.id} className={`border-b border-gray-700 transition-colors duration-200 hover:bg-background/50 ${index % 2 === 0 ? 'bg-background/20' : ''} ${selectedLogIds.has(log.id) ? 'ring-2 ring-accent' : ''}`}>
                                    {isAdmin && (
                                        <td className="p-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedLogIds.has(log.id)}
                                                onChange={() => handleToggleLogSelection(log.id)}
                                                className="w-4 h-4 rounded border-gray-600 bg-background text-accent focus:ring-2 focus:ring-accent cursor-pointer"
                                            />
                                        </td>
                                    )}
                                    <td className="p-3"><LogTypeIcon type={log.type} /></td>
                                    <td className="p-3 font-medium text-text-primary">{getUserName(log.userId)}</td>
                                    {showShopColumn && (
                                        <td className="p-3 text-text-primary">
                                            <span className="inline-block px-2 py-1 rounded bg-primary/20 text-primary text-sm">
                                                {getShopName(log.shopId)}
                                            </span>
                                        </td>
                                    )}
                                    <td className="p-3 font-medium text-text-primary">
                                        {translateEnum(log.type, logTypeTranslations, language)}
                                    </td>
                                    <td className="p-3 text-text-secondary">{renderMessage(log)}</td>
                                    <td className="p-3 text-text-secondary whitespace-nowrap">{formatRelativeTime(log.timestamp, language)}</td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={showShopColumn ? (isAdmin ? 7 : 6) : (isAdmin ? 6 : 5)} className="text-center p-8 text-text-secondary">
                                        {selectedShopIds.length === 0 && !showAllShops
                                            ? t('logs.list.selectShop')
                                            : t('logs.list.empty')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ShopLogsPage;
