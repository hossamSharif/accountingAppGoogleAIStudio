import { useState } from 'react';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

// Helper function to format date as YYYY-MM-DD
const formatDateOnly = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper function to check if date is in ISO format
const isISOFormat = (dateStr: string): boolean => {
    return dateStr.includes('T');
};

interface TransactionUpdate {
    id: string;
    oldDate: string;
    newDate: string;
}

interface MigrationStats {
    totalTransactions: number;
    needsMigration: number;
    alreadyMigrated: number;
    migrated: number;
    failed: number;
}

export default function DateMigrationTool() {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [stats, setStats] = useState<MigrationStats | null>(null);
    const [updates, setUpdates] = useState<TransactionUpdate[]>([]);
    const [progress, setProgress] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);

    const analyzeTransactions = async () => {
        setIsAnalyzing(true);
        setProgress('Analyzing transactions...');

        try {
            const transactionsRef = collection(db, 'transactions');
            const snapshot = await getDocs(transactionsRef);

            const analysisStats: MigrationStats = {
                totalTransactions: snapshot.size,
                needsMigration: 0,
                alreadyMigrated: 0,
                migrated: 0,
                failed: 0
            };

            const transactionUpdates: TransactionUpdate[] = [];

            snapshot.forEach((docSnapshot) => {
                const data = docSnapshot.data();
                const dateStr = data.date;

                if (!dateStr) {
                    return;
                }

                if (isISOFormat(dateStr)) {
                    // Needs migration
                    analysisStats.needsMigration++;

                    // Convert ISO to local date
                    const date = new Date(dateStr);
                    const newDate = formatDateOnly(date);

                    transactionUpdates.push({
                        id: docSnapshot.id,
                        oldDate: dateStr,
                        newDate: newDate
                    });
                } else {
                    // Already migrated
                    analysisStats.alreadyMigrated++;
                }
            });

            setStats(analysisStats);
            setUpdates(transactionUpdates);

            if (analysisStats.needsMigration === 0) {
                setProgress('✅ All transactions are already in the new format!');
            } else {
                setProgress(`Found ${analysisStats.needsMigration} transactions that need migration.`);
                setShowConfirmation(true);
            }
        } catch (error: any) {
            setProgress(`❌ Error analyzing transactions: ${error.message}`);
            console.error('Analysis error:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const performMigration = async () => {
        setIsMigrating(true);
        setShowConfirmation(false);
        setProgress('Starting migration...');

        const migrationStats: MigrationStats = {
            ...stats!,
            migrated: 0,
            failed: 0
        };

        try {
            // Process in batches of 500 (Firestore limit)
            const batchSize = 500;
            const batches: TransactionUpdate[][] = [];

            for (let i = 0; i < updates.length; i += batchSize) {
                batches.push(updates.slice(i, i + batchSize));
            }

            setProgress(`Processing ${updates.length} transactions in ${batches.length} batch(es)...`);

            for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                setProgress(`Migrating batch ${batchIndex + 1}/${batches.length} (${batch.length} transactions)...`);

                const firestoreBatch = writeBatch(db);

                batch.forEach(update => {
                    const docRef = doc(db, 'transactions', update.id);
                    firestoreBatch.update(docRef, { date: update.newDate });
                });

                try {
                    await firestoreBatch.commit();
                    migrationStats.migrated += batch.length;
                    setProgress(`✓ Batch ${batchIndex + 1}/${batches.length} completed`);
                } catch (error: any) {
                    migrationStats.failed += batch.length;
                    console.error(`Batch ${batchIndex + 1} failed:`, error);
                }
            }

            setStats(migrationStats);

            if (migrationStats.failed === 0) {
                setProgress(`✅ Migration completed successfully! Migrated ${migrationStats.migrated} transactions.`);
            } else {
                setProgress(`⚠️ Migration completed with ${migrationStats.failed} failures. ${migrationStats.migrated} transactions migrated successfully.`);
            }
        } catch (error: any) {
            setProgress(`❌ Migration failed: ${error.message}`);
            console.error('Migration error:', error);
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div style={{
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
        }}>
            <h3 style={{ marginTop: 0 }}>Date Migration Tool</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>
                This tool converts transaction dates from ISO format (with timezone) to date-only format (YYYY-MM-DD).
                This fixes the timezone issue where transactions appear on the wrong date.
            </p>

            {!stats && (
                <button
                    onClick={analyzeTransactions}
                    disabled={isAnalyzing}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: isAnalyzing ? '#ccc' : '#2196F3',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        marginBottom: '15px'
                    }}
                >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Transactions'}
                </button>
            )}

            {stats && !showConfirmation && stats.needsMigration > 0 && !isMigrating && (
                <button
                    onClick={() => setShowConfirmation(true)}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: '#FF9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        marginBottom: '15px',
                        marginRight: '10px'
                    }}
                >
                    Start Migration
                </button>
            )}

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

            {stats && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    marginBottom: '15px'
                }}>
                    <h4 style={{ marginTop: 0 }}>Statistics:</h4>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        <li>📊 Total transactions: <strong>{stats.totalTransactions}</strong></li>
                        <li>🔄 Need migration: <strong>{stats.needsMigration}</strong></li>
                        <li>✅ Already migrated: <strong>{stats.alreadyMigrated}</strong></li>
                        {stats.migrated > 0 && (
                            <li style={{ color: '#4CAF50' }}>✓ Successfully migrated: <strong>{stats.migrated}</strong></li>
                        )}
                        {stats.failed > 0 && (
                            <li style={{ color: '#f44336' }}>✗ Failed: <strong>{stats.failed}</strong></li>
                        )}
                    </ul>
                </div>
            )}

            {updates.length > 0 && updates.length <= 5 && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#fff',
                    borderRadius: '4px',
                    marginBottom: '15px'
                }}>
                    <h4 style={{ marginTop: 0 }}>Sample Conversions:</h4>
                    <ul style={{ fontSize: '14px' }}>
                        {updates.slice(0, 5).map((update, index) => (
                            <li key={index}>
                                <strong>{update.oldDate.split('T')[0]}</strong> → <strong style={{ color: '#4CAF50' }}>{update.newDate}</strong>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {showConfirmation && (
                <div style={{
                    padding: '20px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '4px',
                    marginBottom: '15px',
                    border: '2px solid #FF9800'
                }}>
                    <h4 style={{ marginTop: 0, color: '#856404' }}>⚠️ Confirmation Required</h4>
                    <p style={{ margin: '10px 0' }}>
                        You are about to migrate <strong>{stats?.needsMigration}</strong> transactions.
                        This will convert their dates from ISO format to YYYY-MM-DD format.
                    </p>
                    <p style={{ margin: '10px 0', fontWeight: 'bold' }}>
                        Make sure you have created a backup before proceeding!
                    </p>
                    <div style={{ marginTop: '15px' }}>
                        <button
                            onClick={performMigration}
                            disabled={isMigrating}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: isMigrating ? '#ccc' : '#4CAF50',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: isMigrating ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                marginRight: '10px'
                            }}
                        >
                            {isMigrating ? 'Migrating...' : 'Yes, Migrate Now'}
                        </button>
                        <button
                            onClick={() => setShowConfirmation(false)}
                            disabled={isMigrating}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#ccc',
                                color: '#333',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
