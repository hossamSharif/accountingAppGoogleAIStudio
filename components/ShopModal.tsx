import React, { useState, useEffect } from 'react';
import { Shop } from '../types';

interface ShopModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (shopData: Omit<Shop, 'id'> | Shop) => void;
    shopToEdit: Shop | null;
}

const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, onSave, shopToEdit }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (shopToEdit) {
            setName(shopToEdit.name);
            setDescription(shopToEdit.description);
        } else {
            setName('');
            setDescription('');
        }
    }, [shopToEdit, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        
        if (shopToEdit) {
            const shopData = { name: name.trim(), description: description.trim() };
            onSave({ ...shopToEdit, ...shopData });
        } else {
            const shopData: Omit<Shop, 'id'> = { 
                name: name.trim(), 
                description: description.trim(), 
                isActive: true 
            };
            onSave(shopData);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300"
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
                <h2 className="text-2xl font-bold mb-6">{shopToEdit ? 'تعديل المتجر' : 'إضافة متجر جديد'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="shopName" className="block text-sm font-medium text-text-secondary mb-1">اسم المتجر</label>
                            <input
                                type="text"
                                id="shopName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="مثال: متجر وسط المدينة"
                                className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1">الوصف (اختياري)</label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="وصف مختصر للمتجر أو موقعه"
                                rows={3}
                                className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                            />
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end space-x-4 space-x-reverse">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                            {shopToEdit ? 'حفظ التعديلات' : 'إضافة المتجر'}
                        </button>
                    </div>
                </form>
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

export default ShopModal;
