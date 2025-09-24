import React, { useState, useMemo } from 'react';
import { Log, LogType } from '../types';

const LogTypeIcon: React.FC<{ type: LogType }> = ({ type }) => {
    const baseClasses = "w-6 h-6 p-1 rounded-full text-white flex items-center justify-center";
    switch (type) {
        case LogType.LOGIN:
            return <div className={`${baseClasses} bg-green-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg></div>;
        case LogType.LOGOUT:
            return <div className={`${baseClasses} bg-red-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg></div>;
        case LogType.SYNC:
            return <div className={`${baseClasses} bg-blue-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M4 4l5 5M20 20l-5-5"></path></svg></div>;
        case LogType.SHARE_REPORT:
            return <div className={`${baseClasses} bg-purple-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367 2.684z"></path></svg></div>;
        case LogType.EXPORT_REPORT:
            return <div className={`${baseClasses} bg-yellow-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg></div>;
        case LogType.ADD_ENTRY:
            return <div className={`${baseClasses} bg-green-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg></div>;
        case LogType.EDIT_ENTRY:
            return <div className={`${baseClasses} bg-accent`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg></div>;
        case LogType.DELETE_ENTRY:
            return <div className={`${baseClasses} bg-orange-500`}><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></div>;
        default:
            return null;
    }
};

const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `منذ ${seconds} ثوان`;
    if (minutes < 60) return `منذ ${minutes} دقائق`;
    if (hours < 24) return `منذ ${hours} ساعات`;
    if (days <= 7) return `منذ ${days} أيام`;
    return date.toLocaleDateString('ar-EG');
};


interface LogsPageProps {
    logs: Log[];
}

const LogsPage: React.FC<LogsPageProps> = ({ logs }) => {
    const [filter, setFilter] = useState<LogType | 'ALL'>('ALL');

    const filteredLogs = useMemo(() => {
        if (filter === 'ALL') {
            return logs;
        }
        return logs.filter(log => log.type === filter);
    }, [logs, filter]);

    // FIX: Cast Object.values to string array to resolve type inference issue.
    const logTypes = Object.values(LogType) as string[];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
                <h1 className="text-3xl font-bold">سجل النشاطات</h1>
                <div className="flex gap-2 flex-wrap items-center">
                    <label htmlFor="logFilter" className="text-text-secondary">تصفية حسب:</label>
                    <select
                        id="logFilter"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as LogType | 'ALL')}
                        className="bg-surface border border-gray-600 rounded-lg py-2 px-4 text-text-primary focus:ring-primary focus:border-primary"
                    >
                        <option value="ALL">الكل</option>
                        {logTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-surface p-6 rounded-lg shadow-lg">
                 <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b border-gray-700 text-text-secondary">
                                <th className="p-3 w-12"></th>
                                <th className="p-3">النوع</th>
                                <th className="p-3">الرسالة</th>
                                <th className="p-3">الوقت</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log, index) => (
                                <tr key={log.id} className={`border-b border-gray-700 transition-colors duration-200 hover:bg-background/50 ${index % 2 === 0 ? 'bg-background/20' : ''}`}>
                                    <td className="p-3"><LogTypeIcon type={log.type} /></td>
                                    <td className="p-3 font-medium text-text-primary">{log.type}</td>
                                    <td className="p-3 text-text-secondary">{log.message}</td>
                                    <td className="p-3 text-text-secondary whitespace-nowrap">{formatRelativeTime(log.timestamp)}</td>
                                </tr>
                            ))}
                             {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center p-8 text-text-secondary">
                                        لا توجد سجلات تطابق هذه التصفية.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LogsPage;
