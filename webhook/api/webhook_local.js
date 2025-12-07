// 📦 Local Express Server - SalesIQ Customer Data Webhook with Form Controllers
// File: webhook_local.js
// Usage: node webhook_local.js
// Reference: https://www.zoho.com/salesiq/help/developer-section/form-controllers.html

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Firebase Admin SDK
let db = null;
let firebaseEnabled = false;

// Try multiple initialization methods
if (!admin.apps.length) {
  try {
    // Method 1: Try service account JSON file
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    firebaseEnabled = true;
    console.log('🔥 Firebase initialized with service account');
  } catch (serviceAccountError) {
    try {
      // Method 2: Try with project ID only (requires GOOGLE_APPLICATION_CREDENTIALS env var)
      const firebaseConfig = require('./firebase-config.js');
      admin.initializeApp({
        projectId: firebaseConfig.projectId || 'your-project-id'
      });
      db = admin.firestore();
      firebaseEnabled = true;
      console.log('🔥 Firebase initialized with project ID');
    } catch (projectIdError) {
      try {
        // Method 3: Try default initialization
        admin.initializeApp();
        db = admin.firestore();
        firebaseEnabled = true;
        console.log('🔥 Firebase initialized with default credentials');
      } catch (defaultError) {
        console.log('⚠️ Firebase initialization failed, using mock data mode');
        console.log('📝 To enable Firestore:');
        console.log('  1. Download service account JSON → firebase-service-account.json');
        console.log('  2. Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
        console.log('  3. Or update firebase-config.js with your project ID');
        firebaseEnabled = false;
      }
    }
  }
} else {
  db = admin.firestore();
  firebaseEnabled = true;
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📋 ZOHO SALESIQ FORM CONTROLLERS
// Reference: https://www.zoho.com/salesiq/help/developer-section/form-controllers.html

// Form Controller for Customer Data Collection
function createCustomerDataForm() {
  return {
    type: "widget_detail",
    sections: [
      {
        name: "customer_form",
        layout: "info",
        title: "📝 Customer Information",
        data: [
          { label: "Welcome", value: "Please provide your details to help us assist you better" },
          { label: "Required", value: "Name and Email are required" },
          { label: "Optional", value: "Phone and Order ID are optional" }
        ],
        actions: [
          { label: "📝 Fill Customer Form", name: "show_customer_form" },
          { label: "🔙 Skip for Now", name: "skip_form" }
        ]
      }
    ],
    action: {
      type: "submit",
      label: "Get My Information",
      name: "fetch_customer_data"
    }
  };
}

// Form Controller for Order Cancellation
function createCancelOrderForm(orderData) {
  return {
    type: "form",
    title: `❌ Cancel Order ${orderData.id}`,
    name: "cancel_order_form",
    fields: [
      {
        type: "text",
        name: "order_id",
        label: "Order ID",
        value: orderData.id,
        readonly: true
      },
      {
        type: "textarea",
        name: "cancellation_reason",
        label: "Reason for Cancellation",
        placeholder: "Please provide a reason for cancelling this order",
        mandatory: true,
        rows: 3
      },
      {
        type: "select",
        name: "refund_method",
        label: "Preferred Refund Method",
        mandatory: true,
        options: [
          { value: "original_payment", label: "Original Payment Method" },
          { value: "store_credit", label: "Store Credit" },
          { value: "bank_transfer", label: "Bank Transfer" }
        ]
      },
      {
        type: "text",
        name: "bank_details",
        label: "Bank Account (if Bank Transfer selected)",
        placeholder: "Account number or reference",
        mandatory: false,
        conditional: {
          field: "refund_method",
          value: "bank_transfer"
        }
      }
    ],
    action: {
      type: "submit",
      label: "Submit Cancellation Request",
      name: "process_cancellation"
    }
  };
}

// Form Controller for Order Return
function createReturnOrderForm(orderData) {
  return {
    type: "form",
    title: `↩️ Return Order ${orderData.id}`,
    name: "return_order_form",
    fields: [
      {
        type: "text",
        name: "order_id",
        label: "Order ID",
        value: orderData.id,
        readonly: true
      },
      {
        type: "checkbox",
        name: "return_items",
        label: "Items to Return",
        mandatory: true,
        options: orderData.items ? orderData.items.map(item => ({
          value: item.productName,
          label: `${item.productName} - ₹${item.price} (Qty: ${item.quantity})`
        })) : []
      },
      {
        type: "textarea",
        name: "return_reason",
        label: "Reason for Return",
        placeholder: "Please provide a reason for returning this order",
        mandatory: true,
        rows: 3
      },
      {
        type: "select",
        name: "return_condition",
        label: "Item Condition",
        mandatory: true,
        options: [
          { value: "unopened", label: "Unopened/Unused" },
          { value: "opened_unused", label: "Opened but Unused" },
          { value: "used_defective", label: "Used - Defective" },
          { value: "damaged_shipping", label: "Damaged in Shipping" }
        ]
      },
      {
        type: "select",
        name: "refund_method",
        label: "Preferred Refund Method",
        mandatory: true,
        options: [
          { value: "original_payment", label: "Original Payment Method" },
          { value: "store_credit", label: "Store Credit" },
          { value: "bank_transfer", label: "Bank Transfer" }
        ]
      }
    ],
    action: {
      type: "submit",
      label: "Submit Return Request",
      name: "process_return"
    }
  };
}

// Form Controller for Customer Feedback
function createFeedbackForm() {
  return {
    type: "form",
    title: "💬 Customer Feedback",
    name: "customer_feedback_form",
    fields: [
      {
        type: "rating",
        name: "satisfaction_rating",
        label: "How satisfied are you with our service?",
        mandatory: true,
        min: 1,
        max: 5,
        labels: ["Very Poor", "Poor", "Average", "Good", "Excellent"]
      },
      {
        type: "textarea",
        name: "feedback_comments",
        label: "Additional Comments",
        placeholder: "Please share your feedback or suggestions",
        mandatory: false,
        rows: 4
      },
      {
        type: "checkbox",
        name: "contact_permission",
        label: "Permissions",
        options: [
          { value: "follow_up", label: "You may contact me for follow-up" },
          { value: "newsletter", label: "Send me updates and offers" }
        ]
      }
    ],
    action: {
      type: "submit",
      label: "Submit Feedback",
      name: "submit_feedback"
    }
  };
}

// Process Form Submissions
async function processFormSubmission(formName, formData, visitorInfo) {
  console.log(`📋 Processing form submission: ${formName}`);
  console.log('Form Data:', JSON.stringify(formData, null, 2));
  
  switch (formName) {
    case 'customer_data_form':
      return await handleCustomerDataForm(formData, visitorInfo);
    case 'cancel_order_form':
      return await handleCancelOrderForm(formData, visitorInfo);
    case 'return_order_form':
      return await handleReturnOrderForm(formData, visitorInfo);
    case 'customer_feedback_form':
      return await handleFeedbackForm(formData, visitorInfo);
    default:
      return createErrorResponse(`Unknown form: ${formName}`);
  }
}

// Handle Customer Data Form Submission
async function handleCustomerDataForm(formData, visitorInfo) {
  const customerEmail = formData.customer_email;
  const inquiryType = formData.inquiry_type;
  
  // Update visitor info with form data
  visitorInfo.email = customerEmail;
  visitorInfo.name = formData.customer_name;
  
  const customerData = await getCustomerData(customerEmail);
  
  if (!customerData) {
    return {
      type: "message",
      text: `❌ No customer data found for ${customerEmail}. Please check your email address or contact support.`,
      delay: 1000
    };
  }
  
  // Handle specific inquiry types
  switch (inquiryType) {
    case 'order_status':
      return createOrderStatusResponse(customerData, formData.order_id);
    case 'cancel_order':
      return createCancelOrderResponse(customerData, formData.order_id);
    case 'return_order':
      return createReturnOrderResponse(customerData, formData.order_id);
    default:
      return await sendCustomerWidget(visitorInfo);
  }
}

// Handle Cancel Order Form Submission
async function handleCancelOrderForm(formData, visitorInfo) {
  try {
    const cancellationData = {
      order_id: formData.order_id,
      user_id: visitorInfo.email,
      action: 'cancel',
      date: new Date().toISOString(),
      reason: formData.cancellation_reason,
      refund_details: {
        refundableAmount: 0, // Will be calculated
        refundMethod: formData.refund_method,
        accountReference: formData.bank_details || null
      },
      idempotency_token: `cancel_${Date.now()}_${formData.order_id}`
    };
    
    // Process cancellation
    const result = await processCancellation(cancellationData);
    
    if (result.success) {
      return {
        type: "message",
        text: `✅ Order ${formData.order_id} has been cancelled successfully! Refund reference: ${result.refundReference}`,
        delay: 1000
      };
    } else {
      return {
        type: "message",
        text: `❌ Failed to cancel order ${formData.order_id}. Please contact support.`,
        delay: 1000
      };
    }
  } catch (error) {
    console.error('Cancel form error:', error);
    return createErrorResponse('Failed to process cancellation request');
  }
}

// Handle Return Order Form Submission
async function handleReturnOrderForm(formData, visitorInfo) {
  try {
    const returnData = {
      order_id: formData.order_id,
      user_id: visitorInfo.email,
      action: 'return',
      date: new Date().toISOString(),
      reason: formData.return_reason,
      return_items: formData.return_items,
      condition: formData.return_condition,
      refund_details: {
        refundableAmount: 0, // Will be calculated
        refundMethod: formData.refund_method
      },
      idempotency_token: `return_${Date.now()}_${formData.order_id}`
    };
    
    // Process return
    const result = await processReturn(returnData);
    
    if (result.success) {
      return {
        type: "message",
        text: `✅ Return request for order ${formData.order_id} has been submitted successfully! Return reference: ${result.returnReference}`,
        delay: 1000
      };
    } else {
      return {
        type: "message",
        text: `❌ Failed to process return for order ${formData.order_id}. Please contact support.`,
        delay: 1000
      };
    }
  } catch (error) {
    console.error('Return form error:', error);
    return createErrorResponse('Failed to process return request');
  }
}

// Handle Feedback Form Submission
async function handleFeedbackForm(formData, visitorInfo) {
  try {
    const feedbackData = {
      customer_email: visitorInfo.email,
      rating: formData.satisfaction_rating,
      comments: formData.feedback_comments,
      permissions: formData.contact_permission,
      timestamp: new Date().toISOString()
    };
    
    // Store feedback (in real implementation, save to database)
    console.log('📝 Customer Feedback Received:', feedbackData);
    
    return {
      type: "message",
      text: `🙏 Thank you for your feedback! Your ${formData.satisfaction_rating}-star rating has been recorded.`,
      delay: 1000
    };
  } catch (error) {
    console.error('Feedback form error:', error);
    return createErrorResponse('Failed to submit feedback');
  }
}

// Helper Functions for Form Responses
function createOrderStatusResponse(customerData, orderId) {
  const orders = customerData.orders || [];
  
  if (orderId) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      return {
        type: "widget_detail",
        sections: [{
          name: "orderStatus",
          layout: "info",
          title: `📦 Order ${order.id} Status`,
          data: [
            { label: "Status", value: getOrderStatusWithIcon(order.status) },
            { label: "Payment", value: order.paymentStatus },
            { label: "Total", value: `₹${order.totalAmount}` },
            { label: "Order Date", value: new Date(order.orderDate).toLocaleDateString() },
            { label: "Tracking", value: order.trackingNumber || 'Not available' }
          ]
        }]
      };
    }
  }
  
  // Show all orders if no specific order ID or order not found
  return {
    type: "widget_detail",
    sections: [{
      name: "allOrders",
      layout: "listing",
      title: `📦 Your Orders (${orders.length} total)`,
      data: orders.map(order => ({
        name: order.id,
        title: `${getOrderStatusWithIcon(order.status)} Order ${order.id}`,
        text: `₹${order.totalAmount} • ${new Date(order.orderDate).toLocaleDateString()}`,
        subtext: `${order.paymentStatus} • ${order.trackingNumber || 'No tracking'}`
      }))
    }]
  };
}

