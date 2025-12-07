# 🔐 SalesIQ Form Controller Integration Guide

## Overview

This guide explains how to integrate the Cancel/Return form controller script with your webhook backend for secure order cancellation and return processing.

---

## 🚀 Quick Start

### 1. Update Your SalesIQ Form Controller Script

In your SalesIQ Form Controller script, update these configuration values:

```javascript
// CONFIG - replace these with your real values
WEBHOOK_URL = "https://8b48a16ff4b5.ngrok-free.app/salesiq/form-submit";
WEBHOOK_SECRET = "your_shared_secret_here_change_in_production";
```

### 2. Set Webhook Secret in Your Server

**Option A: Environment Variable (Recommended for Production)**
```bash
export WEBHOOK_SECRET="your_shared_secret_here_change_in_production"
node webhook_local.js
```

**Option B: Update Code Directly (For Testing)**
Edit `/Users/sarathyv/Demo_app/webhook/api/webhook_local.js` line 13:
```javascript
const WEBHOOK_SECRET = 'your_shared_secret_here_change_in_production';
```

### 3. Start Your Webhook Server

```bash
cd /Users/sarathyv/Demo_app/webhook/api
npm start
```

You should see:
```
🚀 SalesIQ Webhook Server Running
📍 Local URL: http://localhost:3000
🔐 SalesIQ Form Submit: http://localhost:3000/salesiq/form-submit
🔑 Webhook Secret: your_shared_secret_here_change_in_production
```

---

## 📋 Form Field Requirements

Your SalesIQ form MUST have these field names (exact match):

### Hidden Fields (auto-populated)
- `order_id` - Order ID
- `user_id` - Customer email/user ID
- `action` - "cancel" or "return"
- `idempotency_token` - Unique token to prevent duplicate submissions

### User Input Fields
- `date` - Date picker (optional, defaults to current date)
- `reason` - Textarea (required, max 500 characters)
- `refundable_amount` - Number/readonly (calculated amount)
- `refund_method` - Select dropdown:
  - `original_payment` - Original Payment Method
  - `wallet` - Wallet Credit
  - `store_credit` - Store Credit
  - `bank_transfer` - Bank Transfer
- `refund_account` - Text (required only if refund_method = bank_transfer)

---

## 🔄 Request/Response Flow

### Request Format (from SalesIQ to Webhook)

```json
{
  "order_id": "ORD1701234567890",
  "user_id": "priya@gmail.com",
  "action": "cancel",
  "date": "2024-12-07",
  "reason": "Changed my mind about the purchase",
  "refund_details": {
    "refundable_amount": 1499,
    "refund_method": "original_payment",
    "refund_reference_info": ""
  },
  "idempotency_token": "sid_1701234567890",
  "source": "salesiq_form"
}
```

**Headers:**
```
Content-Type: application/json
X-Webhook-Secret: your_shared_secret_here_change_in_production
```

### Success Response (from Webhook to SalesIQ)

```json
{
  "success": true,
  "order_id": "ORD1701234567890",
  "new_status": "CANCELLED",
  "refund": {
    "amount": 1499,
    "reference": "REF_CANCEL_1701234567890",
    "method": "original_payment",
    "status": "initiated"
  },
  "message": "Order #ORD1701234567890 canceled successfully. Refund of ₹1499 initiated."
}
```

### Error Response

```json
{
  "success": false,
  "message": "Order #ORD123 is already cancelled. Cannot cancel."
}
```

---

## ✅ What the Webhook Does

### 1. **Security Validation**
- ✅ Validates webhook secret in `X-Webhook-Secret` header
- ✅ Returns 401 Unauthorized if secret doesn't match

### 2. **Input Validation**
- ✅ Checks all required fields (order_id, user_id, action, reason)
- ✅ Validates action is "cancel" or "return"
- ✅ Validates reason length (max 500 characters)
- ✅ Validates refund method and bank details

### 3. **Order Validation**
- ✅ Fetches order from Firestore (or uses mock data)
- ✅ Checks order eligibility (not already cancelled/returned)
- ✅ Validates order exists and belongs to user

### 4. **Processing**
- ✅ Updates order status in Firestore to CANCELLED/RETURNED
- ✅ Creates issue/ticket in Firestore for tracking
- ✅ Generates unique refund reference
- ✅ Logs idempotency token (prevents duplicate submissions)

### 5. **Notifications**
- ✅ Logs operator notification with all details
- ✅ Creates audit log entry
- ✅ (Production: send email/SMS to support team)

### 6. **Response**
- ✅ Returns structured JSON with refund details
- ✅ SalesIQ displays success banner to user

---

## 🔐 Security Features

### Webhook Secret Validation
- Prevents unauthorized form submissions
- Only requests with correct `X-Webhook-Secret` header are processed
- Returns 401 Unauthorized for invalid secrets

### Idempotency Protection
- Tracks `idempotency_token` to prevent duplicate submissions
- User can't accidentally submit same cancellation twice
- (Production: store tokens in database with expiry)

### Input Sanitization
- All inputs validated before processing
- SQL injection protection (using Firestore parameterized queries)
- XSS protection (no HTML rendering of user input)

---

## 🧪 Testing

### Test with cURL

```bash
curl -X POST https://8b48a16ff4b5.ngrok-free.app/salesiq/form-submit \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_shared_secret_here_change_in_production" \
  -d '{
    "order_id": "ORD1701234567890",
    "user_id": "priya@gmail.com",
    "action": "cancel",
    "date": "2024-12-07",
    "reason": "Test cancellation",
    "refund_details": {
      "refundable_amount": 1499,
      "refund_method": "original_payment",
      "refund_reference_info": ""
    },
    "idempotency_token": "test_123",
    "source": "salesiq_form"
  }'
```

