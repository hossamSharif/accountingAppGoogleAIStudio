import { useState, useCallback } from 'react';

export interface UseLoadingReturn {
    isLoading: boolean;
    loadingStates: { [key: string]: boolean };
    setLoading: (loading: boolean) => void;
    setLoadingState: (key: string, loading: boolean) => void;
    isLoadingState: (key: string) => boolean;
    withLoading: <T>(operation: () => Promise<T>, key?: string) => Promise<T>;
}

export const useLoading = (): UseLoadingReturn => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStates, setLoadingStates] = useState<{ [key: string]: boolean }>({});

    const setLoading = useCallback((loading: boolean) => {
        setIsLoading(loading);
    }, []);

    const setLoadingState = useCallback((key: string, loading: boolean) => {
        setLoadingStates(prev => ({
            ...prev,
            [key]: loading
        }));
    }, []);

    const isLoadingState = useCallback((key: string): boolean => {
        return loadingStates[key] || false;
    }, [loadingStates]);

    const withLoading = useCallback(async <T,>(
        operation: () => Promise<T>,
        key?: string
    ): Promise<T> => {
        try {
            if (key) {
                setLoadingState(key, true);
            } else {
                setLoading(true);
            }

            const result = await operation();
            return result;
        } finally {
            if (key) {
                setLoadingState(key, false);
            } else {
                setLoading(false);
            }
        }
    }, [setLoading, setLoadingState]);

    return {
        isLoading,
        loadingStates,
        setLoading,
        setLoadingState,
        isLoadingState,
        withLoading
    };
};

export default useLoading;