# 📊 Firestore Database Structure Analysis

## Current Product Parameters (Analyzed from existing code)

Based on the existing `Product` model in your app, here are all the parameters used to display products:

### Product Model Structure:
```dart
Product {
  String id;              // Unique product identifier (e.g., "iphone_case_blue")
  String name;            // Product name (e.g., "iPhone Case - Blue")
  String description;     // Product description
  double price;           // Product price (e.g., 29.99)
  String imageUrl;        // Product image URL
  String category;        // Product category (e.g., "Accessories", "Electronics")
  List<String> colors;    // Available colors (e.g., ["Blue", "Red", "Black"])
  List<String> sizes;     // Available sizes (e.g., ["S", "M", "L", "XL"])
  double rating;          // Product rating (0.0 to 5.0)
  int reviewCount;        // Number of reviews
  bool inStock;           // Stock availability (true/false)
}
```

---

## 🗄️ Firestore Collections Structure

### 1. **users** Collection
```
users/
  └── {userId} (document)
      ├── email: string
      ├── password: string (hashed by Firebase Auth - not stored in Firestore)
      ├── name: string
      ├── phone: string (optional)
      ├── createdAt: timestamp
      ├── updatedAt: timestamp
      └── addresses: array (optional)
          └── {
              street: string,
              city: string,
              state: string,
              zipCode: string,
              country: string,
              isDefault: boolean
             }
```

**Note:** Password is handled by Firebase Authentication and NOT stored in Firestore.

### 2. **products** Collection
```
products/
  └── {productId} (document)
      ├── id: string
      ├── name: string
      ├── description: string
      ├── price: number
      ├── imageUrl: string
      ├── category: string
      ├── colors: array<string>
      ├── sizes: array<string>
      ├── rating: number
      ├── reviewCount: number
      ├── inStock: boolean
      ├── createdAt: timestamp
      └── updatedAt: timestamp
```

### 3. **orders** Collection
```
orders/
  └── {orderId} (document)
      ├── id: string
      ├── customerId: string (userId)
      ├── customerName: string
      ├── customerEmail: string
      ├── customerPhone: string
      ├── shippingAddress: string
      ├── items: array
      │   └── {
      │       productId: string,
      │       productName: string,
      │       price: number,
      │       quantity: number,
      │       selectedColor: string,
      │       selectedSize: string,
      │       imageUrl: string,
      │       deliveryDate: timestamp
      │      }
      ├── totalAmount: number
      ├── status: string (pending, confirmed, processing, shipped, delivered, etc.)
      ├── paymentStatus: string (pending, paid, failed, refunded)
      ├── paymentMethod: string
      ├── orderDate: timestamp
      ├── deliveryDate: timestamp (optional)
      ├── trackingNumber: string (optional)
      ├── statusHistory: array<string>
      ├── notes: string (optional)
      └── createdAt: timestamp
```

---

## 📋 Implementation Plan

### Phase 1: Setup Firestore
- ✅ Add cloud_firestore dependency
- ✅ Create Firestore service
- ✅ Initialize Firestore in main.dart

### Phase 2: User Management
- ✅ Save user details on signup (email, name)
- ✅ Update user profile
- ✅ Fetch user data

### Phase 3: Products Management
- ✅ Fetch products from Firestore
- ✅ Display products on home page
- ✅ Add sample products to Firestore (one-time)

### Phase 4: Orders Management
- ✅ Create order when user places order
- ✅ Save order with:
  - Customer name
  - Shipping address
  - Products list with delivery dates
- ✅ Fetch user's orders
- ✅ Update order status

---

## 🎯 Product Display Parameters Summary

To display products on the home page (as currently implemented), you need:

### Essential Parameters:
1. **id** - Unique identifier
2. **name** - Product name to display
3. **price** - Product price
4. **imageUrl** - Product image to show
5. **category** - For filtering/grouping

### Optional but Recommended:
6. **description** - Product details
7. **rating** - Star rating (0-5)
8. **reviewCount** - Number of reviews
9. **inStock** - Availability status
10. **colors** - Color variants
11. **sizes** - Size variants

---

## 🔄 Data Flow

### Signup Flow:
```
User Signs Up
    ↓
Firebase Auth creates user account
    ↓
Save user details to Firestore users collection
    ↓
User document created with email, name, createdAt
```

### Product Display Flow:
```
Home Screen Loads
    ↓
Fetch products from Firestore
    ↓
Display products in grid/list
    ↓
Show: image, name, price, rating, stock status
```

### Order Placement Flow:
```
User adds items to cart
    ↓
User proceeds to checkout
    ↓
User enters shipping address
    ↓
Create order document in Firestore
    ↓
Save: customerName, address, items[], deliveryDate
    ↓
Order confirmation
```

---

## 📝 Next Steps

1. Add cloud_firestore dependency
2. Create FirestoreService class
3. Update AuthService to save user data to Firestore
4. Create ProductService to fetch products
5. Create OrderService to manage orders
6. Update UI to use Firestore data instead of sample data

---

## 🔐 Security Rules (To be configured in Firebase Console)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Anyone can read products
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null; // Only authenticated users can write
    }
    
    // Users can read their own orders
    match /orders/{orderId} {
      allow read: if request.auth != null && resource.data.customerId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.customerId == request.auth.uid;
      allow update: if request.auth != null && resource.data.customerId == request.auth.uid;
    }
  }
}
```