function createCancelOrderResponse(customerData, orderId) {
  const orders = customerData.orders || [];
  const eligibleOrders = orders.filter(order => 
    order.status === 'confirmed' || order.status === 'processing'
  );
  
  if (orderId) {
    const order = eligibleOrders.find(o => o.id === orderId);
    if (order) {
      return createCancelOrderForm(order);
    }
  }
  
  if (eligibleOrders.length === 0) {
    return {
      type: "message",
      text: "❌ No orders eligible for cancellation found. Orders can only be cancelled before shipping.",
      delay: 1000
    };
  }
  
  return {
    type: "widget_detail",
    sections: [{
      name: "cancellableOrders",
      layout: "listing",
      title: "📦 Orders Available for Cancellation",
      data: eligibleOrders.map(order => ({
        name: order.id,
        title: `Order ${order.id}`,
        text: `₹${order.totalAmount} • ${getOrderStatusWithIcon(order.status)}`,
        subtext: `Ordered on ${new Date(order.orderDate).toLocaleDateString()}`,
        action: {
          type: "form",
          name: "cancel_order_form",
          data: { order_id: order.id }
        }
      }))
    }]
  };
}

function createReturnOrderResponse(customerData, orderId) {
  const orders = customerData.orders || [];
  const eligibleOrders = orders.filter(order => 
    order.status === 'delivered' || order.status === 'shipped'
  );
  
  if (orderId) {
    const order = eligibleOrders.find(o => o.id === orderId);
    if (order) {
      return createReturnOrderForm(order);
    }
  }
  
  if (eligibleOrders.length === 0) {
    return {
      type: "message",
      text: "❌ No orders eligible for return found. Orders can only be returned after delivery.",
      delay: 1000
    };
  }
  
  return {
    type: "widget_detail",
    sections: [{
      name: "returnableOrders",
      layout: "listing",
      title: "📦 Orders Available for Return",
      data: eligibleOrders.map(order => ({
        name: order.id,
        title: `Order ${order.id}`,
        text: `₹${order.totalAmount} • ${getOrderStatusWithIcon(order.status)}`,
        subtext: `Delivered on ${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'Recently'}`,
        action: {
          type: "form",
          name: "return_order_form",
          data: { order_id: order.id }
        }
      }))
    }]
  };
}

function createErrorResponse(message) {
  return {
    type: "message",
    text: `❌ ${message}`,
    delay: 1000
  };
}

