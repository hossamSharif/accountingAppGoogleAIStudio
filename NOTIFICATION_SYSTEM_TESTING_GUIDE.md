# Notification System Testing Guide

## Overview
This guide provides comprehensive testing instructions for the enhanced notification system with English push notifications, email notifications, and dual-language support.

---

## 🚀 Deployment Steps

### 1. Install Email Service Dependencies (Optional)

If you want to use SendGrid or Nodemailer instead of Firebase Extension:

```bash
cd functions
npm install @sendgrid/mail
# OR
npm install nodemailer
```

### 2. Configure Environment Variables

Add to your `.env` file (if using SendGrid or Nodemailer):

```env
# For SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key_here

# OR for Nodemailer
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Application URL (for email links)
APP_URL=https://vavidiaapp.web.app
```

### 3. Deploy Firebase Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

### 4. Deploy Frontend

```bash
npm run build
firebase deploy --only hosting
```

### 5. Install Firebase Email Extension (Recommended)

1. Go to Firebase Console → Extensions
2. Install "Trigger Email" extension
3. Configure with your email provider (SendGrid, Mailgun, etc.)
4. The extension will automatically watch the `mail` collection

---

## ✅ Test Checklist

### Test 1: Service Worker Registration (Cross-Browser)

#### Chrome/Edge (Chromium)
1. Open DevTools → Application → Service Workers
2. Clear all service workers
3. Refresh the page
4. Check console for `[SW] Firebase Messaging Service Worker v2.0.0 loading...`
5. Verify service worker registered successfully
6. **Expected:** Service worker v2.0.0 should be active

#### Firefox
1. Open about:debugging#/runtime/this-firefox
2. Clear service workers
3. Refresh the app
4. Check for firebase-messaging-sw.js in Workers list
5. **Expected:** Service worker registered and running

#### Safari (Desktop)
1. Safari → Develop → Service Workers
2. Note: Safari has limited push notification support
3. **Expected:** Service worker may register but push notifications might not work

#### Mobile Testing
1. Chrome on Android - Full support expected
2. Safari on iOS - Limited/no support for web push notifications
3. **Expected:** Android should work, iOS may not support web push

---

### Test 2: Notification Permission Dialog

1. **As Admin user**, log in to the app
2. **Wait 3 seconds** after login
3. **Expected:** Beautiful permission prompt should appear
4. Click "Enable Notifications" button
5. **Expected:**
   - Browser native permission dialog appears
   - After granting, dialog dismisses
   - Console shows: `✅ FCM token obtained`
   - Console shows: `✅ FCM token saved to user document`

**Troubleshooting:**
- If dialog doesn't appear, check console for errors
- Verify VAPID key is set in `.env`: `VITE_FIREBASE_VAPID_KEY`
- Check that you're accessing via HTTPS (required for notifications)
- Ensure service worker is registered before testing

---

### Test 3: Push Notifications (English)

#### Test Transaction Created Notification

1. Log in as a **shop user** (non-admin)
2. Add a new transaction (any type)
3. Admin should receive:
   - **Push notification** (if app is open or in background)
   - **Email notification** (if configured)

**Expected Push Notification:**
- **Title:** "New Transaction"
- **Body:** "{User Name} added a new {Type} transaction for {Amount} SD at {Shop Name}"
- **Direction:** Left-to-right (LTR)
- **Language:** English
- **Icon:** /logo.png

**Console Logs to Verify:**
```
[SW] Received background message: ...
[SW] Showing notification: New Transaction
✅ Push notification sent successfully
📧 Sending email to: ...
✅ Email queued for sending via Firebase Extension
```

#### Test Foreground Notifications

1. Keep app open on notifications page
2. Have another user create a transaction
3. **Expected:**
   - Native browser notification appears even with app open
   - Notification shows in English
   - LTR text direction

---

### Test 4: Email Notifications

#### Prerequisites
- Firebase Email Extension installed OR
- SendGrid/Nodemailer configured

#### Test Steps

1. Create a transaction as shop user
2. Check admin email inbox
3. **Expected Email:**
   - **Subject:** "New Transaction - {Shop Name}"
   - **Content:**
     - Clean HTML formatting
     - Transaction type, amount, shop name
     - Date in English format
     - "View in App" link
   - **From:** Vavidia Accounting System <noreply@vavidiaapp.com>

4. Click "View in App" link
5. **Expected:** Opens app to /notifications page

---

### Test 5: Dual-Language Notifications Display

1. Log in as **admin user**
2. Go to Notifications page
3. Verify notifications are displayed (some should exist from previous tests)
4. Click "Show Both Languages" button in top-right

**Expected:**
- Each notification shows two sections:
  - **العربية:** (Arabic message)
  - **English:** (English message)
- Both messages display correctly
- Border separates the two languages
- Button changes to "Hide Translation"

5. Click "Hide Translation"
6. **Expected:** Returns to single language display based on user's language preference

---

### Test 6: Email Notification Preferences

1. Go to Firebase Console → Firestore
2. Find a user document
3. Add field: `emailNotifications: false`
4. Create a transaction
5. **Expected:** That user should NOT receive email but should still receive push notification

6. Set `emailNotifications: true` (or remove field)
7. Create another transaction
8. **Expected:** User receives both email and push notification

---

### Test 7: Cross-Browser Production Testing

After deploying to Firebase Hosting:

1. **Chrome Desktop**
   - [ ] Service worker loads
   - [ ] Permission dialog appears
   - [ ] Push notifications received in English
   - [ ] Notifications clickable

