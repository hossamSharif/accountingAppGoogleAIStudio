import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple test to check if the enhanced shop creation components are working
async function testApplication() {
    console.log('🧪 Testing Enhanced Shop Creation Application');
    console.log('=' .repeat(50));

    // Test 1: Check if the application is running
    console.log('1. Testing application availability...');
    try {
        const response = await makeRequest('http://localhost:3001');
        if (response.statusCode === 200) {
            console.log('✅ Application is running on http://localhost:3001');

            // Check if the HTML contains our React app
            if (response.body.includes('root') || response.body.includes('react')) {
                console.log('✅ React application detected');
            } else {
                console.log('⚠️  No React app detected in HTML');
            }
        } else {
            console.log(`❌ Application returned status: ${response.statusCode}`);
        }
    } catch (error) {
        console.log(`❌ Cannot connect to application: ${error.message}`);
        return false;
    }

    // Test 2: Check if we can access static files (CSS, JS)
    console.log('\n2. Testing static file serving...');
    try {
        const assetsResponse = await makeRequest('http://localhost:3001/assets/');
        console.log(`✅ Assets endpoint accessible (${assetsResponse.statusCode})`);
    } catch (error) {
        console.log('ℹ️  Assets endpoint test skipped (normal for dev mode)');
    }

    // Test 3: Check Firebase configuration files exist
    console.log('\n3. Checking Firebase configuration...');
    // fs and path already imported at top

    try {
        const firebasePath = path.join(__dirname, 'firebase.ts');
        if (fs.existsSync(firebasePath)) {
            console.log('✅ Firebase configuration file found');

            const firebaseContent = fs.readFileSync(firebasePath, 'utf8');
            if (firebaseContent.includes('getFirestore')) {
                console.log('✅ Firestore import detected');
            }
            if (firebaseContent.includes('getAuth')) {
                console.log('✅ Auth import detected');
            }
        } else {
            console.log('❌ Firebase configuration file not found');
        }
    } catch (error) {
        console.log(`⚠️  Firebase check error: ${error.message}`);
    }

    // Test 4: Check if enhanced components exist
    console.log('\n4. Checking enhanced shop components...');
    const componentsToCheck = [
        'components/ShopModal.tsx',
        'components/ShopCard.tsx',
        'components/ShopStatsModal.tsx',
        'hooks/useShopData.ts',
        'services/loggingService.ts',
        'utils/validation.ts'
    ];

    let allComponentsExist = true;
    for (const component of componentsToCheck) {
        const componentPath = path.join(__dirname, component);
        if (fs.existsSync(componentPath)) {
            console.log(`✅ ${component} exists`);
        } else {
            console.log(`❌ ${component} missing`);
            allComponentsExist = false;
        }
    }

    // Test 5: Check environment variables
    console.log('\n5. Checking environment configuration...');
    const requiredEnvVars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID'
    ];

    let envConfigured = true;
    for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
            console.log(`✅ ${envVar} is set`);
        } else {
            console.log(`❌ ${envVar} is missing`);
            envConfigured = false;
        }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));

    if (allComponentsExist && envConfigured) {
        console.log('🎉 All basic checks passed!');
        console.log('📋 Manual testing recommendations:');
        console.log('   1. Open http://localhost:3001 in your browser');
        console.log('   2. Navigate to Shop Management section');
        console.log('   3. Click "إضافة متجر جديد" to test the enhanced modal');
        console.log('   4. Fill out the form with shop name "قرش السلك"');
        console.log('   5. Verify all 3 steps work correctly');
        console.log('   6. Check that accounts preview shows 10 accounts');
        console.log('   7. Submit and verify shop creation');

        console.log('\n🔧 For automated testing:');
        console.log('   Run: node tests/shop-creation-test.js');
        console.log('   (after installing puppeteer: npm install puppeteer)');

        return true;
    } else {
        console.log('❌ Some issues found that need to be addressed');

        if (!allComponentsExist) {
            console.log('🔧 Missing components - some files may need to be created');
        }

        if (!envConfigured) {
            console.log('🔧 Environment configuration needed:');
            console.log('   1. Create a .env file in the project root');
            console.log('   2. Add your Firebase configuration variables');
            console.log('   3. Restart the development server');
        }

        return false;
    }
}

// Helper function to make HTTP requests
function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const request = http.get(url, (response) => {
            let body = '';

            response.on('data', (chunk) => {
                body += chunk;
            });

            response.on('end', () => {
                resolve({
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: body
                });
            });
        });

        request.on('error', (error) => {
            reject(error);
        });

        request.setTimeout(5000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

// Run the test
testApplication().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});

export default testApplication;