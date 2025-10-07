import {
    addDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    Timestamp,
    startAfter,
    QueryDocumentSnapshot,
    DocumentData
} from 'firebase/firestore';
import { BaseService } from './baseService';
import { User, LogType, Log } from '../types';
import { NotificationService } from './notificationService';

export interface LogFilters {
    shopId?: string;
    userId?: string;
    logType?: LogType;
    startDate?: string;
    endDate?: string;
    limit?: number;
    startAfter?: QueryDocumentSnapshot<DocumentData>;
}

export interface LogStats {
    totalLogs: number;
    logsByType: { [key in LogType]?: number };
    logsByUser: { [userId: string]: number };
    recentActivity: Log[];
}

export class LoggingService extends BaseService {
    // Log user action
    static async logAction(
        user: User,
        action: LogType,
        message: string,
        shopId?: string,
        metadata?: any
    ): Promise<void> {
        try {
            this.validateRequired({ user, action, message }, ['user', 'action', 'message']);

            const logData: Omit<Log, 'id'> = {
                userId: user.id,
                shopId: shopId || user.shopId,
                type: action,
                message: this.sanitizeString(message),
                timestamp: Timestamp.now().toDate().toISOString(),
                ...(metadata && { metadata: JSON.stringify(metadata) })
            };

            await addDoc(collection(this.db, 'logs'), logData);

            // Auto-create notifications if needed (for non-admin users)
            if (user.role !== 'admin') {
                await NotificationService.notifyAdminsOfUserAction(user, message, shopId);
            }

        } catch (error: any) {
            this.handleError(error, 'logAction');
        }
    }

    // Log system event
    static async logSystemEvent(
        action: LogType,
        message: string,
        shopId?: string,
        metadata?: any
    ): Promise<void> {
        try {
            this.validateRequired({ action, message }, ['action', 'message']);

            const logData: Omit<Log, 'id'> = {
                userId: 'system',
                shopId,
                type: action,
                message: this.sanitizeString(message),
                timestamp: Timestamp.now().toDate().toISOString(),
                ...(metadata && { metadata: JSON.stringify(metadata) })
            };

            await addDoc(collection(this.db, 'logs'), logData);

            // Notify admins of important system events
            if (this.isImportantSystemEvent(action)) {
                await NotificationService.notifyAdminsOfSystemEvent(message, action, shopId);
            }

        } catch (error: any) {
            this.handleError(error, 'logSystemEvent');
        }
    }

    // Get logs with filtering and pagination
    static async getLogs(filters: LogFilters): Promise<{
        logs: Log[];
        hasMore: boolean;
        lastDoc?: QueryDocumentSnapshot<DocumentData>;
    }> {
        try {
            const constraints: any[] = [];

            // Apply filters
            if (filters.shopId) {
                constraints.push(where('shopId', '==', filters.shopId));
            }

            if (filters.userId) {
                constraints.push(where('userId', '==', filters.userId));
            }

            if (filters.logType) {
                constraints.push(where('type', '==', filters.logType));
            }

            if (filters.startDate) {
                constraints.push(where('timestamp', '>=', filters.startDate));
            }

            if (filters.endDate) {
                constraints.push(where('timestamp', '<=', filters.endDate));
            }

            // Add ordering
            constraints.push(orderBy('timestamp', 'desc'));

            // Add pagination
            if (filters.startAfter) {
                constraints.push(startAfter(filters.startAfter));
            }

            // Add limit (default 50, max 100)
            const limitValue = Math.min(filters.limit || 50, 100);
            constraints.push(limit(limitValue + 1)); // Get one extra to check if there are more

            const q = query(collection(this.db, 'logs'), ...constraints);
            const snapshot = await getDocs(q);

            const docs = snapshot.docs;
            const hasMore = docs.length > limitValue;
            const logs = docs.slice(0, limitValue).map(doc => ({ id: doc.id, ...doc.data() } as Log));
            const lastDoc = hasMore ? docs[limitValue - 1] : undefined;

            return { logs, hasMore, lastDoc };

        } catch (error: any) {
            console.error('Error getting logs:', error);
            return { logs: [], hasMore: false };
        }
    }