// Process Cancellation (integrate with Firestore)
async function processCancellation(cancellationData) {
  try {
    const refundReference = `REF${Date.now()}`;
    
    // Update order status in Firestore
    const success = await updateOrderStatusInFirestore(cancellationData.order_id, 'cancelled', {
      cancellationReason: cancellationData.reason,
      refundReference: refundReference,
      refundDetails: cancellationData.refund_details,
      cancelledAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    if (success) {
      // Log cancellation activity
      await saveIssueToFirestore({
        id: `CANCEL_${Date.now()}`,
        customerEmail: cancellationData.user_id,
        orderId: cancellationData.order_id,
        issueType: 'Order Cancellation',
        description: `Order cancelled by customer. Reason: ${cancellationData.reason}`,
        status: 'Resolved',
        resolution: `Refund processed with reference: ${refundReference}`
      });
    }
    
    return {
      success,
      refundReference: refundReference,
      message: 'Order cancelled successfully'
    };
  } catch (error) {
    console.error('❌ Cancellation processing error:', error);
    return { success: false, error: error.message };
  }
}

// Process Return (integrate with Firestore)
async function processReturn(returnData) {
  try {
    const returnReference = `RET${Date.now()}`;
    
    // Update order status in Firestore
    const success = await updateOrderStatusInFirestore(returnData.order_id, 'returned', {
      returnReason: returnData.reason,
      returnReference: returnReference,
      returnItems: returnData.return_items,
      returnCondition: returnData.condition,
      refundDetails: returnData.refund_details,
      returnedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    if (success) {
      // Log return activity
      await saveIssueToFirestore({
        id: `RETURN_${Date.now()}`,
        customerEmail: returnData.user_id,
        orderId: returnData.order_id,
        issueType: 'Order Return',
        description: `Order return requested by customer. Reason: ${returnData.reason}`,
        status: 'Processing',
        resolution: `Return initiated with reference: ${returnReference}`
      });
    }
    
    return {
      success,
      returnReference: returnReference,
      message: 'Return request submitted successfully'
    };
  } catch (error) {
    console.error('❌ Return processing error:', error);
    return { success: false, error: error.message };
  }
}

// 🔥 COMPREHENSIVE CUSTOMER DATA FROM FIRESTORE
async function getCustomerData(customerEmail) {
  try {
    console.log(`🔍 Looking up comprehensive customer data for: ${customerEmail}`);
    
    // If Firebase is enabled, try Firestore first
    if (firebaseEnabled && db) {
      try {
        console.log('🔥 Querying Firestore for all customer data...');
        
        // Step 1: Find user by email in users collection
        const usersSnapshot = await db.collection('users')
          .where('email', '==', customerEmail)
          .limit(1)
          .get();
        
        if (usersSnapshot.empty) {
          console.log(`⚠️ No user found with email: ${customerEmail}`);
          return getMockCustomerData(customerEmail);
        }
        
        const userDoc = usersSnapshot.docs[0];
        const userId = userDoc.id;
        const customerProfile = userDoc.data();
        
        console.log(`✅ Found user profile: ${customerProfile.name} (ID: ${userId})`);
        
        // Step 2: Get customer orders
        const ordersSnapshot = await db.collection('orders')
          .where('customerEmail', '==', customerEmail)
          .orderBy('orderDate', 'desc')
          .get();
        
        const orders = [];
        ordersSnapshot.forEach(doc => {
          const orderData = doc.data();
          orders.push({
            id: doc.id,
            ...orderData,
            orderDate: orderData.orderDate?.toDate?.()?.toISOString() || orderData.orderDate,
            deliveryDate: orderData.deliveryDate?.toDate?.()?.toISOString() || orderData.deliveryDate
          });
        });
        
        console.log(`📦 Found ${orders.length} orders`);
        
        // Step 3: Get cart items
        const cartSnapshot = await db.collection('users')
          .doc(userId)
          .collection('cart')
          .get();
        
        const cartItems = [];
        cartSnapshot.forEach(doc => {
          const cartData = doc.data();
          cartItems.push({
            productId: cartData.productId,
            productName: cartData.productName,
            price: cartData.price,
            quantity: cartData.quantity,
            selectedColor: cartData.selectedColor,
            selectedSize: cartData.selectedSize,
            imageUrl: cartData.imageUrl,
            addedAt: cartData.addedAt?.toDate?.()?.toISOString() || cartData.addedAt
          });
        });
        
        console.log(`� Found ${cartItems.length} cart items`);
        
        // Step 4: Get favorite items
        const favoritesSnapshot = await db.collection('users')
          .doc(userId)
          .collection('favorites')
          .orderBy('addedAt', 'desc')
          .get();
        
        const favorites = [];
        favoritesSnapshot.forEach(doc => {
          const favData = doc.data();
          favorites.push({
            productId: favData.productId,
            productName: favData.productName,
            price: favData.price,
            imageUrl: favData.imageUrl,
            category: favData.category,
            addedAt: favData.addedAt?.toDate?.()?.toISOString() || favData.addedAt
          });
        });
        
        console.log(`❤️ Found ${favorites.length} favorite items`);
        
        // Step 5: Calculate comprehensive analytics
        const analytics = calculateComprehensiveAnalytics(orders, cartItems, favorites, customerProfile);
        
        // Step 6: Get issues (if any)
        let issues = [];
        try {
          const issuesSnapshot = await db.collection('issues')
            .where('customerEmail', '==', customerEmail)
            .get();
          
          issuesSnapshot.forEach(doc => {
            const issueData = doc.data();
            issues.push({
              id: doc.id,
              ...issueData,
              createdAt: issueData.createdAt?.toDate?.()?.toISOString() || issueData.createdAt
            });
          });
        } catch (issueError) {
          console.log('📝 No issues collection found');
        }
        
        console.log(`🎫 Found ${issues.length} issues`);
        
        return {
          userId: userId,
          customerName: customerProfile.name || 'Customer',
          customerEmail: customerEmail,
          customerPhone: customerProfile.phone || 'Not provided',
          ...customerProfile,
          orders,
          cartItems,
          favorites,
          issues,
          analytics
        };
        
      } catch (firestoreError) {
        console.log('⚠️ Firestore query failed:', firestoreError.message);
      }
    }
    
    // Fallback to mock data
    console.log('📝 Using mock data for:', customerEmail);
    return getMockCustomerData(customerEmail);
    
  } catch (error) {
    console.error('❌ Error getting customer data:', error);
    return getMockCustomerData(customerEmail);
  }
}

// � COMPREHENSIVE ANALYTICS CALCULATION
function calculateComprehensiveAnalytics(orders, cartItems, favorites, customerProfile) {
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
  
  // Cart analytics
  const cartValue = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Determine loyalty status based on total spent
  let loyaltyStatus = 'New Customer';
  if (totalOrders >= 10 && totalSpent > 20000) loyaltyStatus = 'Platinum';
  else if (totalOrders >= 5 && totalSpent > 10000) loyaltyStatus = 'Gold';
  else if (totalOrders >= 3 && totalSpent > 5000) loyaltyStatus = 'Silver';
  else if (totalOrders >= 1 && totalSpent > 1000) loyaltyStatus = 'Bronze';
  
  // Find favorite category from orders and favorites
  const categoryCount = {};
  orders.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        const category = item.category || 'General';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
    }
  });
  
  favorites.forEach(fav => {
    const category = fav.category || 'General';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });
  
  const favoriteCategory = Object.keys(categoryCount).reduce((a, b) => 
    categoryCount[a] > categoryCount[b] ? a : b, 'General'
  );
  
  // Order status breakdown
  const statusBreakdown = {};
  orders.forEach(order => {
    const status = order.status || 'unknown';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
  });
  
  return {
    totalOrders,
    totalSpent,
    avgOrderValue,
    loyaltyStatus,
    customerSince: customerProfile?.createdAt?.toDate?.()?.toISOString()?.split('T')[0] || 
                   new Date().toISOString().split('T')[0],
    favoriteCategory,
    cartValue,
    cartItemCount,
    favoritesCount: favorites.length,
    statusBreakdown
  };
}

// � MOCK CUSTOMER DATA (Fallback)
function getMockCustomerData(customerEmail) {
  const mockCustomerData = {
    'priya@gmail.com': {
      customerName: 'Priya Sharma',
      customerEmail: 'priya@gmail.com',
    },
    'arjunfree256@gmail.com': {
      customerName: 'Arjun',
      customerEmail: 'arjunfree256@gmail.com',
      orders: [
        {
          id: 'ORD1765047901843',
          customerName: 'Arjun',
          customerEmail: 'arjunfree256@gmail.com',
          items: [
            { productName: 'Power Bank', price: 1299, quantity: 1 }
          ],
          totalAmount: 1299,
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentMethod: 'UPI',
          deliveryDate: '2025-12-14T00:35:01Z',
          orderDate: '2025-12-07T00:35:01Z',
          trackingNumber: 'TRK123456',
          shippingAddress: 'Customer Address'
        }
      ],
      issues: [],
      analytics: {
        totalOrders: 1,
        totalSpent: 1299,
        avgOrderValue: 1299,
        loyaltyStatus: 'Bronze',
        customerSince: '2025-12-07',
        favoriteCategory: 'Electronics'
      }
    },
    'priya@gmail.com': {
      customerName: 'Priya Sharma',
      customerEmail: 'priya@gmail.com',
      orders: [
        {
          id: 'ORD1701234567890',
          customerName: 'Priya Sharma',
          customerEmail: 'priya@gmail.com',
          items: [
            { productName: 'iPhone Case - Blue', price: 599, quantity: 1 },
            { productName: 'Screen Protector', price: 299, quantity: 1 }
          ],
          totalAmount: 898,
          status: 'outForDelivery',
          paymentStatus: 'paid',
          paymentMethod: 'UPI',
          deliveryDate: '2024-11-30T18:00:00Z',
          orderDate: '2024-11-28T10:30:00Z',
          trackingNumber: 'TRK123456',
          shippingAddress: '123 MG Road, Bangalore, Karnataka 560001'
        },
        {
          id: 'ORD1701234567891',
          customerName: 'Priya Sharma',
          customerEmail: 'priya@gmail.com',
          items: [
            { productName: 'iPhone Case - Blue', price: 599, quantity: 1 }
          ],
          totalAmount: 599,
          status: 'confirmed',
          paymentStatus: 'pending',
          paymentMethod: 'Cash on Delivery',
          orderDate: '2024-11-30T15:45:00Z',
          trackingNumber: 'TRK845410',
          shippingAddress: '123 MG Road, Bangalore, Karnataka 560001',
          deliveryDate: '2024-12-02T16:00:00Z'
        },
        {
          id: 'ORD1701234567892',
          customerName: 'Priya Sharma',
          customerEmail: 'priya@gmail.com',
          items: [
            { productName: 'Wireless Earbuds Pro', price: 2999, quantity: 1 }
          ],
          totalAmount: 2999,
          status: 'delivered',
          paymentStatus: 'paid',
          paymentMethod: 'Credit Card',
          orderDate: '2024-10-15T12:20:00Z',
          trackingNumber: 'TRK789012',
          shippingAddress: '123 MG Road, Bangalore, Karnataka 560001'
        }
      ],
      issues: [
        {
          id: 'ISS1701234567891',
          orderId: 'ORD1701234567890',
          issueType: 'Product Quality',
          description: 'Wrong color delivered in previous order',
          status: 'Resolved',
          createdAt: '2024-10-15T14:20:00Z',
          resolution: 'Refunded ₹500 for inconvenience'
        }
      ],
      analytics: {
        totalOrders: 3,
        totalSpent: 4496,
        avgOrderValue: 1499,
        loyaltyStatus: 'Silver',
        customerSince: '2024-08-15',
        favoriteCategory: 'Mobile Accessories'
      }
    }
  };
  
  const customerData = mockCustomerData[customerEmail];
  
  if (customerData) {
    console.log(`✅ Found mock data for: ${customerEmail}`);
    return customerData;
  } else {
    console.log(`⚠️ No specific data found for: ${customerEmail}, using default demo data`);
    return {
      customerName: 'Demo Customer',
      customerEmail: customerEmail,
      orders: [
        {
          id: 'ORD' + Date.now(),
          customerName: 'Demo Customer',
          customerEmail: customerEmail,
          items: [
            { productName: 'Sample Product', price: 999, quantity: 1 }
          ],
          totalAmount: 999,
          status: 'processing',
          paymentStatus: 'paid',
          paymentMethod: 'UPI',
          orderDate: new Date().toISOString(),
          trackingNumber: 'TRK' + Math.floor(Math.random() * 999999)
        }
      ],
      issues: [],
      analytics: {
        totalOrders: 1,
        totalSpent: 999,
        avgOrderValue: 999,
        loyaltyStatus: 'New Customer',
        customerSince: new Date().toISOString().split('T')[0],
        favoriteCategory: 'General'
      }
    };
  }
}

// 📊 CALCULATE CUSTOMER ANALYTICS
function calculateCustomerAnalytics(orders, customerProfile) {
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSpent / totalOrders) : 0;
  
  // Determine loyalty status based on total spent
  let loyaltyStatus = 'New Customer';
  if (totalSpent > 10000) loyaltyStatus = 'Platinum';
  else if (totalSpent > 5000) loyaltyStatus = 'Gold';
  else if (totalSpent > 2000) loyaltyStatus = 'Silver';
  else if (totalSpent > 500) loyaltyStatus = 'Bronze';
  
  // Find favorite category from orders
  const categoryCount = {};
  orders.forEach(order => {
    if (order.items) {
      order.items.forEach(item => {
        const category = item.category || 'General';
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      });
    }
  });
  
  const favoriteCategory = Object.keys(categoryCount).reduce((a, b) => 
    categoryCount[a] > categoryCount[b] ? a : b, 'General'
  );
  
  return {
    totalOrders,
    totalSpent,
    avgOrderValue,
    loyaltyStatus,
    customerSince: customerProfile?.customerSince || new Date().toISOString().split('T')[0],
    favoriteCategory
  };
}

