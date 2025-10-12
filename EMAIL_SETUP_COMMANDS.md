# Email Setup Commands - Gmail/Nodemailer

## Quick Setup Guide

Copy and run these commands to set up email notifications with your Gmail account.

---

## Step 1: Install Dependencies

```bash
cd functions
npm install
```

---

## Step 2: Set Firebase Functions Configuration

Run these commands to securely store your Gmail credentials:

```bash
# Set SMTP configuration for Gmail
firebase functions:config:set smtp.host="smtp.gmail.com"
firebase functions:config:set smtp.port="587"
firebase functions:config:set smtp.user="hossamsharif1990@gmail.com"
firebase functions:config:set smtp.pass="qcnfpfoqhvutteep"
firebase functions:config:set app.url="https://vavidiaapp.web.app"

# Verify configuration was set correctly
firebase functions:config:get
```

**Note:** The app password has been formatted without spaces for easier copying.

---

## Step 3: Build and Deploy Functions

```bash
# Build TypeScript
cd functions
npm run build

# Deploy only functions (faster)
firebase deploy --only functions

# OR deploy everything
firebase deploy
```

---

## Step 4: Test Email Functionality

After deployment completes, test the email function by visiting:

```
https://us-central1-vavidiaapp.cloudfunctions.net/testEmail
```

Or test with a different email:
```
https://us-central1-vavidiaapp.cloudfunctions.net/testEmail?email=youremail@example.com
```

---

## Step 5: Monitor Logs

Check if emails are sending correctly:

```bash
# View live logs
firebase functions:log --only testEmail

# View all function logs
firebase functions:log

# View specific function logs
firebase functions:log --only onTransactionCreated
```

---

## Troubleshooting

### If emails don't send:

1. **Check logs for errors:**
   ```bash
   firebase functions:log
   ```

2. **Verify config is set:**
   ```bash
   firebase functions:config:get
   ```
   Should show:
   ```json
   {
     "smtp": {
       "host": "smtp.gmail.com",
       "port": "587",
       "user": "hossamsharif1990@gmail.com",
       "pass": "qcnfpfoqhvutteep"
     },
     "app": {
       "url": "https://vavidiaapp.web.app"
     }
   }
   ```

3. **Check Gmail settings:**
   - Ensure 2FA is enabled on hossamsharif1990@gmail.com
   - Check Gmail hasn't blocked the login attempt
   - Verify app password is correct

4. **Test locally (optional):**
   ```bash
   cd functions
   npm run serve
   ```
   Then visit: http://localhost:5001/vavidiaapp/us-central1/testEmail

---

## Email Limits

- **Daily limit:** 500 emails/day (Gmail free account)
- **Rate limit:** ~20 emails/minute
- **Recipients per email:** 100 maximum

---

## Success Indicators

When working correctly, you'll see in logs:
- ✅ Gmail SMTP connection verified successfully
- ✅ Email sent successfully via Gmail/Nodemailer
- Message ID: <random-id@gmail.com>
- Accepted recipients: [list of emails]

---

## Production Checklist

- [x] Nodemailer added to package.json
- [x] emailService.ts configured for Gmail
- [x] config.ts uses Gmail address
- [x] Test function added
- [ ] Firebase config set (run commands above)
- [ ] Functions deployed
- [ ] Test email sent successfully
- [ ] Admin receives transaction emails

---

## All-in-One Command

For quick deployment after code changes:

```bash
cd functions && npm install && npm run build && firebase functions:config:set smtp.host="smtp.gmail.com" smtp.port="587" smtp.user="hossamsharif1990@gmail.com" smtp.pass="qcnfpfoqhvutteep" app.url="https://vavidiaapp.web.app" && firebase deploy --only functions
```

---

**Ready to deploy!** 🚀

After running these commands, your email notifications will be active. Admins will receive emails when:
- New transactions are created
- Transactions are updated
- Transactions are deleted