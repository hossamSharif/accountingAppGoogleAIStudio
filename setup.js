#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting Firebase Integration Setup...\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    console.log('✅ Environment file (.env.local) exists');
} else {
    console.log('❌ Environment file (.env.local) missing');
}

// Check if firebase.ts has been updated
const firebasePath = path.join(__dirname, 'firebase.ts');
if (fs.existsSync(firebasePath)) {
    const content = fs.readFileSync(firebasePath, 'utf8');
    if (content.includes('import.meta.env.VITE_FIREBASE')) {
        console.log('✅ Firebase configuration uses environment variables');
    } else {
        console.log('❌ Firebase configuration still uses hardcoded values');
    }
} else {
    console.log('❌ firebase.ts not found');
}

// Check if firestore.rules exists
const rulesPath = path.join(__dirname, 'firestore.rules');
if (fs.existsSync(rulesPath)) {
    console.log('✅ Firestore security rules file exists');
} else {
    console.log('❌ Firestore security rules file missing');
}

// Check if database initializer exists
const initPath = path.join(__dirname, 'initializeDatabase.ts');
if (fs.existsSync(initPath)) {
    console.log('✅ Database initialization script exists');
} else {
    console.log('❌ Database initialization script missing');
}

console.log('\n📋 Next Steps:');
console.log('1. Deploy firestore.rules to Firebase Console');
console.log('2. Enable Email/Password authentication in Firebase');
console.log('3. Run: npm run dev');
console.log('4. Complete database initialization in the app');

console.log('\n🔐 Default Login Credentials (after initialization):');
console.log('Admin: admin@accounting-app.com / Admin123!');
console.log('User:  user@example.com / user123');