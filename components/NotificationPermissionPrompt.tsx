import React, { useState } from 'react';

interface NotificationPermissionPromptProps {
  onRequestPermission: () => Promise<string | null>;
  onDismiss: () => void;
  isLoading: boolean;
}

const NotificationPermissionPrompt: React.FC<NotificationPermissionPromptProps> = ({
  onRequestPermission,
  onDismiss,
  isLoading
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const handleEnable = async () => {
    await onRequestPermission();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss();
  };

  if (isDismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 animate-slide-up">
      <div className="bg-surface border border-primary/30 rounded-lg shadow-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-bold text-text-primary mb-2">
              تفعيل الإشعارات الفورية
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              احصل على إشعارات فورية عند إضافة معاملات جديدة أو حدوث أحداث مهمة، حتى عندما يكون التطبيق مغلقاً.
            </p>

            <div className="bg-background/50 rounded p-3 mb-4">
              <div className="flex items-start gap-2 text-xs text-text-secondary">
                <svg
                  className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>تلقي إشعارات حتى عندما يكون التطبيق مغلقاً</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-text-secondary mt-2">
                <svg
                  className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>البقاء على اطلاع دائم بنشاط المستخدمين</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-text-secondary mt-2">
                <svg
                  className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>يمكنك إيقاف الإشعارات في أي وقت من إعدادات المتصفح</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    جاري التفعيل...
                  </span>
                ) : (
                  'تفعيل الإشعارات'
                )}
              </button>

              <button
                onClick={handleDismiss}
                disabled={isLoading}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                لاحقاً
              </button>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            disabled={isLoading}
            className="flex-shrink-0 text-text-secondary hover:text-text-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="إغلاق"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionPrompt;
