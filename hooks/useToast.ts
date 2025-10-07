import { useState, useCallback } from 'react';
import { ToastData, ToastType } from '../components/Toast';

export interface UseToastReturn {
    toasts: ToastData[];
    addToast: (message: string, type?: ToastType, duration?: number, action?: { label: string; onClick: () => void }) => string;
    removeToast: (id: string) => void;
    removeAllToasts: () => void;
    success: (message: string, duration?: number, action?: { label: string; onClick: () => void }) => string;
    error: (message: string, duration?: number, action?: { label: string; onClick: () => void }) => string;
    warning: (message: string, duration?: number, action?: { label: string; onClick: () => void }) => string;
    info: (message: string, duration?: number, action?: { label: string; onClick: () => void }) => string;
}

export const useToast = (): UseToastReturn => {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const generateId = useCallback((): string => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }, []);

    const addToast = useCallback((
        message: string,
        type: ToastType = 'info',
        duration?: number,
        action?: { label: string; onClick: () => void }
    ): string => {
        const id = generateId();
        const newToast: ToastData = {
            id,
            message,
            type,
            duration,
            action
        };

        setToasts(prev => [...prev, newToast]);
        return id;
    }, [generateId]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const removeAllToasts = useCallback(() => {
        setToasts([]);
    }, []);

    // Convenience methods for different toast types
    const success = useCallback((
        message: string,
        duration?: number,
        action?: { label: string; onClick: () => void }
    ): string => {
        return addToast(message, 'success', duration, action);
    }, [addToast]);

    const error = useCallback((
        message: string,
        duration?: number,
        action?: { label: string; onClick: () => void }
    ): string => {
        return addToast(message, 'error', duration, action);
    }, [addToast]);

    const warning = useCallback((
        message: string,
        duration?: number,
        action?: { label: string; onClick: () => void }
    ): string => {
        return addToast(message, 'warning', duration, action);
    }, [addToast]);

    const info = useCallback((
        message: string,
        duration?: number,
        action?: { label: string; onClick: () => void }
    ): string => {
        return addToast(message, 'info', duration, action);
    }, [addToast]);

    return {
        toasts,
        addToast,
        removeToast,
        removeAllToasts,
        success,
        error,
        warning,
        info
    };
};

export default useToast;