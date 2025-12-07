# 🔍 WEBHOOK DEBUGGING GUIDE

## Issue: Order Details Not Displaying in SalesIQ Form

### What You're Seeing:
```
💬 Message Text: ❌ Cancel Order
🔍 Fetching cancellable orders from Firestore for: arjunfree256@gmail.com
✅ Found 1 cancellable orders from users/MwvxkRIXALctoj1UBk5iTyU9HuA3/orders
```
Then the webhook gets stuck - no response is sent to SalesIQ.

---

## 🎯 What Should Happen:

### Step 1: User Clicks "❌ Cancel Order"
**Expected Logs:**
```
✅ Real user message received
💬 Message Text: ❌ Cancel Order
🔍 Looking up comprehensive customer data for: arjunfree256@gmail.com
✅ Found user profile: Arjun (ID: MwvxkRIXALctoj1UBk5iTyU9HuA3)
📦 Found 1 orders
🔍 Fetching cancellable orders from Firestore for: arjunfree256@gmail.com
✅ Found 1 cancellable orders from users/MwvxkRIXALctoj1UBk5iTyU9HuA3/orders

✅ ===== SENDING CANCEL ORDER RESPONSE =====
Response Type: message
Message: 📦 You have 1 order(s) that can be cancelled...
Number of Buttons: 1
Buttons:
  1. Label: "Order ORD123 - ₹1299", Name: "cancel_order_ORD123", Type: "postback"

📤 Full Response JSON:
{
  "type": "message",
  "text": "📦 You have 1 order(s) that can be cancelled.\n\nSelect an order to proceed with cancellation:",
  "delay": 1000,
  "buttons": [
    {
      "label": "Order ORD123 - ₹1299",
      "name": "cancel_order_ORD123",
      "type": "postback"
    }
  ]
}
=======================================
```

**What SalesIQ Shows:**
- Message: "📦 You have 1 order(s) that can be cancelled. Select an order to proceed with cancellation:"
- Button: "Order ORD123 - ₹1299"

---

### Step 2: User Clicks Order Button
**Expected Logs:**
```
🔘 ===== POSTBACK BUTTON CLICKED =====
Action: cancel_order_ORD123
Visitor: arjunfree256@gmail.com
📦 Extracted Order ID: ORD123
🔍 Fetching order details and opening form...

🎯 handleOrderAction called
  Action: cancel_order_ORD123
  Order ID: ORD123
  Visitor Email: arjunfree256@gmail.com
  Total Orders Found: 1
  ✅ Order Found:
    ID: ORD123
    Total Amount: 1299
    Status: confirmed
    Items: 1
    First Item: iPhone Case - ₹599

📋 handleOrderCancellation called
  Order ID: ORD123
  Order Status: confirmed
  Total Amount: 1299
  Items: 1
  ✅ Order is cancellable - generating form
  Form will pre-fill:
    - Order ID: ORD123
    - Product: iPhone Case
    - Amount: ₹1299

📤 Sending Form Response:
Type: form
Title: Cancel Order
Form Name: cancel_order_form
Number of Fields: 5

📋 Full Form JSON:
{
  "type": "form",
  "title": "Cancel Order",
  "name": "cancel_order_form",
  "fields": [
    {
      "name": "order_id",
      "label": "Order ID",
      "type": "text",
      "value": "ORD123",
      "readonly": true,
      "required": true
    },
    {
      "name": "product_name",
      "label": "Product",
      "type": "text",
      "value": "iPhone Case",
      "readonly": true
    },
    {
      "name": "total_amount",
      "label": "Order Amount",
      "type": "text",
      "value": "₹1299",
      "readonly": true
    },
    {
      "name": "cancellation_reason",
      "label": "Reason for Cancellation",
      "type": "textarea",
      "placeholder": "Please tell us why you want to cancel this order...",
      "required": true,
      "validation": {
        "maxLength": 500
      }
    },
    {
      "name": "refund_method",
      "label": "Refund Method",
      "type": "select",
      "required": true,
      "options": [
        { "label": "Original Payment Method", "value": "original_payment" },
        { "label": "Wallet Credit", "value": "wallet" },
        { "label": "Store Credit", "value": "store_credit" },
        { "label": "Bank Transfer", "value": "bank_transfer" }
      ]
    }
  ],
  "action": {
    "type": "submit",
    "label": "Submit Cancellation",
    "name": "process_cancellation"
  }
}
=======================================
```

**What SalesIQ Shows:**
- A form opens in the chat
- Pre-filled fields:
  - Order ID: ORD123 (readonly)
  - Product: iPhone Case (readonly)
  - Order Amount: ₹1299 (readonly)
- Empty fields for user to fill:
  - Reason for Cancellation (textarea)
  - Refund Method (dropdown)
  - Bank Details (conditional - only if Bank Transfer selected)

---

## 🐛 Troubleshooting

### If You Don't See the Response Logs:

**Problem:** Webhook receives the message but doesn't send a response.

**Check:**
1. Is the message text exactly `"❌ Cancel Order"`?
   - Check logs for: `💬 Message Text: ❌ Cancel Order`
   - If it shows something else, the handler won't trigger

