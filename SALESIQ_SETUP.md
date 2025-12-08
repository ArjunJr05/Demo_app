# 🔧 SalesIQ Configuration & Setup Guide

## Complete Setup Instructions for Zoho SalesIQ Integration

**Project:** SalesIQ E-Commerce Integration Suite  
**Developer:** Arjun .D  
**Date:** December 8, 2025

---

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Part 1: SalesIQ Account Setup](#part-1-salesiq-account-setup)
- [Part 2: Zobot Configuration](#part-2-zobot-configuration)
- [Part 3: Form Controller Setup](#part-3-form-controller-setup)
- [Part 4: Widget Configuration](#part-4-widget-configuration)
- [Part 5: Webhook Integration](#part-5-webhook-integration)
- [Part 6: Testing](#part-6-testing)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This guide covers the complete SalesIQ setup including:
1. ✅ Zobot (Bot) creation with resume form trigger
2. ✅ Form Controller for Cancel/Return orders
3. ✅ Custom Widget configuration
4. ✅ Webhook integration with Node.js server

---

## 📦 Prerequisites

Before starting, ensure you have:
- ✅ Zoho SalesIQ account (Free or Paid plan)
- ✅ Webhook server running (Node.js)
- ✅ Firebase Firestore configured
- ✅ Flutter app with SalesIQ SDK integrated

---

## Part 1: SalesIQ Account Setup

### **Step 1.1: Create SalesIQ Account**

1. Go to [https://www.zoho.com/salesiq/](https://www.zoho.com/salesiq/)
2. Sign up for free account or log in
3. Create a new brand/portal

### **Step 1.2: Get API Credentials**

1. Go to **Settings** → **Brands**
2. Select your brand
3. Copy the following:
   - **App Key:** `YOUR_APP_KEY`
   - **Access Key:** `YOUR_ACCESS_KEY`
4. Save these for Flutter app integration

### **Step 1.3: Enable Developer Features**

1. Go to **Settings** → **Developer Space**
2. Enable the following:
   - ✅ Webhooks
   - ✅ Custom Widgets
   - ✅ Bot Platform
   - ✅ Form Controllers

---

## Part 2: Zobot Configuration

### **Step 2.1: Create New Bot**

1. Go to **Settings** → **Bots**
2. Click **"+ Create Bot"**
3. Select **"Codeless Bot Builder"**
4. Name: `E-Commerce Support Bot`

### **Step 2.2: Configure Welcome Message**

```
Flow: Welcome Message
├─ Trigger: Visitor starts chat
└─ Action: Send message

Message:
"👋 Welcome to our E-Commerce Support!

I'm here to help you with:
• Order Tracking
• Order Cancellation
• Order Returns
• General Queries

How can I assist you today?"

Suggestions:
- "Cancel Order"
- "Return Order"
- "Track Order"
- "Talk to Human"
```

**Setup in Bot Builder:**
1. Add **"Message"** card
2. Enter welcome text
3. Add **"Suggestions"** card
4. Add 4 buttons with above labels

### **Step 2.3: Create Resume Form Trigger**

This is crucial for handling form submissions after user returns to chat.

**Purpose:** When user fills Cancel/Return form and comes back to chat, bot should resume conversation.

**Setup:**

1. **Add Trigger Card:**
   - Type: `Form Submitted`
   - Form Name: `cancel_order_form` or `return_order_form`

2. **Add Action Card:**
   - Type: `Resume Conversation`
   - Message: `"Thank you! Your request has been submitted. Processing..."`

3. **Add Webhook Card:**
   - URL: `https://your-domain.com/webhook`
   - Method: `POST`
   - Headers: 
     ```json
     {
       "Content-Type": "application/json"
     }
     ```
   - Body:
     ```json
     {
       "handler": "form_submit",
       "form_name": "{{form_name}}",
       "form_data": "{{form_data}}",
       "visitor_email": "{{visitor.email}}"
     }
     ```

**Bot Flow Diagram:**
```
Form Submitted
    ↓
Resume Conversation
    ↓
Send to Webhook
    ↓
Process in Server
    ↓
Send Confirmation
```

### **Step 2.4: Handle Cancel Order Intent**

1. **Add Intent Card:**
   - Intent Name: `cancel_order`
   - Training Phrases:
     - "cancel order"
     - "cancel my order"
     - "I want to cancel"
     - "cancel order please"

2. **Add Webhook Card:**
   - URL: `https://your-domain.com/webhook`
   - Method: `POST`
   - Body:
     ```json
     {
       "handler": "message",
       "message": {
         "text": "cancel order"
       },
       "visitor": {
         "email": "{{visitor.email}}",
         "name": "{{visitor.name}}"
       }
     }
     ```

### **Step 2.5: Handle Return Order Intent**

1. **Add Intent Card:**
   - Intent Name: `return_order`
   - Training Phrases:
     - "return order"
     - "return my order"
     - "I want to return"
     - "return product"

2. **Add Webhook Card:**
   - URL: `https://your-domain.com/webhook`
   - Method: `POST`
   - Body:
     ```json
     {
       "handler": "message",
       "message": {
         "text": "return order"
       },
       "visitor": {
         "email": "{{visitor.email}}",
         "name": "{{visitor.name}}"
       }
     }
     ```

### **Step 2.6: Save and Activate Bot**

1. Click **"Save"**
2. Click **"Activate Bot"**
3. Set bot to trigger on:
   - ✅ Chat start
   - ✅ Form submission
   - ✅ Specific keywords

---

## Part 3: Form Controller Setup

Form Controllers collect structured data from users (Cancel/Return reasons, refund methods).

### **Step 3.1: Create Cancel Order Form**

1. Go to **Settings** → **Developer Space** → **Form Controllers**
2. Click **"+ Create Form"**
3. Form Name: `cancel_order_form`
4. Form ID: `CANCEL_ORDER_FORM`

**Form Fields:**

| Field Name | Field Type | Required | Options |
|------------|-----------|----------|---------|
| order_id | Text | Yes | Auto-filled |
| product_name | Text | Yes | Auto-filled |
| cancellation_reason | Dropdown | Yes | See below |
| refund_method | Dropdown | Yes | See below |

**Cancellation Reason Options:**
```
- Changed my mind
- Found better price
- Ordered by mistake
- Delivery time too long
- Other reason
```

**Refund Method Options:**
```
- Original Payment Method
- Store Credit
- Bank Transfer
```

**Form Configuration JSON:**
```json
{
  "form_id": "CANCEL_ORDER_FORM",
  "title": "Cancel Order Request",
  "description": "Please provide cancellation details",
  "fields": [
    {
      "name": "order_id",
      "label": "Order ID",
      "type": "text",
      "required": true,
      "readonly": true,
      "value": "{{order_id}}"
    },
    {
      "name": "product_name",
      "label": "Product Name",
      "type": "text",
      "required": true,
      "readonly": true,
      "value": "{{product_name}}"
    },
    {
      "name": "cancellation_reason",
      "label": "Reason for Cancellation",
      "type": "dropdown",
      "required": true,
      "options": [
        {"value": "changed_mind", "label": "Changed my mind"},
        {"value": "better_price", "label": "Found better price"},
        {"value": "ordered_mistake", "label": "Ordered by mistake"},
        {"value": "delivery_time", "label": "Delivery time too long"},
        {"value": "other", "label": "Other reason"}
      ]
    },
    {
      "name": "refund_method",
      "label": "Refund Method",
      "type": "dropdown",
      "required": true,
      "options": [
        {"value": "original_payment", "label": "Original Payment Method"},
        {"value": "store_credit", "label": "Store Credit"},
        {"value": "bank_transfer", "label": "Bank Transfer"}
      ]
    }
  ],
  "submit_button": "Submit Cancellation",
  "on_submit": {
    "action": "webhook",
    "url": "https://your-domain.com/webhook/form-submit"
  }
}
```

### **Step 3.2: Create Return Order Form**

1. Click **"+ Create Form"**
2. Form Name: `return_order_form`
3. Form ID: `RETURN_ORDER_FORM`

**Form Fields:**

| Field Name | Field Type | Required | Options |
|------------|-----------|----------|---------|
| order_id | Text | Yes | Auto-filled |
| product_name | Text | Yes | Auto-filled |
| return_reason | Dropdown | Yes | See below |
| refund_method | Dropdown | Yes | See below |

**Return Reason Options:**
```
- Product defective
- Wrong item received
- Product damaged
- Not as described
- Quality issue
- Other reason
```

**Form Configuration JSON:**
```json
{
  "form_id": "RETURN_ORDER_FORM",
  "title": "Return Order Request",
  "description": "Please provide return details",
  "fields": [
    {
      "name": "order_id",
      "label": "Order ID",
      "type": "text",
      "required": true,
      "readonly": true,
      "value": "{{order_id}}"
    },
    {
      "name": "product_name",
      "label": "Product Name",
      "type": "text",
      "required": true,
      "readonly": true,
      "value": "{{product_name}}"
    },
    {
      "name": "return_reason",
      "label": "Reason for Return",
      "type": "dropdown",
      "required": true,
      "options": [
        {"value": "defective", "label": "Product defective"},
        {"value": "wrong_item", "label": "Wrong item received"},
        {"value": "damaged", "label": "Product damaged"},
        {"value": "not_described", "label": "Not as described"},
        {"value": "quality", "label": "Quality issue"},
        {"value": "other", "label": "Other reason"}
      ]
    },
    {
      "name": "refund_method",
      "label": "Refund Method",
      "type": "dropdown",
      "required": true,
      "options": [
        {"value": "original_payment", "label": "Original Payment Method"},
        {"value": "store_credit", "label": "Store Credit"},
        {"value": "bank_transfer", "label": "Bank Transfer"}
      ]
    }
  ],
  "submit_button": "Submit Return Request",
  "on_submit": {
    "action": "webhook",
    "url": "https://your-domain.com/webhook/form-submit"
  }
}
```

### **Step 3.3: Trigger Form from Webhook**

In your webhook server (`webhook_local.js`), trigger the form:

```javascript
// When user selects order to cancel
if (messageText.includes('CANCEL_ORDER:')) {
  const orderId = extractOrderId(messageText);
  const productName = extractProductName(messageText);
  
  return res.status(200).json({
    action: "form",
    form_id: "CANCEL_ORDER_FORM",
    form_data: {
      order_id: orderId,
      product_name: productName
    }
  });
}

// When user selects order to return
if (messageText.includes('RETURN_ORDER:')) {
  const orderId = extractOrderId(messageText);
  const productName = extractProductName(messageText);
  
  return res.status(200).json({
    action: "form",
    form_id: "RETURN_ORDER_FORM",
    form_data: {
      order_id: orderId,
      product_name: productName
    }
  });
}
```

---

## Part 4: Widget Configuration

Custom widgets display customer data in the operator dashboard.

### **Step 4.1: Enable Custom Widgets**

1. Go to **Settings** → **Developer Space** → **Custom Widgets**
2. Click **"+ Create Widget"**
3. Widget Name: `Customer Context Widget`
4. Widget ID: `CUSTOMER_WIDGET`

### **Step 4.2: Configure Widget Trigger**

**Trigger:** When operator opens chat

**Setup:**
1. Trigger Type: `Chat Opened`
2. Webhook URL: `https://your-domain.com/webhook`
3. Method: `POST`
4. Headers:
   ```json
   {
     "Content-Type": "application/json",
     "X-SalesIQ-Widget": "customer_context"
   }
   ```

### **Step 4.3: Widget Response Format**

Your webhook server should return:

```json
{
  "type": "widget_detail",
  "sections": [
    {
      "name": "customer_overview",
      "layout": "info",
      "title": "👋 Hello Customer!",
      "data": [
        {"label": "Customer", "value": "John Doe"},
        {"label": "Email", "value": "john@example.com"},
        {"label": "Phone", "value": "+91 9876543210"},
        {"label": "Member Since", "value": "Jan 2024"},
        {"label": "Loyalty Status", "value": "Gold Member"}
      ]
    },
    {
      "name": "orders_summary",
      "layout": "listing",
      "title": "📦 Recent Orders",
      "data": [
        {
          "name": "ORD123",
          "title": "✅ Order ORD123",
          "text": "₹2999 • Dec 8, 2025",
          "subtext": "Paid • Tracking: TRK123",
          "actions": [
            {
              "label": "❌ Cancel Order",
              "name": "QUICK_CANCEL:ORD123",
              "type": "postback"
            }
          ]
        }
      ]
    },
    {
      "name": "issues",
      "layout": "listing",
      "title": "⚠️ Support Issues",
      "data": [
        {
          "name": "ISSUE123",
          "title": "🔄 Order Return",
          "text": "Order ORD456 - Product defective",
          "subtext": "Pending Review • Dec 8, 2025"
        }
      ]
    }
  ]
}
```

### **Step 4.4: Widget Code in Webhook Server**

```javascript
// webhook_local.js - Customer Widget Handler
async function createComprehensiveCustomerWidget(visitorInfo) {
  console.log('🎯 Creating customer widget');
  const visitorEmail = visitorInfo.email;
  const customerData = await getCustomerData(visitorEmail);

  const sections = [];

  // Customer Overview Section
  sections.push({
    name: "customer_overview",
    layout: "info",
    title: `👋 Hello ${customerData.customerName}!`,
    data: [
      { label: "Customer", value: customerData.customerName },
      { label: "Email", value: customerData.customerEmail },
      { label: "Phone", value: customerData.customerPhone || 'Not provided' },
      { label: "Member Since", value: customerData.analytics?.customerSince || 'Recently' },
      { label: "Loyalty Status", value: `${customerData.analytics?.loyaltyStatus || 'New'} Member` }
    ]
  });

  // Orders Summary Section
  if (customerData.orders && customerData.orders.length > 0) {
    const recentOrders = customerData.orders.slice(0, 3);
    sections.push({
      name: "orders_summary",
      layout: "listing",
      title: `📦 Recent Orders (${customerData.orders.length} total)`,
      data: recentOrders.map(order => {
        const isPending = order.status === 'Pending' || 
                         order.status === 'Processing';
        
        const orderItem = {
          name: order.id,
          title: `${getOrderStatusIcon(order.status)} Order ${order.id}`,
          text: `₹${order.totalAmount} • ${new Date(order.orderDate).toLocaleDateString()}`,
          subtext: `${order.paymentStatus} • ${order.trackingNumber || 'No tracking'}`
        };
        
        // Add cancel button only for pending orders
        if (isPending) {
          orderItem.actions = [
            {
              label: "❌ Cancel Order",
              name: `QUICK_CANCEL:${order.id}`,
              type: "postback"
            }
          ];
        }
        
        return orderItem;
      })
    });
  }

  // Issues Section
  if (customerData.issues && customerData.issues.length > 0) {
    sections.push({
      name: "issues",
      layout: "listing",
      title: `⚠️ Support Issues (${customerData.issues.length} total)`,
      data: customerData.issues.slice(0, 3).map(issue => ({
        name: issue.id,
        title: `${getIssueIcon(issue.status)} ${issue.issueType}`,
        text: issue.description,
        subtext: `${issue.status} • ${new Date(issue.createdAt).toLocaleDateString()}`
      }))
    });
  }

  return {
    type: "widget_detail",
    sections: sections
  };
}
```

---

## Part 5: Webhook Integration

### **Step 5.1: Configure Webhook in SalesIQ**

1. Go to **Settings** → **Developer Space** → **Webhooks**
2. Click **"+ Add Webhook"**
3. Configure:

**Webhook Details:**
```
Name: E-Commerce Bot Webhook
URL: https://your-domain.com/webhook
Method: POST
Authentication: None (or add secret)
```

**Events to Subscribe:**
- ✅ `visitor.chat_initiated`
- ✅ `visitor.message_received`
- ✅ `bot.action_performed`
- ✅ `form.submitted`
- ✅ `widget.requested`

**Headers:**
```json
{
  "Content-Type": "application/json",
  "X-SalesIQ-Secret": "your_webhook_secret"
}
```

### **Step 5.2: Webhook Server Configuration**

**File:** `webhook/api/webhook_local.js`

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const app = express();
app.use(bodyParser.json());

// Main webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    console.log('📥 Webhook received:', req.body.handler);
    
    const handler = req.body.handler;
    const visitor = req.body.visitor;
    const message = req.body.message;

    // Handle different webhook events
    switch (handler) {
      case 'visitor':
        // Customer widget request
        const widget = await createComprehensiveCustomerWidget(visitor);
        return res.status(200).json(widget);

      case 'message':
        // Message from user
        const response = await handleMessage(message, visitor);
        return res.status(200).json(response);

      case 'form_submit':
        // Form submission
        const confirmation = await handleFormSubmit(req.body);
        return res.status(200).json(confirmation);

      default:
        return res.status(200).json({ action: "reply", replies: [{ text: "👋 Hello!" }] });
    }
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(200).json({
      action: "reply",
      replies: [{ text: "Sorry, something went wrong. Please try again." }]
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Webhook server running on port ${PORT}`);
});
```

### **Step 5.3: Connect Widget with Webhook**

**In SalesIQ Settings:**
1. Go to **Custom Widgets** → **Customer Context Widget**
2. Set **Webhook URL:** `https://your-domain.com/webhook`
3. Set **Trigger:** `On chat open`
4. Save configuration

**In Webhook Server:**
```javascript
// Handle widget request
if (req.body.handler === 'visitor') {
  const visitorEmail = req.body.visitor.email;
  
  // Fetch customer data from Firestore
  const customerData = await getCustomerData(visitorEmail);
  
  // Build widget
  const widget = await createComprehensiveCustomerWidget({
    email: visitorEmail,
    name: req.body.visitor.name
  });
  
  // Send widget to SalesIQ
  return res.status(200).json(widget);
}
```

---

## Part 6: Testing

### **Step 6.1: Test Bot Flow**

1. Open SalesIQ chat widget
2. Type "Cancel Order"
3. Verify:
   - ✅ Bot responds with order list
   - ✅ Clicking order shows form
   - ✅ Form has correct fields
   - ✅ Submission triggers webhook
   - ✅ Confirmation message appears

### **Step 6.2: Test Widget Display**

1. Open operator dashboard
2. Start chat with test user
3. Verify:
   - ✅ Customer widget loads
   - ✅ Shows customer profile
   - ✅ Shows recent orders
   - ✅ Shows issues
   - ✅ Cancel buttons appear on pending orders

### **Step 6.3: Test Form Controller**

1. Click "Cancel Order" in chat
2. Select an order
3. Verify:
   - ✅ Form opens with pre-filled data
   - ✅ Dropdown options load correctly
   - ✅ Submit button works
   - ✅ Webhook receives form data
   - ✅ Confirmation sent to user

### **Step 6.4: Test Resume Form Trigger**

1. Open form but don't submit
2. Close chat
3. Reopen chat
4. Verify:
   - ✅ Bot asks if you want to continue
   - ✅ Form state is preserved
   - ✅ Can resume or cancel

---

## 🐛 Troubleshooting

### **Issue: Widget not loading**

**Solution:**
1. Check webhook URL is correct and accessible
2. Verify webhook server is running
3. Check SalesIQ webhook logs
4. Ensure visitor email is set in Flutter app

### **Issue: Form not opening**

**Solution:**
1. Verify form ID matches in webhook response
2. Check form is published in SalesIQ
3. Ensure form fields are correctly configured
4. Check webhook response format

### **Issue: Bot not responding**

**Solution:**
1. Check bot is activated
2. Verify webhook URL in bot configuration
3. Check webhook server logs
4. Test webhook with curl

### **Issue: Resume form not working**

**Solution:**
1. Verify resume trigger is configured in bot
2. Check form submission webhook
3. Ensure form state is saved
4. Test with SalesIQ test console

---

## 📝 Configuration Checklist

- [ ] SalesIQ account created
- [ ] App Key and Access Key obtained
- [ ] Bot created with welcome message
- [ ] Cancel Order intent configured
- [ ] Return Order intent configured
- [ ] Resume form trigger added
- [ ] Cancel Order form created
- [ ] Return Order form created
- [ ] Custom widget enabled
- [ ] Widget webhook configured
- [ ] Main webhook URL added
- [ ] Webhook events subscribed
- [ ] Webhook server running
- [ ] Firebase connected
- [ ] Flutter app integrated
- [ ] All tested and working

---

## 🔗 Quick Links

- **SalesIQ Dashboard:** https://salesiq.zoho.com/
- **Developer Space:** Settings → Developer Space
- **Bot Builder:** Settings → Bots
- **Form Controllers:** Settings → Developer Space → Form Controllers
- **Custom Widgets:** Settings → Developer Space → Custom Widgets
- **Webhooks:** Settings → Developer Space → Webhooks

---

## 📧 Support

For issues:
- Check SalesIQ documentation
- Review webhook server logs
- Test with SalesIQ console
- Contact: arjunfree256@gmail.com

---

**Setup Complete! Your SalesIQ integration is ready to use.** 🎉
