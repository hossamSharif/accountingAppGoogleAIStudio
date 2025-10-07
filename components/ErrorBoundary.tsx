import React, { Component, ErrorInfo, ReactNode } from 'react';
import { LoggingService } from '../services/loggingService';
import { LogType } from '../types';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error?: Error;
    errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({
            error,
            errorInfo
        });

        // Log the error to our logging service
        LoggingService.logSystemEvent(
            LogType.SYSTEM_ERROR,
            `React Error: ${error.message}`,
            undefined,
            {
                stack: error.stack,
                componentStack: errorInfo.componentStack,
                errorBoundary: true
            }
        );

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    public render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
                        <div className="text-6xl mb-4">⚠️</div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-4">
                            حدث خطأ غير متوقع
                        </h1>
                        <p className="text-gray-600 mb-6">
                            نعتذر، حدث خطأ في التطبيق. يرجى إعادة تحميل الصفحة أو المحاولة مرة أخرى.
                        </p>

                        <div className="flex flex-col space-y-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                إعادة تحميل الصفحة
                            </button>

                            <button
                                onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
                                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                المحاولة مرة أخرى
                            </button>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="mt-6 text-left">
                                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                                    تفاصيل الخطأ (للمطورين)
                                </summary>
                                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-3 rounded overflow-auto">
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
    WrappedComponent: React.ComponentType<P>,
    fallback?: ReactNode
) => {
    const WithErrorBoundaryComponent = (props: P) => (
        <ErrorBoundary fallback={fallback}>
            <WrappedComponent {...props} />
        </ErrorBoundary>
    );

    WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

    return WithErrorBoundaryComponent;
};