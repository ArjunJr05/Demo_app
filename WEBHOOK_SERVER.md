# 🔗 Webhook Server Documentation

## Overview

The Node.js webhook server acts as the bridge between SalesIQ and your Firestore database, handling real-time customer data requests, order management, and bot interactions.

---

## 📋 Table of Contents

- [Architecture](#architecture)
- [Features](#features)
- [Setup Instructions](#setup-instructions)
- [API Endpoints](#api-endpoints)
- [Webhook Handlers](#webhook-handlers)
- [Firestore Integration](#firestore-integration)
- [Bot Flow](#bot-flow)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture

```
┌──────────────────┐
│   SalesIQ Chat   │
└────────┬─────────┘
         │
         │ POST /webhook
         ↓
┌──────────────────┐
│  Express Server  │
│  (Port 3000)     │
└────────┬─────────┘
         │
         ├─► Customer Widget Handler
         ├─► Message Handler
         ├─► Cancel Order Handler
         ├─► Return Order Handler
         └─► Form Submission Handler
         │
         ↓
┌──────────────────┐
│  Firebase Admin  │
│  Firestore SDK   │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  Firestore DB    │
│  - users/        │
│  - orders/       │
│  - products/     │
│  - issues/       │
└──────────────────┘
```

---

## ✨ Features

### **1. Customer Widget**
- Fetches comprehensive customer data from Firestore
- Displays orders, cart, favorites, analytics, and issues
- Real-time updates when customer data changes
- Clickable order cards with action buttons

### **2. Order Cancellation**
- Validates shipping status from products collection
- Prevents cancellation if product already shipped
- Collects cancellation reason and refund method
- Saves to Firestore issues collection
- Sends acknowledgement to customer and agent

### **3. Order Return**
- Validates delivery status from products collection
- Prevents return if product not delivered
- Collects return reason and refund method
- Saves to Firestore issues collection
- Sends acknowledgement to customer and agent

### **4. Smart Validation**
- Real-time product status checking
- Status-based button visibility
- Comprehensive error handling
- Detailed logging for debugging

---

## 🚀 Setup Instructions

### **Prerequisites**

```bash
Node.js >= 18.0.0
npm >= 9.0.0
Firebase Project with Firestore enabled
SalesIQ Account with webhook access
```

### **Step 1: Clone & Install**

```bash
cd c:\Users\arjun\salesiq\webhook\api
npm install
```

### **Step 2: Firebase Setup**

1. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project or use existing
   - Enable Firestore Database

2. **Generate Service Account Key:**
   - Go to Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `serviceAccountKey.json` in `webhook/api/` folder

3. **Update Firebase Config:**

```javascript
// webhook/api/webhook_local.js (lines 20-30)
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com"
});
```

### **Step 3: Environment Configuration**

Create `.env` file:

```env
PORT=3000
FIREBASE_PROJECT_ID=your-project-id
SALESIQ_WEBHOOK_SECRET=your-webhook-secret
NODE_ENV=development
```

### **Step 4: Start Server**

```bash
# Development mode
node webhook_local.js

# Production mode (with PM2)
pm2 start webhook_local.js --name salesiq-webhook
```

### **Step 5: Configure SalesIQ Webhook**

1. Go to SalesIQ Settings → Developer Space → Webhooks
2. Add new webhook:
   - **URL:** `https://your-domain.com/webhook`
   - **Events:** Select all (visitor, message, bot)
   - **Secret:** Copy from SalesIQ and add to `.env`

3. Test webhook:
   ```bash
   curl -X POST http://localhost:3000/webhook \
     -H "Content-Type: application/json" \
     -d '{"handler":"visitor","visitor":{"email":"test@example.com"}}'
   ```

---

## 📡 API Endpoints

### **1. Webhook Endpoint**

```http
POST /webhook
Content-Type: application/json
X-SalesIQ-Signature: <signature>
```

**Request Body:**
```json
{
  "handler": "message",
  "visitor": {
    "email": "customer@example.com",
    "name": "John Doe"
  },
  "message": {
    "text": "Cancel Order"
  }
}
```

**Response:**
```json
{
  "action": "reply",
  "replies": [{
    "text": "Select an order to cancel:"
  }],
  "suggestions": [
    "Cancel ORD123 | Product | ₹999",
    "Back to Menu"
  ]
}
```

### **2. Health Check**

```http
GET /
```

**Response:**
```json
{
  "status": "OK",
  "message": "SalesIQ Webhook Server Running",
  "timestamp": "2025-12-08T10:00:00.000Z"
}
```

### **3. Get Customer Orders**

```http
GET /api/orders?email=customer@example.com
```

**Response:**
```json
{
  "orders": [
    {
      "id": "ORD123",
      "status": "Pending",
      "totalAmount": 2999,
      "items": [...]
    }
  ]
}
```

---

## 🔄 Webhook Handlers

### **1. Customer Widget Handler**

**Trigger:** When operator opens customer chat

**Code Location:** Lines 2150-2200

**Flow:**
```javascript
1. Receive visitor email from SalesIQ
2. Query Firestore for customer data
3. Fetch orders, cart, favorites, issues
4. Calculate analytics
5. Build widget JSON response
6. Send to SalesIQ operator dashboard
```

**Response Format:**
```json
{
  "type": "widget_detail",
  "sections": [
    {
      "name": "customer_overview",
      "layout": "info",
      "title": "👋 Hello Customer!",
      "data": [...]
    },
    {
      "name": "orders_summary",
      "layout": "listing",
      "title": "📦 Recent Orders",
      "data": [...]
    }
  ]
}
```

### **2. Cancel Order Handler**

**Trigger:** User clicks "Cancel Order" button

**Code Location:** Lines 2200-2270

**Flow:**
```javascript
1. User clicks "Cancel Order"
2. Fetch customer orders from Firestore
3. Filter cancellable orders (Pending/Processing)
4. Check shipping_status from products collection
5. Show only non-shipped orders
6. User selects order
7. Display cancellation reasons
8. User selects reason and refund method
9. Save to Firestore issues collection
10. Send confirmation message
```

**Validation Logic:**
```javascript
// Check if product is shipped
const productDoc = await db.collection('products').doc(productId).get();
const shippingStatus = productDoc.data().shipping_status;

if (shippingStatus === 'Shipped') {
  // Block cancellation
  return "Cannot cancel - product already shipped";
}
```

### **3. Return Order Handler**

**Trigger:** User clicks "Return Order" button

**Code Location:** Lines 2860-2970

**Flow:**
```javascript
1. User clicks "Return Order"
2. Fetch customer orders from Firestore
3. Check delivery_status from products collection
4. Show only delivered orders
5. User selects order
6. Display return reasons
7. User selects reason and refund method
8. Save to Firestore issues collection
9. Send confirmation message
```

**Validation Logic:**
```javascript
// Check if product is delivered
const productDoc = await db.collection('products').doc(productId).get();
const deliveryStatus = productDoc.data().delivery_status;

if (deliveryStatus !== 'Delivered') {
  // Block return
  return "Cannot return - product not delivered yet";
}
```

### **4. Message Handler**

**Trigger:** User sends any message in chat

**Code Location:** Lines 2165-3350

**Handles:**
- "Cancel Order" → Show cancellable orders
- "Return Order" → Show returnable orders
- Order selection → Show order details with action buttons
- Reason selection → Collect refund method
- Refund method selection → Process and save

---

## 🔥 Firestore Integration

### **Database Structure**

```
firestore/
├── users/
│   └── {userId}/
│       ├── email: string
│       ├── name: string
│       ├── phone: string
│       └── orders/
│           └── {orderId}/
│               ├── id: string
│               ├── status: string
│               ├── totalAmount: number
│               ├── items: array
│               └── orderDate: timestamp
│
├── products/
│   └── {productId}/
│       ├── name: string
│       ├── price: number
│       ├── shipping_status: string
│       └── delivery_status: string
│
└── issues/
    └── {issueId}/
        ├── customerEmail: string
        ├── orderId: string
        ├── issueType: string
        ├── status: string
        ├── returnReason: string
        ├── refundMethod: string
        └── createdAt: timestamp
```

### **Key Functions**

#### **Get Customer Data**
```javascript
async function getCustomerData(email) {
  // Query users collection
  const userSnapshot = await db.collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();
  
  // Get user orders
  const ordersSnapshot = await db.collection('users')
    .doc(userId)
    .collection('orders')
    .orderBy('orderDate', 'desc')
    .get();
  
  return {
    customerName,
    customerEmail,
    orders: [...],
    analytics: {...}
  };
}
```

#### **Save Issue to Firestore**
```javascript
async function saveIssueToFirestore(issueData) {
  await db.collection('issues').doc(issueData.id).set({
    customerEmail: issueData.customerEmail,
    orderId: issueData.orderId,
    issueType: issueData.issueType,
    status: 'Pending Review',
    returnReason: issueData.returnReason,
    refundMethod: issueData.refundMethod,
    createdAt: new Date().toISOString()
  });
}
```

---

## 🤖 Bot Flow

### **Cancel Order Flow**

```
User: "Cancel Order"
  ↓
Bot: Shows list of cancellable orders
  ↓
User: Selects "Cancel ORD123 | Product | ₹999"
  ↓
Bot: Checks shipping_status from products collection
  ↓
  ├─► If Shipped: "Cannot cancel - already shipped"
  └─► If Not Shipped: Shows cancellation reasons
        ↓
      User: Selects reason (e.g., "Changed my mind")
        ↓
      Bot: Shows refund methods
        ↓
      User: Selects refund method
        ↓
      Bot: Saves to Firestore + Shows confirmation
```

### **Return Order Flow**

```
User: "Return Order"
  ↓
Bot: Checks delivery_status from products collection
  ↓
Bot: Shows list of delivered orders
  ↓
User: Selects "Return ORD456 | Product | ₹1999"
  ↓
Bot: Shows return reasons
  ↓
User: Selects reason (e.g., "Product defective")
  ↓
Bot: Shows refund methods
  ↓
User: Selects refund method
  ↓
Bot: Saves to Firestore + Shows confirmation
```

---

## 🚀 Deployment

### **Option 1: Local Server (Development)**

```bash
node webhook_local.js
```

### **Option 2: PM2 (Production)**

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start webhook_local.js --name salesiq-webhook

# Monitor
pm2 logs salesiq-webhook

# Auto-restart on reboot
pm2 startup
pm2 save
```

### **Option 3: Vercel (Serverless)**

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "webhook/api/webhook_local.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "webhook/api/webhook_local.js"
    }
  ]
}
```

3. Deploy:
```bash
vercel --prod
```

---

## 🐛 Troubleshooting

### **Issue: Webhook not receiving events**

**Solution:**
1. Check SalesIQ webhook configuration
2. Verify webhook URL is publicly accessible
3. Check webhook secret matches
4. Review server logs for errors

### **Issue: Firestore permission denied**

**Solution:**
1. Verify `serviceAccountKey.json` is correct
2. Check Firestore rules allow read/write
3. Ensure Firebase project ID is correct

### **Issue: Orders not showing in widget**

**Solution:**
1. Check customer email matches Firestore
2. Verify orders exist in Firestore
3. Check Firestore collection structure
4. Review server logs for query errors

### **Issue: Cancel/Return buttons not appearing**

**Solution:**
1. Verify product status in products collection
2. Check shipping_status/delivery_status fields
3. Review validation logic in code
4. Check console logs for errors

---

## 📝 Logs

### **Enable Debug Logging**

```javascript
// webhook_local.js
const DEBUG = true;

if (DEBUG) {
  console.log('🔍 Debug:', data);
}
```

### **Log Locations**

```bash
# PM2 logs
pm2 logs salesiq-webhook

# Standard output
node webhook_local.js > logs/webhook.log 2>&1
```

---

## 🔒 Security

### **Best Practices**

1. **Validate Webhook Signature:**
```javascript
const signature = req.headers['x-salesiq-signature'];
// Verify signature matches
```

2. **Environment Variables:**
```javascript
// Use .env for sensitive data
require('dotenv').config();
const secret = process.env.SALESIQ_WEBHOOK_SECRET;
```

3. **Rate Limiting:**
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/webhook', limiter);
```

---

## 📚 Additional Resources

- [SalesIQ Webhook Documentation](https://www.zoho.com/salesiq/help/developer-section/webhooks.html)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Express.js Documentation](https://expressjs.com/)

---

## 🤝 Support

For issues or questions:
- Check logs: `pm2 logs salesiq-webhook`
- Review Firestore data structure
- Test webhook with curl
- Contact: arjunfree256@gmail.com
