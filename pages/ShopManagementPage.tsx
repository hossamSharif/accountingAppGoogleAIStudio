
import React, { useState } from 'react';
import { Shop } from '../types';
import ShopList from '../components/ShopList';
import ShopModal from '../components/ShopModal';
import ConfirmationModal from '../components/ConfirmationModal';

interface ShopManagementPageProps {
    shops: Shop[];
    onAddShop: (shop: Omit<Shop, 'id'>) => void;
    onUpdateShop: (shop: Shop) => void;
    onToggleShopStatus: (shopId: string) => void;
    onViewAccounts: (shop: Shop) => void;
}

const PlusIcon = () => <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>;

const ShopManagementPage: React.FC<ShopManagementPageProps> = ({ shops, onAddShop, onUpdateShop, onToggleShopStatus, onViewAccounts }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShop, setEditingShop] = useState<Shop | null>(null);
    const [togglingShop, setTogglingShop] = useState<Shop | null>(null);

    const handleOpenModal = (shop: Shop | null = null) => {
        setEditingShop(shop);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingShop(null);
    };

    const handleSaveShop = (shopData: Omit<Shop, 'id'> | Shop) => {
        if ('id' in shopData) {
            onUpdateShop(shopData as Shop);
        } else {
            onAddShop(shopData);
        }
        handleCloseModal();
    };
    
    const handleConfirmToggle = () => {
        if(togglingShop) {
            onToggleShopStatus(togglingShop.id);
            setTogglingShop(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <h2 className="text-2xl font-bold">إدارة المتاجر</h2>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center shadow-lg"
                >
                    <PlusIcon />
                    <span>إضافة متجر جديد</span>
                </button>
            </div>

            <div className="bg-surface p-6 rounded-lg shadow-lg">
                <ShopList 
                    shops={shops} 
                    onEdit={handleOpenModal} 
                    onToggleStatus={(shopId) => setTogglingShop(shops.find(s => s.id === shopId) || null)} 
                    onViewAccounts={onViewAccounts}
                />
            </div>
            
            <ShopModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveShop}
                shopToEdit={editingShop}
            />

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
        </div>
    );
};

export default ShopManagementPage;
