# 🎯 Complete SalesIQ Mobile SDK Form Trigger Implementation Guide

## 📋 Table of Contents
1. [Problem Analysis](#problem-analysis)
2. [Solution Architecture](#solution-architecture)
3. [Flutter Implementation](#flutter-implementation)
4. [SalesIQ Bot Configuration](#salesiq-bot-configuration)
5. [Testing & Debugging](#testing--debugging)
6. [Troubleshooting](#troubleshooting)

---

## 🔍 Problem Analysis

### Why Mobile Triggers Don't Work Like Web

| Aspect | Web Triggers | Mobile SDK Triggers |
|--------|-------------|---------------------|
| **Session Tracking** | Cookies + localStorage | Native session management |
| **Lifecycle Events** | Page load, DOM ready | App launch, foreground/background |
| **Visitor Identification** | Automatic via cookies | Requires explicit SDK calls |
| **Form Triggers** | Fire on page rules | Require visitor data + events |
| **Reliability** | High (browser-based) | Medium (depends on SDK init) |

### Root Causes of Mobile Trigger Failures

1. **SDK Initialization Timing**
   - Triggers fire before SDK is fully ready
   - Visitor data not set when trigger evaluates

2. **Lifecycle Mismatch**
   - Web: `PAGE_LOAD` → trigger fires
   - Mobile: `APP_LAUNCH` may not register as trigger event

3. **Visitor Tracking**
   - Web: Automatic via cookies
   - Mobile: Must explicitly call `setVisitorEmail()`, `setVisitorName()`

4. **Event Propagation**
   - Mobile SDK events don't always propagate to SalesIQ dashboard triggers
   - Native platform channels add latency

---

## 🏗️ Solution Architecture

### Two-Tier Trigger System

```
┌─────────────────────────────────────────────────────────┐
│                    FLUTTER APP                           │
│                                                          │
│  1. Initialize SalesIQ SDK                              │
│  2. Set Visitor Information (email, name, phone)        │
│  3. Open Chat                                           │
│  4. Send Trigger Signal                                 │
│     ├─ Method A: Page Title Tracking                    │
│     └─ Method B: Custom Visitor Info                    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  SALESIQ PLATFORM                        │
│                                                          │
│  ┌─────────────────────────────────────────┐            │
│  │          BOT (Primary Method)           │            │
│  │                                         │            │
│  │  Trigger Conditions:                   │            │
│  │  • Page Title = "RESUME_FORM_TRIGGER"  │            │
│  │  • OR Visitor Info: FormTrigger =      │            │
│  │    "RESUME_UPLOAD"                     │            │
│  │                                         │            │
│  │  Action:                                │            │
│  │  • Show Resume Upload Form              │            │
│  └─────────────────────────────────────────┘            │
│                                                          │
│  ┌─────────────────────────────────────────┐            │
│  │      TRIGGER (Fallback Method)          │            │
│  │                                         │            │
│  │  Conditions:                            │            │
│  │  • Visitor Email is set                 │            │
│  │  • Chat opened                          │            │
│  │                                         │            │
│  │  Action:                                │            │
│  │  • Show Form                            │            │
│  └─────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

---

## 📱 Flutter Implementation

### Step 1: Add Dependency

**pubspec.yaml**
```yaml
dependencies:
  flutter:
    sdk: flutter
  salesiq_mobilisten: ^5.0.0  # Latest version
```

Run:
```bash
flutter pub get
```

### Step 2: Get SalesIQ Keys

1. Go to **SalesIQ Dashboard** → **Settings** → **Brands**
2. Select your brand → **Installation**
3. Choose **Mobile SDK** → **Android** or **iOS**
4. Copy:
   - **App Key** (e.g., `siq12345678`)
   - **Access Key** (e.g., `abc123def456...`)

### Step 3: Update main.dart

Replace `YOUR_APP_KEY_HERE` and `YOUR_ACCESS_KEY_HERE` in the provided `main.dart` file.

### Key Implementation Points

```dart
// ✅ Initialize SDK early
await ZohoSalesIQ.init(appKey, accessKey);

// ✅ Set visitor data BEFORE opening chat
await ZohoSalesIQ.setVisitorName('John Doe');
await ZohoSalesIQ.setVisitorEmail('john@example.com');
await ZohoSalesIQ.setVisitorContactNumber('+1234567890');

// ✅ Open chat
ZohoSalesIQ.show();

// ✅ Send trigger signal
ZohoSalesIQ.setPageTitle('RESUME_FORM_TRIGGER');
await ZohoSalesIQ.setVisitorAddInfo('FormTrigger', 'RESUME_UPLOAD');
```

---

## 🤖 SalesIQ Bot Configuration

### Method 1: Page Title Trigger (Recommended)

1. **Go to SalesIQ Dashboard** → **Settings** → **Bots**
2. **Create New Bot** or edit existing
3. **Add Trigger Rule:**

```
Trigger Name: Resume Form Trigger
Trigger Type: Page Visit
Condition: Page Title equals "RESUME_FORM_TRIGGER"
```

4. **Add Action:**
   - Action Type: **Show Form**
   - Select Form: **Resume Upload Form**

5. **Save and Publish Bot**

### Method 2: Visitor Info Trigger (Fallback)

1. **Create Bot Trigger:**

```
Trigger Name: Resume Form by Visitor Info
Trigger Type: Visitor Info
Condition: FormTrigger equals "RESUME_UPLOAD"
```

2. **Add Action:**
   - Action Type: **Show Form**
   - Select Form: **Resume Upload Form**

3. **Save and Publish**

### Method 3: Keyword Trigger (Manual Fallback)

If automatic triggers fail, users can type a keyword:

1. **Create Bot Flow:**

```
User Message: "upload resume" OR "apply job" OR "resume"
Bot Response: Show Resume Upload Form
```

2. **Configuration:**
   - Trigger: **Message Contains**
   - Keywords: `upload resume`, `apply job`, `resume`
   - Action: **Show Form** → Resume Upload Form

---

## 🧪 Testing & Debugging

### Expected Debug Output

When you run the app and click "Open Chat & Trigger Resume Form":

```
[10:30:45] Starting SalesIQ initialization...
[10:30:45] ✅ SalesIQ SDK initialized
[10:30:45] ✅ In-app notifications enabled
[10:30:45] ✅ Chat launcher visible
[10:30:45] Registering SalesIQ event listeners...
[10:30:45] ✅ Using native event handling
[10:30:45] Setting visitor information...
[10:30:45] ✅ Visitor name set: Arjun Kumar
[10:30:45] ✅ Visitor email set: arjunfree256@gmail.com
[10:30:45] ✅ Visitor phone set: +919876543210
[10:30:45] ✅ Additional visitor info set
[10:30:45] 🎉 All visitor information set successfully
[10:30:45] ✅ Page title APP_LAUNCH tracked
[10:30:45] 🎉 SalesIQ fully initialized and ready
[10:30:50] Opening SalesIQ chat...
[10:30:50] ✅ Chat opened
[10:30:51] Sending form trigger message...
[10:30:51] ✅ Page title set to RESUME_FORM_TRIGGER
[10:30:51] ✅ Visitor trigger variable set
[10:30:51] 💡 Bot should now detect trigger and show form
[10:30:51] 📝 Configure your SalesIQ bot to respond when:
[10:30:51]    - Page Title = RESUME_FORM_TRIGGER
[10:30:51]    - OR Visitor Info: FormTrigger = RESUME_UPLOAD
[10:30:51] ✅ Form trigger sequence completed
```

### Verify in SalesIQ Dashboard

1. **Go to** → **Visitors** → **Active Visitors**
2. **Find your test visitor** (by email)
3. **Check:**
   - ✅ Visitor name, email, phone are set
   - ✅ Custom Info shows: `FormTrigger = RESUME_UPLOAD`
   - ✅ Page Title shows: `RESUME_FORM_TRIGGER`
4. **Open the chat** → Form should appear automatically

---

## 🔧 Troubleshooting

### Issue 1: SDK Not Initializing

**Symptoms:**
- App crashes on launch
- "SalesIQ not initialized" error

**Solutions:**
```dart
// ✅ Ensure keys are correct
const String appKey = 'siq12345678';  // NOT 'YOUR_APP_KEY_HERE'
const String accessKey = 'abc123...'; // Full access key

// ✅ Initialize before any other SalesIQ calls
await ZohoSalesIQ.init(appKey, accessKey);
```

### Issue 2: Chat Opens But No Form

**Symptoms:**
- Chat window opens
- No form appears
- No bot message

**Solutions:**

1. **Check Bot is Published:**
   - SalesIQ Dashboard → Bots → Ensure bot is **Active**

2. **Verify Trigger Conditions:**
   ```dart
   // Must match EXACTLY in bot configuration
   ZohoSalesIQ.setPageTitle('RESUME_FORM_TRIGGER');
   ```

3. **Check Visitor Data:**
   ```dart
   // Set BEFORE opening chat
   await ZohoSalesIQ.setVisitorEmail('user@example.com');
   ```

4. **Add Delay:**
   ```dart
   ZohoSalesIQ.show();
   await Future.delayed(Duration(milliseconds: 1500));
   ZohoSalesIQ.setPageTitle('RESUME_FORM_TRIGGER');
   ```

### Issue 3: Android Build Fails

**Error:** `Execution failed for task ':app:mergeReleaseResources'`

**Solution:**
```gradle
// android/app/build.gradle
android {
    defaultConfig {
        minSdkVersion 21  // ✅ Must be 21+
        multiDexEnabled true  // ✅ Required
    }
}
```

### Issue 4: iOS Build Fails

**Error:** `Undefined symbol: _OBJC_CLASS_$_ZohoSalesIQ`

**Solution:**
```bash
cd ios
pod deintegrate
pod install
cd ..
flutter clean
flutter pub get
flutter run
```

### Issue 5: Visitor Data Not Showing

**Symptoms:**
- Chat opens
- SalesIQ dashboard shows "Anonymous Visitor"

**Solution:**
```dart
// ✅ Set visitor data IMMEDIATELY after init
await ZohoSalesIQ.init(appKey, accessKey);
await ZohoSalesIQ.setVisitorName('John Doe');
await ZohoSalesIQ.setVisitorEmail('john@example.com');
// THEN open chat
ZohoSalesIQ.show();
```

---

## 📊 Success Criteria Checklist

### Flutter App
- [ ] SalesIQ SDK initializes without errors
- [ ] Debug log shows all visitor info set
- [ ] Chat opens when button clicked
- [ ] Page title changes to `RESUME_FORM_TRIGGER`
- [ ] Visitor info includes `FormTrigger = RESUME_UPLOAD`

### SalesIQ Dashboard
- [ ] Bot is created and published
- [ ] Bot trigger matches page title or visitor info
- [ ] Bot action is set to "Show Form"
- [ ] Form is created with resume upload field
- [ ] Active visitor shows correct email/name

### End-to-End Test
- [ ] Open app
- [ ] Click "Open Chat & Trigger Resume Form"
- [ ] Chat opens within 2 seconds
- [ ] Form appears automatically within 3 seconds
- [ ] Form has file upload field
- [ ] Can upload resume file
- [ ] Form submission works

---

## 🎓 Technical Explanation

### Why This Approach Works

1. **Explicit Visitor Identification**
   - Mobile SDK requires manual `setVisitorEmail()` calls
   - Web automatically uses cookies
   - Solution: Set visitor data immediately after SDK init

2. **Bot-Based Triggers > Dashboard Triggers**
   - Bots run server-side, more reliable
   - Dashboard triggers depend on client-side events
   - Bots can check multiple conditions (page title + visitor info)

3. **Page Title as Signal**
   - `setPageTitle()` is a reliable SDK method
   - Propagates to SalesIQ server immediately
   - Bots can detect page title changes

4. **Visitor Info as Fallback**
   - `setVisitorAddInfo()` stores custom fields
   - Persists across chat sessions
   - Bot can check these fields

5. **Delay After Chat Open**
   - Gives SDK time to establish WebSocket connection
   - Ensures page title/visitor info reaches server
   - 1.5 second delay is optimal

---

## 🚀 Production Deployment

### Before Release

1. **Replace Test Keys:**
   ```dart
   // ❌ Don't hardcode in production
   const String appKey = 'YOUR_APP_KEY_HERE';
   
   // ✅ Use environment variables or secure storage
   final appKey = dotenv.env['SALESIQ_APP_KEY']!;
   ```

2. **Enable ProGuard (Android):**
   - Already configured in `proguard-rules.pro`
   - Test release build thoroughly

3. **Test on Real Devices:**
   - Android: Multiple manufacturers (Samsung, Xiaomi, OnePlus)
   - iOS: iPhone 8+ and iPad

4. **Monitor SalesIQ Analytics:**
   - Track form submission rate
   - Check for failed triggers
   - Monitor visitor drop-off

---

## 📞 Support

If issues persist:

1. **Check SalesIQ SDK Logs:**
   ```bash
   # Android
   adb logcat | grep -i salesiq
   
   # iOS
   # Xcode → Window → Devices → View Device Logs
   ```

2. **Contact Zoho Support:**
   - Email: support@zohosalesiq.com
   - Include: SDK version, platform, error logs

3. **Community:**
   - Zoho SalesIQ Community Forum
   - Stack Overflow: Tag `zoho-salesiq`

---

## ✅ Summary

This implementation provides:

- ✅ **Reliable form triggering** via bot-based system
- ✅ **Fallback mechanisms** (page title + visitor info + keywords)
- ✅ **Complete visitor tracking** (name, email, phone, custom fields)
- ✅ **Production-ready code** with error handling and logging
- ✅ **Cross-platform support** (Android 21+ and iOS 12+)
- ✅ **Debug visibility** with comprehensive logging

The key insight: **Don't rely on mobile SDK triggers alone**. Use bots to detect visitor state changes (page title, custom info) and trigger forms programmatically. This works reliably across all platforms.
