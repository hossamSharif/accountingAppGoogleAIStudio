import React from 'react';
import { Shop, User } from '../types';
import { ShopStats } from '../hooks/useShopData';
import { formatCurrency } from '../utils/formatting';

interface ShopCardProps {
    shop: Shop;
    stats?: ShopStats | null;
    currentUser: User;
    onEdit: () => void;
    onToggleStatus: () => void;
    onDelete?: () => void; // Added delete handler
    onViewAccounts: () => void;
    onViewStats?: () => void;
    onViewFinancialYears?: () => void;
    onViewUsers?: () => void;
    isLoading?: boolean;
}

const ShopCard: React.FC<ShopCardProps> = ({
    shop,
    stats,
    currentUser,
    onEdit,
    onToggleStatus,
    onDelete,
    onViewAccounts,
    onViewStats,
    onViewFinancialYears,
    onViewUsers,
    isLoading = false
}) => {
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'لا يوجد';
        return new Date(dateString).toLocaleDateString('en-US');
    };

    return (
        <div className={`bg-surface rounded-lg shadow-lg border-2 transition-all duration-300 hover:shadow-xl ${
            shop.isActive ? 'border-green-500 hover:border-green-400' : 'border-red-500 hover:border-red-400'
        }`}>
            {/* Header */}
            <div className={`p-4 rounded-t-lg ${
                shop.isActive ? 'bg-gradient-to-r from-green-900/30 to-blue-900/30' : 'bg-gray-900/30'
            }`}>
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${
                                shop.isActive ? 'bg-green-400' : 'bg-red-400'
                            }`} />
                            <h3 className="text-lg font-bold text-text-primary truncate">
                                {shop.name}
                            </h3>
                            {shop.shopCode && (
                                <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded border border-blue-500">
                                    {shop.shopCode}
                                </span>
                            )}
                        </div>
                        {shop.description && (
                            <p className="text-text-secondary text-sm mt-1 line-clamp-2">
                                {shop.description}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            shop.isActive
                                ? 'bg-green-900/50 text-green-300 border border-green-500'
                                : 'bg-red-900/50 text-red-300 border border-red-500'
                        }`}>
                            {shop.isActive ? 'نشط' : 'غير نشط'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="p-4">
                {stats ? (
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="text-center p-3 bg-blue-900/30 rounded-lg border-2 border-blue-500">
                            <div className="text-2xl font-bold text-blue-300">
                                {stats.accountsCount}
                            </div>
                            <div className="text-xs text-blue-200">الحسابات</div>
                        </div>

                        <div className="text-center p-3 bg-green-900/30 rounded-lg border-2 border-green-500">
                            <div className="text-2xl font-bold text-green-300">
                                {stats.transactionsCount}
                            </div>
                            <div className="text-xs text-green-200">المعاملات</div>
                        </div>

                        <div className="col-span-2 text-center p-3 bg-purple-900/30 rounded-lg border-2 border-purple-500">
                            <div className="text-lg font-bold text-purple-300">
                                {formatCurrency(stats.totalBalance, false)}
                            </div>
                            <div className="text-xs text-purple-200">إجمالي الأرصدة</div>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center items-center h-20">
                        <div className="animate-pulse text-text-secondary">
                            جاري تحميل الإحصائيات...
                        </div>
                    </div>
                )}

                {/* Last Activity */}
                {stats?.lastTransactionDate && (
                    <div className="text-xs text-text-secondary text-center mb-4">
                        آخر معاملة: {formatDate(stats.lastTransactionDate)}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                    {/* Primary Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={onViewAccounts}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                        >
                            📊 الحسابات
                        </button>

                        {onViewStats && (
                            <button
                                onClick={onViewStats}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                            >
                                📈 الإحصائيات
                            </button>
                        )}
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex gap-2">
                        {onViewFinancialYears && (
                            <button
                                onClick={onViewFinancialYears}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                            >
                                📅 السنوات المالية
                            </button>
                        )}

                        {onViewUsers && currentUser.role === 'admin' && (
                            <button
                                onClick={onViewUsers}
                                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                            >
                                👥 المستخدمون
                            </button>
                        )}
                    </div>

                    {/* Admin Actions */}
                    {currentUser.role === 'admin' && (
                        <div className="pt-2 border-t border-gray-600 space-y-2">
                            <div className="flex gap-2">
                                <button
                                    onClick={onEdit}
                                    disabled={isLoading}
                                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    ✏️ تعديل
                                </button>

                                <button
                                    onClick={onToggleStatus}
                                    disabled={isLoading}
                                    className={`flex-1 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50 ${
                                        shop.isActive
                                            ? 'bg-yellow-600 hover:bg-yellow-700'
                                            : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                >
                                    {shop.isActive ? '⏸️ إيقاف' : '✅ تفعيل'}
                                </button>
                            </div>

                            {onDelete && (
                                <button
                                    onClick={onDelete}
                                    disabled={isLoading}
                                    className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    🗑️ حذف المتجر نهائياً
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-lg">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            )}
        </div>
    );
};

export default ShopCard;