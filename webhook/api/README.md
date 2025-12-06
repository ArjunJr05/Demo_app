# 🔥 SalesIQ Webhook with Firestore Integration

This webhook now uses **Firebase Firestore** instead of hardcoded data to provide dynamic customer information for SalesIQ chat.

## 🚀 Setup Instructions

### 1. Firebase Project Setup

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or use existing one
   - Enable Firestore Database

2. **Generate Service Account Key**:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Rename it to `firebase-service-account.json`
   - Place it in the `webhook/api/` folder

### 2. Firestore Database Structure

Create these collections in your Firestore:

#### **📋 customers** collection:
```javascript
// Document ID: customer email (e.g., "priya@gmail.com")
{
  customerName: "Priya Sharma",
  customerEmail: "priya@gmail.com", 
  customerSince: "2024-08-15",
  phone: "+91-9876543210",
  address: "123 MG Road, Bangalore, Karnataka 560001",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **📦 orders** collection:
```javascript
// Document ID: order ID (e.g., "ORD1701234567890")
{
  id: "ORD1701234567890",
  customerEmail: "priya@gmail.com",
  customerName: "Priya Sharma",
  items: [
    {
      productName: "iPhone Case - Blue",
      price: 599,
      quantity: 1,
      category: "Mobile Accessories"
    }
  ],
  totalAmount: 599,
  status: "confirmed", // confirmed, processing, shipped, delivered, cancelled, returned
  paymentStatus: "paid", // paid, pending, failed, refunded
  paymentMethod: "UPI", // UPI, Credit Card, Cash on Delivery
  orderDate: timestamp,
  deliveryDate: timestamp,
  trackingNumber: "TRK123456",
  shippingAddress: "123 MG Road, Bangalore, Karnataka 560001",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **🎫 issues** collection:
```javascript
// Document ID: issue ID (e.g., "ISS1701234567891")
{
  id: "ISS1701234567891",
  customerEmail: "priya@gmail.com",
  orderId: "ORD1701234567890",
  issueType: "Product Quality", // Product Quality, Delivery Issue, Payment Issue, etc.
  description: "Wrong color delivered",
  status: "Open", // Open, Processing, Resolved, Closed
  priority: "Medium", // Low, Medium, High, Critical
  resolution: "Refunded ₹500 for inconvenience",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **🛒 products** collection:
```javascript
// Document ID: product ID (e.g., "wireless_earbuds")
{
  id: "wireless_earbuds",
  name: "Wireless Earbuds Pro",
  category: "Audio",
  price: 2999,
  description: "Premium wireless earbuds with noise cancellation",
  imageUrl: "https://via.placeholder.com/300x300/FF6600/FFFFFF?text=Earbuds",
  inStock: true,
  colors: ["White", "Black", "Blue"],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 3. Installation & Running

```bash
# Install dependencies
npm install

# Start the server
npm start

# Development mode (auto-restart)
npm run dev
```

### 4. Environment Configuration

Update the Firebase configuration in `webhook_local.js`:

```javascript
// Line 20: Update with your project ID
databaseURL: 'https://your-project-id-default-rtdb.firebaseio.com/'
```

## 🔥 Firestore Integration Features

### ✅ **Dynamic Customer Data**
- Real-time customer lookup by email
- Automatic profile creation for new customers
- Customer analytics calculation from orders

### ✅ **Order Management**
- Fetch customer orders from Firestore
- Real-time order status updates
- Cancel/Return processing with Firestore updates

### ✅ **Issue Tracking**
- Customer support issues from Firestore
- Automatic issue creation for cancellations/returns
- Issue status tracking

### ✅ **Product Integration**
- Product data from Firestore
- Category-based analytics
- Dynamic product information

## 📊 How It Works

1. **Customer connects** → Webhook searches Firestore by email
2. **No customer found** → Creates default profile in Firestore
3. **Customer found** → Fetches orders, issues, calculates analytics
4. **Actions performed** → Updates Firestore in real-time
5. **All data persisted** → No more hardcoded data!

## 🔧 API Endpoints

All existing endpoints now use Firestore:

- `POST /webhook` - Main SalesIQ webhook (Firestore-powered)
- `POST /orders/:orderId/cancel` - Cancel order (updates Firestore)
- `POST /orders/:orderId/return` - Return order (updates Firestore)
- `POST /api/notifications` - SalesIQ notifications
- `GET /api/forms/*` - Dynamic forms (Firestore data)

## 🛡️ Security Notes

- Keep `firebase-service-account.json` secure and never commit to git
- Add `firebase-service-account.json` to `.gitignore`
- Use environment variables for production deployment
- Enable Firestore security rules for production

## 🎯 Testing

1. **Add test data** to your Firestore collections
2. **Start the webhook** server
3. **Connect SalesIQ** to your webhook URL
4. **Test with real customer emails** from your Firestore data

The webhook will now provide **completely dynamic responses** based on your real Firestore data! 🚀
