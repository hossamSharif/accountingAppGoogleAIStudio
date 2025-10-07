// Authentication error handler with Arabic messages
export const getAuthErrorMessage = (errorCode: string): string => {
    const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'البريد الإلكتروني غير مسجل في النظام',
        'auth/wrong-password': 'كلمة المرور غير صحيحة',
        'auth/invalid-email': 'البريد الإلكتروني غير صالح',
        'auth/user-disabled': 'تم تعطيل هذا الحساب',
        'auth/too-many-requests': 'تم تجاوز عدد المحاولات المسموح. حاول مرة أخرى لاحقاً',
        'auth/network-request-failed': 'خطأ في الاتصال. تحقق من الإنترنت',
        'auth/invalid-credential': 'البيانات المدخلة غير صحيحة',
        'auth/weak-password': 'كلمة المرور ضعيفة جداً',
        'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
        'auth/operation-not-allowed': 'العملية غير مسموحة',
        'auth/requires-recent-login': 'يتطلب تسجيل دخول حديث لهذه العملية',
        'auth/invalid-verification-code': 'رمز التحقق غير صحيح',
        'auth/invalid-verification-id': 'معرف التحقق غير صحيح',
        'auth/missing-verification-code': 'رمز التحقق مطلوب',
        'auth/missing-verification-id': 'معرف التحقق مطلوب'
    };

    return errorMessages[errorCode] || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى';
};

export const getAuthSuccessMessage = (operation: string): string => {
    const successMessages: Record<string, string> = {
        'login': 'تم تسجيل الدخول بنجاح',
        'logout': 'تم تسجيل الخروج بنجاح',
        'password-reset': 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني',
        'email-verification': 'تم إرسال رابط تفعيل البريد الإلكتروني',
        'profile-update': 'تم تحديث الملف الشخصي بنجاح',
        'user-created': 'تم إنشاء المستخدم بنجاح',
        'user-updated': 'تم تحديث المستخدم بنجاح',
        'user-deleted': 'تم حذف المستخدم بنجاح',
        'shop-created': 'تم إنشاء المتجر بنجاح',
        'account-created': 'تم إنشاء الحساب بنجاح'
    };

    return successMessages[operation] || 'تمت العملية بنجاح';
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate password strength
export const isValidPassword = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 6) {
        return { isValid: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
    }

    if (password.length < 8) {
        return { isValid: false, message: 'كلمة المرور ضعيفة. يُنصح بـ 8 أحرف أو أكثر' };
    }

    return { isValid: true, message: 'كلمة المرور قوية' };
};