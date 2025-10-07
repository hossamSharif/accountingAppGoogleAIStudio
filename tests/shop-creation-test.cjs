/**
 * Enhanced Shop Creation Test Script
 * Tests the multi-step shop creation process for "قرش السلك"
 */

const puppeteer = require('puppeteer');
const path = require('path');

class ShopCreationTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = {
            success: false,
            steps: [],
            errors: [],
            screenshots: []
        };
    }

    async init() {
        console.log('🚀 Initializing Enhanced Shop Creation Test...');

        this.browser = await puppeteer.launch({
            headless: false, // Set to true for headless testing
            slowMo: 100, // Slow down operations for better visibility
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-extensions',
                '--disable-gpu',
                '--disable-web-security',
                '--no-first-run'
            ],
            defaultViewport: { width: 1280, height: 800 }
        });

        this.page = await this.browser.newPage();

        // Set up console logging
        this.page.on('console', msg => {
            console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
        });

        // Set up error handling
        this.page.on('pageerror', error => {
            console.error(`[PAGE ERROR] ${error.message}`);
            this.testResults.errors.push(`Page Error: ${error.message}`);
        });

        // Set Arabic language for better RTL testing
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
        });
    }

    async navigateToApp() {
        console.log('📍 Navigating to the application...');

        try {
            // Set environment variables for this process
            process.env.VITE_FIREBASE_API_KEY = 'AIzaSyC9PglQejrYi41ZShGj__FiAd3oxyfbRO0';
            process.env.VITE_FIREBASE_AUTH_DOMAIN = 'vavidiaapp.firebaseapp.com';
            process.env.VITE_FIREBASE_PROJECT_ID = 'vavidiaapp';
            process.env.VITE_FIREBASE_STORAGE_BUCKET = 'vavidiaapp.firebasestorage.app';
            process.env.VITE_FIREBASE_MESSAGING_SENDER_ID = '646948750836';
            process.env.VITE_FIREBASE_APP_ID = '1:646948750836:web:549bf4bdcdf380dac5a5a1';

            // Try common development URLs - Start with known working port
            const urls = [
                'http://localhost:3500'
            ];

            let loaded = false;
            for (const url of urls) {
                try {
                    await this.page.goto(url, { waitUntil: 'load', timeout: 30000 });

                    // Check if the page loaded successfully
                    const title = await this.page.title();
                    if (title && !title.includes('This site can\'t be reached')) {
                        console.log(`✅ Successfully loaded application at ${url}`);
                        console.log(`📄 Page title: ${title}`);

                        // Wait for React app to mount
                        try {
                            await this.page.waitForSelector('#root', { timeout: 10000 });
                            console.log('✅ React app root element found');
                        } catch (e) {
                            console.log('⚠️ React root not found, but continuing...');
                        }

                        loaded = true;
                        break;
                    }
                } catch (error) {
                    console.log(`❌ Failed to load ${url}: ${error.message}`);
                }
            }

            if (!loaded) {
                throw new Error('Could not access the application at any common development URL');
            }

            await this.takeScreenshot('01-app-loaded');
            this.addStep('Application loaded successfully', true);

        } catch (error) {
            this.addStep(`Failed to navigate to app: ${error.message}`, false);
            throw error;
        }
    }

    async performLogin() {
        console.log('🔐 Performing login...');

        try {
            // Check if we're on the login page
            const loginForm = await this.page.$('form, .login-form, input[type="email"]');
            if (!loginForm) {
                console.log('⚠️ No login form detected, assuming already logged in');
                return;
            }

            // Fill email field
            const emailInput = await this.page.$('input[type="email"], input[name="email"], #email');
            if (emailInput) {
                await emailInput.click();
                await emailInput.evaluate(input => input.value = '');
                await emailInput.type('admin@accounting-app.com');
                console.log('✅ Email entered');
            } else {
                throw new Error('Could not find email input field');
            }

            // Fill password field
            const passwordInput = await this.page.$('input[type="password"], input[name="password"], #password');
            if (passwordInput) {
                await passwordInput.click();
                await passwordInput.evaluate(input => input.value = '');
                await passwordInput.type('Admin123!');
                console.log('✅ Password entered');
            } else {
                throw new Error('Could not find password input field');
            }

            await this.takeScreenshot('login-form-filled');

            // Click login button
            const loginButton = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(btn =>
                    btn.textContent.includes('تسجيل الدخول') ||
                    btn.textContent.includes('Login') ||
                    btn.type === 'submit'
                );
            });

            if (loginButton) {
                await this.page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const btn = buttons.find(btn =>
                        btn.textContent.includes('تسجيل الدخول') ||
                        btn.textContent.includes('Login') ||
                        btn.type === 'submit'
                    );
                    if (btn) btn.click();
                });
                console.log('✅ Login button clicked');
            } else {
                // Try alternative selectors
                const submitButton = await this.page.$('button[type="submit"], .login-button, .btn-login');
                if (submitButton) {
                    await submitButton.click();
                    console.log('✅ Submit button clicked');
                } else {
                    throw new Error('Could not find login button');
                }
            }

            // Wait for navigation after login
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Check if login was successful by looking for login-specific elements
            const stillOnLogin = await this.page.$('input[type="email"]');
            const hasNavigation = await this.page.$('nav, .navigation, .sidebar');

            // Also check for any error messages
            const errorMessages = await this.page.$$eval('[class*="error"], .alert-danger, .text-red',
                elements => elements.map(el => el.textContent).filter(text => text.trim())
            );

            if (errorMessages.length > 0) {
                console.log('❌ Login error messages found:', errorMessages);
                throw new Error(`Login failed with errors: ${errorMessages.join(', ')}`);
            }

            if (!stillOnLogin || hasNavigation) {
                console.log('✅ Login successful');
                await this.takeScreenshot('logged-in');
                this.addStep('Successfully logged in as admin', true);
            } else {
                // Try to get more debugging info
                const pageText = await this.page.evaluate(() => document.body.textContent);
                console.log('Current page content sample:', pageText.substring(0, 500));
                throw new Error('Login failed - still on login page');
            }

        } catch (error) {
            this.addStep(`Failed to login: ${error.message}`, false);
            throw error;
        }
    }

    async findShopManagement() {
        console.log('🔍 Looking for Shop Management section...');

        try {
            // Wait for the app to load completely
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Look for shop management link/button in various formats
            const shopManagementSelectors = [
                'a[href*="shop"]',
                'button:contains("إدارة المتاجر")',
                'a:contains("إدارة المتاجر")',
                'a:contains("Shop")',
                'a:contains("متجر")',
                '[data-testid="shop-management"]',
                '.shop-management',
                'nav a[href="/shops"]',
                'nav a[href="/shop-management"]',
                '.sidebar a[href*="shop"]',
                '.navigation a[href*="shop"]'
            ];

            let shopManagementFound = false;

            for (const selector of shopManagementSelectors) {
                try {
                    if (selector.includes('contains')) {
                        // Handle text-based selectors
                        const found = await this.page.evaluate(() => {
                            const elements = Array.from(document.querySelectorAll('a, button'));
                            const el = elements.find(el => el.textContent.includes('إدارة المتاجر'));
                            if (el) {
                                el.click();
                                return true;
                            }
                            return false;
                        });
                        if (found) {
                            shopManagementFound = true;
                            break;
                        }
                    } else {
                        const element = await this.page.$(selector);
                        if (element) {
                            await element.click();
                            shopManagementFound = true;
                            break;
                        }
                    }
                } catch (error) {
                    // Continue to next selector
                }
            }

            if (!shopManagementFound) {
                // Try to find any navigation that might lead to shop management
                console.log('🔍 Searching for navigation menu...');
                await this.takeScreenshot('02-looking-for-navigation');

                // Look for any menu or navigation
                const navElements = await this.page.$$('nav, .navigation, .menu, .sidebar');
                if (navElements.length > 0) {
                    console.log(`Found ${navElements.length} navigation elements`);

                    // Try clicking on likely navigation items
                    const possibleLinks = await this.page.$$eval('a, button', elements =>
                        elements.map(el => ({
                            text: el.textContent?.trim(),
                            href: el.href,
                            className: el.className
                        })).filter(item =>
                            item.text && (
                                item.text.includes('متجر') ||
                                item.text.includes('Shop') ||
                                item.text.includes('إدارة') ||
                                item.text.includes('Management')
                            )
                        )
                    );

                    console.log('Possible shop management links found:', possibleLinks);

                    if (possibleLinks.length > 0) {
                        // Try clicking the first likely candidate
                        const targetText = possibleLinks[0].text;
                        const found = await this.page.evaluate((text) => {
                            const elements = Array.from(document.querySelectorAll('a, button'));
                            const el = elements.find(el => el.textContent.includes(text));
                            if (el) {
                                el.click();
                                return true;
                            }
                            return false;
                        }, targetText);
                        if (found) {
                            shopManagementFound = true;
                        }
                    }
                }
            }

            if (!shopManagementFound) {
                throw new Error('Could not find Shop Management section in the navigation');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.takeScreenshot('03-shop-management-page');
            this.addStep('Successfully navigated to Shop Management', true);

        } catch (error) {
            this.addStep(`Failed to find Shop Management: ${error.message}`, false);
            throw error;
        }
    }

    async startShopCreation() {
        console.log('➕ Starting shop creation process...');

        try {
            // Look for the "Add New Shop" button
            const addButtonSelectors = [
                'button:contains("إضافة متجر جديد")',
                'button:contains("إضافة متجر")',
                'button:contains("متجر جديد")',
                '[data-testid="add-shop"]',
                '.add-shop-button',
                'button[class*="primary"]:contains("إضافة")'
            ];

            let addButtonFound = false;

            for (const selector of addButtonSelectors) {
                try {
                    if (selector.includes('contains')) {
                        const found = await this.page.evaluate(() => {
                            const buttons = Array.from(document.querySelectorAll('button'));
                            const btn = buttons.find(btn => btn.textContent.includes('إضافة متجر'));
                            if (btn) {
                                btn.click();
                                return true;
                            }
                            return false;
                        });
                        if (found) {
                            addButtonFound = true;
                            break;
                        }
                    } else {
                        const button = await this.page.$(selector);
                        if (button) {
                            await button.click();
                            addButtonFound = true;
                            break;
                        }
                    }
                } catch (error) {
                    // Continue to next selector
                }
            }

            if (!addButtonFound) {
                // Try to find any button that might be for adding shops
                const allButtons = await this.page.$$eval('button', buttons =>
                    buttons.map(btn => btn.textContent?.trim()).filter(text => text)
                );
                console.log('Available buttons:', allButtons);

                // Look for plus icon or add-related buttons
                const addButton = await this.page.$('button svg[data-icon="plus"], button .fa-plus, button:contains("+")');
                if (addButton) {
                    await addButton.click();
                    addButtonFound = true;
                }
            }

            if (!addButtonFound) {
                throw new Error('Could not find "Add New Shop" button');
            }

            // Wait for the modal to appear
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check if modal is visible
            const modal = await this.page.$('.modal, [role="dialog"], .shop-modal');
            if (!modal) {
                throw new Error('Shop creation modal did not appear');
            }

            await this.takeScreenshot('04-shop-modal-opened');
            this.addStep('Shop creation modal opened successfully', true);

        } catch (error) {
            this.addStep(`Failed to start shop creation: ${error.message}`, false);
            throw error;
        }
    }

    async fillShopForm() {
        console.log('📝 Filling shop creation form...');

        try {
            // Step 1: Basic Information
            console.log('📝 Step 1: Basic Information');

            // Fill shop name
            const nameInput = await this.page.$('#shopName, input[name="name"], input[placeholder*="اسم"]');
            if (nameInput) {
                await nameInput.click();
                await nameInput.evaluate(input => input.value = '');
                await nameInput.type('قرش السلك');
                console.log('✅ Shop name entered: قرش السلك');
            } else {
                throw new Error('Could not find shop name input field');
            }

            // Fill description
            const descInput = await this.page.$('#description, textarea[name="description"], textarea[placeholder*="وصف"]');
            if (descInput) {
                await descInput.click();
                await descInput.evaluate(input => input.value = '');
                await descInput.type('متجر متخصص في قطع غيار السيارات والأسلاك الكهربائية');
                console.log('✅ Description entered');
            }

            // Select business type
            const businessTypeSelect = await this.page.$('#businessType, select[name="businessType"]');
            if (businessTypeSelect) {
                await businessTypeSelect.select('قطع غيار السيارات');
                console.log('✅ Business type selected');
            }

            // Fill opening stock value
            const stockInput = await this.page.$('#openingStock, input[name="openingStockValue"]');
            if (stockInput) {
                await stockInput.click();
                await stockInput.evaluate(input => input.value = '');
                await stockInput.type('50000');
                console.log('✅ Opening stock value entered: 50000');
            }

            await this.takeScreenshot('05-basic-info-filled');

            // Click Next button
            const nextClicked = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const nextBtn = buttons.find(btn => btn.textContent.includes('التالي'));
                if (nextBtn) {
                    nextBtn.click();
                    return true;
                }
                return false;
            });
            if (nextClicked) {
                console.log('✅ Moved to next step');
            } else {
                throw new Error('Could not find Next button');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 2: Contact Details
            console.log('📝 Step 2: Contact Details');

            // Fill address
            const addressInput = await this.page.$('#address, textarea[name="address"]');
            if (addressInput) {
                await addressInput.click();
                await addressInput.type('شارع الملك فهد، الرياض، المملكة العربية السعودية');
                console.log('✅ Address entered');
            }

            // Fill phone
            const phoneInput = await this.page.$('#contactPhone, input[name="contactPhone"]');
            if (phoneInput) {
                await phoneInput.click();
                await phoneInput.type('+966501234567');
                console.log('✅ Phone number entered');
            }

            // Fill email
            const emailInput = await this.page.$('#contactEmail, input[name="contactEmail"]');
            if (emailInput) {
                await emailInput.click();
                await emailInput.type('info@qareshsalik.com');
                console.log('✅ Email entered');
            }

            await this.takeScreenshot('06-contact-details-filled');

            // Click Next to go to preview
            const nextClicked2 = await this.page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const nextBtn = buttons.find(btn => btn.textContent.includes('التالي'));
                if (nextBtn) {
                    nextBtn.click();
                    return true;
                }
                return false;
            });
            if (nextClicked2) {
                console.log('✅ Moved to preview step');
            }

            await new Promise(resolve => setTimeout(resolve, 1000));

            // Step 3: Preview
            console.log('📝 Step 3: Preview');
            await this.takeScreenshot('07-preview-step');

            this.addStep('Successfully filled all form steps', true);

        } catch (error) {
            this.addStep(`Failed to fill shop form: ${error.message}`, false);
            throw error;
        }
    }

    async submitShopCreation() {
        console.log('🚀 Submitting shop creation...');

        try {
            // Look for the final submit button
            const submitSelectors = [
                'button:contains("إنشاء المتجر")',
                'button:contains("حفظ")',
                'button:contains("إنشاء")',
                'button[type="submit"]',
                'button:contains("إضافة المتجر")'
            ];

            let submitted = false;

            for (const selector of submitSelectors) {
                try {
                    if (selector.includes('contains')) {
                        const found = await this.page.evaluate(() => {
                            const buttons = Array.from(document.querySelectorAll('button'));
                            const btn = buttons.find(btn =>
                                btn.textContent.includes('إنشاء') ||
                                btn.textContent.includes('حفظ')
                            );
                            if (btn) {
                                btn.click();
                                return true;
                            }
                            return false;
                        });
                        if (found) {
                            submitted = true;
                            break;
                        }
                    } else {
                        const button = await this.page.$(selector);
                        if (button) {
                            await button.click();
                            submitted = true;
                            break;
                        }
                    }
                } catch (error) {
                    // Continue to next selector
                }
            }

            if (!submitted) {
                throw new Error('Could not find submit button');
            }

            // Wait for submission to complete
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Look for success message
            const successSelectors = [
                '.success',
                '.alert-success',
                '.notification-success',
                '[class*="success"]'
            ];

            let successFound = false;
            for (const selector of successSelectors) {
                const successElement = await this.page.$(selector);
                if (successElement) {
                    const successText = await successElement.textContent();
                    console.log(`✅ Success message found: ${successText}`);
                    successFound = true;
                    break;
                }
            }

            // Check if modal closed (indicating success)
            const modal = await this.page.$('.modal, [role="dialog"]');
            const modalClosed = !modal;

            if (successFound || modalClosed) {
                await this.takeScreenshot('08-shop-created-success');
                this.addStep('Shop "قرش السلك" created successfully', true);
                this.testResults.success = true;
            } else {
                throw new Error('No success confirmation found');
            }

        } catch (error) {
            this.addStep(`Failed to submit shop creation: ${error.message}`, false);
            throw error;
        }
    }

    async verifyShopInList() {
        console.log('🔍 Verifying shop appears in the list...');

        try {
            // Wait for the list to refresh
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Look for the shop in the list
            const shopFound = await this.page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('*'));
                return elements.some(el => el.textContent && el.textContent.includes('قرش السلك'));
            });

            if (shopFound) {
                console.log('✅ Shop "قرش السلك" found in the list');
                await this.takeScreenshot('09-shop-in-list');
                this.addStep('Shop verified in the shop list', true);
            } else {
                throw new Error('Shop not found in the list');
            }

        } catch (error) {
            this.addStep(`Failed to verify shop in list: ${error.message}`, false);
            throw error;
        }
    }

    async takeScreenshot(filename) {
        try {
            const screenshotPath = path.join(__dirname, 'screenshots', `${filename}.png`);
            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true
            });
            this.testResults.screenshots.push(screenshotPath);
            console.log(`📸 Screenshot saved: ${filename}.png`);
        } catch (error) {
            console.error(`Failed to take screenshot ${filename}: ${error.message}`);
        }
    }

    addStep(description, success) {
        this.testResults.steps.push({
            description,
            success,
            timestamp: new Date().toISOString()
        });
        console.log(`${success ? '✅' : '❌'} ${description}`);
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async runFullTest() {
        try {
            await this.init();
            await this.navigateToApp();
            await this.performLogin();
            await this.findShopManagement();
            await this.startShopCreation();
            await this.fillShopForm();
            await this.submitShopCreation();
            await this.verifyShopInList();

            console.log('\n🎉 TEST COMPLETED SUCCESSFULLY!');
            console.log('✅ Shop "قرش السلك" has been created with enhanced features');

        } catch (error) {
            console.error('\n❌ TEST FAILED:', error.message);
            this.testResults.success = false;
            await this.takeScreenshot('error-state');
        } finally {
            await this.cleanup();
            this.printTestReport();
        }
    }

    printTestReport() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 ENHANCED SHOP CREATION TEST REPORT');
        console.log('='.repeat(60));
        console.log(`🎯 Overall Result: ${this.testResults.success ? 'PASSED ✅' : 'FAILED ❌'}`);
        console.log(`📅 Test Date: ${new Date().toLocaleString()}`);
        console.log(`🏪 Target Shop: قرش السلك`);
        console.log(`📸 Screenshots: ${this.testResults.screenshots.length} saved`);
        console.log('\n📋 Test Steps:');

        this.testResults.steps.forEach((step, index) => {
            console.log(`  ${index + 1}. ${step.success ? '✅' : '❌'} ${step.description}`);
        });

        if (this.testResults.errors.length > 0) {
            console.log('\n❌ Errors Encountered:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        console.log('\n💡 Next Steps:');
        if (this.testResults.success) {
            console.log('  • Verify all accounts were created in the Accounts page');
            console.log('  • Check financial year setup');
            console.log('  • Test shop statistics display');
            console.log('  • Verify activity logging');
        } else {
            console.log('  • Review error logs and screenshots');
            console.log('  • Check application is running and accessible');
            console.log('  • Verify Firebase configuration');
            console.log('  • Check for JavaScript console errors');
        }

        console.log('='.repeat(60));
    }
}

// Run the test
if (require.main === module) {
    const test = new ShopCreationTest();
    test.runFullTest().catch(console.error);
}

module.exports = ShopCreationTest;