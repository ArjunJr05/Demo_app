# 🔄 FIRESTORE RESTRUCTURE - ORDERS AS SUBCOLLECTION

## ✅ **WHAT CHANGED**

Your Firestore database structure has been updated to store orders as **subcollections under users**, matching the pattern used for `cart` and `favorites`.

---

## 📊 **NEW FIRESTORE STRUCTURE**

### **Before (Old Structure):**
```
Firestore Root
├── orders/                    ← Top-level collection
│   ├── ORD1765047901843
│   ├── ORD1765047901844
│   └── ...
├── products/
└── users/
    └── {userId}/
        ├── cart/              ← Subcollection
        └── favorites/         ← Subcollection
```

### **After (New Structure):**
```
Firestore Root
├── products/
├── issues/                    ← Top-level (shared across users)
└── users/
    └── {userId}/
        ├── email: "user@example.com"
        ├── name: "User Name"
        ├── phone: "..."
        ├── cart/              ← Subcollection
        ├── favorites/         ← Subcollection
        └── orders/            ← NEW Subcollection ✅
            └── {orderId}/
                ├── id: "ORD123"
                ├── customerId: "userId"
                ├── customerEmail: "user@example.com"
                ├── customerName: "User Name"
                ├── items: [...]
                ├── totalAmount: 999
                ├── status: "processing"
                ├── orderDate: Timestamp
                ├── deliveryDate: Timestamp
                └── ...
```

---

## 🎯 **BENEFITS OF THIS STRUCTURE**

### **1. Better Data Organization**
- All user-specific data in one place
- Easier to manage user data
- Consistent with `cart` and `favorites` pattern

### **2. Improved Security**
- Firestore security rules can easily restrict access
- Users can only read/write their own orders
- No need to filter by `customerEmail` in queries

### **3. Better Performance**
- Faster queries (no need to filter by email)
- Smaller index sizes
- Automatic data locality

### **4. Easier Data Management**
- Delete user → automatically deletes all their orders
- Export user data → includes all orders
- GDPR compliance → easier to delete all user data

---

## 📝 **FILES UPDATED**

### **1. Flutter - `lib/services/firestore_service.dart`**

#### **createOrder()**
```dart
// ✅ NEW: Store order as subcollection under user
await _firestore
    .collection('users')
    .doc(customerId)
    .collection('orders')
    .doc(orderId)
    .set(orderData);

print('✅ Order created: users/$customerId/orders/$orderId');
```

#### **getCustomerOrders()**
```dart
// ✅ NEW: Fetch from users/{customerId}/orders subcollection
QuerySnapshot snapshot = await _firestore
    .collection('users')
    .doc(customerId)
    .collection('orders')
    .orderBy('orderDate', descending: true)
    .get();
```

#### **getOrder()**
```dart
// ✅ NEW: Requires customerId parameter
static Future<Order?> getOrder(String customerId, String orderId) async {
  DocumentSnapshot doc = await _firestore
      .collection('users')
      .doc(customerId)
      .collection('orders')
      .doc(orderId)
      .get();
  // ...
}
```

#### **updateOrderStatus()**
```dart
// ✅ NEW: Requires customerId parameter
static Future<void> updateOrderStatus({
  required String customerId,  // NEW
  required String orderId,
  required OrderStatus status,
  String? trackingNumber,
}) async {
  await _firestore
      .collection('users')
      .doc(customerId)
      .collection('orders')
      .doc(orderId)
      .update(updates);
}
```

---

### **2. Flutter - `lib/services/order_cancellation_service.dart`**

#### **fetchCancellableOrders()**
```dart
// Get userId from email first
QuerySnapshot userSnapshot = await _firestore
    .collection('users')
    .where('email', isEqualTo: customerEmail)
    .limit(1)
    .get();

String userId = userSnapshot.docs.first.id;

// ✅ NEW: Query from users/{userId}/orders subcollection
QuerySnapshot snapshot = await _firestore
    .collection('users')
    .doc(userId)
    .collection('orders')
    .orderBy('orderDate', descending: true)
    .get();
```

---

### **3. Webhook - `webhook_local.js`**

#### **New Helper Function: getUserIdFromEmail()**
```javascript
async function getUserIdFromEmail(email) {
  const userSnapshot = await db.collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();
  
  if (userSnapshot.empty) {
    return null;
  }
  
  return userSnapshot.docs[0].id;
}
```

#### **saveOrderToFirestore()**
```javascript
// Get userId from customerEmail
const userId = await getUserIdFromEmail(orderData.customerEmail);

// ✅ NEW: Save to users/{userId}/orders/{orderId}
await db.collection('users')
  .doc(userId)
  .collection('orders')
  .doc(orderData.id)
  .set(orderDoc);

console.log(`✅ Order saved: users/${userId}/orders/${orderData.id}`);
```

#### **updateOrderStatusInFirestore()**
```javascript
async function updateOrderStatusInFirestore(orderId, newStatus, customerEmail, additionalData) {
  // Get userId from customerEmail
  const userId = await getUserIdFromEmail(customerEmail);
  
  // ✅ NEW: Update in users/{userId}/orders/{orderId}
  await db.collection('users')
    .doc(userId)
    .collection('orders')
    .doc(orderId)
    .update(updateData);
}
```

#### **handleCancelAction()**
```javascript
// Get userId from email first
const userId = await getUserIdFromEmail(visitorInfo.email);

// ✅ NEW: Query from users/{userId}/orders subcollection
const ordersSnapshot = await db.collection('users')
  .doc(userId)
  .collection('orders')
  .orderBy('orderDate', 'desc')
  .get();
```

