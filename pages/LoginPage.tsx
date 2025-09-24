import React, { useState } from 'react';
import ForgotPasswordModal from '../components/ForgotPasswordModal';

interface LoginPageProps {
    onLogin: (email: string, password: string) => Promise<true | string>;
}

const LogoIcon = () => (
    <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01M12 6v-1h4v1m-4 10v-1h4v1m-4-7h-2l-1 1v1h3v1h-3v1l1 1h2m0-7V7m0 1v.01"></path>
    </svg>
);

const UserIcon = () => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>;
const LockIcon = () => <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>;

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('user@example.com');
    const [password, setPassword] = useState('user');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const result = await onLogin(email, password);
        if (result !== true) {
            setError(result);
        }
        // On success, the onAuthStateChanged listener in App.tsx will handle the view change.
        setIsLoading(false);
    };

    return (
        <>
            <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 font-sans">
                <div className="max-w-md w-full mx-auto">
                    <div className="flex justify-center mb-6">
                        <LogoIcon />
                    </div>
                    <h1 className="text-3xl font-bold text-center text-text-primary mb-2">نظام محاسبة قطع الغيار</h1>
                    <p className="text-center text-text-secondary mb-8">تسجيل الدخول للمتابعة</p>
                    
                    <div className="bg-surface rounded-lg shadow-xl p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <UserIcon />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="البريد الإلكتروني"
                                    className="w-full bg-background border border-gray-600 rounded-md p-3 pr-10 text-text-primary focus:ring-primary focus:border-primary placeholder-gray-500 text-left"
                                    required
                                />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <LockIcon />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="كلمة المرور"
                                    className="w-full bg-background border border-gray-600 rounded-md p-3 pr-10 text-text-primary focus:ring-primary focus:border-primary placeholder-gray-500 text-left"
                                    required
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {isLoading ? 'جار التسجيل...' : 'تسجيل الدخول'}
                                </button>
                            </div>
                        </form>
                         <div className="text-center mt-4">
                            <button 
                                onClick={() => setIsForgotPasswordOpen(true)}
                                className="text-sm text-accent hover:underline focus:outline-none"
                            >
                                هل نسيت كلمة المرور؟
                            </button>
                        </div>
                    </div>
                    <div className="text-center mt-6 text-sm text-text-secondary">
                        <p>Admin: admin@example.com / admin</p>
                        <p>User: user@example.com / user</p>
                    </div>
                </div>
            </div>
            <ForgotPasswordModal 
                isOpen={isForgotPasswordOpen}
                onClose={() => setIsForgotPasswordOpen(false)}
            />
        </>
    );
};

export default LoginPage;