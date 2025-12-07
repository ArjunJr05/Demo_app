# 🚀 Quick Start Guide - SalesIQ Mobile Form Trigger

## 1️⃣ Setup (5 minutes)

### Get SalesIQ Keys
1. Go to [SalesIQ Dashboard](https://salesiq.zoho.com)
2. **Settings** → **Brands** → Your Brand → **Installation** → **Mobile SDK**
3. Copy **App Key** and **Access Key**

### Update Flutter Code
```dart
// lib/main.dart line 75-76
const String appKey = 'YOUR_APP_KEY_HERE';     // ← Paste your App Key
const String accessKey = 'YOUR_ACCESS_KEY_HERE'; // ← Paste your Access Key
```

### Install Dependencies
```bash
flutter pub get
```

---

## 2️⃣ Configure SalesIQ Bot (3 minutes)

### Create Bot
1. **SalesIQ Dashboard** → **Settings** → **Bots** → **Create Bot**
2. **Name:** "Resume Form Trigger Bot"

### Add Trigger
```
Trigger Type: Page Visit
Condition: Page Title equals "RESUME_FORM_TRIGGER"
```

### Add Action
```
Action: Show Form
Form: [Select your Resume Upload Form]
```

### Publish Bot
Click **Publish** → **Activate**

---

## 3️⃣ Create Form (2 minutes)

1. **SalesIQ Dashboard** → **Settings** → **Forms** → **Create Form**
2. **Name:** "Resume Upload Form"
3. **Add Fields:**
   - Name (Text)
   - Email (Email)
   - Phone (Phone)
   - Resume (File Upload) ← **Important**
4. **Save Form**

---

## 4️⃣ Test (1 minute)

### Run App
```bash
flutter run
```

### Test Flow
1. Click **"Open Chat & Trigger Resume Form"**
2. Chat opens
3. Form appears automatically (within 3 seconds)
4. Upload resume file
5. Submit form

### Expected Debug Output
```
✅ SalesIQ SDK initialized
✅ Visitor name set: Arjun Kumar
✅ Visitor email set: arjunfree256@gmail.com
✅ Chat opened
✅ Page title set to RESUME_FORM_TRIGGER
✅ Form trigger sequence completed
```

---

## 🐛 Troubleshooting

### Form Doesn't Appear?

**Check 1: Bot is Active**
```
SalesIQ Dashboard → Bots → Ensure "Active" toggle is ON
```

**Check 2: Page Title Matches**
```dart
// Must be EXACTLY this string
ZohoSalesIQ.setPageTitle('RESUME_FORM_TRIGGER');
```

**Check 3: Visitor Email is Set**
```dart
// Must be set BEFORE opening chat
await ZohoSalesIQ.setVisitorEmail('user@example.com');
```

### Android Build Fails?

```gradle
// android/app/build.gradle
minSdkVersion 21  // ✅ Must be 21 or higher
multiDexEnabled true  // ✅ Must be enabled
```

### iOS Build Fails?

```bash
cd ios
pod install
cd ..
flutter clean
flutter run
```

---

## 📱 Platform-Specific Setup

### Android
- ✅ `minSdkVersion 21`
- ✅ `multiDexEnabled true`
- ✅ Internet permission (already in AndroidManifest.xml)
- ✅ ProGuard rules (already in proguard-rules.pro)

### iOS
- ✅ iOS 12.0+
- ✅ Camera/Photo permissions (already in Info.plist)
- ✅ ATS allowance (already in Info.plist)

---

## 🎯 Key Points

1. **Set visitor data BEFORE opening chat**
   ```dart
   await ZohoSalesIQ.setVisitorEmail('user@example.com');
   ZohoSalesIQ.show();  // Open chat AFTER setting data
   ```

2. **Use exact page title in bot**
   ```
   Flutter: ZohoSalesIQ.setPageTitle('RESUME_FORM_TRIGGER');
   Bot: Page Title equals "RESUME_FORM_TRIGGER"
   ```

3. **Add 1.5 second delay**
   ```dart
   ZohoSalesIQ.show();
   await Future.delayed(Duration(milliseconds: 1500));
   ZohoSalesIQ.setPageTitle('RESUME_FORM_TRIGGER');
   ```

---

## 📚 Full Documentation

See `SALESIQ_MOBILE_FORM_TRIGGER_GUIDE.md` for:
- Complete technical explanation
- Advanced troubleshooting
- Production deployment guide
- Bot configuration examples

---

## ✅ Success Checklist

- [ ] SalesIQ keys added to main.dart
- [ ] `flutter pub get` completed
- [ ] Bot created and published
- [ ] Form created with file upload field
- [ ] App runs without errors
- [ ] Chat opens when button clicked
- [ ] Form appears automatically
- [ ] File upload works
- [ ] Form submission succeeds

---

## 🆘 Still Having Issues?

1. Check debug log in app (scroll down in Debug Log section)
2. Verify visitor appears in SalesIQ Dashboard → Visitors
3. Check bot trigger conditions match exactly
4. See full guide: `SALESIQ_MOBILE_FORM_TRIGGER_GUIDE.md`
5. Contact: support@zohosalesiq.com

---

**Total Setup Time: ~10 minutes**

**Result: Reliable form triggering in mobile app** ✅