#### **Form Submission Endpoint**
```javascript
// Get userId from email
const userId = await getUserIdFromEmail(normalizedUserId);

// ✅ NEW: Fetch from users/{userId}/orders/{orderId}
const orderDoc = await db.collection('users')
  .doc(userId)
  .collection('orders')
  .doc(normalizedOrderId)
  .get();

// ✅ NEW: Update in users/{userId}/orders/{orderId}
await db.collection('users')
  .doc(userId)
  .collection('orders')
  .doc(normalizedOrderId)
  .update({
    status: newStatus,
    // ...
  });
```

---

## 🔄 **DATA MIGRATION REQUIRED**

### **⚠️ IMPORTANT: You need to migrate existing orders**

If you have existing orders in the top-level `orders/` collection, you need to move them to the new structure.

### **Migration Script (Run Once):**

```javascript
// migration_script.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateOrders() {
  console.log('🔄 Starting order migration...');
  
  // Get all orders from top-level collection
  const ordersSnapshot = await db.collection('orders').get();
  
  console.log(`📦 Found ${ordersSnapshot.size} orders to migrate`);
  
  for (const orderDoc of ordersSnapshot.docs) {
    const orderData = orderDoc.data();
    const customerEmail = orderData.customerEmail;
    
    if (!customerEmail) {
      console.log(`⚠️ Skipping order ${orderDoc.id} - no customerEmail`);
      continue;
    }
    
    // Find user by email
    const userSnapshot = await db.collection('users')
      .where('email', '==', customerEmail)
      .limit(1)
      .get();
    
    if (userSnapshot.empty) {
      console.log(`⚠️ No user found for email: ${customerEmail}`);
      continue;
    }
    
    const userId = userSnapshot.docs[0].id;
    
    // Copy order to users/{userId}/orders/{orderId}
    await db.collection('users')
      .doc(userId)
      .collection('orders')
      .doc(orderDoc.id)
      .set(orderData);
    
    console.log(`✅ Migrated order ${orderDoc.id} to users/${userId}/orders/${orderDoc.id}`);
  }
  
  console.log('✅ Migration complete!');
  console.log('⚠️ IMPORTANT: Verify all orders migrated correctly before deleting old collection');
}

migrateOrders().catch(console.error);
```

### **Run Migration:**
```bash
cd c:\Users\arjun\salesiq\webhook
node migration_script.js
```

### **After Migration:**
1. **Verify** all orders are in new location
2. **Test** order creation, fetching, and cancellation
3. **Delete** old `orders/` collection (optional)

---

## 🧪 **TESTING THE NEW STRUCTURE**

### **Test 1: Create New Order**
```dart
// In your Flutter app
String orderId = await FirestoreService.createOrder(
  customerId: currentUser.uid,
  customerName: currentUser.displayName,
  customerEmail: currentUser.email,
  // ...
);

// Check Firebase Console:
// users/{userId}/orders/{orderId} should exist
```

### **Test 2: Fetch Orders**
```dart
List<Order> orders = await FirestoreService.getCustomerOrders(currentUser.uid);
print('Found ${orders.length} orders');
```

### **Test 3: Cancel Order**
```dart
// Click "Cancel Order" in app
// Check Firebase Console:
// users/{userId}/orders/{orderId}/status should be "CANCELLED"
```

### **Test 4: Webhook Integration**
```
1. Open SalesIQ chat
2. Click "Cancel Order"
3. Select an order
4. Submit cancellation form
5. Check Firebase Console:
   - users/{userId}/orders/{orderId}/status = "CANCELLED"
   - issues/{issueId} created
```

---

## 📊 **FIRESTORE SECURITY RULES**

Update your Firestore security rules to match the new structure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      // User can read/write their own document
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Cart subcollection
      match /cart/{cartItemId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Favorites subcollection
      match /favorites/{favoriteId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // ✅ NEW: Orders subcollection
      match /orders/{orderId} {
        // User can read their own orders
        allow read: if request.auth != null && request.auth.uid == userId;
        
        // User can create orders
        allow create: if request.auth != null && request.auth.uid == userId;
        
        // User can update their own orders (for cancellation)
        allow update: if request.auth != null && request.auth.uid == userId;
        
        // Only admin can delete orders
        allow delete: if false;
      }
    }
    
    // Products collection (public read)
    match /products/{productId} {
      allow read: if true;
      allow write: if false; // Only admin can write
    }
    
    // Issues collection (user can create, admin can read/write)
    match /issues/{issueId} {
      allow create: if request.auth != null;
      allow read, update: if request.auth != null; // Add admin check in production
    }
  }
}
```

---

## ✅ **VERIFICATION CHECKLIST**

- [ ] Flutter app creates orders in `users/{userId}/orders/`
- [ ] Flutter app fetches orders from `users/{userId}/orders/`
- [ ] Flutter app can cancel orders
- [ ] Webhook fetches orders from `users/{userId}/orders/`
- [ ] Webhook updates orders in `users/{userId}/orders/`
- [ ] SalesIQ cancel order flow works end-to-end
- [ ] Firestore security rules updated
- [ ] Old `orders/` collection migrated (if applicable)
- [ ] Old `orders/` collection deleted (optional)

---

## 🚀 **NEXT STEPS**

1. **Test in your Flutter app** - Create a new order and verify it's in the right location
2. **Run migration script** - If you have existing orders
3. **Update security rules** - Apply the new rules in Firebase Console
4. **Test cancellation flow** - Verify end-to-end functionality
5. **Delete old collection** - After verifying everything works

---

## 📞 **SUPPORT**

If you encounter any issues:
- Check Firebase Console to verify data location
- Check Flutter console for error messages
- Check webhook terminal for error logs
- Verify `getUserIdFromEmail()` is finding users correctly

**Everything is ready for the new structure!** 🎉
