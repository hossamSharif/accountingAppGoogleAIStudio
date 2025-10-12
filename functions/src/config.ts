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

// Currency symbol configuration
// Note: Server-side templates use Arabic by default. For client-side currency display,
// the currency symbol is determined by the user's language preference.
export const CURRENCY_SYMBOL_AR = 'ج.س';
export const CURRENCY_SYMBOL_EN = 'SD';

// Message templates for push notifications (English only)
export const pushNotificationTemplates = {
    transaction: {
        created: {
            title: 'New Transaction',
            body: `{userName} added a new {transactionType} transaction for {amount} ${CURRENCY_SYMBOL_EN} at {shopName}`
        },
        updated: {
            title: 'Transaction Updated',
            body: `{userName} updated a {transactionType} transaction to {amount} ${CURRENCY_SYMBOL_EN} at {shopName}`
        },
        deleted: {
            title: 'Transaction Deleted',
            body: `{userName} deleted a {transactionType} transaction at {shopName}`
        }
    },
    shop: {
        created: {
            title: 'New Shop Created',
            body: 'A new shop "{shopName}" has been created'
        },
        updated: {
            title: 'Shop Updated',
            body: 'Shop "{shopName}" has been updated'
        },
        deleted: {
            title: 'Shop Deleted',
            body: 'Shop "{shopName}" has been deleted'
        },
        activated: {
            title: 'Shop Activated',
            body: 'Shop "{shopName}" has been activated'
        },
        deactivated: {
            title: 'Shop Deactivated',
            body: 'Shop "{shopName}" has been deactivated'
        }
    },
    user: {
        created: {
            title: 'New User Created',
            body: 'A new user "{userName}" has been created'
        },
        updated: {
            title: 'User Updated',
            body: 'User "{userName}" information has been updated'
        },
        deactivated: {
            title: 'User Deactivated',
            body: 'User "{userName}" has been deactivated'
        }
    },
    system: {
        error: {
            title: 'System Error',
            body: 'Error: {error}'
        },
        warning: {
            title: 'System Warning',
            body: 'Warning: {warning}'
        },
        info: {
            title: 'System Notification',
            body: 'Info: {info}'
        }
    }
};

// Message templates for database storage (kept for backwards compatibility - Arabic)
export const messageTemplates = {
    transaction: {
        created: `المستخدم "{userName}" أضاف معاملة جديدة ({transactionType}) بقيمة {amount} ${CURRENCY_SYMBOL_AR}`,
        updated: `المستخدم "{userName}" عدل معاملة ({transactionType}) بقيمة {amount} ${CURRENCY_SYMBOL_AR}`,
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

// Email configuration
export const emailConfig = {
    from: {
        email: 'hossamsharif1990@gmail.com',
        name: 'Vavidia Accounting System'
    },
    templates: {
        transaction: {
            created: {
                subject: 'New Transaction - {shopName}',
                body: `
                    <h2>New Transaction Alert</h2>
                    <p><strong>{userName}</strong> has added a new transaction:</p>
                    <ul>
                        <li><strong>Type:</strong> {transactionType}</li>
                        <li><strong>Amount:</strong> {amount} ${CURRENCY_SYMBOL_EN}</li>
                        <li><strong>Shop:</strong> {shopName}</li>
                        <li><strong>Description:</strong> {description}</li>
                        <li><strong>Date:</strong> {date}</li>
                    </ul>
                    <p><a href="{appUrl}/notifications">View in App</a></p>
                `
            },
            updated: {
                subject: 'Transaction Updated - {shopName}',
                body: `
                    <h2>Transaction Update Alert</h2>
                    <p><strong>{userName}</strong> has updated a transaction:</p>
                    <ul>
                        <li><strong>Type:</strong> {transactionType}</li>
                        <li><strong>New Amount:</strong> {amount} ${CURRENCY_SYMBOL_EN}</li>
                        <li><strong>Shop:</strong> {shopName}</li>
                        <li><strong>Date:</strong> {date}</li>
                    </ul>
                    <p><a href="{appUrl}/notifications">View in App</a></p>
                `
            },
            deleted: {
                subject: 'Transaction Deleted - {shopName}',
                body: `
                    <h2>Transaction Deletion Alert</h2>
                    <p><strong>{userName}</strong> has deleted a transaction:</p>
                    <ul>
                        <li><strong>Type:</strong> {transactionType}</li>
                        <li><strong>Amount:</strong> {amount} ${CURRENCY_SYMBOL_EN}</li>
                        <li><strong>Shop:</strong> {shopName}</li>
                        <li><strong>Description:</strong> {description}</li>
                    </ul>
                    <p><a href="{appUrl}/notifications">View in App</a></p>
                `
            }
        }
    }
};