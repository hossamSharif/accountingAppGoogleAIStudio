#!/bin/bash

# Deploy Cloud Functions Script for Accounting App Notification System

echo "========================================="
echo "Firebase Cloud Functions Deployment"
echo "========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        exit 1
    fi
}

# Check if Firebase CLI is installed
echo -e "${YELLOW}Checking Firebase CLI...${NC}"
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Firebase CLI not found. Installing...${NC}"
    npm install -g firebase-tools
    print_status $? "Firebase CLI installed"
else
    echo -e "${GREEN}Firebase CLI found${NC}"
fi

# Check if logged in to Firebase
echo -e "${YELLOW}Checking Firebase authentication...${NC}"
firebase projects:list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Not logged in to Firebase. Please login:${NC}"
    firebase login
    print_status $? "Firebase login successful"
else
    echo -e "${GREEN}Already logged in to Firebase${NC}"
fi

# Navigate to functions directory
cd functions

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install
print_status $? "Dependencies installed"

# Build TypeScript
echo -e "${YELLOW}Building TypeScript...${NC}"
npm run build
print_status $? "TypeScript build completed"

# Return to project root
cd ..

# Select deployment option
echo ""
echo "Select deployment option:"
echo "1) Deploy all functions"
echo "2) Deploy notification functions only"
echo "3) Deploy cleanup function only"
echo "4) Test with emulators"
echo "5) View function logs"
echo "6) Cancel"

read -p "Enter option (1-6): " option

case $option in
    1)
        echo -e "${YELLOW}Deploying all functions...${NC}"
        firebase deploy --only functions
        print_status $? "All functions deployed"
        ;;
    2)
        echo -e "${YELLOW}Deploying notification functions...${NC}"
        firebase deploy --only functions:onTransactionCreated,functions:onLogCreated,functions:processPendingNotifications
        print_status $? "Notification functions deployed"
        ;;
    3)
        echo -e "${YELLOW}Deploying cleanup function...${NC}"
        firebase deploy --only functions:cleanupOldNotifications
        print_status $? "Cleanup function deployed"
        ;;
    4)
        echo -e "${YELLOW}Starting Firebase emulators...${NC}"
        firebase emulators:start --only functions,firestore
        ;;
    5)
        echo -e "${YELLOW}Viewing function logs...${NC}"
        firebase functions:log --follow
        ;;
    6)
        echo "Deployment cancelled"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}Deployment process completed!${NC}"
echo -e "${GREEN}=========================================${NC}"

# Show post-deployment instructions
if [ $option -le 3 ]; then
    echo ""
    echo "Post-deployment steps:"
    echo "1. Test the functions by creating a transaction as a shop user"
    echo "2. Check admin notifications in the Firebase Console"
    echo "3. Monitor function logs: firebase functions:log --follow"
    echo "4. View function dashboard: firebase open functions"
fi