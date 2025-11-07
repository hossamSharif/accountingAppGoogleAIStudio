@echo off
REM Firebase Backup Script using Firebase CLI
REM Creates a timestamped backup of all Firestore collections

echo.
echo ========================================
echo Firebase Backup Script
echo ========================================
echo.

REM Create timestamp for backup folder
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "timestamp=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%-%dt:~8,2%%dt:~10,2%%dt:~12,2%"

REM Create backups directory if it doesn't exist
if not exist "backups" mkdir backups

REM Set backup path
set "backupPath=backups\backup-%timestamp%"

echo Creating backup folder: %backupPath%
echo.

REM Export Firestore data
echo Exporting Firestore data...
echo This may take a few minutes depending on your data size...
echo.

firebase firestore:export %backupPath%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Backup completed successfully!
    echo ========================================
    echo.
    echo Backup location: %backupPath%
    echo.
    echo To restore this backup, run:
    echo firebase firestore:import %backupPath%
    echo.
) else (
    echo.
    echo ========================================
    echo Backup failed!
    echo ========================================
    echo.
    echo Please check your Firebase connection and permissions.
    echo.
    exit /b 1
)
