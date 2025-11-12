import React, { useState, useMemo } from 'react';
import { User, Shop } from '../types';
import UserModal from '../components/UserModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { UserService, CreateUserData } from '../services/userService';
import { getAuthErrorMessage } from '../utils/authErrorHandler';

interface UserManagementPageProps {
    users: User[];
    shops: Shop[];
    onAddUser?: (user: Omit<User, 'id' | 'role' | 'isActive'>) => void;
    onUpdateUser?: (user: User) => void;
    onToggleUserStatus?: (userId: string) => void;
    onDeleteUser?: (userId: string) => void;
}

const PlusIcon = () => <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>;
const SearchIcon = () => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>;
const EditIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>;
const DeleteIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>;
const ToggleOnIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7"></path></svg>;
const ToggleOffIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>;

const UserManagementPage: React.FC<UserManagementPageProps> = ({ users, shops, onAddUser, onUpdateUser, onToggleUserStatus, onDeleteUser }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [togglingUser, setTogglingUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleOpenModal = (user: User | null = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleSaveUser = async (userData: (Omit<User, 'id' | 'role' | 'isActive'> & { password?: string }) | User) => {
        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            if ('id' in userData && userData.id) {
                // Update existing user
                const { id, role, isActive, password, ...updateData } = userData as User & { password?: string };
                await UserService.updateUser(id, updateData);
                if (onUpdateUser) {
                    onUpdateUser(userData as User);
                }
                setSuccess('تم تحديث المستخدم بنجاح');
            } else {
                // Create new user
                const { password, ...userDataWithoutPassword } = userData as Omit<User, 'id' | 'role' | 'isActive'> & { password: string };

                if (!password) {
                    throw new Error('كلمة المرور مطلوبة للمستخدمين الجدد');
                }

                const createUserData: CreateUserData = {
                    name: userDataWithoutPassword.name,
                    email: userDataWithoutPassword.email,
                    password,
                    shopId: userDataWithoutPassword.shopId || ''
                };

                await UserService.createUser(createUserData);
                if (onAddUser) {
                    onAddUser(userDataWithoutPassword);
                }
                setSuccess('تم إنشاء المستخدم بنجاح وتم إرسال رابط التفعيل إلى البريد الإلكتروني');
            }

            handleCloseModal();
        } catch (error: any) {
            console.error('Error saving user:', error);
            if (error.code) {
                setError(getAuthErrorMessage(error.code));
            } else {
                setError(error.message || 'حدث خطأ أثناء حفظ المستخدم');
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!deletingUser) return;

        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            await UserService.deleteUser(deletingUser.id);
            if (onDeleteUser) {
                onDeleteUser(deletingUser.id);
            }
            setSuccess(`تم حذف المستخدم "${deletingUser.name}" بنجاح`);
            setDeletingUser(null);
        } catch (error: any) {
            console.error('Error deleting user:', error);
            setError(error.message || 'حدث خطأ أثناء حذف المستخدم');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleConfirmToggle = async () => {
        if (!togglingUser) return;

        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            await UserService.toggleUserStatus(togglingUser.id);
            if (onToggleUserStatus) {
                onToggleUserStatus(togglingUser.id);
            }
            setSuccess(`تم ${togglingUser.isActive ? 'إلغاء تفعيل' : 'تفعيل'} المستخدم "${togglingUser.name}" بنجاح`);
            setTogglingUser(null);
        } catch (error: any) {
            console.error('Error toggling user status:', error);
            setError(error.message || 'حدث خطأ أثناء تحديث حالة المستخدم');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return users;
        return users.filter(u => 
            u.name.toLowerCase().includes(query) || 
            u.email.toLowerCase().includes(query)
        );
    }, [users, searchQuery]);

    const getShopName = (shopId?: string) => {
        return shops.find(s => s.id === shopId)?.name || <span className="text-gray-500">غير مرتبط</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
                <button 
                    onClick={() => handleOpenModal()}
                    className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-300 flex items-center shadow-lg transform hover:scale-105"
                >
                    <PlusIcon />
                    <span>{isLoading ? 'جاري التحميل...' : 'إضافة مستخدم جديد'}</span>
                </button>
            </div>

            <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <SearchIcon />
                </div>
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                    className="w-full bg-surface border border-gray-600 rounded-lg p-3 pr-10 text-text-primary focus:ring-primary focus:border-primary placeholder-gray-400"
                />
            </div>

            {/* Error and Success Messages */}
            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg mb-4">
                    {success}
                </div>
            )}

            <div className="bg-surface p-4 md:p-6 rounded-lg shadow-lg">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="border-2 text-base font-semibold" style={{ backgroundColor: 'var(--color-surface-hover)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}>
                             <tr>
                                <th className="p-3">الاسم الكامل</th>
                                <th className="p-3">البريد الإلكتروني</th>
                                <th className="p-3">المتجر المرتبط</th>
                                <th className="p-3">الحالة</th>
                                <th className="p-3 text-left sticky left-0 z-10" style={{ backgroundColor: 'var(--color-surface-hover)' }}>الإجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user, index) => (
                                <tr key={user.id} className={`border-b border-gray-700 transition-colors duration-200 hover:bg-background/50 ${index % 2 === 0 ? 'bg-background/20' : ''}`}>
                                    <td className="p-3 font-medium text-text-primary">{user.name}</td>
                                    <td className="p-3 text-text-secondary text-left">{user.email}</td>
                                    <td className="p-3 text-text-secondary">{getShopName(user.shopId)}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {user.isActive ? 'نشط' : 'غير نشط'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-left sticky left-0 bg-background/90 backdrop-blur-sm z-10">
                                        <button
                                            onClick={() => handleOpenModal(user)}
                                            disabled={isLoading}
                                            className="text-accent hover:text-blue-400 p-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label={`تعديل ${user.name}`}
                                        >
                                            <EditIcon />
                                        </button>
                                        <button
                                            onClick={() => setTogglingUser(user)}
                                            disabled={isLoading}
                                            className={`p-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${user.isActive ? 'text-yellow-400 hover:text-yellow-300' : 'text-green-400 hover:text-green-300'}`}
                                            aria-label={`${user.isActive ? 'إلغاء تفعيل' : 'تفعيل'} ${user.name}`}
                                        >
                                            {user.isActive ? <ToggleOffIcon /> : <ToggleOnIcon />}
                                        </button>
                                        <button
                                            onClick={() => setDeletingUser(user)}
                                            disabled={isLoading}
                                            className="text-red-500 hover:text-red-400 p-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            aria-label={`حذف ${user.name}`}
                                        >
                                            <DeleteIcon />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center p-8 text-text-secondary">
                                        لا يوجد مستخدمون يطابقون بحثك أو لم يتم إضافة أي مستخدمين بعد.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                    {filteredUsers.length === 0 ? (
                        <div className="text-center p-8 text-text-secondary">
                            لا يوجد مستخدمون يطابقون بحثك أو لم يتم إضافة أي مستخدمين بعد.
                        </div>
                    ) : (
                        filteredUsers.map((user) => (
                            <div key={user.id} className="bg-background border border-gray-700 rounded-lg p-4 space-y-3">
                                {/* Header with name and status */}
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-text-primary">{user.name}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {user.isActive ? 'نشط' : 'غير نشط'}
                                    </span>
                                </div>

                                {/* Email and Shop */}
                                <div className="space-y-1 text-sm">
                                    <p className="text-text-secondary text-left">{user.email}</p>
                                    <p className="text-text-secondary">{getShopName(user.shopId)}</p>
                                </div>

                                {/* Action buttons */}
                                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-700">
                                    <button
                                        onClick={() => handleOpenModal(user)}
                                        disabled={isLoading}
                                        className="flex items-center justify-center gap-1 bg-primary/20 hover:bg-primary/30 text-accent py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <EditIcon />
                                        <span className="text-xs">تعديل</span>
                                    </button>
                                    <button
                                        onClick={() => setTogglingUser(user)}
                                        disabled={isLoading}
                                        className={`flex items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors disabled:opacity-50 ${
                                            user.isActive
                                                ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                                                : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                                        }`}
                                    >
                                        {user.isActive ? <ToggleOffIcon /> : <ToggleOnIcon />}
                                        <span className="text-xs">{user.isActive ? 'إيقاف' : 'تفعيل'}</span>
                                    </button>
                                    <button
                                        onClick={() => setDeletingUser(user)}
                                        disabled={isLoading}
                                        className="flex items-center justify-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        <DeleteIcon />
                                        <span className="text-xs">حذف</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <UserModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveUser}
                userToEdit={editingUser}
                allUsers={users}
                shops={shops.filter(s => s.isActive)}
                isLoading={isLoading}
            />

            {deletingUser && (
                 <ConfirmationModal 
                    isOpen={!!deletingUser} 
                    onClose={() => setDeletingUser(null)}
                    onConfirm={handleConfirmDelete}
                    title="تأكيد الحذف"
                    message={`هل أنت متأكد من حذف المستخدم "${deletingUser.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
                    confirmText="حذف"
                    isDestructive={true}
                />
            )}
             {togglingUser && (
                <ConfirmationModal 
                    isOpen={!!togglingUser} 
                    onClose={() => setTogglingUser(null)}
                    onConfirm={handleConfirmToggle}
                    title={togglingUser.isActive ? 'تأكيد إلغاء التفعيل' : 'تأكيد التفعيل'}
                    message={`هل أنت متأكد من ${togglingUser.isActive ? 'إلغاء تفعيل' : 'تفعيل'} حساب "${togglingUser.name}"؟`}
                    confirmText={togglingUser.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
                    isDestructive={togglingUser.isActive}
                />
            )}
        </div>
    );
};

export default UserManagementPage;