2. Is `handleCancelAction` being called?
   - Look for: `🔍 Fetching cancellable orders from Firestore`
   - If missing, the function isn't being called

3. Is the response being returned?
   - Look for: `✅ ===== SENDING CANCEL ORDER RESPONSE =====`
   - If missing, there's an error in `handleCancelAction`

---

### If Buttons Don't Show Order Details:

**Problem:** Buttons appear but don't have order ID, amount, or product name.

**Check Logs:**
```
Number of Buttons: 1
Buttons:
  1. Label: "Order undefined - ₹undefined", Name: "cancel_order_undefined", Type: "postback"
```

**Solution:** The order data from Firestore is missing fields.

**Fix:**
1. Check Firestore document structure:
   ```
   users/{userId}/orders/{orderId}
   ├── id: "ORD123"
   ├── totalAmount: 1299
   ├── status: "confirmed"
   └── items: [
       {
         productName: "iPhone Case",
         price: 599,
         quantity: 1
       }
     ]
   ```

2. Ensure `handleCancelAction` maps fields correctly:
   ```javascript
   cancellableOrders.push({
     id: doc.id,
     order_id: doc.id,
     product_name: orderData.items?.[0]?.productName || 'Product',
     total_amount: orderData.totalAmount || 0,
     status: status
   });
   ```

---

### If Form Doesn't Open When Button Clicked:

**Problem:** User clicks order button but form doesn't appear.

**Check Logs:**
```
🔘 ===== POSTBACK BUTTON CLICKED =====
Action: cancel_order_ORD123
```

**If you see:**
```
❌ Order not found in customer data
Available Order IDs: ORD456, ORD789
```

**Solution:** The order ID doesn't match.

**Possible Causes:**
1. Button name is `cancel_order_ORD123` but Firestore has `ORD-123` (different format)
2. Order was deleted from Firestore
3. User ID mismatch - order belongs to different user

**Fix:**
- Ensure order IDs are consistent
- Check: `const orderId = action.split('_').pop();`
- This extracts `ORD123` from `cancel_order_ORD123`

---

## 📋 Quick Checklist

When testing, verify these logs appear in order:

- [ ] `✅ Real user message received`
- [ ] `💬 Message Text: ❌ Cancel Order`
- [ ] `🔍 Fetching cancellable orders from Firestore`
- [ ] `✅ Found X cancellable orders`
- [ ] `✅ ===== SENDING CANCEL ORDER RESPONSE =====`
- [ ] `Number of Buttons: X` (should be > 0)
- [ ] Button labels show: `Order {ID} - ₹{Amount}`
- [ ] `🔘 ===== POSTBACK BUTTON CLICKED =====` (when button clicked)
- [ ] `✅ Order Found:` with ID, Amount, Items
- [ ] `📤 Sending Form Response:`
- [ ] Form has 5 fields with pre-filled values

---

## 🎯 Expected Flow Summary

```
User Action          →  Webhook Logs                    →  SalesIQ Display
─────────────────────────────────────────────────────────────────────────────
1. Click "Cancel"    →  "Fetching cancellable orders"  →  Loading...
                     →  "Found 1 orders"               →  
                     →  "SENDING RESPONSE"             →  Message + Buttons

2. Click Order Btn   →  "BUTTON CLICKED"               →  Loading...
                     →  "Order Found: ORD123"          →
                     →  "Generating form"              →
                     →  "Sending Form Response"        →  Form Opens

3. Fill & Submit     →  "FORM SUBMITTED"               →  Loading...
                     →  "Order cancelled"              →  Success Message
                     →  "Firestore updated"            →
```

---

## 🔧 Testing Commands

### 1. Test Webhook Response Format
```bash
node test-response.js
```

### 2. Start Webhook Server
```bash
node webhook_local.js
```

### 3. Watch Logs in Real-Time
Look for these sections:
- `===== WEBHOOK CALLED =====`
- `===== SENDING CANCEL ORDER RESPONSE =====`
- `===== POSTBACK BUTTON CLICKED =====`
- `===== SALESIQ FORM SUBMISSION =====`

---

## ✅ Success Indicators

You'll know it's working when you see:

1. **After clicking "Cancel Order":**
   - Logs show button with order details
   - SalesIQ shows clickable button with "Order ORD123 - ₹1299"

2. **After clicking order button:**
   - Logs show form JSON with pre-filled values
   - SalesIQ opens form with Order ID, Product, Amount already filled

3. **After submitting form:**
   - Logs show "Order cancelled successfully"
   - SalesIQ shows success message
   - Firestore order status changes to "cancelled"

---

## 🆘 Still Not Working?

**Share these logs:**
1. Full webhook console output from when you click "Cancel Order"
2. The `===== SENDING CANCEL ORDER RESPONSE =====` section
3. The button JSON from the logs
4. Any error messages

**Check SalesIQ:**
1. Is the webhook URL correct in SalesIQ settings?
2. Is the webhook active and receiving requests?
3. Are there any errors in SalesIQ console?

**Check Firestore:**
1. Does the order document exist?
2. Does it have all required fields (id, totalAmount, items, status)?
3. Is the status "confirmed" or "processing"?
