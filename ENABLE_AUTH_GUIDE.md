# 🔥 URGENT: Enable Firebase Authentication

## ❌ Current Error

You're seeing this error because Email/Password authentication is **NOT enabled** in Firebase Console:

```
E/RecaptchaCallWrapper: Initial task failed for action RecaptchaAction(action=signUpPassword)
with exception - An internal error has occurred. [ CONFIGURATION_NOT_FOUND ]
```

---

## ✅ Solution: Enable Authentication in Firebase Console

### Quick Link (Click to Open):
🔗 **https://console.firebase.google.com/project/salesiq-f0530/authentication/providers**

---

## 📋 Step-by-Step Instructions

### 1. Open Firebase Console
- Click the link above, or
- Go to https://console.firebase.google.com/
- Select project: **salesiq-f0530**

### 2. Navigate to Authentication
- In the left sidebar, click **"Build"**
- Click **"Authentication"**
- If this is your first time, click **"Get Started"** button
- Otherwise, click the **"Sign-in method"** tab at the top

### 3. Enable Email/Password
You'll see a list of authentication providers:

```
Native providers:
┌─────────────────────┬──────────┐
│ Email/Password      │ Disabled │  ← Click this one!
├─────────────────────┼──────────┤
│ Phone               │ Disabled │
├─────────────────────┼──────────┤
│ Google              │ Disabled │
└─────────────────────┴──────────┘
```

- Click on **"Email/Password"** row
- A dialog will appear
- Toggle the **"Enable"** switch to ON
- (Optional) Enable "Email link (passwordless sign-in)" if you want
- Click **"Save"** button

### 4. Verify It's Enabled
After saving, you should see:

```
Native providers:
┌─────────────────────┬──────────┐
│ Email/Password      │ Enabled  │  ← Should show "Enabled"
└─────────────────────┴──────────┘
```

---

## 🧪 Test After Enabling

Once you've enabled Email/Password authentication:

1. **Restart your app** (if running)
   ```bash
   # Stop the app and run again
   flutter run
   ```

2. **Try signing up again**
   - Enter name: Test User
   - Enter email: sarathykgf5@gmail.com (or any email)
   - Enter password: test123 (or any 6+ characters)
   - Click "Sign Up"

3. **Check Firebase Console**
   - Go to: Authentication → Users
   - Your new user should appear in the list

---

## 🎯 What This Enables

Once Email/Password authentication is enabled, you'll be able to:

✅ Create new user accounts with email/password
✅ Sign in existing users
✅ Reset passwords
✅ Manage users in Firebase Console
✅ See user analytics and activity

---

## 🔍 Troubleshooting

### Still seeing CONFIGURATION_NOT_FOUND?
- Make sure you saved the changes in Firebase Console
- Wait 1-2 minutes for changes to propagate
- Restart your app completely
- Clear app data and try again

### Can't find Authentication in Firebase Console?
- Make sure you're in the correct project (salesiq-f0530)
- Look under "Build" section in the left sidebar
- If you don't see it, your Firebase account may not have proper permissions

### "Get Started" button not appearing?
- You may already have Authentication initialized
- Look for the "Sign-in method" tab at the top
- Click it to see the list of providers

---

## 📞 Need Help?

If you're still having issues:

1. **Check Firebase Project**
   - Verify you're in project: salesiq-f0530
   - Project number should be: 176891083985

2. **Check Permissions**
   - Make sure you have Editor or Owner role in the Firebase project
   - Ask project admin to grant access if needed

3. **Firebase Status**
   - Check: https://status.firebase.google.com/
   - Ensure all services are operational

---

## 🚀 After Enabling

Once authentication is enabled, your app will:

1. Successfully create user accounts
2. Store user credentials securely in Firebase
3. Allow users to sign in/out
4. Persist login sessions
5. Integrate with your SalesIQ features

**This is a one-time setup. Once enabled, it stays enabled for your project.**

---

## ⚡ Quick Summary

**Problem:** Authentication not configured in Firebase
**Solution:** Enable Email/Password in Firebase Console
**Link:** https://console.firebase.google.com/project/salesiq-f0530/authentication/providers
**Action:** Click Email/Password → Enable → Save

**That's it! Your authentication will work after this.**
