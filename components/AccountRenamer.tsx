import React, { useState } from 'react';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Account, Shop, User } from '../types';

interface AccountRenamerProps {
  currentUser: User;
}

interface RenameResult {
  success: boolean;
  totalProcessed: number;
  updated: number;
  skipped: number;
  orphaned: number;
  errors: string[];
}

export const AccountRenamer: React.FC<AccountRenamerProps> = ({ currentUser }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RenameResult | null>(null);
  const [dryRunResult, setDryRunResult] = useState<RenameResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Check if current user is admin
  if (currentUser.role !== 'admin') {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-medium text-red-800 mb-2">Access Denied</h2>
        <p className="text-red-600">Only administrators can access the account renaming tool.</p>
      </div>
    );
  }

  const renameAccountsWithShopSuffix = async (dryRun: boolean = false): Promise<RenameResult> => {
    const result: RenameResult = {
      success: false,
      totalProcessed: 0,
      updated: 0,
      skipped: 0,
      orphaned: 0,
      errors: []
    };

    try {
      addLog(dryRun ? 'Starting dry run analysis...' : 'Starting account renaming...');

      // Step 1: Get all shops
      addLog('Fetching all shops...');
      const shopsSnapshot = await getDocs(collection(db, 'shops'));
      const shops: { [shopId: string]: Shop } = {};

      shopsSnapshot.forEach(doc => {
        shops[doc.id] = { id: doc.id, ...doc.data() } as Shop;
      });

      addLog(`Found ${Object.keys(shops).length} shops`);

      // Step 2: Get all accounts
      addLog('Fetching all accounts...');
      const accountsSnapshot = await getDocs(collection(db, 'accounts'));
      const accounts: Account[] = [];

      accountsSnapshot.forEach(doc => {
        accounts.push({ id: doc.id, ...doc.data() } as Account);
      });

      addLog(`Found ${accounts.length} accounts`);
      result.totalProcessed = accounts.length;

      // Step 3: Process accounts
      if (!dryRun) {
        const batch = writeBatch(db);
        let batchCount = 0;
        const MAX_BATCH_SIZE = 500;

        for (const account of accounts) {
          const shop = shops[account.shopId];

          if (!shop) {
            addLog(`⚠️ Orphaned account: "${account.name}" - Shop not found`);
            result.orphaned++;
            continue;
          }

          const shopSuffix = `-${shop.name}`;

          if (account.name.endsWith(shopSuffix)) {
            addLog(`⏭️ Skipping: "${account.name}" (already has suffix)`);
            result.skipped++;
            continue;
          }

          const newName = `${account.name}${shopSuffix}`;

          addLog(`🔄 Renaming: "${account.name}" → "${newName}"`);

          const accountRef = doc(db, 'accounts', account.id);
          batch.update(accountRef, {
            name: newName
          });

          batchCount++;
          result.updated++;

          if (batchCount >= MAX_BATCH_SIZE) {
            addLog(`💾 Committing batch of ${batchCount} updates...`);
            await batch.commit();

            const newBatch = writeBatch(db);
            Object.assign(batch, newBatch);
            batchCount = 0;
          }
        }

        if (batchCount > 0) {
          addLog(`💾 Committing final batch of ${batchCount} updates...`);
          await batch.commit();
        }
      } else {
        // Dry run - just analyze
        addLog('Analyzing what would be changed...');

        for (const account of accounts) {
          const shop = shops[account.shopId];

          if (!shop) {
            addLog(`⚠️ Orphaned: "${account.name}" - Shop not found`);
            result.orphaned++;
            continue;
          }

          const shopSuffix = `-${shop.name}`;

          if (account.name.endsWith(shopSuffix)) {
            result.skipped++;
            continue;
          }

          const newName = `${account.name}${shopSuffix}`;
          addLog(`📝 Would rename: "${account.name}" → "${newName}" (Shop: ${shop.name}, Code: ${account.accountCode} unchanged)`);
          result.updated++;
        }
      }

      result.success = true;
      addLog(dryRun ? 'Dry run analysis completed' : 'Account renaming completed successfully');
      return result;

    } catch (error: any) {
      const errorMsg = `Error: ${error.message}`;
      addLog(errorMsg);
      result.errors.push(errorMsg);
      throw error;
    }
  };

  const handleDryRun = async () => {
    setIsLoading(true);
    setLogs([]);
    setDryRunResult(null);

    try {
      const result = await renameAccountsWithShopSuffix(true);
      setDryRunResult(result);
    } catch (error) {
      console.error('Dry run failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!window.confirm('Are you sure you want to rename all accounts with shop name suffixes? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setLogs([]);
    setResult(null);

    try {
      const result = await renameAccountsWithShopSuffix(false);
      setResult(result);
    } catch (error) {
      console.error('Account renaming failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Renaming Tool</h1>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-medium text-blue-800 mb-2">What this tool does:</h2>
          <ul className="text-blue-700 space-y-1">
            <li>• Adds shop name suffix to all account names</li>
            <li>• Example: "المصروفات" → "المصروفات-قرش-الحصايا"</li>
            <li>• Updates only account names (codes remain unchanged)</li>
            <li>• Skips accounts that already have shop suffixes</li>
          </ul>
        </div>

        <div className="flex space-x-4 mb-6">
          <button
            onClick={handleDryRun}
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Running...' : 'Run Analysis (Dry Run)'}
          </button>

          <button
            onClick={handleExecute}
            disabled={isLoading || !dryRunResult?.success || dryRunResult?.updated === 0}
            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'Executing...' : 'Execute Renaming'}
          </button>
        </div>

        {dryRunResult && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Analysis Results:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Total accounts: {dryRunResult.totalProcessed}</div>
              <div>Would update: {dryRunResult.updated}</div>
              <div>Would skip: {dryRunResult.skipped}</div>
              <div>Orphaned: {dryRunResult.orphaned}</div>
            </div>
            {dryRunResult.updated > 0 && (
              <p className="text-green-600 mt-2">✅ Ready to execute renaming</p>
            )}
            {dryRunResult.updated === 0 && (
              <p className="text-blue-600 mt-2">💡 No accounts need renaming</p>
            )}
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-medium text-green-800 mb-2">Execution Results:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Total processed: {result.totalProcessed}</div>
              <div>Updated: {result.updated}</div>
              <div>Skipped: {result.skipped}</div>
              <div>Orphaned: {result.orphaned}</div>
            </div>
            {result.success && (
              <p className="text-green-600 mt-2">🎉 Account renaming completed successfully!</p>
            )}
          </div>
        )}

        {logs.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Execution Log:</h3>
            <div className="max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="text-sm text-gray-700 font-mono">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};