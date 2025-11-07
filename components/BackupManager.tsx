import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import DateMigrationTool from './DateMigrationTool';

interface BackupStats {
    collectionName: string;
    documentCount: number;
    success: boolean;
}

const COLLECTIONS = [
    'transactions',
    'accounts',
    'shops',
    'users',
    'financialYears',
    'logs',
    'notifications',
    'transactionTemplates'
];

export default function BackupManager() {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [progress, setProgress] = useState('');
    const [stats, setStats] = useState<BackupStats[]>([]);

    const downloadJSON = (data: any, filename: string) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const createBackup = async () => {
        setIsBackingUp(true);
        setProgress('Starting backup...');
        setStats([]);

        try {
            const allData: { [key: string]: any[] } = {};
            const backupStats: BackupStats[] = [];

            for (const collectionName of COLLECTIONS) {
                try {
                    setProgress(`Backing up ${collectionName}...`);

                    const collectionRef = collection(db, collectionName);
                    const snapshot = await getDocs(collectionRef);

                    const documents = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));

                    allData[collectionName] = documents;

                    backupStats.push({
                        collectionName,
                        documentCount: documents.length,
                        success: true
                    });

                    setStats([...backupStats]);
                } catch (error: any) {
                    console.error(`Error backing up ${collectionName}:`, error);
                    backupStats.push({
                        collectionName,
                        documentCount: 0,
                        success: false
                    });
                    setStats([...backupStats]);
                }
            }

            // Create backup metadata
            const metadata = {
                timestamp: new Date().toISOString(),
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                stats: backupStats,
                totalCollections: COLLECTIONS.length,
                successfulCollections: backupStats.filter(s => s.success).length,
                totalDocuments: backupStats.reduce((sum, s) => sum + s.documentCount, 0)
            };

            // Create complete backup object
            const completeBackup = {
                metadata,
                data: allData
            };

            // Download backup file
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `firebase-backup-${timestamp}.json`;

            setProgress('Generating backup file...');
            downloadJSON(completeBackup, filename);

            setProgress(`Backup completed! ${metadata.totalDocuments} documents backed up.`);
        } catch (error: any) {
            setProgress(`Backup failed: ${error.message}`);
            console.error('Backup error:', error);
        } finally {
            setIsBackingUp(false);
        }
    };

    return (
        <div>
            {/* Date Migration Tool */}
            <div style={{ marginBottom: '30px' }}>
                <DateMigrationTool />
            </div>

            {/* Backup Manager */}
            <div style={{
                padding: '20px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: '#f9f9f9'
            }}>
                <h3 style={{ marginTop: 0 }}>Firebase Backup Manager</h3>

            <button
                onClick={createBackup}
                disabled={isBackingUp}
                style={{
                    padding: '12px 24px',
                    backgroundColor: isBackingUp ? '#ccc' : '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: isBackingUp ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    marginBottom: '15px'
                }}
            >
                {isBackingUp ? 'Creating Backup...' : 'Create Backup'}
            </button>

            {progress && (
                <div style={{
                    padding: '10px',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '4px',
                    marginBottom: '15px'
                }}>
                    {progress}
                </div>
            )}

            {stats.length > 0 && (
                <div>
                    <h4>Backup Progress:</h4>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {stats.map((stat, index) => (
                            <li
                                key={index}
                                style={{
                                    padding: '8px',
                                    marginBottom: '5px',
                                    backgroundColor: stat.success ? '#d4edda' : '#f8d7da',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <span>
                                    {stat.success ? '✓' : '✗'} {stat.collectionName}
                                </span>
                                <span style={{ fontWeight: 'bold' }}>
                                    {stat.documentCount} documents
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div style={{
                marginTop: '20px',
                padding: '10px',
                backgroundColor: '#fff3cd',
                borderRadius: '4px',
                fontSize: '14px'
            }}>
                <strong>Note:</strong> The backup will be downloaded as a JSON file. Keep this file safe as it contains all your Firebase data.
            </div>
            </div>
        </div>
    );
}
