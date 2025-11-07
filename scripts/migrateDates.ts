import { getDocs, collection, doc, updateDoc, writeBatch } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

// Import Firebase after env vars are loaded
import { db } from '../firebaseNode.js';

// Helper function to format date as YYYY-MM-DD
const formatDateOnly = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper function to check if date is in ISO format
const isISOFormat = (dateStr: string): boolean => {
    return dateStr.includes('T') && dateStr.includes('Z');
};

interface TransactionUpdate {
    id: string;
    oldDate: string;
    newDate: string;
    shopId?: string;
}

interface MigrationStats {
    totalTransactions: number;
    needsMigration: number;
    alreadyMigrated: number;
    migrated: number;
    failed: number;
    errors: { id: string; error: string }[];
}

async function confirmMigration(): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('\n⚠️  Are you sure you want to proceed with the migration? (yes/no): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'yes');
        });
    });
}

async function analyzeMigration(): Promise<{ updates: TransactionUpdate[]; stats: MigrationStats }> {
    console.log('📊 Analyzing transactions...\n');

    const stats: MigrationStats = {
        totalTransactions: 0,
        needsMigration: 0,
        alreadyMigrated: 0,
        migrated: 0,
        failed: 0,
        errors: []
    };

    const updates: TransactionUpdate[] = [];

    try {
        const transactionsRef = collection(db, 'transactions');
        const snapshot = await getDocs(transactionsRef);

        stats.totalTransactions = snapshot.size;

        snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const dateStr = data.date;

            if (!dateStr) {
                console.log(`⚠️  Transaction ${docSnapshot.id} has no date field`);
                return;
            }

            if (isISOFormat(dateStr)) {
                // Needs migration
                stats.needsMigration++;

                // Convert ISO to local date
                const date = new Date(dateStr);
                const newDate = formatDateOnly(date);

                updates.push({
                    id: docSnapshot.id,
                    oldDate: dateStr,
                    newDate: newDate,
                    shopId: data.shopId
                });
            } else {
                // Already migrated
                stats.alreadyMigrated++;
            }
        });

        return { updates, stats };
    } catch (error: any) {
        console.error('❌ Error analyzing transactions:', error);
        throw error;
    }
}

async function performMigration(updates: TransactionUpdate[], dryRun: boolean = false): Promise<MigrationStats> {
    const stats: MigrationStats = {
        totalTransactions: updates.length,
        needsMigration: updates.length,
        alreadyMigrated: 0,
        migrated: 0,
        failed: 0,
        errors: []
    };

    if (dryRun) {
        console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
    } else {
        console.log('\n🔄 Starting migration...\n');
    }

    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    const batches = [];

    for (let i = 0; i < updates.length; i += batchSize) {
        batches.push(updates.slice(i, i + batchSize));
    }

    console.log(`Processing ${updates.length} transactions in ${batches.length} batch(es)...\n`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`\nBatch ${batchIndex + 1}/${batches.length} (${batch.length} transactions)`);

        if (dryRun) {
            // In dry run, just show what would be changed
            batch.slice(0, 5).forEach(update => {
                console.log(`  Would update ${update.id}:`);
                console.log(`    Old: ${update.oldDate}`);
                console.log(`    New: ${update.newDate}`);
            });
            if (batch.length > 5) {
                console.log(`  ... and ${batch.length - 5} more transactions`);
            }
            stats.migrated += batch.length;
        } else {
            // Actual migration
            const firestoreBatch = writeBatch(db);

            batch.forEach(update => {
                const docRef = doc(db, 'transactions', update.id);
                firestoreBatch.update(docRef, { date: update.newDate });
            });

            try {
                await firestoreBatch.commit();
                console.log(`  ✓ Successfully migrated ${batch.length} transactions`);
                stats.migrated += batch.length;
            } catch (error: any) {
                console.error(`  ✗ Failed to migrate batch: ${error.message}`);
                stats.failed += batch.length;
                batch.forEach(update => {
                    stats.errors.push({
                        id: update.id,
                        error: error.message
                    });
                });
            }
        }
    }

    return stats;
}

function printSummary(stats: MigrationStats, dryRun: boolean = false) {
    console.log('\n' + '='.repeat(60));
    console.log(dryRun ? '📊 DRY RUN SUMMARY' : '📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total transactions: ${stats.totalTransactions}`);
    console.log(`Need migration: ${stats.needsMigration}`);
    console.log(`Already migrated: ${stats.alreadyMigrated}`);

    if (!dryRun) {
        console.log(`Successfully migrated: ${stats.migrated}`);
        console.log(`Failed: ${stats.failed}`);

        if (stats.errors.length > 0) {
            console.log('\n❌ Errors:');
            stats.errors.slice(0, 10).forEach(err => {
                console.log(`  - Transaction ${err.id}: ${err.error}`);
            });
            if (stats.errors.length > 10) {
                console.log(`  ... and ${stats.errors.length - 10} more errors`);
            }
        }
    }

    console.log('='.repeat(60));
}

async function runMigration(dryRun: boolean = false) {
    try {
        console.log('🔥 Firebase Date Migration Script\n');
        console.log('This script will convert transaction dates from ISO format');
        console.log('(e.g., "2024-09-28T22:00:00.000Z") to date-only format');
        console.log('(e.g., "2024-09-29")\n');

        if (dryRun) {
            console.log('🔍 Running in DRY RUN mode (no changes will be made)\n');
        }

        // Analyze what needs to be migrated
        const { updates, stats } = await analyzeMigration();

        console.log('\n' + '='.repeat(60));
        console.log('📊 ANALYSIS RESULTS');
        console.log('='.repeat(60));
        console.log(`Total transactions: ${stats.totalTransactions}`);
        console.log(`Need migration: ${stats.needsMigration}`);
        console.log(`Already in new format: ${stats.alreadyMigrated}`);
        console.log('='.repeat(60));

        if (stats.needsMigration === 0) {
            console.log('\n✅ All transactions are already in the new format!');
            console.log('No migration needed.');
            return;
        }

        // Show sample conversions
        console.log('\n📝 Sample conversions (first 5):');
        updates.slice(0, 5).forEach((update, index) => {
            console.log(`${index + 1}. ${update.oldDate} → ${update.newDate}`);
        });

        if (!dryRun) {
            // Ask for confirmation
            const confirmed = await confirmMigration();
            if (!confirmed) {
                console.log('\n❌ Migration cancelled by user.');
                return;
            }
        }

        // Perform migration
        const migrationStats = await performMigration(updates, dryRun);

        // Print summary
        printSummary(migrationStats, dryRun);

        if (!dryRun && migrationStats.failed === 0) {
            console.log('\n✅ Migration completed successfully!');
        } else if (!dryRun) {
            console.log('\n⚠️  Migration completed with errors.');
            console.log('Please check the error log above.');
        }

    } catch (error: any) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');

// Run migration
runMigration(dryRun)
    .then(() => {
        console.log('\n🎉 Done!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
