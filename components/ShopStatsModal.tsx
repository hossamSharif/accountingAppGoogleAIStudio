import React from 'react';
import { Shop } from '../types';
import { ShopStats } from '../hooks/useShopData';
import { formatCurrency } from '../utils/formatting';

interface ShopStatsModalProps {
    shop: Shop;
    stats: ShopStats | null;
    isOpen: boolean;
    onClose: () => void;
}

const ShopStatsModal: React.FC<ShopStatsModalProps> = ({
    shop,
    stats,
    isOpen,
    onClose
}) => {
    if (!isOpen) return null;

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'لا يوجد';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const StatCard: React.FC<{
        title: string;
        value: string | number;
        subtitle?: string;
        color: string;
        icon: string;
    }> = ({ title, value, subtitle, color, icon }) => (
        <div className={`p-4 rounded-lg bg-${color}-900/30 border-2 border-${color}-500`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{icon}</span>
                <span className={`text-2xl font-bold text-${color}-300`}>
                    {value}
                </span>
            </div>
            <h3 className={`font-medium text-${color}-200`}>{title}</h3>
            {subtitle && (
                <p className={`text-sm text-${color}-300 mt-1`}>{subtitle}</p>
            )}
        </div>
    );

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300"
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-text-primary">إحصائيات متجر "{shop.name}"</h2>
                    <button
                        onClick={onClose}
                        className="text-text-secondary hover:text-text-primary text-2xl font-bold"
                        aria-label="إغلاق"
                    >
                        ×
                    </button>
                </div>

                {stats ? (
                    <div className="space-y-6">
                        {/* Overview Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                title="إجمالي المستخدمين"
                                value={stats.usersCount}
                                subtitle={`منهم ${stats.activeUsersCount} نشط`}
                                color="blue"
                                icon="👥"
                            />

                            <StatCard
                                title="عدد الحسابات"
                                value={stats.accountsCount}
                                subtitle="الحسابات المحاسبية"
                                color="green"
                                icon="📊"
                            />

                            <StatCard
                                title="عدد المعاملات"
                                value={stats.transactionsCount}
                                subtitle="إجمالي المعاملات"
                                color="purple"
                                icon="💰"
                            />

                            <StatCard
                                title="السنوات المالية"
                                value={stats.financialYearsCount}
                                subtitle="عدد السنوات المالية"
                                color="orange"
                                icon="📅"
                            />
                        </div>

                        {/* Financial Summary */}
                        <div className="bg-gradient-to-r from-blue-900/30 to-green-900/30 p-6 rounded-lg border-2 border-yellow-500">
                            <h3 className="text-lg font-semibold mb-4 text-text-primary">الملخص المالي</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-300">
                                        {formatCurrency(stats.totalBalance)}
                                    </div>
                                    <p className="text-blue-200 font-medium">إجمالي الأرصدة</p>
                                    <p className="text-sm text-blue-300">الصندوق والبنك</p>
                                </div>

                                <div className="text-center">
                                    <div className="text-lg font-semibold text-green-300">
                                        {formatDate(stats.lastTransactionDate)}
                                    </div>
                                    <p className="text-green-200 font-medium">آخر معاملة</p>
                                    <p className="text-sm text-green-300">
                                        {stats.lastTransactionDate ? 'تاريخ آخر نشاط' : 'لا توجد معاملات'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Activity Status */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className={`p-4 rounded-lg border-2 ${
                                shop.isActive ? 'border-green-500 bg-green-900/30' : 'border-red-500 bg-red-900/30'
                            }`}>
                                <div className="text-center">
                                    <div className={`text-3xl mb-2 ${
                                        shop.isActive ? 'text-green-300' : 'text-red-300'
                                    }`}>
                                        {shop.isActive ? '✅' : '🚫'}
                                    </div>
                                    <h4 className={`font-semibold ${
                                        shop.isActive ? 'text-green-200' : 'text-red-200'
                                    }`}>
                                        حالة المتجر
                                    </h4>
                                    <p className={`text-sm ${
                                        shop.isActive ? 'text-green-300' : 'text-red-300'
                                    }`}>
                                        {shop.isActive ? 'نشط ويقبل المعاملات' : 'غير نشط'}
                                    </p>
                                </div>
                            </div>

                            <div className={`p-4 rounded-lg border-2 ${
                                stats.activeUsersCount > 0 ? 'border-blue-500 bg-blue-900/30' : 'border-gray-500 bg-gray-900/30'
                            }`}>
                                <div className="text-center">
                                    <div className={`text-3xl mb-2 ${
                                        stats.activeUsersCount > 0 ? 'text-blue-300' : 'text-gray-300'
                                    }`}>
                                        👤
                                    </div>
                                    <h4 className={`font-semibold ${
                                        stats.activeUsersCount > 0 ? 'text-blue-200' : 'text-gray-200'
                                    }`}>
                                        المستخدمون النشطون
                                    </h4>
                                    <p className={`text-sm ${
                                        stats.activeUsersCount > 0 ? 'text-blue-300' : 'text-gray-300'
                                    }`}>
                                        {stats.activeUsersCount > 0
                                            ? `${stats.activeUsersCount} مستخدم نشط`
                                            : 'لا يوجد مستخدمون نشطون'
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className={`p-4 rounded-lg border-2 ${
                                stats.transactionsCount > 0 ? 'border-purple-500 bg-purple-900/30' : 'border-gray-500 bg-gray-900/30'
                            }`}>
                                <div className="text-center">
                                    <div className={`text-3xl mb-2 ${
                                        stats.transactionsCount > 0 ? 'text-purple-300' : 'text-gray-300'
                                    }`}>
                                        📈
                                    </div>
                                    <h4 className={`font-semibold ${
                                        stats.transactionsCount > 0 ? 'text-purple-200' : 'text-gray-200'
                                    }`}>
                                        النشاط المحاسبي
                                    </h4>
                                    <p className={`text-sm ${
                                        stats.transactionsCount > 0 ? 'text-purple-300' : 'text-gray-300'
                                    }`}>
                                        {stats.transactionsCount > 0
                                            ? `${stats.transactionsCount} معاملة مسجلة`
                                            : 'لا توجد معاملات'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Shop Details */}
                        <div className="bg-background p-4 rounded-lg border border-gray-600">
                            <h3 className="font-semibold text-text-primary mb-3">تفاصيل المتجر</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-text-secondary">اسم المتجر:</span>
                                    <span className="font-medium text-text-primary mr-2">{shop.name}</span>
                                </div>
                                {shop.description && (
                                    <div>
                                        <span className="text-text-secondary">الوصف:</span>
                                        <span className="font-medium text-text-primary mr-2">{shop.description}</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-text-secondary">معرف المتجر:</span>
                                    <span className="font-mono text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded mr-2">
                                        {shop.id}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-text-secondary">الحالة:</span>
                                    <span className={`font-medium mr-2 ${
                                        shop.isActive ? 'text-green-300' : 'text-red-300'
                                    }`}>
                                        {shop.isActive ? 'نشط' : 'غير نشط'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center items-center h-64">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="text-text-secondary">جاري تحميل الإحصائيات...</p>
                        </div>
                    </div>
                )}

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-lg transition duration-300"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShopStatsModal;