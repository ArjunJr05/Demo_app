# 🎯 SalesIQ Form Controller - Quick Setup Guide

## 📝 What You Need to Update

### 1. SalesIQ Form Controller Script

In your SalesIQ Form Controller, update these two lines at the top:

```javascript
// CONFIG - replace these with your real values
WEBHOOK_URL = "https://8b48a16ff4b5.ngrok-free.app/salesiq/form-submit";
WEBHOOK_SECRET = "your_shared_secret_here_change_in_production";
```

**Important:** The `WEBHOOK_SECRET` must match exactly on both SalesIQ and your webhook server!

---

## 🔐 Webhook Secret Configuration

### Current Default Secret
```
your_shared_secret_here_change_in_production
```

### How to Change It

**Option 1: Environment Variable (Recommended)**
```bash
export WEBHOOK_SECRET="my_super_secret_key_12345"
cd /Users/sarathyv/Demo_app/webhook/api
npm start
```

**Option 2: Edit Code Directly**
Edit file: `/Users/sarathyv/Demo_app/webhook/api/webhook_local.js`
Line 13:
```javascript
const WEBHOOK_SECRET = 'my_super_secret_key_12345';
```
 
**Generate a Strong Secret:**
```bash
# On Mac/Linux
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚀 Start Your Webhook Server

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

## 🧪 Test the Integration

### Test 1: Run Automated Tests
```bash
cd /Users/sarathyv/Demo_app/webhook
node test-salesiq-form.js
```

Expected output:
```
🧪 Starting SalesIQ Form Controller Tests
✅ Valid Cancellation Request - PASSED
✅ Valid Return Request with Bank Transfer - PASSED
❌ Invalid Webhook Secret - PASSED
...
📊 Test Results:
   ✅ Passed: 7/7
   🎉 All tests passed!
```

### Test 2: Manual cURL Test
```bash
curl -X POST http://localhost:3000/salesiq/form-submit \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your_shared_secret_here_change_in_production" \
  -d '{
    "order_id": "ORD1701234567890",
    "user_id": "priya@gmail.com",
    "action": "cancel",
    "reason": "Test cancellation",
    "refund_details": {
      "refundable_amount": 1499,
      "refund_method": "original_payment"
    },
    "idempotency_token": "test_123",
    "source": "salesiq_form"
  }'
```

Expected response:
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

---

## 📋 SalesIQ Form Field Names (Must Match Exactly)

Your form in SalesIQ must have these field names:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `order_id` | Hidden | ✅ Yes | Order ID |
| `user_id` | Hidden | ✅ Yes | Customer email |
| `action` | Hidden/Select | ✅ Yes | "cancel" or "return" |
| `date` | Date | ❌ No | Defaults to today |
| `reason` | Textarea | ✅ Yes | Max 500 chars |
| `refundable_amount` | Number | ❌ No | Calculated amount |
| `refund_method` | Select | ✅ Yes | See options below |
| `refund_account` | Text | ⚠️ Conditional | Required if bank_transfer |
| `idempotency_token` | Hidden | ✅ Yes | Unique token |

**Refund Method Options:**
- `original_payment` - Original Payment Method
- `wallet` - Wallet Credit
- `store_credit` - Store Credit
- `bank_transfer` - Bank Transfer (requires refund_account)

---

## ✅ Flow Validation - Your Approach is CORRECT!

Your current flow is well-designed:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User fills Cancel/Return form in SalesIQ                    │
│    - Enters reason, selects refund method                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. SalesIQ Form Controller Script validates client-side        │
│    - Checks required fields                                     │
│    - Validates reason length                                    │
│    - Checks bank details if needed                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Script sends POST to webhook with secret header             │
│    POST /salesiq/form-submit                                    │
│    Header: X-Webhook-Secret: your_secret                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Webhook validates request                                    │
│    ✅ Webhook secret                                            │
│    ✅ Required fields                                           │
│    ✅ Action type (cancel/return)                               │
│    ✅ Reason length                                             │
│    ✅ Refund method & bank details                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Webhook checks order eligibility                            │
│    - Fetches order from Firestore                              │
│    - Validates not already cancelled/returned                   │
│    - Checks idempotency token                                   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Webhook processes cancellation/return                       │
│    - Updates order status in Firestore                         │
│    - Creates support ticket/issue                              │
│    - Generates refund reference                                │
│    - Logs audit trail                                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Webhook initiates refund (simulated)                        │
│    - In production: calls payment gateway API                   │
│    - Generates refund reference number                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Webhook notifies support team                               │
│    - Logs operator notification                                │
│    - In production: sends email/SMS                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. Webhook returns success response                            │
│    {                                                            │
│      "success": true,                                           │
│      "order_id": "ORD123",                                      │
│      "new_status": "CANCELLED",                                 │
│      "refund": {...},                                           │
│      "message": "Order cancelled successfully"                  │
│    }                                                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. SalesIQ Form Controller displays success banner            │
│     "Order #ORD123 cancelled. Refund of ₹1499 initiated."      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 What's Already Implemented

### ✅ Security
- Webhook secret validation
- Input sanitization
- Idempotency token logging (ready for storage)

### ✅ Validation
- Required field checks
- Action type validation (cancel/return)
- Reason length validation (max 500 chars)
- Refund method validation
- Bank details validation (conditional)
- Order eligibility checks

### ✅ Data Processing
- Firestore order updates
- Support ticket creation
- Refund reference generation
- Audit logging

### ✅ Notifications
- Operator notification logging
- Structured notification payload (ready for email/SMS)

### ✅ Response Handling
- Structured JSON responses
- Error messages for all validation failures
- Success response with refund details

---

## 🚀 Production Enhancements (Optional)

### 1. Idempotency Token Storage
Prevents duplicate submissions if user clicks submit twice.

### 2. Email Notifications
Send email to support team when order is cancelled/returned.

### 3. Payment Gateway Integration
Integrate with Razorpay/Stripe/PayPal for actual refunds.

### 4. SMS Notifications
Send SMS to customer confirming cancellation/return.

### 5. Rate Limiting
Prevent abuse by limiting requests per user/IP.

See `SALESIQ-FORM-CONTROLLER-GUIDE.md` for implementation details.

---

## 📊 Monitoring

### Server Logs
Watch server logs in real-time:
```bash
cd /Users/sarathyv/Demo_app/webhook/api
npm start
# Server logs will show all form submissions
```

### Firestore Console
Check updated data:
- Orders: `https://console.firebase.google.com/project/YOUR_PROJECT/firestore/data/orders`
- Issues: `https://console.firebase.google.com/project/YOUR_PROJECT/firestore/data/issues`

---

## 🚨 Common Issues

### "Unauthorized: Invalid webhook secret"
**Fix:** Ensure `WEBHOOK_SECRET` matches in both SalesIQ script and webhook server.

### "Missing required fields"
**Fix:** Check form field names match exactly (case-sensitive).

### "Order is already cancelled"
**Fix:** Order has already been processed. Check Firestore order status.

### No response from webhook
**Fix:** 
1. Check server is running: `npm start`
2. Verify ngrok URL is active
3. Test with cURL to isolate issue

---

## 📞 Next Steps

1. ✅ Update `WEBHOOK_SECRET` in both SalesIQ and server
2. ✅ Start webhook server: `npm start`
3. ✅ Run tests: `node test-salesiq-form.js`
4. ✅ Test in SalesIQ with real form submission
5. ✅ Monitor server logs for successful processing
6. ✅ Check Firestore for updated orders and issues

**For detailed documentation, see:** `SALESIQ-FORM-CONTROLLER-GUIDE.md`
