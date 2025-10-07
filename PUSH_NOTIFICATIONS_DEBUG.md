# Push Notifications Debugging Guide

## ⚠️ IMPORTANT: First Steps

### 1. RESTART Your Development Server

The `.env` file was just updated with the VAPID key. **Vite only loads environment variables when the server starts.**

```bash
# Stop your current dev server (Ctrl+C in the terminal)
# Then restart:
npm run dev
```

**This is the most common reason for push notifications not working!**

---

## 🔍 Step-by-Step Debugging

### Step 1: Check Browser Console on Page Load

When you open the app, you should see these console messages:

#### ✅ Expected Console Output:

```
✅ VAPID Key loaded: BJLHs4WzL5...
✅ Firebase Messaging initialized
🔍 Checking push notification support...
  - Notification API: true
  - Service Worker API: true
  - Firebase Messaging: true
  - VAPID Key: ✅ Present
  - Overall Support: ✅ Supported
  - Current Permission: default
```

#### ❌ Problem Indicators:

If you see:
```
❌ VAPID Key NOT FOUND!
```
**Solution:** Dev server wasn't restarted. Restart it now.

If you see:
```
  - Firebase Messaging: false
```
**Solution:** Browser doesn't support push notifications or there's an error initializing messaging.

---

### Step 2: Check After Login (Admin User)

After logging in as admin, wait a few seconds. Check console:

#### ✅ Expected Output:

```
🔔 Notification Prompt Check:
  - Current User: Your Admin Name
  - Is Admin: true
  - Push Supported: true
  - Permission: default
  - Has FCM Token: false
✅ All conditions met! Showing prompt in 3 seconds...
🎯 Displaying notification permission prompt NOW
```

Then you should see the notification permission prompt appear on screen.

#### ❌ Problem Indicators:

If you see:
```
❌ Conditions not met for showing notification prompt
```

Check which condition failed:
- **Is Admin: false** → You're not logged in as admin
- **Push Supported: false** → Check Step 1 output
- **Permission: granted** → You already granted permission (this is good!)
- **Has FCM Token: true** → Token already exists (this is good!)

---

### Step 3: Check Service Worker

**Chrome DevTools:**
1. Press `F12` to open DevTools
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar

#### ✅ Expected:

You should see:
```
Source: /firebase-messaging-sw.js
Status: activated and is running
```

#### ❌ Problem:

If you see errors or no service worker:
- Check that `public/firebase-messaging-sw.js` exists
- Check browser console for service worker errors
- Try clearing site data and refreshing

---

### Step 4: Test Notification Permission Request

If the prompt appears, click **"تفعيل الإشعارات" (Enable Notifications)**

#### ✅ Expected Console Output:

```
✅ Notification permission granted
✅ Service worker registered
✅ FCM token obtained: dA1B2C3...
✅ FCM token saved to user document
```

#### ❌ Problem Indicators:

**Error: "VAPID key not configured"**
- Solution: Restart dev server

**Error: "An error occurred while retrieving token"**
- Solution: Check VAPID key is correct
- Solution: Check service worker is registered

**Error: "Notification permission denied"**
- Solution: User clicked "Block". Reset in browser settings:
  - Chrome: Settings → Privacy → Site Settings → Notifications → localhost → Reset

---

### Step 5: Verify Token Saved to Firestore

**Firestore Console:**
1. Go to Firebase Console → Firestore Database
2. Open `users` collection
3. Find your admin user document
4. Check if `fcmToken` field exists with a long token value
5. Check if `fcmTokenUpdatedAt` has a recent timestamp

#### ✅ Expected:

```
users/{adminId}/
  - fcmToken: "dA1B2C3D4E5F..."  (long string)
  - fcmTokenUpdatedAt: "2025-01-05T12:34:56..."
```

#### ❌ Problem:

If fields don't exist:
- Check console for errors during token save
- Check Firestore security rules allow updating user document

---

## 🚨 Common Issues & Solutions

### Issue 1: "No prompt appears"

