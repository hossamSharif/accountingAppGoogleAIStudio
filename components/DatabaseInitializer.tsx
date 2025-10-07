import React, { useState } from 'react';
import { initializeDatabase, defaultInitializationData, InitializationData } from '../initializeDatabase';

interface DatabaseInitializerProps {
    onInitializationComplete: () => void;
}

const DatabaseInitializer: React.FC<DatabaseInitializerProps> = ({ onInitializationComplete }) => {
    const [isInitializing, setIsInitializing] = useState(false);
    const [initializationStatus, setInitializationStatus] = useState<string>('');
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string>('');

    const handleInitialize = async () => {
        setIsInitializing(true);
        setInitializationStatus('بدء إعداد قاعدة البيانات...');
        setError('');

        try {
            const result = await initializeDatabase(defaultInitializationData);

            if (result.success) {
                setInitializationStatus('✅ تم إعداد قاعدة البيانات بنجاح!');
                setIsComplete(true);
                setTimeout(() => {
                    onInitializationComplete();
                }, 2000);
            } else {
                setError(result.error || 'حدث خطأ غير معروف');
                setInitializationStatus('❌ فشل في إعداد قاعدة البيانات');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : String(error));
            setInitializationStatus('❌ فشل في إعداد قاعدة البيانات');
        }

        setIsInitializing(false);
    };

    return (
        <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full mx-auto bg-surface rounded-lg shadow-xl p-8">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-text-primary mb-2">
                        إعداد قاعدة البيانات
                    </h1>
                    <p className="text-text-secondary">
                        هذا الإعداد مطلوب لتشغيل التطبيق لأول مرة
                    </p>
                </div>

                {!isInitializing && !isComplete && (
                    <div className="space-y-4">
                        <div className="bg-gray-800 p-4 rounded-lg">
                            <h3 className="text-text-primary font-semibold mb-2">سيتم إنشاء:</h3>
                            <ul className="text-text-secondary text-sm space-y-1">
                                <li>• حساب المدير: admin@accounting-app.com</li>
                                <li>• حساب تجريبي: user@example.com</li>
                                <li>• {defaultInitializationData.shops.length} متاجر تجريبية</li>
                                <li>• شجرة الحسابات الافتراضية</li>
                                <li>• السنوات المالية</li>
                            </ul>
                        </div>

                        <button
                            onClick={handleInitialize}
                            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            بدء الإعداد
                        </button>
                    </div>
                )}

                {isInitializing && (
                    <div className="text-center">
                        <div className="animate-pulse mb-4">
                            <div className="w-16 h-16 bg-primary rounded-full mx-auto flex items-center justify-center">
                                <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        </div>
                        <p className="text-text-primary">{initializationStatus}</p>
                        <p className="text-text-secondary text-sm mt-2">
                            الرجاء الانتظار، قد يستغرق الأمر بضع ثوان...
                        </p>
                    </div>
                )}

                {isComplete && (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-600 rounded-full mx-auto flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <p className="text-green-400 font-semibold">{initializationStatus}</p>
                        <p className="text-text-secondary text-sm mt-2">
                            سيتم إعادة توجيهك تلقائياً...
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-4 bg-red-900 border border-red-700 rounded-lg">
                        <p className="text-red-400 text-sm">{error}</p>
                        <button
                            onClick={() => {
                                setError('');
                                setInitializationStatus('');
                            }}
                            className="mt-2 text-red-300 hover:text-red-200 text-sm underline"
                        >
                            إعادة المحاولة
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DatabaseInitializer;