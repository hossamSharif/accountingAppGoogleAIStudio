import React, { useState } from 'react';
import { auth } from '../firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        if (!email) return;

        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage(`تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email} إن كان الحساب موجوداً.`);
            setEmail('');
        } catch (error: any) {
            console.error('Password Reset Error:', error);
            setMessage('حدث خطأ أثناء إرسال البريد الإلكتروني. يرجى المحاولة مرة أخرى.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setMessage('');
            setEmail('');
            setIsLoading(false);
        }, 300);
    };
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300"
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
                <h2 className="text-2xl font-bold mb-4 text-text-primary">نسيت كلمة المرور</h2>
                
                <form onSubmit={handleSubmit}>
                    {message ? (
                        <div className="text-center p-4">
                             <p className="text-text-primary">{message}</p>
                        </div>
                    ) : (
                         <>
                            <p className="text-text-secondary mb-6">أدخل بريدك الإلكتروني، وسنقوم بإرسال رابط لاستعادة حسابك.</p>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="reset-email" className="block text-sm font-medium text-text-secondary mb-1">البريد الإلكتروني</label>
                                    <input
                                        type="email"
                                        id="reset-email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="أدخل بريدك الإلكتروني"
                                        className="w-full bg-background border border-gray-600 rounded-md p-2 text-text-primary focus:ring-primary focus:border-primary text-left"
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    )}
                    <div className="mt-8 flex justify-end space-x-4 space-x-reverse">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                        >
                            {message ? 'إغلاق' : 'إلغاء'}
                        </button>
                        {!message && (
                             <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-wait"
                            >
                                {isLoading ? 'جار الإرسال...' : 'إرسال رابط الاستعادة'}
                            </button>
                        )}
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

export default ForgotPasswordModal;