import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { auth } from '../firebase';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useTranslation } from '../i18n/useTranslation';


const LockIcon = () => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>;
const UserIcon = () => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>;

interface ProfilePageProps {
    currentUser: User;
    onUpdateUser: (user: User) => void;
    allUsers: User[];
}

const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser, onUpdateUser, allUsers }) => {
    const { t } = useTranslation();

    // State for profile info form
    const [name, setName] = useState(currentUser.name);
    const [email, setEmail] = useState(currentUser.email);
    const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // State for password change form
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPasswordChanging, setIsPasswordChanging] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Sync state if currentUser prop changes (e.g., after a successful update)
    useEffect(() => {
        setName(currentUser.name);
        setEmail(currentUser.email);
    }, [currentUser]);

    const handleProfileUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMessage(null);

        if (!name.trim() || !email.trim()) {
            setProfileMessage({ type: 'error', text: t('profile.validation.nameEmailRequired') });
            return;
        }

        const isEmailTaken = allUsers.some(
            u => u.email.toLowerCase() === email.trim().toLowerCase() && u.id !== currentUser.id
        );

        if (isEmailTaken) {
            setProfileMessage({ type: 'error', text: t('profile.validation.emailTaken') });
            return;
        }

        onUpdateUser({ ...currentUser, name: name.trim(), email: email.trim() });
        setProfileMessage({ type: 'success', text: t('profile.messages.updated') });
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordMessage(null);
        setIsPasswordChanging(true);

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordMessage({ type: 'error', text: t('profile.validation.fillAllFields') });
            setIsPasswordChanging(false);
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMessage({ type: 'error', text: t('profile.messages.passwordMismatch') });
            setIsPasswordChanging(false);
            return;
        }
        if (newPassword.length < 6) {
             setPasswordMessage({ type: 'error', text: t('profile.messages.passwordTooShort') });
             setIsPasswordChanging(false);
            return;
        }

        const user = auth.currentUser;
        if (!user || !user.email) {
            setPasswordMessage({ type: 'error', text: t('profile.messages.notAuthenticated') });
            setIsPasswordChanging(false);
            return;
        }

        const credential = EmailAuthProvider.credential(user.email, currentPassword);

        try {
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            setPasswordMessage({ type: 'success', text: t('profile.messages.passwordChanged') });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error("Password change error:", error);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                 setPasswordMessage({ type: 'error', text: t('profile.messages.currentPasswordWrong') });
            } else {
                 setPasswordMessage({ type: 'error', text: t('profile.messages.passwordChangeError') });
            }
        } finally {
            setIsPasswordChanging(false);
        }
    };
    
    const isAdmin = currentUser.role === 'admin';

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold mb-6">{t('profile.title')}</h1>

            {isAdmin && (
                 <div className="bg-surface p-8 rounded-lg shadow-lg">
                    <h2 className="text-xl font-bold mb-6 text-text-primary">{t('profile.personalInfo')}</h2>
                    <form onSubmit={handleProfileUpdate} className="space-y-6">
                         <div>
                            <label htmlFor="fullName" className="block text-sm font-medium text-text-secondary mb-1">{t('profile.form.name')}</label>
                             <input
                                type="text"
                                id="fullName"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-background border border-gray-600 rounded-md p-3 text-text-primary focus:ring-primary focus:border-primary"
                                required
                            />
                        </div>
                        <div className="relative">
                            <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1">{t('profile.form.email')}</label>
                             <div className="absolute inset-y-0 right-0 pr-3 top-7 flex items-center pointer-events-none">
                                <UserIcon />
                            </div>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-background border border-gray-600 rounded-md p-3 pr-10 text-text-primary focus:ring-primary focus:border-primary text-left"
                                required
                            />
                        </div>
                         {profileMessage && (
                            <div className={`p-3 rounded-md text-center text-sm ${profileMessage.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                {profileMessage.text}
                            </div>
                        )}
                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                className="bg-accent hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 shadow-lg"
                            >
                                {t('profile.buttons.saveProfile')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-surface p-8 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-6 text-text-primary">{t('profile.passwordChange')}</h2>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div className="relative">
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-text-secondary mb-1">{t('profile.form.currentPassword')}</label>
                        <div className="absolute inset-y-0 right-0 pr-3 top-7 flex items-center pointer-events-none">
                            <LockIcon />
                        </div>
                        <input
                            type="password"
                            id="currentPassword"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full bg-background border border-gray-600 rounded-md p-3 pr-10 text-text-primary focus:ring-primary focus:border-primary"
                            required
                        />
                    </div>
                     <div className="relative">
                        <label htmlFor="newPassword" className="block text-sm font-medium text-text-secondary mb-1">{t('profile.form.newPassword')}</label>
                         <div className="absolute inset-y-0 right-0 pr-3 top-7 flex items-center pointer-events-none">
                            <LockIcon />
                        </div>
                        <input
                            type="password"
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-background border border-gray-600 rounded-md p-3 pr-10 text-text-primary focus:ring-primary focus:border-primary"
                            required
                        />
                    </div>
                     <div className="relative">
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-1">{t('profile.form.confirmPassword')}</label>
                        <div className="absolute inset-y-0 right-0 pr-3 top-7 flex items-center pointer-events-none">
                            <LockIcon />
                        </div>
                        <input
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-background border border-gray-600 rounded-md p-3 pr-10 text-text-primary focus:ring-primary focus:border-primary"
                            required
                        />
                    </div>
                    
                    {passwordMessage && (
                        <div className={`p-3 rounded-md text-center text-sm ${passwordMessage.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {passwordMessage.text}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isPasswordChanging}
                            className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-lg transition duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isPasswordChanging ? t('profile.buttons.saving') : t('profile.buttons.savePassword')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;