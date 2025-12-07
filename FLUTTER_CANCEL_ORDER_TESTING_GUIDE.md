# 🧪 FLUTTER CANCEL ORDER - TESTING GUIDE

## ✅ ISSUE FIXED

**Problem:** Webhook was failing to fetch orders from Firestore due to missing Firebase credentials.

**Solution:** Flutter app now fetches cancellable orders **directly from Firestore** instead of relying on the webhook.

---

## 📱 HOW TO TEST IN FLUTTER APP

### **Step 1: Open Your Flutter App**
```bash
cd c:\Users\arjun\salesiq
flutter run
```

### **Step 2: Login**
- Login with: `arjunfree256@gmail.com`
- This email matches the order in your Firestore

### **Step 3: Navigate to Orders**
1. Go to "My Orders" or "Order History"
2. You should see your order: **ORD1765047901843**
   - Product: Sample Product
   - Amount: ₹999
   - Status: processing

### **Step 4: Click on the Order**
- Tap on the order to open Order Details screen

### **Step 5: Click "Cancel Order" Button**
- You'll see an orange "Cancel Order" button
- Tap it

### **Step 6: Fill Cancellation Form**
The form will show:
```
┌──────────────────────────────────────────┐
│ Cancel Order                              │
├──────────────────────────────────────────┤
│ Order #ORD1765047901843                  │
│                                           │
│ Reason for Cancellation: *                │
│ [                                    ]    │
│ [                                    ]    │
│                                           │
│ Refund Method: *                          │
│ [▼ Original Payment Method          ]    │
│                                           │
│ [Submit Cancellation Request]            │
└──────────────────────────────────────────┘
```

**Fill in:**
- Reason: "Changed my mind about the purchase"
- Refund Method: "Original Payment Method"

### **Step 7: Submit**
- Tap "Submit Cancellation Request"

---

## 🔍 WHAT HAPPENS BEHIND THE SCENES

### **1. Flutter Fetches Order from Firestore**
```dart
// lib/services/order_cancellation_service.dart
QuerySnapshot snapshot = await _firestore
    .collection('orders')
    .where('customerEmail', isEqualTo: 'arjunfree256@gmail.com')
    .where('status', 'in', ['confirmed', 'processing', 'pending'])
    .get();
```

### **2. Flutter Submits to Webhook**
```dart
POST https://nonchivalrous-paranoidly-cara.ngrok-free.dev/salesiq/form-submit
Headers:
  X-Webhook-Secret: your_shared_secret_here_change_in_production

Body:
{
  "order_id": "ORD1765047901843",
  "user_id": "arjunfree256@gmail.com",
  "action": "cancel",
  "cancellation_reason": "Changed my mind about the purchase",
  "refund_method": "original_payment",
  "date": "2025-12-07T...",
  "source": "flutter_app"
}
```

### **3. Webhook Updates Firestore**
```javascript
await db.collection('orders').doc('ORD1765047901843').update({
  status: 'CANCELLED',
  cancel_reason: "Changed my mind about the purchase",
  refund: {
    amount: 999,
    method: "original_payment",
    reference: "REF_CANCEL_1733567890123",
    status: "initiated"
  }
});
```

### **4. Flutter Shows Success**
```
✅ Order #ORD1765047901843 canceled successfully!

💰 Refund Amount: ₹999
📝 Reference: REF_CANCEL_1733567890123
📅 Refund will be processed within 3-5 business days

📧 You will receive a confirmation email shortly.
```

---

## 📊 VERIFY IN FIREBASE CONSOLE

### **Before Cancellation:**
```
orders/ORD1765047901843:
{
  customerEmail: "arjunfree256@gmail.com",
  customerName: "Arjun",
  status: "OrderStatus.processing",
  totalAmount: 999,
  items: [...]
}
```

### **After Cancellation:**
```
orders/ORD1765047901843:
{
  customerEmail: "arjunfree256@gmail.com",
  customerName: "Arjun",
  status: "CANCELLED",  ← CHANGED
  totalAmount: 999,
  items: [...],
  cancel_reason: "Changed my mind about the purchase",  ← NEW
  cancel_date: "2025-12-07T...",  ← NEW
  refund: {  ← NEW
    amount: 999,
    method: "original_payment",
    reference: "REF_CANCEL_1733567890123",
    status: "initiated"
  }
}
```

