import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
}

const AlertIcon = ({ isDestructive }: { isDestructive?: boolean }) => (
    <svg className={`h-12 w-12 ${isDestructive ? 'text-red-500' : 'text-yellow-500'}`} stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
);

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'تأكيد', isDestructive = true }) => {
    if (!isOpen) return null;

    const confirmButtonColor = isDestructive 
        ? "bg-red-600 hover:bg-red-700" 
        : "bg-primary hover:bg-primary-dark";
    
    const iconBgColor = isDestructive ? 'bg-red-500/20' : 'bg-yellow-500/20';


    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
            aria-modal="true"
            role="alertdialog"
        >
            <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-md m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale text-center">
                <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full ${iconBgColor} mb-4`}>
                    <AlertIcon isDestructive={isDestructive} />
                </div>
                <h3 className="text-xl font-bold text-text-primary mb-2" id="modal-title">{title}</h3>
                <p className="text-text-secondary mb-6">{message}</p>
                
                <div className="flex justify-center space-x-4 space-x-reverse">
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-6 rounded-lg transition duration-300"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`${confirmButtonColor} text-white font-bold py-2 px-6 rounded-lg transition duration-300`}
                    >
                        {confirmText}
                    </button>
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

export default ConfirmationModal;