// 🆕 CREATE DEFAULT CUSTOMER DATA
async function createDefaultCustomerData(customerEmail) {
  console.log(`🆕 Creating default customer profile for: ${customerEmail}`);
  
  const defaultProfile = {
    customerName: 'New Customer',
    customerEmail: customerEmail,
    customerSince: new Date().toISOString().split('T')[0]
  };
  
  // Only try to save to Firestore if it's enabled
  if (firebaseEnabled && db) {
    try {
      await db.collection('customers').doc(customerEmail).set({
        ...defaultProfile,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Created default profile in Firestore for: ${customerEmail}`);
    } catch (error) {
      console.error('❌ Error creating default profile in Firestore:', error);
    }
  }
  
  return {
    ...defaultProfile,
    orders: [],
    issues: [],
    analytics: {
      totalOrders: 0,
      totalSpent: 0,
      avgOrderValue: 0,
      loyaltyStatus: 'New Customer',
      customerSince: defaultProfile.customerSince,
      favoriteCategory: 'General'
    }
  };
}

// 🛒 GET PRODUCTS FROM FIRESTORE
async function getProductsFromFirestore() {
  try {
    console.log('🛒 Fetching products from Firestore...');
    const productsSnapshot = await db.collection('products').get();
    
    const products = [];
    productsSnapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ Found ${products.length} products in Firestore`);
    return products;
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    return [];
  }
}

// 💾 SAVE ORDER TO FIRESTORE
async function saveOrderToFirestore(orderData) {
  try {
    console.log(`💾 Saving order to Firestore: ${orderData.id}`);
    
    const orderDoc = {
      ...orderData,
      orderDate: admin.firestore.Timestamp.fromDate(new Date(orderData.orderDate)),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('orders').doc(orderData.id).set(orderDoc);
    console.log(`✅ Order saved successfully: ${orderData.id}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving order:', error);
    return false;
  }
}

// 🎫 SAVE ISSUE TO FIRESTORE
async function saveIssueToFirestore(issueData) {
  try {
    console.log(`🎫 Saving issue to Firestore: ${issueData.id}`);
    
    const issueDoc = {
      ...issueData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection('issues').doc(issueData.id).set(issueDoc);
    console.log(`✅ Issue saved successfully: ${issueData.id}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving issue:', error);
    return false;
  }
}

// 🔄 UPDATE ORDER STATUS IN FIRESTORE
async function updateOrderStatusInFirestore(orderId, newStatus, additionalData = {}) {
  try {
    console.log(`🔄 Updating order status in Firestore: ${orderId} -> ${newStatus}`);
    
    const updateData = {
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...additionalData
    };
    
    await db.collection('orders').doc(orderId).update(updateData);
    console.log(`✅ Order status updated successfully: ${orderId}`);
    return true;
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    return false;
  }
}

// Extract visitor information from SalesIQ context
function extractVisitorInfo(context) {
  const visitorInfo = {
    name: 'Guest',
    email: 'Not provided',
    phone: 'Not provided',
    location: 'Unknown',
    hasInfo: false
  };

  if (!context) return visitorInfo;

  const data = context.data || {};
  
  if (data.name) {
    visitorInfo.name = data.name;
    visitorInfo.hasInfo = true;
  } else if (data.first_name) {
    const lastName = data.last_name || '';
    visitorInfo.name = `${data.first_name} ${lastName}`.trim();
    visitorInfo.hasInfo = true;
  }

  if (data.email_id) {
    visitorInfo.email = data.email_id;
    visitorInfo.hasInfo = true;
  } else if (data.email) {
    visitorInfo.email = data.email;
    visitorInfo.hasInfo = true;
  }

  if (data.phone) {
    visitorInfo.phone = data.phone;
  }

  const locationParts = [];
  if (data.city) locationParts.push(data.city);
  if (data.state) locationParts.push(data.state);
  if (data.country) locationParts.push(data.country);
  
  if (locationParts.length > 0) {
    visitorInfo.location = locationParts.join(', ');
  }

  visitorInfo.ip = data.ip || 'Unknown';
  visitorInfo.browser = data.browser || 'Unknown';
  visitorInfo.os = data.os || 'Unknown';

  return visitorInfo;
}

// 🎯 MAIN WIDGET RESPONSE - STARTUP FOCUSED
async function sendCustomerWidget(visitorInfo) {
  console.log('🎯 Generating Customer Data Widget for Startup');
  console.log('📋 Visitor Info:', JSON.stringify(visitorInfo, null, 2));

  // Get customer data - Simple and Fast
  const customerData = await getCustomerData(visitorInfo.email);
  console.log('📦 Customer Data:', JSON.stringify(customerData, null, 2));
  
  if (!customerData) {
    return {
      type: "widget_detail",
      sections: [
        {
          name: "error",
          layout: "info",
          title: "❌ No Customer Data",
          data: [
            { label: "Status", value: "Customer data not available" }
          ]
        }
      ]
    };
  }

  // Show comprehensive customer data widget
  if (visitorInfo.email && visitorInfo.email !== 'Not provided') {
    console.log('🎯 Showing comprehensive customer data widget');
    return createComprehensiveCustomerWidget(visitorInfo, customerData);
  }

  // All orders (sorted by date - newest first)
  const allOrders = customerData.orders ? customerData.orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate)) : [];
  
  // Open issues
  const openIssues = customerData.issues ? customerData.issues.filter(issue => issue.status === 'Open') : [];
  
  const response = {
    type: "widget_detail",
    sections: [
      {
        name: "customerOverview",
        layout: "info",
        title: `🛍️ ${visitorInfo.name} - Customer Profile`,
        data: [
          { label: "Customer Since", value: customerData.analytics?.customerSince || 'New Customer' },
          { label: "Loyalty Status", value: `${customerData.analytics?.loyaltyStatus || 'New'} Member` },
          { label: "Total Orders", value: (customerData.analytics?.totalOrders || 0).toString() },
          { label: "Total Spent", value: `₹${customerData.analytics?.totalSpent || 0}` },
          { label: "Favorite Category", value: customerData.analytics?.favoriteCategory || 'None' }
        ], 
        actions: [
          { label: "📦 View All Orders", name: "view_orders" },
          { label: "🎫 Check Issues", name: "view_issues" }
        ]
      }
    ]
  };

  // Add all orders section if any exist
  if (allOrders.length > 0) {
    response.sections.push({
      name: "allOrders",
      layout: "listing",
      title: `📦 Customer Orders (${allOrders.length} Total)`,
      navigate: true,
      data: allOrders.map(order => ({
        name: order.id,
        title: `${getOrderStatusWithIcon(order.status)} Order ${order.id}`,
        text: `${order.items ? order.items.map(item => item.productName).join(', ') : 'No items'} - ₹${order.totalAmount || 0}`,
        subtext: `${new Date(order.orderDate).toLocaleDateString()} • ${(order.paymentStatus || 'pending').toUpperCase()} • ${order.trackingNumber || 'No tracking'}`
      }))
    });
  }

  // Add issues section if any exist
  if (customerData.issues && customerData.issues.length > 0) {
    response.sections.push({
      name: "customerIssues",
      layout: "listing",
      title: `⚠️ Customer Issues (${openIssues.length} Open)`,
      data: customerData.issues.slice(0, 5).map(issue => ({
        name: issue.id,
        title: `${getIssueIcon(issue.status)} ${issue.issueType}`,
        text: issue.description,
        subtext: `${issue.status} • ${new Date(issue.createdAt).toLocaleDateString()}`
      }))
    });
  }

  // Add quick actions for startup agents
  response.sections.push({
    name: "quickActions",
    layout: "info",
    title: "⚡ Quick Actions",
    data: [
      { label: "Customer Type", value: customerData.analytics?.loyaltyStatus || 'New Customer' },
      { label: "Last Order", value: allOrders.length > 0 ? new Date(allOrders[0].orderDate).toLocaleDateString() : 'No orders' },
      { label: "Support Priority", value: openIssues.length > 0 ? 'High (Has Issues)' : 'Normal' }
    ],
    actions: [
      { label: "💬 Continue Chat", name: "continue_chat" },
      { label: "📦 Check Order Status", name: "check_order" },
      { label: "🎁 Offer Discount", name: "offer_discount" }
    ]
  });

  return response;
}

// 🎯 COMPREHENSIVE CUSTOMER DATA WIDGET
function createComprehensiveCustomerWidget(visitorInfo, customerData) {
  const sections = [];
  
  // Customer Overview Section
  sections.push({
    name: "customer_overview",
    layout: "info",
    title: `👋 Hello ${customerData.customerName || visitorInfo.name}!`,
    data: [
      { label: "Customer", value: customerData.customerName || visitorInfo.name },
      { label: "Email", value: customerData.customerEmail },
      { label: "Phone", value: customerData.customerPhone || 'Not provided' },
      { label: "Member Since", value: customerData.analytics?.customerSince || 'Recently' },
      { label: "Loyalty Status", value: `${customerData.analytics?.loyaltyStatus || 'New'} Member` }
    ],
    actions: [
      { label: "🔄 Return Order", name: "return_action" },
      { label: "❌ Cancel Order", name: "cancel_action" },
      { label: "📋 Other Options", name: "other_action" }
    ]
  });
  
  // Orders Summary Section
  if (customerData.orders && customerData.orders.length > 0) {
    const recentOrders = customerData.orders.slice(0, 3); // Show latest 3 orders
    sections.push({
      name: "orders_summary",
      layout: "listing",
      title: `📦 Recent Orders (${customerData.orders.length} total)`,
      data: recentOrders.map(order => ({
        name: order.id,
        title: `${getOrderStatusWithIcon(order.status)} Order ${order.id}`,
        text: `₹${order.totalAmount} • ${new Date(order.orderDate).toLocaleDateString()}`,
        subtext: `${order.paymentStatus} • ${order.trackingNumber || 'No tracking'}`
      }))
    });
  }
  
  // Cart Items Section
  if (customerData.cartItems && customerData.cartItems.length > 0) {
    sections.push({
      name: "cart_items",
      layout: "listing",
      title: `🛒 Cart Items (${customerData.analytics?.cartItemCount || 0} items)`,
      data: customerData.cartItems.slice(0, 3).map(item => ({
        name: item.productId,
        title: item.productName,
        text: `₹${item.price} x ${item.quantity} = ₹${item.price * item.quantity}`,
        subtext: `${item.selectedColor || ''} ${item.selectedSize || ''}`.trim() || 'Standard'
      }))
    });
  }
  
  // Favorites Section
  if (customerData.favorites && customerData.favorites.length > 0) {
    sections.push({
      name: "favorites",
      layout: "listing",
      title: `❤️ Favorite Items (${customerData.favorites.length} total)`,
      data: customerData.favorites.slice(0, 3).map(fav => ({
        name: fav.productId,
        title: fav.productName,
        text: `₹${fav.price} • ${fav.category || 'General'}`,
        subtext: `Added ${new Date(fav.addedAt).toLocaleDateString()}`
      }))
    });
  }
  
  // Analytics Section
  if (customerData.analytics) {
    const analytics = customerData.analytics;
    sections.push({
      name: "analytics",
      layout: "info",
      title: "📊 Customer Analytics",
      data: [
        { label: "Total Orders", value: analytics.totalOrders?.toString() || '0' },
        { label: "Total Spent", value: `₹${analytics.totalSpent || 0}` },
        { label: "Average Order", value: `₹${analytics.avgOrderValue || 0}` },
        { label: "Cart Value", value: `₹${analytics.cartValue || 0}` },
        { label: "Favorite Category", value: analytics.favoriteCategory || 'None' }
      ]
    });
  }
  
  // Issues Section (if any)
  if (customerData.issues && customerData.issues.length > 0) {
    const openIssues = customerData.issues.filter(issue => issue.status === 'Open');
    sections.push({
      name: "issues",
      layout: "listing",
      title: `⚠️ Support Issues (${openIssues.length} open)`,
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

// 💬 AUTOMATIC ACTION BUTTONS FOR USER MESSAGES
function createAutoActionButtonsMessage(visitorInfo) {
  return {
    type: "message",
    text: `Hi ${visitorInfo.name || 'there'}! 👋 How can I help you today?`,
    delay: 500,
    buttons: [
      {
        label: "🔄 Return Order",
        name: "return_action",
        type: "postback"
      },
      {
        label: "❌ Cancel Order", 
        name: "cancel_action",
        type: "postback"
      },
      {
        label: "📋 Other Options",
        name: "other_action",
        type: "postback"
      }
    ]
  };
}

// 🎯 SIMPLE ACTION BUTTONS MESSAGE (Fallback)
function createActionButtonsMessage(visitorInfo, customerData) {
  return {
    type: "widget_detail",
    sections: [
      {
        name: "welcome",
        layout: "info",
        title: `👋 Hello ${visitorInfo.name}!`,
        data: [
          { label: "Customer", value: visitorInfo.name },
          { label: "Email", value: visitorInfo.email },
          { label: "Status", value: "How can I help you today?" }
        ],
        actions: [
          { label: "🔄 Return Order", name: "return_action" },
          { label: "❌ Cancel Order", name: "cancel_action" },
          { label: "📋 Other Options", name: "other_action" }
        ]
      }
    ]
  };
}

// 🎯 HANDLE BUTTON ACTIONS
async function handleButtonAction(action, visitorInfo) {
  const customerData = await getCustomerData(visitorInfo.email);
  
  switch (action) {
    case 'return_action':
      return handleReturnAction(customerData, visitorInfo);
    case 'cancel_action':
      return handleCancelAction(customerData, visitorInfo);
    case 'other_action':
      return handleOtherAction(customerData, visitorInfo);
    default:
      return createErrorResponse('Unknown action');
  }
}

// 🔄 HANDLE RETURN ACTION
function handleReturnAction(customerData, visitorInfo) {
  const orders = customerData.orders || [];
  
  // Filter orders that are delivered (eligible for return)
  const deliveredOrders = orders.filter(order => 
    order.status === 'delivered'
  );
  
  if (deliveredOrders.length === 0) {
    return {
      type: "message",
      text: "📦 No delivered orders found that are eligible for return.",
      delay: 1000
    };
  }
  
  return {
    type: "message",
    text: "📦 Here are your delivered orders. Click on an order to process return:",
    delay: 1000,
    buttons: deliveredOrders.map(order => ({
      label: `Order ${order.id} - ₹${order.totalAmount}`,
      name: `return_order_${order.id}`,
      type: "postback"
    }))
  };
}

// ❌ HANDLE CANCEL ACTION  
function handleCancelAction(customerData, visitorInfo) {
  const orders = customerData.orders || [];
  
  // Filter orders that can be cancelled (not shipped yet)
  const cancellableOrders = orders.filter(order => 
    order.status === 'confirmed' || order.status === 'processing'
  );
  
  if (cancellableOrders.length === 0) {
    return {
      type: "message",
      text: "📦 No orders found that can be cancelled. Orders can only be cancelled before shipping.",
      delay: 1000
    };
  }
  
  return {
    type: "message",
    text: "📦 Here are your orders that can be cancelled. Click on an order:",
    delay: 1000,
    buttons: cancellableOrders.map(order => ({
      label: `Order ${order.id} - ₹${order.totalAmount}`,
      name: `cancel_order_${order.id}`,
      type: "postback"
    }))
  };
}

// 📋 HANDLE OTHER ACTION
function handleOtherAction(customerData, visitorInfo) {
  return {
    type: "message",
    text: "📋 What else would you like to do?",
    delay: 1000,
    buttons: [
      {
        label: "📦 Check Order Status",
        name: "check_status",
        type: "postback"
      },
      {
        label: "💬 Give Feedback",
        name: "feedback",
        type: "postback"
      },
      {
        label: "🏠 View Profile",
        name: "view_profile",
        type: "postback"
      },
      {
        label: "📞 Contact Support",
        name: "contact_support",
        type: "postback"
      }
    ]
  };
}

// 🎯 HANDLE SPECIFIC ORDER ACTIONS
async function handleOrderAction(action, orderId, visitorInfo) {
  const customerData = await getCustomerData(visitorInfo.email);
  const order = customerData.orders.find(o => o.id === orderId);
  
  if (!order) {
    return createErrorResponse('Order not found');
  }
  
  if (action.startsWith('cancel_order_')) {
    return handleOrderCancellation(order, visitorInfo);
  } else if (action.startsWith('return_order_')) {
    return handleOrderReturn(order, visitorInfo);
  }
  
  return createErrorResponse('Unknown order action');
}

// ❌ HANDLE ORDER CANCELLATION LOGIC
function handleOrderCancellation(order, visitorInfo) {
  // Check if order is already shipped
  if (order.status === 'shipped' || order.status === 'outForDelivery' || order.status === 'delivered') {
    return {
      type: "message",
      text: `📦 Order ${order.id} has already been shipped, so it cannot be cancelled. You can request a return instead.`,
      delay: 1000,
      buttons: [
        {
          label: "🔄 Request Return",
          name: `return_order_${order.id}`,
          type: "postback"
        },
        {
          label: "🏠 Back to Menu",
          name: "back_to_menu",
          type: "postback"
        }
      ]
    };
  }
  
  // Check payment status and method
  if (order.paymentStatus === 'paid') {
    // Payment done - refund will be processed
    const refundAmount = order.totalAmount;
    return {
      type: "message",
      text: `✅ Order ${order.id} cancelled successfully!\n\n💰 Refund Amount: ₹${refundAmount}\n📅 Refund will be processed within 3-5 business days to your original payment method.\n\n📧 You will receive a confirmation email shortly.`,
      delay: 1500
    };
  } else if (order.paymentMethod === 'Cash on Delivery' || order.paymentStatus === 'pending') {
    // Pay on delivery or pending payment - simple cancellation
    return {
      type: "message",
      text: `✅ Order ${order.id} cancelled successfully!\n\n💡 Since this was a Cash on Delivery order, no refund processing is needed.\n\n📧 You will receive a confirmation email shortly.`,
      delay: 1500
    };
  }
  
  // Default cancellation message
  return {
    type: "message",
    text: `✅ Order ${order.id} has been cancelled successfully!`,
    delay: 1000
  };
}

// 🔄 HANDLE ORDER RETURN LOGIC
function handleOrderReturn(order, visitorInfo) {
  // Check if order is delivered
  if (order.status !== 'delivered') {
    return {
      type: "message",
      text: `📦 Order ${order.id} is not yet delivered. Returns can only be processed after delivery.\n\nCurrent Status: ${getOrderStatusWithIcon(order.status)}`,
      delay: 1000
    };
  }
  
  // Order is delivered - can process return
  const returnAmount = order.totalAmount;
  return {
    type: "message",
    text: `🔄 Return request initiated for Order ${order.id}\n\n💰 Return Amount: ₹${returnAmount}\n📦 Please pack the items in original packaging\n🚚 Our pickup team will contact you within 24 hours\n\n📧 Return confirmation will be sent to your email.`,
    delay: 1500,
    buttons: [
      {
        label: "📋 Return Form",
        name: `return_form_${order.id}`,
        type: "postback"
      },
      {
        label: "🏠 Back to Menu",
        name: "back_to_menu",
        type: "postback"
      }
    ]
  };
}

// Helper functions for better display
function getOrderStatusWithIcon(status) {
  const statusMap = {
    'pending': '⏳ Pending',
    'confirmed': '✅ Confirmed', 
    'processing': '🔄 Processing',
    'shipped': '🚚 Shipped',
    'outForDelivery': '🏃 Out for Delivery',
    'delivered': '✅ Delivered',
    'cancelled': '❌ Cancelled',
    'returned': '↩️ Returned'
  };
  return statusMap[status] || status;
}

function getIssueIcon(status) {
  return status === 'Open' ? '🔴' : '✅';
}

// 🔄 HANDLE CANCEL ORDER
async function handleCancelOrder(req, res) {
  try {
    console.log('📝 Processing cancel order request');
    const formData = req.body;
    
    // Generate refund reference
    const refundReference = `REF${Date.now()}`;
    
    // Simulate processing
    const response = {
      success: true,
      orderId: formData.order_id,
      action: 'cancel',
      refundDetails: {
        ...formData.refund_details,
        refundReference: refundReference,
        refundDate: new Date().toISOString(),
        status: 'processed'
      },
      message: 'Order cancelled successfully'
    };
    
    console.log('✅ Cancel order processed:', response);
    return res.status(200).json(response);
  } catch (error) {
    console.error('❌ Cancel order error:', error);
    return res.status(500).json({ error: 'Failed to process cancellation' });
  }
}

// 🔄 HANDLE RETURN ORDER
async function handleReturnOrder(req, res) {
  try {
    console.log('📝 Processing return order request');
    const formData = req.body;
    
    // Generate refund reference
    const refundReference = `REF${Date.now()}`;
    
    // Simulate processing
    const response = {
      success: true,
      orderId: formData.order_id,
      action: 'return',
      refundDetails: {
        ...formData.refund_details,
        refundReference: refundReference,
        refundDate: new Date().toISOString(),
        status: 'processed'
      },
      message: 'Order returned successfully'
    };
    
    console.log('✅ Return order processed:', response);
    return res.status(200).json(response);
  } catch (error) {
    console.error('❌ Return order error:', error);
    return res.status(500).json({ error: 'Failed to process return' });
  }
}

// 📡 HANDLE SALESIQ NOTIFICATIONS
async function handleNotification(req, res) {
  try {
    console.log('📡 Processing SalesIQ notification');
    const notification = req.body;
    
    // Log the notification for SalesIQ operators
    console.log('🔔 SalesIQ Operator Notification:', {
      type: notification.type,
      customer: notification.customerEmail,
      order: notification.orderId,
      action: notification.action,
      reason: notification.reason,
      priority: notification.priority,
      timestamp: notification.timestamp
    });
    
    // In a real implementation, you would:
    // 1. Send to SalesIQ webhook
    // 2. Store in database
    // 3. Send email/SMS to operators
    // 4. Update customer timeline
    
    return res.status(200).json({
      success: true,
      message: 'Notification processed successfully'
    });
  } catch (error) {
    console.error('❌ Notification error:', error);
    return res.status(500).json({ error: 'Failed to process notification' });
  }
}

// 🌐 ROUTES

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 SalesIQ Customer Webhook - Local Express Server',
    description: 'Simple Customer Data Webhook for Startup Support Teams',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/webhook',
      cancel: '/orders/:orderId/cancel',
      return: '/orders/:orderId/return',
      notifications: '/api/notifications'
    },
    github: 'https://github.com/ArjunJr05/webhook'
  });
});


// 🔘 SEND BUTTON CONTAINER TO SALESIQ
app.post('/api/send-button-container', async (req, res) => {
  try {
    console.log('🔘 Button container request received');
    const { customer_email, buttons, message } = req.body;
    
    console.log('Customer:', customer_email);
    console.log('Buttons:', JSON.stringify(buttons, null, 2));
    
    // This endpoint would integrate with SalesIQ API to send bot messages
    // For now, we log it and return success
    
    // In production, you would call SalesIQ API here:
    // await salesiqAPI.sendBotMessage({
    //   customerEmail: customer_email,
    //   message: message,
    //   buttons: buttons
    // });
    
    console.log('✅ Button container logged (would be sent to SalesIQ in production)');
    
    res.status(200).json({
      success: true,
      message: 'Button container sent',
      buttons: buttons
    });
  } catch (error) {
    console.error('❌ Error sending button container:', error);
    res.status(500).json({ error: 'Failed to send button container' });
  }
});

// 💬 SEND BOT MESSAGE TO SALESIQ
app.post('/api/send-message', async (req, res) => {
  try {
    console.log('💬 Bot message request received');
    const { customer_email, message, type } = req.body;
    
    console.log('Customer:', customer_email);
    console.log('Message:', message);
    console.log('Type:', type);
    
    // In production, call SalesIQ API to send bot message
    
    console.log('✅ Bot message logged (would be sent to SalesIQ in production)');
    
    res.status(200).json({
      success: true,
      message: 'Bot message sent'
    });
  } catch (error) {
    console.error('❌ Error sending bot message:', error);
    res.status(500).json({ error: 'Failed to send bot message' });
  }
});

// 🎯 HANDLE BUTTON CLICK FROM SALESIQ
app.post('/api/button-click', async (req, res) => {
  try {
    console.log('🎯 Button click received');
    const { button_id, action, customer_email } = req.body;
    
    console.log('Button ID:', button_id);
    console.log('Action:', action);
    console.log('Customer:', customer_email);
    
    // Handle the button action
    let responseMessage = '';
    
    switch (action) {
      case 'cancel':
        responseMessage = 'Your request has been cancelled.';
        break;
      case 'return':
        responseMessage = 'You have been returned to the previous menu.';
        break;
      default:
        responseMessage = 'Action completed.';
    }
    
    console.log('✅ Button click processed');
    
    res.status(200).json({
      success: true,
      response_message: responseMessage
    });
  } catch (error) {
    console.error('❌ Error handling button click:', error);
    res.status(500).json({ error: 'Failed to handle button click' });
  }
});

// Main webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    console.log('\n📥 ===== LOCAL WEBHOOK =====');
    console.log('Timestamp:', new Date().toISOString());
    console.log('Method:', req.method);
    console.log('Headers:', req.headers);

    const requestData = req.body || {};
    const handler = requestData.handler || requestData.event;
    const context = requestData.context || {};
    const formData = requestData.form_data;
    const formName = requestData.form_name;

    console.log('Request Data:', JSON.stringify(requestData, null, 2));

    const visitorInfo = extractVisitorInfo(context);
    
    // Handle form submissions
    if (formData && formName) {
      console.log('📋 Form submission detected:', formName);
      const formResponse = await processFormSubmission(formName, formData, visitorInfo);
      return res.status(200).json(formResponse);
    }
    
    // Handle button actions (postback)
    if (requestData.postback) {
      const action = requestData.postback.name;
      console.log('🔘 Button action detected:', action);
      
      // Handle specific order actions
      if (action.startsWith('cancel_order_') || action.startsWith('return_order_')) {
        const orderId = action.split('_').pop();
        const actionType = action.startsWith('cancel_order_') ? 'cancel' : 'return';
        const actionResponse = await handleOrderAction(action, orderId, visitorInfo);
        return res.status(200).json(actionResponse);
      }
      
      // Handle general button actions
      if (action === 'return_action' || action === 'cancel_action' || action === 'other_action') {
        const buttonResponse = await handleButtonAction(action, visitorInfo);
        return res.status(200).json(buttonResponse);
      }
      
      // Handle back to menu
      if (action === 'back_to_menu') {
        const menuResponse = await sendCustomerWidget(visitorInfo);
        return res.status(200).json(menuResponse);
      }
      
      // Handle other actions
      if (action === 'check_status') {
        const customerData = await getCustomerData(visitorInfo.email);
        const statusResponse = createOrderStatusResponse(customerData);
        return res.status(200).json(statusResponse);
      }
      
      if (action === 'feedback') {
        return res.status(200).json(createFeedbackForm());
      }
      
      if (action === 'view_profile') {
        const widgetResponse = await sendCustomerWidget(visitorInfo);
        return res.status(200).json(widgetResponse);
      }
    }
    
    // Handle user messages - automatically send action buttons
    const isUserMessage = requestData.message || 
                         requestData.text || 
                         requestData.chat_message ||
                         handler === 'message' ||
                         handler === 'chat' ||
                         (requestData.event && requestData.event.type === 'message');
    
    if (isUserMessage) {
      console.log('💬 User sent a message - sending action buttons automatically');
      console.log('Message content:', requestData.message || requestData.text || requestData.chat_message || 'No content');
      
      // Handle SalesIQ preview mode
      if (visitorInfo.name === 'Priya' && (!visitorInfo.email || visitorInfo.email === 'Not provided')) {
        visitorInfo.email = 'priya@gmail.com';
        visitorInfo.name = 'Priya Sharma';
      }
      
      // If no email provided, use demo email
      if (!visitorInfo.email || visitorInfo.email === 'Not provided') {
        visitorInfo.email = 'demo@customer.com';
        visitorInfo.name = 'Demo Customer';
      }
      
      // Send automatic action buttons response
      const actionButtonsResponse = createAutoActionButtonsMessage(visitorInfo);
      return res.status(200).json(actionButtonsResponse);
    }
    
    // Handle SalesIQ preview mode - if visitor name is "Priya", use priya@gmail.com
    if (visitorInfo.name === 'Priya' && (!visitorInfo.email || visitorInfo.email === 'Not provided')) {
      visitorInfo.email = 'priya@gmail.com';
      visitorInfo.name = 'Priya Sharma';
      console.log('🎭 Preview mode detected - using Priya Sharma demo data');
    }

    // If no email provided, use demo email for testing
    if (!visitorInfo.email || visitorInfo.email === 'Not provided') {
      console.log('🎭 No email provided - using demo customer for testing');
      visitorInfo.email = 'demo@customer.com';
      visitorInfo.name = 'Demo Customer';
    }

    // Handle Sarathy preview mode
    if (visitorInfo.name === 'Sarathy' && (!visitorInfo.email || visitorInfo.email === 'Not provided')) {
      visitorInfo.email = 'sarathy@gmail.com';
      visitorInfo.name = 'Sarathy Kumar';
      console.log('🎭 Preview mode detected - using Sarathy Kumar demo data');
    }

    console.log('Handler type:', handler);
    console.log('Visitor:', visitorInfo.name, visitorInfo.email);

    // Generate and send the customer widget
    const widgetResponse = await sendCustomerWidget(visitorInfo);
    
    console.log('✅ Widget response generated successfully');
    return res.status(200).json(widgetResponse);

  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    console.error('Stack:', error.stack);
    
    return res.status(200).json({
      type: 'widget_detail',
      sections: [
        {
          name: 'error',
          layout: 'info',
          title: '❌ Error Loading Customer Data',
          data: [
            { label: 'Error', value: error.message },
            { label: 'Timestamp', value: new Date().toISOString() }
          ]
        }
      ]
    });
  }
});