    // Get recent activity for dashboard
    static async getRecentActivity(shopId?: string, limitCount: number = 10): Promise<Log[]> {
        try {
            const constraints: any[] = [
                orderBy('timestamp', 'desc'),
                limit(limitCount)
            ];

            if (shopId) {
                constraints.unshift(where('shopId', '==', shopId));
            }

            const q = query(collection(this.db, 'logs'), ...constraints);
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));

        } catch (error: any) {
            console.error('Error getting recent activity:', error);
            return [];
        }
    }

    // Get log statistics
    static async getLogStats(shopId?: string, days: number = 30): Promise<LogStats> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const constraints: any[] = [
                where('timestamp', '>=', startDate.toISOString())
            ];

            if (shopId) {
                constraints.push(where('shopId', '==', shopId));
            }

            const q = query(collection(this.db, 'logs'), ...constraints);
            const snapshot = await getDocs(q);

            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));

            const stats: LogStats = {
                totalLogs: logs.length,
                logsByType: {},
                logsByUser: {},
                recentActivity: logs
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .slice(0, 10)
            };

            // Count by type
            logs.forEach(log => {
                const type = log.type;
                stats.logsByType[type] = (stats.logsByType[type] || 0) + 1;
            });

            // Count by user
            logs.forEach(log => {
                const userId = log.userId;
                stats.logsByUser[userId] = (stats.logsByUser[userId] || 0) + 1;
            });

            return stats;

        } catch (error: any) {
            console.error('Error getting log stats:', error);
            return {
                totalLogs: 0,
                logsByType: {},
                logsByUser: {},
                recentActivity: []
            };
        }
    }

    // Search logs by message content
    static async searchLogs(
        searchTerm: string,
        shopId?: string,
        limitCount: number = 50
    ): Promise<Log[]> {
        try {
            // Since Firestore doesn't support full-text search, we'll get logs and filter client-side
            const constraints: any[] = [
                orderBy('timestamp', 'desc'),
                limit(Math.min(limitCount * 2, 200)) // Get more to allow for filtering
            ];

            if (shopId) {
                constraints.unshift(where('shopId', '==', shopId));
            }

            const q = query(collection(this.db, 'logs'), ...constraints);
            const snapshot = await getDocs(q);

            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));

            // Filter by search term
            const searchLower = searchTerm.toLowerCase().trim();
            return logs
                .filter(log => log.message.toLowerCase().includes(searchLower))
                .slice(0, limitCount);

        } catch (error: any) {
            console.error('Error searching logs:', error);
            return [];
        }
    }

    // Get logs by date range
    static async getLogsByDateRange(
        startDate: string,
        endDate: string,
        shopId?: string
    ): Promise<Log[]> {
        try {
            const constraints: any[] = [
                where('timestamp', '>=', startDate),
                where('timestamp', '<=', endDate),
                orderBy('timestamp', 'desc')
            ];

            if (shopId) {
                constraints.push(where('shopId', '==', shopId));
            }

            const q = query(collection(this.db, 'logs'), ...constraints);
            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));

        } catch (error: any) {
            console.error('Error getting logs by date range:', error);
            return [];
        }
    }

    // Get user activity summary
    static async getUserActivitySummary(
        userId: string,
        days: number = 7
    ): Promise<{
        totalActions: number;
        actionsByType: { [key in LogType]?: number };
        actionsByDay: { [date: string]: number };
        recentActions: Log[];
    }> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const q = query(
                collection(this.db, 'logs'),
                where('userId', '==', userId),
                where('timestamp', '>=', startDate.toISOString()),
                orderBy('timestamp', 'desc')
            );

            const snapshot = await getDocs(q);
            const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log));

            const summary = {
                totalActions: logs.length,
                actionsByType: {} as { [key in LogType]?: number },
                actionsByDay: {} as { [date: string]: number },
                recentActions: logs.slice(0, 10)
            };

            logs.forEach(log => {
                // Count by type
                const type = log.type;
                summary.actionsByType[type] = (summary.actionsByType[type] || 0) + 1;

                // Count by day
                const date = new Date(log.timestamp).toISOString().split('T')[0];
                summary.actionsByDay[date] = (summary.actionsByDay[date] || 0) + 1;
            });

            return summary;

        } catch (error: any) {
            console.error('Error getting user activity summary:', error);
            return {
                totalActions: 0,
                actionsByType: {},
                actionsByDay: {},
                recentActions: []
            };
        }
    }

    // Export logs to CSV format
    static exportLogsToCSV(logs: Log[]): string {
        const headers = ['Timestamp', 'User ID', 'Shop ID', 'Type', 'Message', 'Metadata'];
        const csvRows = [headers.join(',')];

        logs.forEach(log => {
            const row = [
                `"${log.timestamp}"`,
                `"${log.userId}"`,
                `"${log.shopId || ''}"`,
                `"${log.type}"`,
                `"${log.message.replace(/"/g, '""')}"`, // Escape quotes
                `"${log.metadata?.replace(/"/g, '""') || ''}"`
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    // Helper methods

    // Check if system event is important enough to notify admins
    private static isImportantSystemEvent(action: LogType): boolean {
        const importantEvents: LogType[] = [
            LogType.SYSTEM_ERROR,
            LogType.DATA_CORRUPTION,
            LogType.BACKUP_FAILED,
            LogType.SECURITY_VIOLATION
        ];

        return importantEvents.includes(action);
    }

    // Batch log multiple actions (for bulk operations)
    static async logBatchActions(
        user: User,
        actions: { type: LogType; message: string; metadata?: any }[],
        shopId?: string
    ): Promise<void> {
        try {
            if (actions.length === 0) return;

            const timestamp = Timestamp.now().toDate().toISOString();
            const batch = this.createBatch();

            actions.forEach(action => {
                const logRef = this.getDocumentRef('logs');
                const logData: Omit<Log, 'id'> = {
                    userId: user.id,
                    shopId: shopId || user.shopId,
                    type: action.type,
                    message: this.sanitizeString(action.message),
                    timestamp,
                    ...(action.metadata && { metadata: JSON.stringify(action.metadata) })
                };

                batch.set(logRef, logData);
            });

            await batch.commit();

            // Notify admins if user is not admin
            if (user.role !== 'admin' && actions.length > 0) {
                const summaryMessage = `Performed ${actions.length} bulk actions`;
                await NotificationService.notifyAdminsOfUserAction(user, summaryMessage, shopId);
            }

        } catch (error: any) {
            this.handleError(error, 'logBatchActions');
        }
    }

    // Clean up old logs (older than specified days)
    static async cleanupOldLogs(daysOld: number = 90): Promise<number> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            const cutoffTimestamp = cutoffDate.toISOString();

            const q = query(
                collection(this.db, 'logs'),
                where('timestamp', '<', cutoffTimestamp)
            );

            const snapshot = await getDocs(q);

            if (snapshot.empty) return 0;

            // Delete in batches to avoid hitting Firestore limits
            const batchSize = 500;
            let deletedCount = 0;

            for (let i = 0; i < snapshot.docs.length; i += batchSize) {
                const batch = this.createBatch();
                const batchDocs = snapshot.docs.slice(i, i + batchSize);

                batchDocs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                deletedCount += batchDocs.length;
            }

            // Log the cleanup action
            await this.logSystemEvent(
                LogType.SYSTEM_MAINTENANCE,
                `Cleaned up ${deletedCount} old log entries (older than ${daysOld} days)`
            );

            return deletedCount;

        } catch (error: any) {
            console.error('Error cleaning up old logs:', error);
            return 0;
        }
    }
}