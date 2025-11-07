import { getDocs, collection } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

// Import Firebase after env vars are loaded
import { db } from '../firebaseNode.js';

// Collections to backup
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

interface BackupStats {
    collectionName: string;
    documentCount: number;
    success: boolean;
    error?: string;
}

async function backupCollection(collectionName: string): Promise<BackupStats> {
    try {
        console.log(`📥 Backing up collection: ${collectionName}...`);

        const collectionRef = collection(db, collectionName);
        const snapshot = await getDocs(collectionRef);

        const documents = snapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data()
        }));

        console.log(`   ✓ Retrieved ${documents.length} documents from ${collectionName}`);

        return {
            collectionName,
            documentCount: documents.length,
            success: true
        };
    } catch (error: any) {
        console.error(`   ✗ Error backing up ${collectionName}:`, error.message);
        return {
            collectionName,
            documentCount: 0,
            success: false,
            error: error.message
        };
    }
}

async function createBackup() {
    console.log('🔥 Starting Firebase Backup Process...\n');

    // Create timestamp for backup folder
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' +
                     new Date().toTimeString().split(' ')[0].replace(/:/g, '');
    const backupDir = path.join(process.cwd(), 'backups', `backup-${timestamp}`);

    // Create backup directory
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(`📁 Backup directory: ${backupDir}\n`);

    const stats: BackupStats[] = [];
    const allData: { [key: string]: any[] } = {};

    // Backup each collection
    for (const collectionName of COLLECTIONS) {
        try {
            const collectionRef = collection(db, collectionName);
            const snapshot = await getDocs(collectionRef);

            const documents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            allData[collectionName] = documents;

            // Save individual collection to file
            const filePath = path.join(backupDir, `${collectionName}.json`);
            fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));

            console.log(`✓ ${collectionName}: ${documents.length} documents backed up`);

            stats.push({
                collectionName,
                documentCount: documents.length,
                success: true
            });
        } catch (error: any) {
            console.error(`✗ ${collectionName}: Backup failed - ${error.message}`);
            stats.push({
                collectionName,
                documentCount: 0,
                success: false,
                error: error.message
            });
        }
    }

    // Save complete backup in single file
    const completeBackupPath = path.join(backupDir, 'complete-backup.json');
    fs.writeFileSync(completeBackupPath, JSON.stringify(allData, null, 2));

    // Save backup metadata
    const metadata = {
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        stats,
        totalCollections: COLLECTIONS.length,
        successfulCollections: stats.filter(s => s.success).length,
        totalDocuments: stats.reduce((sum, s) => sum + s.documentCount, 0)
    };

    const metadataPath = path.join(backupDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKUP SUMMARY');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${metadata.timestamp}`);
    console.log(`Timezone: ${metadata.timezone}`);
    console.log(`Location: ${backupDir}`);
    console.log('\nCollections backed up:');

    stats.forEach(stat => {
        const status = stat.success ? '✓' : '✗';
        console.log(`  ${status} ${stat.collectionName}: ${stat.documentCount} documents`);
    });

    console.log(`\nTotal: ${metadata.totalDocuments} documents across ${metadata.successfulCollections}/${metadata.totalCollections} collections`);
    console.log('='.repeat(60));

    // Check for failures
    const failures = stats.filter(s => !s.success);
    if (failures.length > 0) {
        console.log('\n⚠️  WARNING: Some collections failed to backup:');
        failures.forEach(f => {
            console.log(`   ✗ ${f.collectionName}: ${f.error}`);
        });
        process.exit(1);
    }

    console.log('\n✅ Backup completed successfully!');
    console.log(`\n💾 Files created:`);
    console.log(`   - ${completeBackupPath}`);
    console.log(`   - ${metadataPath}`);
    COLLECTIONS.forEach(col => {
        console.log(`   - ${path.join(backupDir, col + '.json')}`);
    });

    return backupDir;
}

// Run backup
createBackup()
    .then(() => {
        console.log('\n🎉 All done!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Backup failed:', error);
        process.exit(1);
    });