### Expected Success Response
```json
{
  "success": true,
  "order_id": "ORD1701234567890",
  "new_status": "CANCELLED",
  "refund": {
    "amount": 1499,
    "reference": "REF_CANCEL_1733567890123",
    "method": "original_payment",
    "status": "initiated"
  },
  "message": "Order #ORD1701234567890 canceled successfully. Refund of ₹1499 initiated."
}
```

### Test Invalid Secret
```bash
curl -X POST https://8b48a16ff4b5.ngrok-free.app/salesiq/form-submit \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: wrong_secret" \
  -d '{"order_id": "ORD123", "user_id": "test@test.com", "action": "cancel", "reason": "test"}'
```

Expected: `401 Unauthorized`

---

## 🎯 Flow Validation

### ✅ Your Current Flow is CORRECT

Your approach is well-designed:

1. **SalesIQ Form Controller** → Validates input client-side
2. **Sends to Webhook** → With secret authentication
3. **Webhook Validates** → Server-side validation + eligibility checks
4. **Updates Firestore** → Persistent data storage
5. **Initiates Refund** → (Simulated, ready for payment gateway)
6. **Notifies Operator** → Support team gets alerted
7. **Returns Response** → SalesIQ shows success/error banner

### 🎨 Recommended Enhancements

#### 1. **Add Idempotency Storage (Production)**
```javascript
// Store in Firestore to prevent duplicate submissions
const tokenDoc = await db.collection('idempotency_tokens').doc(idempotency_token).get();
if (tokenDoc.exists) {
  return res.status(200).json(tokenDoc.data().response); // Return cached response
}

// After processing, store the response
await db.collection('idempotency_tokens').doc(idempotency_token).set({
  response: successResponse,
  processed_at: admin.firestore.FieldValue.serverTimestamp(),
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
});
```

#### 2. **Add Email Notifications**
```javascript
// Install: npm install nodemailer
const nodemailer = require('nodemailer');

// After successful cancellation
const transporter = nodemailer.createTransport({...});
await transporter.sendMail({
  to: 'support@yourcompany.com',
  subject: `Order ${action.toUpperCase()}: ${order_id}`,
  html: `
    <h2>Order ${action === 'cancel' ? 'Cancellation' : 'Return'} Request</h2>
    <p><strong>Order ID:</strong> ${order_id}</p>
    <p><strong>Customer:</strong> ${user_id}</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p><strong>Refund:</strong> ₹${refundAmount} via ${refundMethod}</p>
    <p><strong>Reference:</strong> ${refundReference}</p>
  `
});
```

#### 3. **Add Payment Gateway Integration**
```javascript
// Example: Razorpay refund
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Initiate actual refund
const refund = await razorpay.payments.refund(orderData.payment_id, {
  amount: refundAmount * 100, // Amount in paise
  notes: {
    reason: reason,
    order_id: order_id
  }
});
```

---

## 📊 Monitoring & Logs

### Server Logs
When a form is submitted, you'll see:
```
📥 ===== SALESIQ FORM SUBMISSION =====
Timestamp: 2024-12-07T08:59:00.000Z
✅ Webhook secret validated
📦 Order found in Firestore: ORD1701234567890
✅ Order ORD1701234567890 updated to CANCELLED in Firestore
✅ Issue ISS_1733567890123 created in Firestore
💰 Initiating refund: ₹1499 via original_payment
📝 Refund reference: REF_CANCEL_1733567890123
📧 Operator notification: {...}
📊 Audit log: {...}
✅ Form submission processed successfully
```

### Firestore Collections Updated
- `orders/{order_id}` - Status updated to CANCELLED/RETURNED
- `issues/{issue_id}` - New support ticket created
- `idempotency_tokens/{token}` - (If implemented) Token stored

---

## 🚨 Troubleshooting

### Error: "Unauthorized: Invalid webhook secret"
- ✅ Check `WEBHOOK_SECRET` matches in both SalesIQ script and server
- ✅ Verify header name is exactly `X-Webhook-Secret` (case-sensitive)

### Error: "Missing required fields"
- ✅ Ensure form field names match exactly (order_id, user_id, action, reason)
- ✅ Check SalesIQ script is sending all required fields

### Error: "Order is already cancelled"
- ✅ Order has already been processed
- ✅ Check Firestore order status
- ✅ Verify idempotency token is unique

### No response from webhook
- ✅ Check webhook server is running (`npm start`)
- ✅ Verify ngrok URL is correct and active
- ✅ Check server logs for errors
- ✅ Test with cURL to isolate SalesIQ vs webhook issue

---

## 🔄 Production Deployment Checklist

- [ ] Change `WEBHOOK_SECRET` to strong random value
- [ ] Use environment variable for secret (not hardcoded)
- [ ] Deploy to Vercel/production server (not ngrok)
- [ ] Update SalesIQ script with production URL
- [ ] Implement idempotency token storage
- [ ] Add email notifications to support team
- [ ] Integrate real payment gateway for refunds
- [ ] Set up monitoring/alerting for failed refunds
- [ ] Add rate limiting to prevent abuse
- [ ] Enable Firestore security rules
- [ ] Test end-to-end with real orders
- [ ] Document for support team

---

## 📞 Support

For issues or questions:
1. Check server logs: `tail -f webhook_local.log`
2. Test with cURL commands above
3. Verify Firestore data in Firebase Console
4. Review this documentation

**Current Configuration:**
- Webhook URL: `https://8b48a16ff4b5.ngrok-free.app/salesiq/form-submit`
- Webhook Secret: `your_shared_secret_here_change_in_production`
- Server: Local (webhook_local.js on port 3000)
