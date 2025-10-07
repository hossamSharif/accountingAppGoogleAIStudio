
import React, { useState } from 'react';
import { Shop, User } from '../types';
import ShopModal from '../components/ShopModal';
import ShopCard from '../components/ShopCard';
import ShopStatsModal from '../components/ShopStatsModal';
import ConfirmationModal from '../components/ConfirmationModal';
import ShopDeleteConfirmationModal from '../components/ShopDeleteConfirmationModal';
import { ShopService, CreateShopData } from '../services/shopService';
import { useShopData } from '../hooks/useShopData';
import { LoggingService } from '../services/loggingService';
import { LogType } from '../types';

interface ShopManagementPageProps {
    currentUser: User;
    onViewAccounts: (shop: Shop) => void;
    onNavigateToFinancialYears?: (shop: Shop) => void;
    onNavigateToUsers?: (shop: Shop) => void;
}

const PlusIcon = () => <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>;

const ShopManagementPage: React.FC<ShopManagementPageProps> = ({
    currentUser,
    onViewAccounts,
    onNavigateToFinancialYears,
    onNavigateToUsers
}) => {
    const { shops, loading: shopsLoading, error: shopsError, refreshShops, getShopStats } = useShopData(currentUser);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShop, setEditingShop] = useState<Shop | null>(null);
    const [togglingShop, setTogglingShop] = useState<Shop | null>(null);
    const [deletingShop, setDeletingShop] = useState<Shop | null>(null); // Added for delete
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
    const [showStatsModal, setShowStatsModal] = useState(false);

    const handleOpenModal = (shop: Shop | null = null) => {
        setEditingShop(shop);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingShop(null);
    };

    const handleSaveShop = async (shopData: Omit<Shop, 'id'> | Shop) => {
        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            if ('id' in shopData) {
                // Update existing shop
                const { id, isActive, ...updateData } = shopData as Shop;
                await ShopService.updateShop(id, updateData);

                // Log the update
                await LoggingService.logAction(
                    currentUser,
                    LogType.SHOP_UPDATED,
                    `تم تحديث متجر "${shopData.name}"`,
                    id
                );

                setSuccess(`تم تحديث متجر "${shopData.name}" بنجاح`);
            } else {
                // Create new shop
                const createShopData: CreateShopData = {
                    name: shopData.name,
                    shopCode: (shopData as any).shopCode, // Include shop code
                    description: shopData.description,
                    address: (shopData as any).address,
                    contactPhone: (shopData as any).contactPhone,
                    contactEmail: (shopData as any).contactEmail,
                    businessType: (shopData as any).businessType,
                    customBusinessType: (shopData as any).customBusinessType,
                    openingStockValue: (shopData as any).openingStockValue || 0
                };

                const newShop = await ShopService.createShop(createShopData);

                // Log the creation
                await LoggingService.logAction(
                    currentUser,
                    LogType.SHOP_CREATED,
                    `تم إنشاء متجر جديد "${newShop.name}" مع ${Math.round((shopData as any).openingStockValue || 0)} ريال مخزون افتتاحي`,
                    newShop.id
                );

                setSuccess(`تم إنشاء متجر "${newShop.name}" بنجاح مع الحسابات الافتراضية والسنة المالية`);
            }

            handleCloseModal();
            refreshShops(); // Refresh the data

        } catch (error: any) {
            console.error('Error saving shop:', error);
            let errorMessage = 'حدث خطأ أثناء حفظ المتجر';

            if (error.code === 'permission-denied') {
                errorMessage = 'ليس لديك صلاحية لتنفيذ هذا العمل';
            } else if (error.message?.includes('Shop with this name already exists')) {
                errorMessage = 'يوجد متجر بنفس هذا الاسم، يرجى اختيار اسم آخر';
            } else if (error.message?.includes('Firebase')) {
                errorMessage = 'مشكلة في الاتصال بقاعدة البيانات، يرجى المحاولة مرة أخرى';
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleConfirmToggle = async () => {
        if (!togglingShop) return;

        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            await ShopService.toggleShopStatus(togglingShop.id);

            // Log the status change
            await LoggingService.logAction(
                currentUser,
                togglingShop.isActive ? LogType.SHOP_DEACTIVATED : LogType.SHOP_ACTIVATED,
                `تم ${togglingShop.isActive ? 'إلغاء تفعيل' : 'تفعيل'} متجر "${togglingShop.name}"`,
                togglingShop.id
            );

            setSuccess(`تم ${togglingShop.isActive ? 'إلغاء تفعيل' : 'تفعيل'} متجر "${togglingShop.name}" بنجاح`);
            setTogglingShop(null);
            refreshShops(); // Refresh the data

        } catch (error: any) {
            console.error('Error toggling shop status:', error);
            let errorMessage = 'حدث خطأ أثناء تحديث حالة المتجر';

            if (error.message?.includes('active users')) {
                errorMessage = 'لا يمكن إلغاء تفعيل متجر يحتوي على مستخدمين نشطين';
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleViewShopStats = (shop: Shop) => {
        setSelectedShop(shop);
        setShowStatsModal(true);
    };

    const handleDeleteShop = (shop: Shop) => {
        setDeletingShop(shop);
    };

    const handleConfirmDelete = async () => {
        if (!deletingShop) return;

        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            // Force delete shop with all its data
            const result = await ShopService.forceDeleteShop(deletingShop.id);

            // Log the deletion
            await LoggingService.logAction(
                currentUser,
                LogType.SHOP_DELETED,
                `تم حذف متجر "${deletingShop.name}" نهائياً مع ${result.deletedCount.accounts} حساب و ${result.deletedCount.transactions} معاملة`,
                deletingShop.id
            );

            setSuccess(`تم حذف متجر "${deletingShop.name}" وجميع بياناته بنجاح`);
            setDeletingShop(null);
            refreshShops(); // Refresh the data

        } catch (error: any) {
            console.error('Error deleting shop:', error);
            let errorMessage = 'حدث خطأ أثناء حذف المتجر';

            if (error.code === 'permission-denied') {
                errorMessage = 'ليس لديك صلاحية لحذف هذا المتجر';
            }

            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    // Clear messages after 5 seconds
    React.useEffect(() => {
        if (error || success) {
            const timer = setTimeout(clearMessages, 5000);
            return () => clearTimeout(timer);
        }
    }, [error, success]);

    // Show loading state for shops
    if (shopsLoading && shops.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <span className="ml-3 text-lg">جاري تحميل المتاجر...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                    <h2 className="text-2xl font-bold">إدارة المتاجر</h2>
                    <p className="text-gray-600 mt-1">
                        {shops.length > 0 ? `إجمالي المتاجر: ${shops.length}` : 'لا توجد متاجر'}
                        {shops.filter(s => s.isActive).length !== shops.length &&
                            ` (${shops.filter(s => s.isActive).length} نشط)`
                        }
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={refreshShops}
                        disabled={shopsLoading || isLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-lg disabled:opacity-50"
                    >
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        تحديث البيانات
                    </button>

                    {(currentUser.role === 'admin') && (
                        <button
                            onClick={() => handleOpenModal()}
                            disabled={isLoading}
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-lg disabled:opacity-50"
                        >
                            <PlusIcon />
                            <span>{isLoading ? 'جاري المعالجة...' : 'إضافة متجر جديد'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Error and Success Messages */}
            {(error || shopsError) && (
                <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
                    <span>{error || shopsError}</span>
                    <button
                        onClick={clearMessages}
                        className="text-red-400 hover:text-red-300"
                    >
                        ✕
                    </button>
                </div>
            )}
            {success && (
                <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg mb-4 flex justify-between items-center">
                    <span>{success}</span>
                    <button
                        onClick={clearMessages}
                        className="text-green-400 hover:text-green-300"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Shops Grid/List */}
            {shops.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {shops.map((shop) => {
                        const stats = getShopStats(shop.id);
                        return (
                            <ShopCard
                                key={shop.id}
                                shop={shop}
                                stats={stats}
                                currentUser={currentUser}
                                onEdit={() => handleOpenModal(shop)}
                                onToggleStatus={() => setTogglingShop(shop)}
                                onDelete={() => handleDeleteShop(shop)} // Add delete handler
                                onViewAccounts={() => onViewAccounts(shop)}
                                onViewStats={() => handleViewShopStats(shop)}
                                onViewFinancialYears={onNavigateToFinancialYears ? () => onNavigateToFinancialYears(shop) : undefined}
                                onViewUsers={onNavigateToUsers ? () => onNavigateToUsers(shop) : undefined}
                                isLoading={isLoading}
                            />
                        );
                    })}
                </div>
            ) : (
                <div className="bg-surface p-12 rounded-lg shadow-lg text-center">
                    <div className="text-6xl mb-4">🏪</div>
                    <h3 className="text-xl font-semibold mb-2">لا توجد متاجر</h3>
                    <p className="text-gray-600 mb-4">ابدأ بإنشاء متجرك الأول لإدارة العمليات المحاسبية</p>
                    {currentUser.role === 'admin' && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-lg"
                        >
                            إنشاء متجر جديد
                        </button>
                    )}
                </div>
            )}
            
            {/* Modals */}
            <ShopModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveShop}
                shopToEdit={editingShop}
                isLoading={isLoading}
            />

            {showStatsModal && selectedShop && (
                <ShopStatsModal
                    shop={selectedShop}
                    stats={getShopStats(selectedShop.id)}
                    isOpen={showStatsModal}
                    onClose={() => setShowStatsModal(false)}
                />
            )}

            {togglingShop && (
                <ConfirmationModal
                    isOpen={!!togglingShop}
                    onClose={() => setTogglingShop(null)}
                    onConfirm={handleConfirmToggle}
                    title={togglingShop.isActive ? 'تأكيد إلغاء التفعيل' : 'تأكيد التفعيل'}
                    message={`هل أنت متأكد من ${togglingShop.isActive ? 'إلغاء تفعيل' : 'تفعيل'} متجر "${togglingShop.name}"؟`}
                    confirmText={togglingShop.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
                    isDestructive={togglingShop.isActive}
                />
            )}

            {deletingShop && (
                <ShopDeleteConfirmationModal
                    isOpen={!!deletingShop}
                    shop={deletingShop}
                    shopStats={getShopStats(deletingShop.id)}
                    onClose={() => setDeletingShop(null)}
                    onConfirm={handleConfirmDelete}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
};

export default ShopManagementPage;
