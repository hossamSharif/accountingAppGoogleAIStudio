export const MessageKeys = {
  // Authentication
  LOGIN_SUCCESS: 'auth.messages.loginSuccess',
  LOGIN_FAILED: 'auth.messages.loginFailed',
  LOGOUT_SUCCESS: 'auth.messages.logoutSuccess',

  // Accounts
  ACCOUNT_CREATED: 'accounts.messages.created',
  ACCOUNT_UPDATED: 'accounts.messages.updated',
  ACCOUNT_DELETED: 'accounts.messages.deleted',
  ACCOUNT_DELETE_ERROR: 'accounts.messages.deleteError',

  // Transactions
  TRANSACTION_CREATED: 'transactions.messages.created',
  TRANSACTION_UPDATED: 'transactions.messages.updated',
  TRANSACTION_DELETED: 'transactions.messages.deleted',

  // Shops
  SHOP_CREATED: 'shops.messages.created',
  SHOP_UPDATED: 'shops.messages.updated',
  SHOP_DELETED: 'shops.messages.deleted',
  SHOP_ACTIVATED: 'shops.messages.activated',
  SHOP_DEACTIVATED: 'shops.messages.deactivated',

  // Users
  USER_CREATED: 'users.messages.created',
  USER_UPDATED: 'users.messages.updated',
  USER_ACTIVATED: 'users.messages.activated',
  USER_DEACTIVATED: 'users.messages.deactivated',

  // Financial Years
  FINANCIAL_YEAR_CREATED: 'financialYears.messages.created',
  FINANCIAL_YEAR_CLOSED: 'financialYears.messages.closed',

  // Notifications
  NOTIFICATION_MARKED_READ: 'notifications.messages.markedRead',

  // Reports
  REPORT_GENERATED: 'reports.messages.generated',
  REPORT_EXPORTED: 'reports.messages.exported',

  // General
  SAVE_SUCCESS: 'messages.saveSuccess',
  SAVE_FAILED: 'messages.saveFailed',
  DELETE_SUCCESS: 'messages.deleteSuccess',
  DELETE_FAILED: 'messages.deleteFailed',
  UPDATE_SUCCESS: 'messages.updateSuccess',
  UPDATE_FAILED: 'messages.updateFailed',
} as const;
