export const config = {
    region: 'us-central1', // Change to your preferred region
    timezone: 'Africa/Khartoum', // Change to your timezone
    cleanup: {
        daysToKeep: 30,
        batchSize: 500
    },
    notifications: {
        maxBatchSize: 500,
        retryAttempts: 3
    }
};

export const messageTemplates = {
    transaction: {
        created: 'المستخدم "{userName}" أضاف معاملة جديدة ({transactionType}) بقيمة {amount} ج.س',
        updated: 'المستخدم "{userName}" عدل معاملة ({transactionType}) بقيمة {amount} ج.س',
        deleted: 'المستخدم "{userName}" حذف معاملة ({transactionType})'
    },
    shop: {
        created: 'تم إنشاء متجر جديد "{shopName}"',
        updated: 'تم تحديث متجر "{shopName}"',
        deleted: 'تم حذف متجر "{shopName}"',
        activated: 'تم تفعيل متجر "{shopName}"',
        deactivated: 'تم إلغاء تفعيل متجر "{shopName}"'
    },
    user: {
        created: 'تم إنشاء مستخدم جديد "{userName}"',
        updated: 'تم تحديث بيانات المستخدم "{userName}"',
        deactivated: 'تم إلغاء تفعيل المستخدم "{userName}"'
    },
    system: {
        error: 'خطأ في النظام: {error}',
        warning: 'تحذير: {warning}',
        info: 'معلومة: {info}'
    }
};