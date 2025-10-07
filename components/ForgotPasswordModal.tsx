import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { getAuthErrorMessage, getAuthSuccessMessage } from '../utils/authErrorHandler';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!email.trim()) {
            setError('يرجى إدخال البريد الإلكتروني');
            return;
        }

        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email.trim());
            setSuccess(getAuthSuccessMessage('password-reset'));

            // Auto-close after 3 seconds
            setTimeout(() => {
                handleClose();
            }, 3000);

        } catch (error: any) {
            setError(getAuthErrorMessage(error.code));
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setError('');
        setSuccess('');
        setIsLoading(false);
        onClose();
    };
    
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300"
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-text-primary">استعادة كلمة المرور</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-300"
                        disabled={isLoading}
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            البريد الإلكتروني
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="أدخل بريدك الإلكتروني"
                            className="w-full bg-background border border-gray-600 rounded-md p-3 text-text-primary focus:ring-primary focus:border-primary placeholder-gray-500 disabled:opacity-50"
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-900/20 border border-red-500/30 rounded-md p-2">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="text-green-500 text-sm text-center bg-green-900/20 border border-green-500/30 rounded-md p-2">
                            {success}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                            disabled={isLoading}
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || success}
                            className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    جار الإرسال...
                                </div>
                            ) : (
                                'إرسال الرابط'
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-4 text-xs text-gray-400 text-center">
                    سيتم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني
                </div>
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