**Checklist:**
- [ ] Dev server was restarted after adding VAPID key
- [ ] Logged in as admin user (not shop user)
- [ ] Check console for "All conditions met" message
- [ ] Wait at least 3 seconds after login
- [ ] Check browser console for errors

**Quick Fix:**
```bash
# 1. Stop dev server (Ctrl+C)
# 2. Clear browser cache
# 3. Restart dev server
npm run dev
# 4. Clear browser console
# 5. Login again
```

---

### Issue 2: "VAPID key not found"

**This means .env wasn't loaded.**

**Solution:**
```bash
# 1. Verify .env file exists in root directory
ls .env

# 2. Verify VAPID key is in .env file
cat .env | grep VAPID

# Expected output:
# VITE_FIREBASE_VAPID_KEY=BJLHs4WzL5Bs2u9PNCFQAFA8JY3Tx7kXBID7aVZDZTGOzR7YUX3tIRu1wifgt77ZoLgtvqZwhu3Rkdt269tKW5w

# 3. RESTART dev server
npm run dev
```

---

### Issue 3: "Firebase Messaging: false"

**This means messaging couldn't initialize.**

**Possible causes:**
1. Browser doesn't support push notifications
   - **Solution:** Use Chrome, Firefox, or Edge (not Safari < 16.4)

2. HTTPS requirement
   - **Solution:** localhost is okay, but custom domains need HTTPS

3. Service Worker blocked
   - **Solution:** Check browser console for errors

---

### Issue 4: "Service worker registration failed"

**Check:**
1. Is `public/firebase-messaging-sw.js` present?
   ```bash
   ls public/firebase-messaging-sw.js
   ```

2. Are there syntax errors in the service worker?
   - Check browser console for specific errors

3. Is service worker blocked by browser?
   - Check browser settings

---

### Issue 5: "Permission already granted but no token"

**This means permission was granted but token generation failed.**

**Solution:**
```javascript
// Open browser console and run:
console.log('Current permission:', Notification.permission);

// If "granted", try to manually request token:
// (This is just for debugging - the app should do this automatically)
```

Check console for specific error message.

---

## 🧪 Manual Testing Commands

Open browser console and run these to debug:

### Check Environment Variables:
```javascript
console.log('VAPID:', import.meta.env.VITE_FIREBASE_VAPID_KEY ? 'Present' : 'MISSING');
```

### Check Notification API:
```javascript
console.log('Notification permission:', Notification.permission);
console.log('Service Worker supported:', 'serviceWorker' in navigator);
```

### Check Service Worker:
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service Workers:', regs.length);
  regs.forEach(reg => console.log('  -', reg.active?.scriptURL));
});
```

---

## ✅ Success Checklist

Your push notifications are working when you see:

- [ ] ✅ VAPID Key loaded in console
- [ ] ✅ Firebase Messaging initialized
- [ ] ✅ Push notification support detected
- [ ] ✅ Notification prompt appears after login (for admins)
- [ ] ✅ Permission granted successfully
- [ ] ✅ FCM token obtained
- [ ] ✅ FCM token saved to Firestore user document
- [ ] ✅ Service worker active in DevTools
- [ ] ✅ Can receive test notifications

---

## 🆘 Still Not Working?

Run this complete diagnostic:

```bash
# 1. Check .env file
cat .env

# 2. Restart dev server
npm run dev

# 3. Open browser in incognito/private mode
# 4. Open DevTools (F12)
# 5. Go to Console tab
# 6. Clear console (Ctrl+L)
# 7. Login as admin
# 8. Copy ALL console output
# 9. Check for any red error messages
```

**Look for these specific messages:**
1. "✅ VAPID Key loaded" - If missing, dev server not restarted
2. "✅ Firebase Messaging initialized" - If missing, browser not supported
3. "✅ All conditions met" - If missing, check why conditions failed
4. "✅ FCM token obtained" - If missing, check for errors above it

---

## 📞 Next Steps

1. **Restart dev server** ← Most important!
2. **Clear browser cache and console**
3. **Login as admin**
4. **Wait 3 seconds**
5. **Check console output**
6. **Share console output if still having issues**

The console messages will tell us exactly what's wrong!