### **New Issue Created:**
```
issues/ISS_1733567890123:
{
  customerEmail: "arjunfree256@gmail.com",
  orderId: "ORD1765047901843",
  issueType: "Order Cancellation",
  description: "Changed my mind about the purchase",
  status: "Processing",
  priority: "High",
  createdAt: Timestamp
}
```

---

## 🎯 EXPECTED TERMINAL OUTPUT

### **Flutter App Console:**
```
🔄 Submitting cancellation via OrderCancellationService...
🔍 Fetching cancellable orders from Firestore for: arjunfree256@gmail.com
✅ Found 1 cancellable orders from Firestore
📤 Submitting cancellation request for order: ORD1765047901843
📥 Response status: 200
📥 Response body: {"success":true,"order_id":"ORD1765047901843",...}
✅ Cancellation successful: Order #ORD1765047901843 canceled successfully!
```

### **Webhook Server Console:**
```
📥 ===== SALESIQ FORM SUBMISSION =====
Timestamp: 2025-12-07T...
✅ Webhook secret validated
📋 Normalized Form Data:
  Order ID: ORD1765047901843
  User ID: arjunfree256@gmail.com
  Action: cancel
  Reason: Changed my mind about the purchase
  Refund Method: original_payment
📦 Order found in Firestore: ORD1765047901843
✅ Order ORD1765047901843 updated to CANCELLED in Firestore
✅ Issue ISS_1733567890123 created in Firestore
💰 Initiating refund: ₹999 via original_payment
📝 Refund reference: REF_CANCEL_1733567890123
```

---

## 🐛 TROUBLESHOOTING

### **Issue: "No cancellable orders found"**
**Cause:** Order status in Firestore is not 'confirmed', 'processing', or 'pending'

**Fix:**
1. Open Firebase Console
2. Go to Firestore Database
3. Find your order: `orders/ORD1765047901843`
4. Check `status` field
5. It should be one of:
   - `OrderStatus.confirmed`
   - `OrderStatus.processing`
   - `OrderStatus.pending`
   - `confirmed` (string)
   - `processing` (string)
   - `pending` (string)

### **Issue: "Failed to fetch orders"**
**Cause:** Flutter app can't connect to Firestore

**Fix:**
1. Check internet connection
2. Verify Firebase is initialized in `main.dart`:
   ```dart
   await Firebase.initializeApp(
     options: DefaultFirebaseOptions.currentPlatform,
   );
   ```
3. Check `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) is present

### **Issue: "Error: 401 Unauthorized"**
**Cause:** Webhook secret mismatch

**Fix:**
1. Open `lib/services/order_cancellation_service.dart`
2. Update `WEBHOOK_SECRET` to match webhook server:
   ```dart
   static const String WEBHOOK_SECRET = 'your_shared_secret_here_change_in_production';
   ```

### **Issue: "Order status not updating in Firestore"**
**Cause:** Webhook can't access Firestore

**Fix:**
1. Check webhook server has Firebase credentials
2. Verify `serviceAccountKey.json` is in webhook directory
3. Check environment variable:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=path/to/serviceAccountKey.json
   ```

---

## ✅ SUCCESS CRITERIA

- [ ] Flutter app displays order with "Cancel Order" button
- [ ] Clicking "Cancel Order" shows cancellation form
- [ ] Form has all required fields (reason, refund method)
- [ ] Submitting form shows success message
- [ ] Firestore order status changes to "CANCELLED"
- [ ] Firestore has `cancel_reason` and `refund` fields
- [ ] New issue created in `issues` collection
- [ ] Flutter app shows updated order status

---

## 📸 SCREENSHOTS TO VERIFY

1. **Order Details Screen** - showing "Cancel Order" button
2. **Cancellation Form** - filled with reason and refund method
3. **Success Dialog** - showing refund details
4. **Firebase Console** - showing updated order status
5. **Firebase Console** - showing new issue created

---

## 🚀 NEXT STEPS

1. **Test in your Flutter app** - Follow steps above
2. **Verify in Firebase** - Check order status changed
3. **Test edge cases**:
   - Try cancelling already cancelled order (should fail)
   - Try cancelling shipped order (should fail)
   - Try with empty reason (should show validation error)
4. **Test in SalesIQ chat** - Click "Cancel Order" in chat
5. **Compare both flows** - Ensure both work identically

---

## 📞 SUPPORT

If you encounter any issues:
1. Check Flutter console for error messages
2. Check webhook terminal for error logs
3. Check Firebase Console for data changes
4. Share screenshots and error messages

**Everything is now ready for testing!** 🎉
