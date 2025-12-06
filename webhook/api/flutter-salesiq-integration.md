# 🚀 Flutter SalesIQ Automation Integration

## 📱 How to Add to Your Flutter App

### 1. **Add to your main.dart or specific screens:**

```dart
import 'dart:html' as html;

class SalesIQAutomation {
  // Auto-send welcome message
  static void sendWelcomeMessage() {
    html.window.postMessage({
      'type': 'salesiq_action',
      'action': 'send_message',
      'message': 'Hi! Welcome to Cliqtrix 👋 How can I help?'
    }, '*');
  }
  
  // Auto-capture user data
  static void setUserData(String name, String email, [String? phone]) {
    html.window.postMessage({
      'type': 'salesiq_action',
      'action': 'set_user_data',
      'data': {
        'name': name,
        'email': email,
        'phone': phone ?? ''
      }
    }, '*');
  }
  
  // Auto-open chat
  static void openChat() {
    html.window.postMessage({
      'type': 'salesiq_action',
      'action': 'open_chat'
    }, '*');
  }
  
  // Track custom events
  static void trackEvent(String eventName, Map<String, dynamic> data) {
    html.window.postMessage({
      'type': 'salesiq_action',
      'action': 'track_event',
      'event': eventName,
      'data': data
    }, '*');
  }
}
```

### 2. **Use in your screens:**

```dart
// In ECommerceHomeScreen
@override
void initState() {
  super.initState();
  
  // Auto-set user data when screen loads
  if (widget.customerEmail.isNotEmpty) {
    SalesIQAutomation.setUserData(
      widget.customerName, 
      widget.customerEmail,
      widget.customerPhone
    );
  }
  
  // Send welcome message after 2 seconds
  Timer(Duration(seconds: 2), () {
    SalesIQAutomation.sendWelcomeMessage();
  });
}

// Track when user views products
void _trackProductView(Product product) {
  SalesIQAutomation.trackEvent('product_viewed', {
    'product_id': product.id,
    'product_name': product.name,
    'price': product.price
  });
}

// Auto-open chat for cart abandonment
void _handleCartAbandonment() {
  Timer(Duration(minutes: 5), () {
    SalesIQAutomation.openChat();
  });
}
```

## 🎯 **What the Automation Does:**

### ✅ **Automatic Behaviors:**
- **Welcome Message**: Auto-sends greeting after 2 seconds
- **User Data Capture**: Auto-fills name, email, phone from Flutter app
- **Smart Triggers**: Opens chat based on user behavior
- **Event Tracking**: Tracks page views, scrolling, cart actions
- **Cart Abandonment**: Reminds users about items in cart

### ✅ **Manual Controls:**
```javascript
// Available functions for manual control
sendCustomMessage("Your custom message");
openChat();
closeChat();
setCustomerData("Name", "email@example.com", "+91-9876543210");
```

## 🔧 **Integration Steps:**

### 1. **Add to your web/index.html:**
```html
<!-- Add before closing </body> tag -->
<script src="salesiq-automation.js"></script>
```

### 2. **Update SalesIQ widget code:**
Replace `widgetcode` with your actual SalesIQ widget code from your dashboard.

### 3. **Test the automation:**
- Open your Flutter web app
- Check browser console for automation logs
- Verify welcome message appears
- Test action buttons functionality

## 📊 **Analytics Tracking:**

The automation tracks:
- **Page views**
- **Time on page**
- **Scroll behavior**
- **Chat interactions**
- **Button clicks**
- **Cart activities**

All events are sent to your webhook at `/api/track-event` for analytics.

## 🎯 **Expected Results:**

1. **User opens app** → Auto-captures user data
2. **After 2 seconds** → Sends welcome message
3. **User types anything** → Gets action buttons automatically
4. **User inactive for 30s** → Gets help offer
5. **Cart abandonment** → Gets reminder message

Your SalesIQ chat is now **fully automated** and **intelligent**! 🚀
