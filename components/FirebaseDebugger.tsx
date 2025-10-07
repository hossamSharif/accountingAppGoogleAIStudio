import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const FirebaseDebugger: React.FC = () => {
    const [debugInfo, setDebugInfo] = useState<any>({});
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const runDiagnostics = async () => {
            const info: any = {
                timestamp: new Date().toISOString(),
                auth: {
                    currentUser: null,
                    isConnected: false
                },
                firestore: {
                    isConnected: false,
                    collections: {},
                    errors: []
                },
                environment: {
                    variables: {}
                }
            };

            try {
                // Check environment variables
                info.environment.variables = {
                    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing',
                    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || '❌ Missing'
                };

                // Check Auth connection
                info.auth.isConnected = !!auth;
                info.auth.currentUser = auth.currentUser?.email || 'Not signed in';

                // Check Firestore connection and collections
                try {
                    const usersRef = collection(db, 'users');
                    const usersSnapshot = await getDocs(usersRef);
                    info.firestore.collections.users = `${usersSnapshot.docs.length} documents`;
                    info.firestore.isConnected = true;
                } catch (err: any) {
                    info.firestore.errors.push(`Users collection: ${err.message}`);
                }

                try {
                    const shopsRef = collection(db, 'shops');
                    const shopsSnapshot = await getDocs(shopsRef);
                    info.firestore.collections.shops = `${shopsSnapshot.docs.length} documents`;
                } catch (err: any) {
                    info.firestore.errors.push(`Shops collection: ${err.message}`);
                }

                try {
                    const accountsRef = collection(db, 'accounts');
                    const accountsSnapshot = await getDocs(accountsRef);
                    info.firestore.collections.accounts = `${accountsSnapshot.docs.length} documents`;
                } catch (err: any) {
                    info.firestore.errors.push(`Accounts collection: ${err.message}`);
                }

            } catch (err: any) {
                setError(`Diagnostics error: ${err.message}`);
            }

            setDebugInfo(info);
        };

        runDiagnostics();

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            runDiagnostics();
        });

        return () => unsubscribe();
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            background: '#1a1a1a',
            color: 'white',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '12px',
            maxWidth: '400px',
            zIndex: 9999,
            fontFamily: 'monospace',
            border: '1px solid #333'
        }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#0ea5e9' }}>🔍 Firebase Debug Info</h3>

            {error && (
                <div style={{ background: '#dc2626', padding: '8px', borderRadius: '4px', marginBottom: '10px' }}>
                    Error: {error}
                </div>
            )}

            <div style={{ marginBottom: '10px' }}>
                <strong>🔑 Environment:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    {Object.entries(debugInfo.environment?.variables || {}).map(([key, value]) => (
                        <li key={key}>{key}: {value}</li>
                    ))}
                </ul>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <strong>🔐 Auth Status:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li>Connected: {debugInfo.auth?.isConnected ? '✅' : '❌'}</li>
                    <li>User: {debugInfo.auth?.currentUser || 'None'}</li>
                </ul>
            </div>

            <div style={{ marginBottom: '10px' }}>
                <strong>🗄️ Firestore:</strong>
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                    <li>Connected: {debugInfo.firestore?.isConnected ? '✅' : '❌'}</li>
                    {Object.entries(debugInfo.firestore?.collections || {}).map(([collection, count]) => (
                        <li key={collection}>{collection}: {count}</li>
                    ))}
                    {debugInfo.firestore?.errors?.length > 0 && (
                        <li style={{ color: '#ef4444' }}>
                            Errors: {debugInfo.firestore.errors.length}
                            <ul>
                                {debugInfo.firestore.errors.map((err: string, idx: number) => (
                                    <li key={idx}>{err}</li>
                                ))}
                            </ul>
                        </li>
                    )}
                </ul>
            </div>

            <div style={{ fontSize: '10px', color: '#888', borderTop: '1px solid #333', paddingTop: '8px' }}>
                Last updated: {debugInfo.timestamp}
            </div>
        </div>
    );
};

export default FirebaseDebugger;