2. **Firefox Desktop**
   - [ ] Service worker loads
   - [ ] Permission dialog appears
   - [ ] Push notifications received in English
   - [ ] Notifications clickable

3. **Edge Desktop**
   - [ ] Service worker loads
   - [ ] Permission dialog appears
   - [ ] Push notifications received in English
   - [ ] Notifications clickable

4. **Chrome Mobile (Android)**
   - [ ] Service worker loads
   - [ ] Permission dialog appears
   - [ ] Push notifications received in English
   - [ ] Notifications appear on lock screen
   - [ ] Vibration works
   - [ ] Notifications clickable

5. **Safari Mobile (iOS)**
   - [ ] Note: Web push notifications NOT supported
   - [ ] Service worker may or may not register
   - [ ] Email notifications should still work

---

## 🐛 Common Issues & Solutions

### Issue 1: Permission Dialog Doesn't Appear

**Symptoms:**
- No dialog shows after 3 seconds of logging in as admin
- Console shows: "Conditions not met for showing notification prompt"

**Solutions:**
1. Verify you're logged in as admin (`currentUser.role === 'admin'`)
2. Check permission status: `Notification.permission` should be `'default'`
3. Verify VAPID key is loaded: Check console for "VAPID Key loaded"
4. Clear browser cache and reload
5. Check for HTTPS (required for notifications)

---

### Issue 2: Service Worker Not Loading

**Symptoms:**
- Console error: `[SW] Error loading Firebase scripts`
- Service worker status: Not registered

**Solutions:**
1. Check network tab - verify firebase scripts load from CDN
2. Clear all service workers: DevTools → Application → Service Workers → Unregister
3. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
4. Check firebase-messaging-sw.js is accessible at /firebase-messaging-sw.js
5. Verify file is in `public/` folder, not `src/`

---

### Issue 3: No FCM Token Generated

**Symptoms:**
- Permission granted but no token
- Console error: "No FCM token received from Firebase"

**Solutions:**
1. Verify VAPID key is correct in Firebase Console
2. Check Cloud Messaging is enabled in Firebase
3. Verify service worker is active before requesting token
4. Try unregistering all service workers and retrying
5. Check Firebase project settings → Cloud Messaging → Web Push certificates

---

### Issue 4: Notifications Still in Arabic

**Symptoms:**
- Push notifications show Arabic text
- Expected English messages

**Solutions:**
1. Verify functions are deployed: `firebase deploy --only functions`
2. Check functions/src/index.ts uses `pushNotificationTemplates`
3. Check functions/src/helpers.ts has `lang: 'en'` and `dir: 'ltr'`
4. Check firebase-messaging-sw.js has `lang: 'en'` and `dir: 'ltr'`
5. Clear browser cache and test again

---

### Issue 5: Emails Not Sending

**Symptoms:**
- Push notifications work but no emails
- Console shows email queued but not received

**Solutions:**

**If using Firebase Extension:**
1. Check Extension is installed: Firebase Console → Extensions
2. Check `mail` collection in Firestore - should have documents with `state: 'SUCCESS'`
3. Verify email provider credentials in Extension configuration
4. Check Extension logs for errors

**If using SendGrid:**
1. Verify `SENDGRID_API_KEY` is set correctly
2. Check SendGrid API key is active in SendGrid dashboard
3. Uncomment SendGrid code in functions/src/emailService.ts
4. Verify sender email is verified in SendGrid

**If using Nodemailer:**
1. Verify SMTP credentials are correct
2. For Gmail, use App Password, not regular password
3. Uncomment Nodemailer code in functions/src/emailService.ts
4. Test SMTP connection separately

---

## 📊 Monitoring & Logs

### Frontend Logs

**Service Worker:**
```bash
# Open DevTools Console
# Filter by: [SW]
```

**Push Notifications:**
```bash
# Open DevTools Console
# Filter by: 🔔 🔑 📬 📨
```

### Backend Logs

**Cloud Functions:**
```bash
firebase functions:log --only onTransactionCreated,onLogCreated
```

**Look for:**
- ✅ Push notification sent successfully
- 📧 Sending email to: ...
- ✅ Email queued for sending

---

## 🎯 Success Criteria Summary

✅ **All tests pass when:**

1. Push notification permission dialog appears on all supported browsers
2. Service worker v2.0.0 registers successfully in production
3. All push notifications are in English with LTR direction
4. Admins receive email notifications for transactions
5. Notifications page can display both Arabic and English
6. Email preferences can be toggled per user
7. Notifications are clickable and open correct page
8. No console errors related to notifications

---

## 📝 Additional Notes

### Browser Compatibility
- ✅ Chrome/Edge (Full support)
- ✅ Firefox (Full support)
- ⚠️ Safari Desktop (Limited support)
- ✅ Chrome Android (Full support)
- ❌ Safari iOS (No web push support)

### Production Checklist
- [ ] VAPID key configured
- [ ] Firebase Functions deployed
- [ ] Service worker accessible at /firebase-messaging-sw.js
- [ ] HTTPS enabled (required for service workers)
- [ ] Email service configured
- [ ] Admin users have valid email addresses
- [ ] Test on production URL before announcing

---

## 🆘 Getting Help

If issues persist:
1. Check Firebase Console → Functions → Logs
2. Check Firebase Console → Firestore → `mail` collection (if using extension)
3. Check browser console for detailed error messages
4. Verify all environment variables are set correctly
5. Test with a fresh incognito window

---

**Last Updated:** 2025-01-11
**Version:** 2.0.0
