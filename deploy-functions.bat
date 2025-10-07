@echo off
REM Deploy Cloud Functions Script for Accounting App Notification System (Windows)

echo =========================================
echo Firebase Cloud Functions Deployment
echo =========================================

REM Check if Firebase CLI is installed
echo Checking Firebase CLI...
where firebase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Firebase CLI not found. Installing...
    npm install -g firebase-tools
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install Firebase CLI
        pause
        exit /b 1
    )
    echo Firebase CLI installed successfully
) else (
    echo Firebase CLI found
)

REM Check if logged in to Firebase
echo Checking Firebase authentication...
firebase projects:list >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Not logged in to Firebase. Please login:
    firebase login
    if %ERRORLEVEL% NEQ 0 (
        echo Firebase login failed
        pause
        exit /b 1
    )
    echo Firebase login successful
) else (
    echo Already logged in to Firebase
)

REM Navigate to functions directory
cd functions

REM Install dependencies
echo Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install dependencies
    pause
    exit /b 1
)
echo Dependencies installed

REM Build TypeScript
echo Building TypeScript...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo TypeScript build failed
    pause
    exit /b 1
)
echo TypeScript build completed

REM Return to project root
cd ..

REM Select deployment option
echo.
echo Select deployment option:
echo 1) Deploy all functions
echo 2) Deploy notification functions only
echo 3) Deploy cleanup function only
echo 4) Test with emulators
echo 5) View function logs
echo 6) Cancel

set /p option="Enter option (1-6): "

if "%option%"=="1" (
    echo Deploying all functions...
    firebase deploy --only functions
    if %ERRORLEVEL% EQU 0 (
        echo All functions deployed successfully
    ) else (
        echo Deployment failed
        pause
        exit /b 1
    )
) else if "%option%"=="2" (
    echo Deploying notification functions...
    firebase deploy --only functions:onTransactionCreated,functions:onLogCreated,functions:processPendingNotifications
    if %ERRORLEVEL% EQU 0 (
        echo Notification functions deployed successfully
    ) else (
        echo Deployment failed
        pause
        exit /b 1
    )
) else if "%option%"=="3" (
    echo Deploying cleanup function...
    firebase deploy --only functions:cleanupOldNotifications
    if %ERRORLEVEL% EQU 0 (
        echo Cleanup function deployed successfully
    ) else (
        echo Deployment failed
        pause
        exit /b 1
    )
) else if "%option%"=="4" (
    echo Starting Firebase emulators...
    firebase emulators:start --only functions,firestore
) else if "%option%"=="5" (
    echo Viewing function logs...
    firebase functions:log --follow
) else if "%option%"=="6" (
    echo Deployment cancelled
    pause
    exit /b 0
) else (
    echo Invalid option
    pause
    exit /b 1
)

echo.
echo =========================================
echo Deployment process completed!
echo =========================================

REM Show post-deployment instructions
if %option% LEQ 3 (
    echo.
    echo Post-deployment steps:
    echo 1. Test the functions by creating a transaction as a shop user
    echo 2. Check admin notifications in the Firebase Console
    echo 3. Monitor function logs: firebase functions:log --follow
    echo 4. View function dashboard: firebase open functions
)

pause