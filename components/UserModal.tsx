import React, { useState, useEffect } from 'react';
import { User, Shop } from '../types';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (userData: Omit<User, 'role' | 'isActive'>) => void;
    userToEdit: User | null;
    allUsers: User[];
    shops: Shop[];
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, userToEdit, allUsers, shops }) => {
    const [uid, setUid] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [shopId, setShopId] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        setError('');
        if (userToEdit) {
            setUid(userToEdit.id);
            setName(userToEdit.name);
            setEmail(userToEdit.email);
            setShopId(userToEdit.shopId || '');
        } else {
            setUid('');
            setName('');
            setEmail('');
            setShopId(shops[0]?.id || '');
        }
    }, [userToEdit, isOpen, shops]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || !email.trim() || !shopId) {
            setError('الرجاء ملء جميع الحقول المطلوبة.');
            return;
        }
        
        if (!userToEdit && !uid.trim()) {
            setError('معرف المستخدم (UID) مطلوب للمستخدم الجديد.');
            return;
        }

        const isEmailTaken = allUsers.some(
            u => u.email.toLowerCase() === email.trim().toLowerCase() && u.id !== userToEdit?.id
        );

        if (isEmailTaken) {
            setError('هذا البريد الإلكتروني مستخدم بالفعل.');
            return;
        }

        if (userToEdit) {
            const updatedData: User = {
                ...userToEdit,
                name: name.trim(),
                email: email.trim(),
                shopId
            };
            onSave(updatedData);
        } else {
             const newData: Omit<User, 'role' | 'isActive'> = {
                id: uid.trim(),
                name: name.trim(),
                email: email.trim(),
                shopId
            };
            onSave(newData);
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
                <h2 className="text-2xl font-bold mb-6">{userToEdit ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h2>
                <form onSubmit={handleSubmit}>
                     {!userToEdit && (
                        <div className="bg-blue-900/50 border border-blue-700 text-blue-200 text-sm rounded-lg p-3 mb-4">
                            <h4 className="font-bold">خطوات إضافة مستخدم:</h4>
                            <ol className="list-decimal list-inside mt-1">
                                <li>اذهب إلى لوحة تحكم Firebase &gt; Authentication.</li>
                                <li>أضف مستخدم جديد وأدخل بريده الإلكتروني وكلمة المرور.</li>
                                <li>انسخ "معرف المستخدم (UID)" الذي تم إنشاؤه.</li>
                                <li>الصق الـ UID في الحقل المخصص بالأسفل.</li>
                            </ol>
                        </div>
                    )}
                    <div className="space-y-4">
                        {!userToEdit && (
                             <div>
                                <label htmlFor="uid" className="block text-sm font-medium text-text-secondary mb-1">معرف المستخدم (UID)</label>
                                <input
                                    type="text"
                                    id="uid"
                                    value={uid}
                                    onChange={(e) => setUid(e.target.value)}
                                    placeholder="الصق الـ UID من Firebase هنا"
                                    className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                                    required
                                />
                            </div>
                        )}
                        <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-text-secondary mb-1">الاسم الكامل</label>
                            <input
                                type="text"
                                id="fullName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">البريد الإلكتروني (مطابق لحساب الدخول)</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary text-left"
                                required
                            />
                        </div>
                         <div>
                            <label htmlFor="shopId" className="block text-sm font-medium text-text-secondary mb-1">المتجر المرتبط</label>
                            <select
                                id="shopId"
                                value={shopId}
                                onChange={(e) => setShopId(e.target.value)}
                                className="w-full bg-background border border-gray-600 rounded-md p-2 focus:ring-primary focus:border-primary"
                                required
                            >
                                <option value="" disabled>-- اختر متجر --</option>
                                {shops.map(shop => (
                                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                                ))}
                            </select>
                        </div>
                         {error && <p className="text-red-500 text-sm text-center bg-red-500/10 p-2 rounded-md">{error}</p>}
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
                            {userToEdit ? 'حفظ التعديلات' : 'إضافة المستخدم'}
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

export default UserModal;
