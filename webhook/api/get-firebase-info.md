# 🔥 How to Connect Your Firestore Database

## Quick Setup (2 minutes):

### **Step 1: Get Your Project ID**
1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Click on your project
3. Go to **Project Settings** (gear icon)
4. Copy your **Project ID** (it's something like `salesiq-12345` or similar)

### **Step 2: Update Firebase Config**
1. Open `firebase-config.js` in this folder
2. Replace `"your-project-id"` with your actual project ID:

```javascript
const firebaseConfig = {
  projectId: "your-actual-project-id-here", // Replace this!
};
```

### **Step 3: Set Environment Variable (Windows)**
Run this command in your terminal (replace with your project ID):

```bash
set GOOGLE_APPLICATION_CREDENTIALS=default
set FIREBASE_PROJECT_ID=your-actual-project-id-here
```

### **Step 4: Test the Connection**
Restart your webhook server:

```bash
npm start
```

You should see:
```
🔥 Firebase initialized with project ID
```

## Alternative: Service Account (More Secure)

If the above doesn't work, download a service account key:

1. Go to **Firebase Console** → **Project Settings** → **Service Accounts**
2. Click **"Generate new private key"**
3. Download the JSON file
4. Rename it to `firebase-service-account.json`
5. Place it in this folder (`webhook/api/`)

## Your Firestore Structure

Based on your screenshots, you have:
- **users** collection with `arjunfree256@gmail.com`
- **orders** collection with order data

The webhook will now automatically:
1. ✅ Look in `users` collection for customer profile
2. ✅ Look in `orders` collection for customer orders  
3. ✅ Show action buttons for Return/Cancel/Other
4. ✅ Handle order status logic properly

## Test It!

Once connected, test with:
- Email: `arjunfree256@gmail.com` → Should load your real Firestore data
- Email: `priya@gmail.com` → Should load mock data
- No email → Should show customer data form

The webhook will work with **both** your real Firestore data AND mock data as fallback! 🚀
