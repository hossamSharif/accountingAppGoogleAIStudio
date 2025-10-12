import React, { useState, useMemo } from 'react';
import { Notification, LogType, User, Shop } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { translateEnum, logTypeTranslations } from '../i18n/enumTranslations';
import { getBilingualText } from '../utils/bilingual';

const LogTypeIcon: React.FC<{ type: LogType | undefined }> = ({ type }) => {
    const baseClasses = "w-8 h-8 p-1.5 rounded-full text-white flex items-center justify-center flex-shrink-0";
    if (!type) return null;
    
    switch (type) {
        case LogType.LOGIN:
            return <div className={`${baseClasses} bg-green-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg></div>;
        case LogType.LOGOUT:
            return <div className={`${baseClasses} bg-red-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg></div>;
        case LogType.SYNC:
            return <div className={`${baseClasses} bg-blue-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5"></path></svg></div>;
        case LogType.SHARE_REPORT:
            return <div className={`${baseClasses} bg-purple-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path></svg></div>;
        case LogType.EXPORT_REPORT:
            return <div className={`${baseClasses} bg-yellow-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg></div>;
        case LogType.ADD_ENTRY:
            return <div className={`${baseClasses} bg-green-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></div>;
        case LogType.EDIT_ENTRY:
            return <div className={`${baseClasses} bg-accent`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg></div>;
        case LogType.DELETE_ENTRY:
            return <div className={`${baseClasses} bg-orange-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></div>;
        default:
             return <div className={`${baseClasses} bg-gray-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>;
    }
};

const formatRelativeTime = (isoString: string | undefined | null, language: 'ar' | 'en' = 'ar') => {
    try {
        // Handle null, undefined, or empty string
        if (!isoString || typeof isoString !== 'string') {
            console.error('Invalid timestamp:', isoString);
            return language === 'ar' ? 'تاريخ غير صالح' : 'Invalid date';
        }

        const date = new Date(isoString);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.error('Invalid date string:', isoString);
            return language === 'ar' ? 'تاريخ غير صالح' : 'Invalid date';
        }

        const now = new Date();
        const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
        const minutes = Math.round(seconds / 60);
        const hours = Math.round(minutes / 60);
        const days = Math.round(hours / 24);

        // Handle future dates
        if (seconds < 0) {
            console.warn('Future timestamp detected:', isoString);
            return language === 'ar' ? 'الآن' : 'Now';
        }

        if (language === 'ar') {
            if (seconds < 5) return 'الآن';
            if (seconds < 60) return `منذ ${seconds} ثانية`;
            if (minutes < 60) return `منذ ${minutes} دقيقة`;
            if (hours < 24) return `منذ ${hours} ساعة`;
            if (days <= 7) return `منذ ${days} أيام`;
        } else {
            if (seconds < 5) return 'Now';
            if (seconds < 60) return `${seconds}s ago`;
            if (minutes < 60) return `${minutes}m ago`;
            if (hours < 24) return `${hours}h ago`;
            if (days <= 7) return `${days}d ago`;
        }

        // Format date based on language
        const locale = language === 'ar' ? 'ar-SD' : 'en-US';
        return new Intl.DateTimeFormat(locale, {
            timeZone: 'Africa/Khartoum',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    } catch (error) {
        console.error('Error formatting date:', error, 'Input:', isoString);
        return language === 'ar' ? 'تاريخ غير صالح' : 'Invalid date';
    }
};

interface NotificationsPageProps {
    notifications: Notification[];
    onMarkAllRead: () => void;
    onDeleteNotifications: (notificationIds: string[]) => Promise<void>;
    users: User[];
    shops: Shop[];
    currentUser: User;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ notifications, onMarkAllRead, onDeleteNotifications, users, shops, currentUser }) => {
    const { t, language } = useTranslation();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [showBothLanguages, setShowBothLanguages] = useState(false);

    const getUserName = (userId: string | undefined) => users.find(u => u.id === userId)?.name || (language === 'ar' ? 'غير معروف' : 'Unknown');
    const getShopName = (shopId: string | undefined) => {
        const shop = shops.find(s => s.id === shopId);
        if (!shop) return language === 'ar' ? 'غير معروف' : 'Unknown';
        return getBilingualText(shop.name, shop.nameEn, language);
    };

    // Render notification message with translation
    const renderMessage = (notification: Notification) => {
        // If has messageKey, translate it
        if (notification.messageKey) {
            return t(notification.messageKey, notification.messageParams);
        }

        // Otherwise use stored message in current language
        if (language === 'en' && notification.messageEn) {
            return notification.messageEn;
        }

        return notification.messageAr || notification.message;
    };

    // Render both language versions
    const renderBothLanguages = (notification: Notification) => {
        const arabicMessage = notification.messageAr || notification.message;
        const englishMessage = notification.messageEn || notification.message;

        return (
            <div className="space-y-2">
                <div className="text-text-primary">
                    <span className="text-xs font-semibold text-gray-400 block mb-1">العربية:</span>
                    <span className="block">{arabicMessage}</span>
                </div>
                <div className="text-text-primary border-t border-gray-700 pt-2">
                    <span className="text-xs font-semibold text-gray-400 block mb-1">English:</span>
                    <span className="block">{englishMessage}</span>
                </div>
            </div>
        );
    };

    const isAdmin = currentUser.role === 'admin';

    // Check if all notifications are selected
    const allSelected = useMemo(() => {
        return notifications.length > 0 && notifications.every(n => selectedIds.has(n.id));
    }, [notifications, selectedIds]);

    // Toggle individual notification selection
    const handleToggleSelection = (notificationId: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(notificationId)) {
                newSet.delete(notificationId);
            } else {
                newSet.add(notificationId);
            }
            return newSet;
        });
    };

    // Toggle select all
    const handleToggleSelectAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(notifications.map(n => n.id)));
        }
    };

    // Handle delete selected notifications
    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0 || !isAdmin) return;

        const confirmMessage = language === 'ar'
            ? `هل أنت متأكد من حذف ${selectedIds.size} إشعار(ات)؟ لا يمكن التراجع عن هذا الإجراء.`
            : `Are you sure you want to delete ${selectedIds.size} notification(s)? This action cannot be undone.`;

        if (window.confirm(confirmMessage)) {
            setIsDeleting(true);
            try {
                await onDeleteNotifications(Array.from(selectedIds));
                setSelectedIds(new Set()); // Clear selection after successful deletion
            } catch (error) {
                console.error('Failed to delete notifications:', error);
                const errorMessage = language === 'ar'
                    ? 'فشل حذف الإشعارات. يرجى المحاولة مرة أخرى.'
                    : 'Failed to delete notifications. Please try again.';
                alert(errorMessage);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <h1 className="text-3xl font-bold">{t('notifications.title')}</h1>
                <div className="flex gap-2 flex-wrap">
                    {/* Dual Language Toggle */}
                    {isAdmin && notifications.length > 0 && (
                        <button
                            onClick={() => setShowBothLanguages(!showBothLanguages)}
                            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                            </svg>
                            {showBothLanguages ? language === 'ar' ? 'إخفاء الترجمة' : 'Hide Translation' : language === 'ar' ? 'عرض بلغتين' : 'Show Both Languages'}
                        </button>
                    )}
                    {notifications.some(n => !n.isRead) && (
                        <button
                            onClick={onMarkAllRead}
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                            {t('notifications.actions.markAllRead')}
                        </button>
                    )}
                    {isAdmin && selectedIds.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isDeleting ? t('common.ui.loading') : `${t('notifications.actions.deleteSelected')} (${selectedIds.size})`}
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-surface p-4 sm:p-6 rounded-lg shadow-lg">
                {isAdmin && notifications.length > 0 && (
                    <div className="mb-4 pb-4 border-b border-gray-700">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-background/30 p-2 rounded transition-colors">
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
                <div className="space-y-4">
                    {notifications.map((notif) => (
                        <div
                            key={notif.id}
                            className={`flex items-start gap-4 p-4 rounded-lg transition-colors duration-300 ${!notif.isRead ? 'bg-background' : 'bg-transparent'} ${selectedIds.has(notif.id) ? 'ring-2 ring-accent' : ''}`}
                        >
                            {isAdmin && (
                                <div className="flex-shrink-0 mt-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(notif.id)}
                                        onChange={() => handleToggleSelection(notif.id)}
                                        className="w-4 h-4 rounded border-gray-600 bg-background text-accent focus:ring-2 focus:ring-accent cursor-pointer"
                                    />
                                </div>
                            )}
                            {!notif.isRead && <div className="w-2.5 h-2.5 bg-accent rounded-full mt-3 flex-shrink-0" title={t('notifications.filters.unread')}></div>}
                            <div className={`flex-shrink-0 mt-1 ${notif.isRead && !isAdmin ? 'ml-5' : ''}`}>
                                <LogTypeIcon type={notif.logType} />
                            </div>
                            <div className="flex-grow">
                                {showBothLanguages ? (
                                    renderBothLanguages(notif)
                                ) : (
                                    <p className="text-text-primary">{renderMessage(notif)}</p>
                                )}
                                <div className="text-xs text-text-secondary mt-1 flex items-center gap-4">
                                    {notif.originatingUserId && <span>{t('common.ui.user')}: <strong className="font-medium text-gray-300">{getUserName(notif.originatingUserId)}</strong></span>}
                                    {notif.shopId && <span>{t('logs.list.columns.shop')}: <strong className="font-medium text-gray-300">{getShopName(notif.shopId)}</strong></span>}
                                    <span>{formatRelativeTime(notif.timestamp, language)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {notifications.length === 0 && (
                        <div className="text-center p-12 text-text-secondary">
                            <svg className="w-16 h-16 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                            <h3 className="mt-2 text-lg font-medium">{t('notifications.list.empty')}</h3>
                            <p className="mt-1 text-sm">{t('notifications.subtitle')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;