// Cancel order endpoint
app.post('/orders/:orderId/cancel', handleCancelOrder);

// Return order endpoint
app.post('/orders/:orderId/return', handleReturnOrder);

// Notifications endpoint
app.post('/api/notifications', handleNotification);

// Flutter activity endpoint (for CustomerTimelineService)
app.post('/api/flutter-activity', (req, res) => {
  try {
    console.log('📱 Flutter activity received:', req.body);
    res.status(200).json({ success: true, message: 'Activity logged' });
  } catch (error) {
    console.error('❌ Flutter activity error:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// SalesIQ automation event tracking
app.post('/api/track-event', (req, res) => {
  try {
    const { event, data, timestamp, url } = req.body;
    console.log('📊 SalesIQ Event Tracked:', {
      event,
      data,
      timestamp,
      url: url?.substring(0, 100) // Truncate long URLs
    });
    
    // Here you could save to database, send to analytics, etc.
    res.status(200).json({ success: true, message: 'Event tracked successfully' });
  } catch (error) {
    console.error('❌ Event tracking error:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Form submission endpoint
app.post('/api/form-submit', async (req, res) => {
  try {
    const { form_name, form_data, visitor_info } = req.body;
    console.log('📋 Direct form submission:', form_name);
    
    const response = await processFormSubmission(form_name, form_data, visitor_info || {});
    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Form submission error:', error);
    res.status(500).json(createErrorResponse('Failed to process form submission'));
  }
});

// Get customer data form
app.get('/api/forms/customer-data', (req, res) => {
  res.json(createCustomerDataForm());
});

// Get feedback form
app.get('/api/forms/feedback', (req, res) => {
  res.json(createFeedbackForm());
});

// Get cancel order form
app.get('/api/forms/cancel-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { customerEmail } = req.query;
    
    if (!customerEmail) {
      return res.status(400).json({ error: 'Customer email required' });
    }
    
    const customerData = await getCustomerData(customerEmail);
    if (!customerData) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const order = customerData.orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(createCancelOrderForm(order));
  } catch (error) {
    console.error('❌ Cancel form error:', error);
    res.status(500).json({ error: 'Failed to generate cancel form' });
  }
});

// Get return order form
app.get('/api/forms/return-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { customerEmail } = req.query;
    
    if (!customerEmail) {
      return res.status(400).json({ error: 'Customer email required' });
    }
    
    const customerData = await getCustomerData(customerEmail);
    if (!customerData) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const order = customerData.orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json(createReturnOrderForm(order));
  } catch (error) {
    console.error('❌ Return form error:', error);
    res.status(500).json({ error: 'Failed to generate return form' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 SalesIQ Webhook Server Running`);
  console.log(`📍 Local URL: http://localhost:${PORT}`);
  console.log(`📋 Health Check: http://localhost:${PORT}/`);
  console.log(`🔗 Webhook Endpoint: http://localhost:${PORT}/webhook`);
  console.log(`📦 Cancel Endpoint: http://localhost:${PORT}/orders/:orderId/cancel`);
  console.log(`📦 Return Endpoint: http://localhost:${PORT}/orders/:orderId/return`);
  console.log(`📡 Notifications: http://localhost:${PORT}/api/notifications`);
  console.log(`\n💡 Update your Flutter app to use: http://localhost:${PORT}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down webhook server...');
  process.exit(0);
});
