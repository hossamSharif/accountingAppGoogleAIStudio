
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
import { useTranslation } from '../i18n/useTranslation';

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
    const { t, language } = useTranslation();
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
                    'logs.messages.shopUpdated',
                    id,
                    undefined,
                    { shopName: shopData.name }
                );

                setSuccess(t('shops.messages.updated'));
            } else {
                // Create new shop
                const createShopData: CreateShopData = {
                    name: shopData.name,
                    nameEn: (shopData as any).nameEn || '',
                    shopCode: (shopData as any).shopCode,
                    description: shopData.description,
                    descriptionEn: (shopData as any).descriptionEn || '',
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
                    'logs.messages.shopCreated',
                    newShop.id,
                    { openingStockValue: Math.round((shopData as any).openingStockValue || 0) },
                    { shopName: newShop.name }
                );

                setSuccess(t('shops.messages.created'));
            }

            handleCloseModal();
            refreshShops(); // Refresh the data

        } catch (error: any) {
            console.error('Error saving shop:', error);
            let errorMessage = t('errors.general');

            if (error.code === 'permission-denied') {
                errorMessage = t('errors.permissionDenied');
            } else if (error.message?.includes('Shop with this name already exists')) {
                errorMessage = t('shops.validation.nameExists');
            } else if (error.message?.includes('Firebase')) {
                errorMessage = t('errors.databaseConnection');
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
                togglingShop.isActive ? 'logs.messages.shopDeactivated' : 'logs.messages.shopActivated',
                togglingShop.id,
                undefined,
                { shopName: togglingShop.name }
            );

            setSuccess(togglingShop.isActive ? t('shops.messages.deactivated') : t('shops.messages.activated'));
            setTogglingShop(null);
            refreshShops(); // Refresh the data

        } catch (error: any) {
            console.error('Error toggling shop status:', error);
            let errorMessage = t('errors.general');

            if (error.message?.includes('active users')) {
                errorMessage = t('shops.messages.cannotDeactivate');
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
                'logs.messages.shopDeleted',
                deletingShop.id,
                {
                    deletedAccounts: result.deletedCount.accounts,
                    deletedTransactions: result.deletedCount.transactions
                },
                { shopName: deletingShop.name }
            );

            setSuccess(t('shops.messages.deleted'));
            setDeletingShop(null);
            refreshShops(); // Refresh the data

        } catch (error: any) {
            console.error('Error deleting shop:', error);
            let errorMessage = t('errors.general');

            if (error.code === 'permission-denied') {
                errorMessage = t('errors.permissionDenied');
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
                <span className="ml-3 text-lg">{t('common.ui.loading')}</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <div>
                    <h2 className="text-2xl font-bold">{t('shops.title')}</h2>
                    <p className="text-gray-600 mt-1">
                        {shops.length > 0 ? `${t('common.ui.total')}: ${shops.length}` : t('shops.list.empty')}
                        {shops.filter(s => s.isActive).length !== shops.length &&
                            ` (${shops.filter(s => s.isActive).length} ${t('shops.status.active')})`
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
                        {t('common.actions.refresh')}
                    </button>

                    {(currentUser.role === 'admin') && (
                        <button
                            onClick={() => handleOpenModal()}
                            disabled={isLoading}
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-lg disabled:opacity-50"
                        >
                            <PlusIcon />
                            <span>{isLoading ? t('common.ui.loading') : t('shops.actions.create')}</span>
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
                    <h3 className="text-xl font-semibold mb-2">{t('shops.list.empty')}</h3>
                    <p className="text-gray-600 mb-4">{t('shops.subtitle')}</p>
                    {currentUser.role === 'admin' && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-lg"
                        >
                            {t('shops.actions.create')}
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
                    title={togglingShop.isActive ? t('common.ui.confirmation') : t('common.ui.confirmation')}
                    message={t(togglingShop.isActive ? 'shops.messages.deactivateConfirm' : 'shops.messages.activateConfirm')}
                    confirmText={t(togglingShop.isActive ? 'shops.actions.deactivate' : 'shops.actions.activate')}
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
