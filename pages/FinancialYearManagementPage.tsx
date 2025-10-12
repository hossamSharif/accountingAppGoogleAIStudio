import React, { useState, useEffect } from 'react';
import { FinancialYearService } from '../services/financialYearService';
import { ShopService } from '../services/ShopService';
import { LoggingService } from '../services/loggingService';
import { useLoading } from '../hooks/useLoading';
import { useToast } from '../hooks/useToast';
import { FinancialYearSelector } from '../components/FinancialYearSelector';
import ConfirmationModal from '../components/ConfirmationModal';
import {
    FinancialYear,
    Shop,
    User,
    CreateFinancialYearData,
    EnhancedLogType
} from '../types';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { formatCurrency } from '../utils/formatting';
import { useTranslation } from '../i18n/useTranslation';
import { getBilingualText } from '../utils/bilingual';

// Icons
const PlusIcon = () => (
    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
);

const CalendarIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const TrendingUpIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
);

const LockClosedIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
    </svg>
);

const ExclamationIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
);

interface FinancialYearModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateFinancialYearData) => void;
    editingYear?: FinancialYear | null;
    shops: Shop[];
    selectedShopId?: string;
}

const FinancialYearModal: React.FC<FinancialYearModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    editingYear,
    shops,
    selectedShopId
}) => {
    const { t, language } = useTranslation();
    const [formData, setFormData] = useState<CreateFinancialYearData>({
        shopId: selectedShopId || '',
        name: '',
        startDate: '',
        endDate: '',
        openingStockValue: 0,
        notes: ''
    });

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (editingYear) {
            setFormData({
                shopId: editingYear.shopId,
                name: editingYear.name,
                startDate: editingYear.startDate.split('T')[0],
                endDate: editingYear.endDate.split('T')[0],
                openingStockValue: editingYear.openingStockValue,
                notes: editingYear.notes || ''
            });
        } else {
            setFormData({
                shopId: selectedShopId || '',
                name: '',
                startDate: '',
                endDate: '',
                openingStockValue: 0,
                notes: ''
            });
        }
        setErrors({});
    }, [editingYear, selectedShopId, isOpen]);

    const validateForm = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.shopId) newErrors.shopId = t('shops.validation.selectShop');
        if (!formData.name.trim()) newErrors.name = t('financialYears.validation.nameRequired');
        if (!formData.startDate) newErrors.startDate = t('financialYears.validation.startDateRequired');
        if (!formData.endDate) newErrors.endDate = t('financialYears.validation.endDateRequired');
        if (formData.openingStockValue < 0) newErrors.openingStockValue = t('financialYears.validation.openingStockRequired');

        if (formData.startDate && formData.endDate) {
            const startDate = new Date(formData.startDate);
            const endDate = new Date(formData.endDate);
            if (endDate <= startDate) {
                newErrors.endDate = t('financialYears.validation.endAfterStart');
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            onSubmit(formData);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-surface rounded-lg shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-700 bg-primary rounded-t-lg">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <CalendarIcon />
                        <span className="mr-2">
                            {editingYear ? t('financialYears.form.title.edit') : t('financialYears.form.title.create')}
                        </span>
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-background">
                    {/* Shop Selection */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            {t('shops.form.name')} *
                        </label>
                        <select
                            value={formData.shopId}
                            onChange={(e) => setFormData(prev => ({ ...prev, shopId: e.target.value }))}
                            className={`w-full bg-background border rounded-md p-3 text-text-primary focus:ring-2 focus:ring-primary focus:border-primary ${
                                errors.shopId ? 'border-red-500' : 'border-gray-600'
                            }`}
                        >
                            <option value="">{t('shops.form.selectShop')}</option>
                            {shops.map(shop => (
                                <option key={shop.id} value={shop.id}>{getBilingualText(shop.name, shop.nameEn, language)}</option>
                            ))}
                        </select>
                        {errors.shopId && <p className="text-red-500 text-sm mt-1">{errors.shopId}</p>}
                    </div>

                    {/* Financial Year Name */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            {t('financialYears.form.name')} *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={language === 'ar' ? 'مثال: السنة المالية 2024-2025' : 'Example: Financial Year 2024-2025'}
                            className={`w-full bg-background border rounded-md p-3 text-text-primary focus:ring-2 focus:ring-primary focus:border-primary ${
                                errors.name ? 'border-red-500' : 'border-gray-600'
                            }`}
                        />
                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                {t('financialYears.form.startDate')} *
                            </label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                                className={`w-full bg-background border rounded-md p-3 text-text-primary focus:ring-2 focus:ring-primary focus:border-primary ${
                                    errors.startDate ? 'border-red-500' : 'border-gray-600'
                                }`}
                            />
                            {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                {t('financialYears.form.endDate')} *
                            </label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                                className={`w-full bg-background border rounded-md p-3 text-text-primary focus:ring-2 focus:ring-primary focus:border-primary ${
                                    errors.endDate ? 'border-red-500' : 'border-gray-600'
                                }`}
                            />
                            {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
                        </div>
                    </div>

                    {/* Opening Stock Value */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            {t('financialYears.form.openingStockValue')}
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.openingStockValue}
                            onChange={(e) => setFormData(prev => ({ ...prev, openingStockValue: parseFloat(e.target.value) || 0 }))}
                            placeholder="0.00"
                            className={`w-full bg-background border rounded-md p-3 text-text-primary focus:ring-2 focus:ring-primary focus:border-primary ${
                                errors.openingStockValue ? 'border-red-500' : 'border-gray-600'
                            }`}
                            dir="ltr"
                        />
                        {errors.openingStockValue && <p className="text-red-500 text-sm mt-1">{errors.openingStockValue}</p>}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            {t('financialYears.form.notes')} ({t('common.ui.optional')})
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
                            rows={3}
                            className="w-full bg-background border border-gray-600 rounded-md p-3 text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>

                    <div className="flex justify-end space-x-3 space-x-reverse pt-4 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 border border-gray-600 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
                        >
                            {t('common.actions.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                        >
                            {editingYear ? t('common.actions.update') : t('common.actions.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const FinancialYearManagementPage: React.FC = () => {
    const { t, language } = useTranslation();
    const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
    const [filteredFinancialYears, setFilteredFinancialYears] = useState<FinancialYear[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [selectedShopFilter, setSelectedShopFilter] = useState<string>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingYear, setEditingYear] = useState<FinancialYear | null>(null);
    const [closingYear, setClosingYear] = useState<FinancialYear | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const { isLoading, withLoading } = useLoading();
    const { showToast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                // Get user details from Firestore if needed
                setCurrentUser({ id: user.uid, email: user.email || '', name: user.displayName || '', role: 'admin', isActive: true });
            } else {
                setCurrentUser(null);
            }
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        // Filter financial years based on selected shop
        if (selectedShopFilter === 'all') {
            setFilteredFinancialYears(financialYears);
        } else {
            const filtered = financialYears.filter(fy => fy.shopId === selectedShopFilter);
            setFilteredFinancialYears(filtered);
        }
    }, [selectedShopFilter, financialYears]);

    const loadInitialData = async () => {
        await withLoading(async () => {
            try {
                const [shopsData, yearsData] = await Promise.all([
                    ShopService.getAllShops(),
                    FinancialYearService.getAllFinancialYears()
                ]);
                setShops(shopsData);
                const sortedYears = yearsData.sort((a, b) =>
                    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                );
                setFinancialYears(sortedYears);
                setFilteredFinancialYears(sortedYears);
            } catch (error) {
                console.error('Error loading initial data:', error);
                showToast(t('common.ui.error'), 'error');
            }
        });
    };


    const handleCreateFinancialYear = async (fyData: CreateFinancialYearData) => {
        await withLoading(async () => {
            try {
                const newFY = await FinancialYearService.createFinancialYearWithStockAccounts(fyData);
                setFinancialYears(prev => [newFY, ...prev].sort((a, b) =>
                    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                ));
                setShowCreateModal(false);

                // Log the action
                if (currentUser) {
                    await LoggingService.logAction(
                        currentUser,
                        EnhancedLogType.FINANCIAL_YEAR_CREATED,
                        `تم إنشاء سنة مالية جديدة: ${newFY.name}`,
                        newFY.shopId
                    );
                }

                showToast(t('financialYears.messages.created'), 'success');
            } catch (error) {
                console.error('Error creating financial year:', error);
                showToast(t('common.ui.error'), 'error');
            }
        });
    };

    const handleEditFinancialYear = async (fyData: CreateFinancialYearData) => {
        if (!editingYear) return;

        await withLoading(async () => {
            try {
                const updatedFY = await FinancialYearService.updateFinancialYear(editingYear.id, fyData);
                setFinancialYears(prev => prev.map(fy =>
                    fy.id === editingYear.id ? updatedFY : fy
                ).sort((a, b) =>
                    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                ));
                setEditingYear(null);

                // Log the action
                if (currentUser) {
                    await LoggingService.logAction(
                        currentUser,
                        EnhancedLogType.FINANCIAL_YEAR_UPDATED,
                        `تم تعديل السنة المالية: ${updatedFY.name}`,
                        updatedFY.shopId
                    );
                }

                showToast(t('financialYears.messages.updated'), 'success');
            } catch (error) {
                console.error('Error updating financial year:', error);
                showToast(t('common.ui.error'), 'error');
            }
        });
    };

    const handleCloseFinancialYear = async (fyId: string) => {
        await withLoading(async () => {
            try {
                await FinancialYearService.closeFinancialYear(fyId);

                // Refresh the list
                const yearsData = await FinancialYearService.getAllFinancialYears();
                const sortedYears = yearsData.sort((a, b) =>
                    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                );
                setFinancialYears(sortedYears);

                setClosingYear(null);

                // Log the action
                const fy = financialYears.find(f => f.id === fyId);
                if (currentUser && fy) {
                    await LoggingService.logAction(
                        currentUser,
                        EnhancedLogType.FINANCIAL_YEAR_CLOSED,
                        `تم إغلاق السنة المالية: ${fy.name}`,
                        fy.shopId
                    );
                }

                showToast(t('financialYears.messages.closed'), 'success');
            } catch (error) {
                console.error('Error closing financial year:', error);
                showToast(t('common.ui.error'), 'error');
            }
        });
    };

    const getShopName = (shopId: string): string => {
        const shop = shops.find(s => s.id === shopId);
        return shop ? getBilingualText(shop.name, shop.nameEn, language) : (language === 'ar' ? 'متجر غير محدد' : 'Unknown Shop');
    };

    const renderFinancialYearCard = (fy: FinancialYear) => {
        const isOpen = fy.status === 'open';
        const locale = language === 'ar' ? 'ar-EG' : 'en-US';

        return (
            <div key={fy.id} className="bg-surface rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-700">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary">{fy.name}</h3>
                        <p className="text-sm text-primary mt-1">{getShopName(fy.shopId)}</p>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            isOpen
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                            {t(`financialYears.status.${fy.status}`)}
                        </span>
                    </div>
                </div>

                <div className="space-y-2 mb-4 bg-background rounded-lg p-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-text-secondary">{t('financialYears.form.startDate')}:</span>
                        <span className="text-sm font-medium text-text-primary" dir="ltr">
                            {new Date(fy.startDate).toLocaleDateString(locale)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-text-secondary">{t('financialYears.form.endDate')}:</span>
                        <span className="text-sm font-medium text-text-primary" dir="ltr">
                            {new Date(fy.endDate).toLocaleDateString(locale)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-text-secondary">{t('financialYears.list.columns.openingStock')}:</span>
                        <span className="text-sm font-medium text-primary">
                            {formatCurrency(fy.openingStockValue)}
                        </span>
                    </div>
                    {fy.closingStockValue !== undefined && (
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-text-secondary">{t('financialYears.list.columns.closingStock')}:</span>
                            <span className="text-sm font-medium text-green-400">
                                {formatCurrency(fy.closingStockValue)}
                            </span>
                        </div>
                    )}
                </div>

                {fy.notes && (
                    <div className="mb-4 p-3 bg-background rounded-lg border border-gray-700">
                        <p className="text-sm text-text-secondary">{fy.notes}</p>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                    {isOpen && (
                        <>
                            <button
                                onClick={() => setClosingYear(fy)}
                                className="px-3 py-1.5 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center text-sm transition-colors"
                            >
                                <LockClosedIcon />
                                <span className="mr-1">{t('financialYears.actions.close')}</span>
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => setEditingYear(fy)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm transition-colors"
                    >
                        {t('financialYears.actions.edit')}
                    </button>

                    <button className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 flex items-center text-sm transition-colors">
                        <TrendingUpIcon />
                        <span className="mr-1">{t('financialYears.actions.viewReport')}</span>
                    </button>
                </div>
            </div>
        );
    };

    const renderEmptyState = () => (
        <div className="text-center py-12 bg-surface rounded-lg shadow-md">
            <CalendarIcon />
            <h3 className="mt-2 text-sm font-medium text-text-primary">{t('financialYears.list.empty')}</h3>
            <p className="mt-1 text-sm text-text-secondary">
                {language === 'ar' ? 'ابدأ بإنشاء سنة مالية جديدة لإدارة حساباتك' : 'Start by creating a new financial year to manage your accounts'}
            </p>
            <div className="mt-6">
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium"
                >
                    <PlusIcon />
                    {t('financialYears.actions.create')}
                </button>
            </div>
        </div>
    );

    if (isLoading && financialYears.length === 0) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">{t('financialYears.title')}</h1>
                    <p className="text-text-secondary mt-1">{t('financialYears.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-lg transition-colors"
                >
                    <PlusIcon />
                    <span>{t('financialYears.actions.create')}</span>
                </button>
            </div>

            {/* Shop Filter */}
            <div className="bg-surface rounded-lg shadow p-4">
                <div className="flex items-center space-x-4 space-x-reverse">
                    <label className="text-sm font-medium text-text-secondary">
                        {language === 'ar' ? 'تصفية حسب المتجر:' : 'Filter by shop:'}
                    </label>
                    <select
                        value={selectedShopFilter}
                        onChange={(e) => setSelectedShopFilter(e.target.value)}
                        className="bg-background border border-gray-600 rounded-md p-2 text-text-primary focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                        <option value="all">{language === 'ar' ? 'جميع المتاجر' : 'All Shops'}</option>
                        {shops.map(shop => (
                            <option key={shop.id} value={shop.id}>{getBilingualText(shop.name, shop.nameEn, language)}</option>
                        ))}
                    </select>
                    <span className="text-sm text-text-secondary">
                        ({filteredFinancialYears.length} {language === 'ar' ? 'من' : 'of'} {financialYears.length} {language === 'ar' ? 'سنة مالية' : 'financial years'})
                    </span>
                </div>
            </div>

            {/* Financial Years Grid */}
            {filteredFinancialYears.length === 0 ? (
                financialYears.length === 0 ? (
                    renderEmptyState()
                ) : (
                    <div className="text-center py-12 bg-surface rounded-lg shadow-md">
                        <CalendarIcon />
                        <h3 className="mt-2 text-sm font-medium text-text-primary">
                            {language === 'ar' ? 'لا توجد سنوات مالية لهذا المتجر' : 'No financial years for this shop'}
                        </h3>
                        <p className="mt-1 text-sm text-text-secondary">
                            {language === 'ar' ? 'اختر متجر آخر أو أضف سنة مالية جديدة لهذا المتجر' : 'Select another shop or add a new financial year for this shop'}
                        </p>
                    </div>
                )
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFinancialYears.map(renderFinancialYearCard)}
                </div>
            )}

            {/* Modals */}
            <FinancialYearModal
                isOpen={showCreateModal || editingYear !== null}
                onClose={() => {
                    setShowCreateModal(false);
                    setEditingYear(null);
                }}
                onSubmit={editingYear ? handleEditFinancialYear : handleCreateFinancialYear}
                editingYear={editingYear}
                shops={shops}
                selectedShopId={selectedShopFilter !== 'all' ? selectedShopFilter : ''}
            />

            {closingYear && (
                <ConfirmationModal
                    isOpen={true}
                    onClose={() => setClosingYear(null)}
                    onConfirm={() => handleCloseFinancialYear(closingYear.id)}
                    title={t('financialYears.messages.closeConfirm')}
                    message={t('financialYears.messages.closeWarning')}
                    confirmText={t('financialYears.actions.close')}
                    cancelText={t('common.actions.cancel')}
                />
            )}
        </div>
    );
};