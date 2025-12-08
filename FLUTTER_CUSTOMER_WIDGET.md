# 📱 Flutter Customer Widget Package

## Overview

The `salesiq_customer_widget` package provides a seamless integration between your Flutter e-commerce app and Zoho SalesIQ, automatically displaying comprehensive customer context to support agents.

---

## 📋 Table of Contents

- [Package Information](#package-information)
- [Features](#features)
- [Installation](#installation)
- [Setup Guide](#setup-guide)
- [Usage](#usage)
- [Complete Flow](#complete-flow)
- [Firestore Integration](#firestore-integration)
- [Customization](#customization)
- [Troubleshooting](#troubleshooting)

---

## 📦 Package Information

- **Package Name:** `salesiq_customer_widget`
- **Version:** 1.0.0
- **Publisher:** Arjun .D
- **License:** MIT
- **Platform:** Flutter (Android, iOS, Web)
- **pub.dev:** https://pub.dev/packages/salesiq_customer_widget

---

## ✨ Features

### **Automatic Customer Identification**
- ✅ Identifies users via email/phone from Flutter app
- ✅ Fetches complete customer profile from Firestore
- ✅ Displays real-time data in SalesIQ operator dashboard

### **Comprehensive Customer Widget**
- 👤 **Customer Profile:** Name, Email, Phone, Loyalty Status
- 📦 **Order History:** Recent orders with status and details
- 🛒 **Active Cart:** Current cart items
- ❤️ **Favorites:** Saved products
- 📊 **Analytics:** Total orders, spending, average order value
- ⚠️ **Support Issues:** Active and resolved issues

### **Smart Order Management**
- ✅ **Clickable Order Cards:** Each order displays complete details
- ✅ **Status-Based Actions:** 
  - Cancel button for pending/processing orders
  - Return button for delivered orders
- ✅ **Real-Time Validation:** Checks shipping/delivery status from products collection
- ✅ **Form-Based Flow:** Collects reason and refund method
- ✅ **Firestore Integration:** Saves cancellation/return requests

---

## 🚀 Installation

### **Step 1: Add Dependencies**

```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  salesiq_mobilisten: ^5.0.0
  firebase_core: ^2.24.0
  cloud_firestore: ^4.13.0
  firebase_auth: ^4.15.0
```

### **Step 2: Install Packages**

```bash
flutter pub get
```

### **Step 3: Configure Firebase**

1. **Android Setup:**
   - Download `google-services.json` from Firebase Console
   - Place in `android/app/` folder

2. **iOS Setup:**
   - Download `GoogleService-Info.plist` from Firebase Console
   - Add to Xcode project

3. **Initialize Firebase:**

```dart
// lib/main.dart
import 'package:firebase_core/firebase_core.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(MyApp());
}
```

---

## 🛠️ Setup Guide

### **Step 1: SalesIQ Configuration**

```dart
// lib/services/salesiq_service.dart
import 'package:salesiq_mobilisten/salesiq_mobilisten.dart';

class SalesIQService {
  static Future<void> initialize() async {
    await ZohoSalesIQ.init(
      'YOUR_APP_KEY',
      'YOUR_ACCESS_KEY',
    );
    
    // Enable launcher
    await ZohoSalesIQ.showLauncher(true);
  }
  
  static Future<void> setUserData(String name, String email, String? phone) async {
    // Set visitor info
    await ZohoSalesIQ.Visitor.setName(name);
    await ZohoSalesIQ.Visitor.setEmail(email);
    if (phone != null) {
      await ZohoSalesIQ.Visitor.setContactNumber(phone);
    }
  }
}
```

### **Step 2: User Registration Integration**

```dart
// lib/screens/register_screen.dart
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/salesiq_service.dart';

class RegisterScreen extends StatefulWidget {
  @override
  _RegisterScreenState createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  
  Future<void> _register() async {
    try {
      // 1. Create Firebase Auth user
      UserCredential userCredential = await FirebaseAuth.instance
          .createUserWithEmailAndPassword(
        email: _emailController.text,
        password: _passwordController.text,
      );
      
      // 2. Save user data to Firestore
      await FirebaseFirestore.instance
          .collection('users')
          .doc(userCredential.user!.uid)
          .set({
        'name': _nameController.text,
        'email': _emailController.text,
        'phone': _phoneController.text,
        'createdAt': FieldValue.serverTimestamp(),
      });
      
      // 3. Set SalesIQ visitor data
      await SalesIQService.setUserData(
        _nameController.text,
        _emailController.text,
        _phoneController.text,
      );
      
      // Navigate to home
      Navigator.pushReplacementNamed(context, '/home');
    } catch (e) {
      print('Registration error: $e');
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Register')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _nameController,
              decoration: InputDecoration(labelText: 'Name'),
            ),
            TextField(
              controller: _emailController,
              decoration: InputDecoration(labelText: 'Email'),
            ),
            TextField(
              controller: _phoneController,
              decoration: InputDecoration(labelText: 'Phone'),
            ),
            TextField(
              controller: _passwordController,
              decoration: InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: _register,
              child: Text('Register'),
            ),
          ],
        ),
      ),
    );
  }
}
```

### **Step 3: Login Integration**

```dart
// lib/screens/login_screen.dart
class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  
  Future<void> _login() async {
    try {
      // 1. Sign in with Firebase Auth
      UserCredential userCredential = await FirebaseAuth.instance
          .signInWithEmailAndPassword(
        email: _emailController.text,
        password: _passwordController.text,
      );
      
      // 2. Get user data from Firestore
      DocumentSnapshot userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(userCredential.user!.uid)
          .get();
      
      Map<String, dynamic> userData = userDoc.data() as Map<String, dynamic>;
      
      // 3. Set SalesIQ visitor data
      await SalesIQService.setUserData(
        userData['name'],
        userData['email'],
        userData['phone'],
      );
      
      // Navigate to home
      Navigator.pushReplacementNamed(context, '/home');
    } catch (e) {
      print('Login error: $e');
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Login')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _emailController,
              decoration: InputDecoration(labelText: 'Email'),
            ),
            TextField(
              controller: _passwordController,
              decoration: InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            SizedBox(height: 20),
            ElevatedButton(
              onPressed: _login,
              child: Text('Login'),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 📖 Usage

### **Basic Implementation**

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'services/salesiq_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // Initialize SalesIQ
  await SalesIQService.initialize();
  
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'E-Commerce App',
      theme: ThemeData(primarySwatch: Colors.blue),
      initialRoute: '/login',
      routes: {
        '/login': (context) => LoginScreen(),
        '/register': (context) => RegisterScreen(),
        '/home': (context) => HomeScreen(),
      },
    );
  }
}
```

### **Order Creation**

```dart
// lib/services/order_service.dart
class OrderService {
  static Future<void> createOrder({
    required String userId,
    required List<Map<String, dynamic>> items,
    required double totalAmount,
    required String paymentMethod,
  }) async {
    try {
      // Generate order ID
      String orderId = 'ORD${DateTime.now().millisecondsSinceEpoch}';
      
      // Save order to Firestore
      await FirebaseFirestore.instance
          .collection('users')
          .doc(userId)
          .collection('orders')
          .doc(orderId)
          .set({
        'id': orderId,
        'items': items,
        'totalAmount': totalAmount,
        'paymentMethod': paymentMethod,
        'status': 'Pending',
        'orderDate': FieldValue.serverTimestamp(),
      });
      
      // Update product status
      for (var item in items) {
        await FirebaseFirestore.instance
            .collection('products')
            .doc(item['productId'])
            .update({
          'shipping_status': 'Pending',
          'delivery_status': 'Not Delivered',
        });
      }
      
      print('Order created: $orderId');
    } catch (e) {
      print('Error creating order: $e');
    }
  }
}
```

---

## 🔄 Complete Flow

### **1. User Registration/Login**

```
User registers/logs in
  ↓
Firebase Auth creates user
  ↓
User data saved to Firestore
  ↓
SalesIQ visitor data set (name, email, phone)
  ↓
User can now chat with support
```

### **2. Customer Widget Display**

```
User opens chat
  ↓
SalesIQ sends webhook to server
  ↓
Server fetches customer data from Firestore:
  - User profile
  - Orders (from users/{userId}/orders)
  - Cart items
  - Favorites
  - Issues
  ↓
Server calculates analytics
  ↓
Server sends widget JSON to SalesIQ
  ↓
Operator sees comprehensive customer data
```

### **3. Order Cancellation Flow**

```
User clicks "Cancel Order" in chat
  ↓
Webhook server fetches orders
  ↓
Filters cancellable orders (Pending/Processing)
  ↓
Checks shipping_status from products collection
  ↓
Shows only non-shipped orders
  ↓
User selects order
  ↓
Displays cancellation reasons
  ↓
User selects reason
  ↓
Displays refund methods
  ↓
User selects refund method
  ↓
Server saves to Firestore issues collection
  ↓
Confirmation message sent to user and agent
  ↓
Widget refreshes with updated issue
```

### **4. Order Return Flow**

```
User clicks "Return Order" in chat
  ↓
Webhook server fetches orders
  ↓
Checks delivery_status from products collection
  ↓
Shows only delivered orders
  ↓
User selects order
  ↓
Displays return reasons
  ↓
User selects reason
  ↓
Displays refund methods
  ↓
User selects refund method
  ↓
Server saves to Firestore issues collection
  ↓
Confirmation message sent to user and agent
  ↓
Widget refreshes with updated issue
```

---

## 🔥 Firestore Integration

### **Required Collections**

#### **1. users/**
```dart
users/{userId}/
  ├── name: string
  ├── email: string
  ├── phone: string
  ├── createdAt: timestamp
  └── orders/
      └── {orderId}/
          ├── id: string
          ├── status: string
          ├── totalAmount: number
          ├── paymentMethod: string
          ├── items: array
          └── orderDate: timestamp
```

#### **2. products/**
```dart
products/{productId}/
  ├── name: string
  ├── price: number
  ├── category: string
  ├── shipping_status: string  // "Pending", "Shipped"
  └── delivery_status: string  // "Not Delivered", "Delivered"
```

#### **3. issues/**
```dart
issues/{issueId}/
  ├── customerEmail: string
  ├── orderId: string
  ├── issueType: string  // "Order Cancellation", "Order Return"
  ├── status: string  // "Pending Review", "Resolved"
  ├── returnReason: string
  ├── refundMethod: string
  ├── returnReference: string
  └── createdAt: timestamp
```

### **Firestore Rules**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Orders subcollection
      match /orders/{orderId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Products collection (read-only for users)
    match /products/{productId} {
      allow read: if true;
      allow write: if false;  // Only admin can write
    }
    
    // Issues collection
    match /issues/{issueId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if false;  // Only admin can update
    }
  }
}
```

---

## 🎨 Customization

### **Custom Widget Styling**

```dart
// Customize SalesIQ theme
await ZohoSalesIQ.Theme.setThemeColorForiOS('#FF5733');
await ZohoSalesIQ.Theme.setThemeColorForAndroid('#FF5733');
```

### **Custom Launcher**

```dart
// Hide default launcher
await ZohoSalesIQ.showLauncher(false);

// Create custom button
FloatingActionButton(
  onPressed: () async {
    await ZohoSalesIQ.Chat.show();
  },
  child: Icon(Icons.chat),
)
```

---

## 🐛 Troubleshooting

### **Issue: Widget not showing customer data**

**Solution:**
1. Verify user email is set in SalesIQ
2. Check Firestore has user data
3. Verify webhook server is running
4. Check server logs for errors

### **Issue: Cancel/Return buttons not appearing**

**Solution:**
1. Check order status in Firestore
2. Verify products collection has shipping_status/delivery_status
3. Review webhook server validation logic
4. Check console logs

### **Issue: Orders not syncing**

**Solution:**
1. Verify Firebase initialization
2. Check Firestore rules allow read/write
3. Ensure user is authenticated
4. Review order creation code

---

## 📚 Additional Resources

- [SalesIQ Flutter SDK](https://www.zoho.com/salesiq/help/developer-section/flutter-sdk.html)
- [Firebase Flutter Setup](https://firebase.google.com/docs/flutter/setup)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)

---

## 🤝 Support

For issues or questions:
- Email: arjunfree256@gmail.com
- GitHub: [Your Repository]
- SalesIQ Community: [Zoho Forums]
