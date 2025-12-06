// 📦 Local Express Server - SalesIQ Customer Data Webhook
// File: webhook_local.js
// Usage: node webhook_local.js

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📊 SIMPLE CUSTOMER DATA (No external APIs)
async function getCustomerData(customerEmail) {
  try {
    console.log(`🔍 Looking up customer data for: ${customerEmail}`);
    
    // Mock customer data - replace with your database query
    const mockCustomerData = {
      'priya@gmail.com': {
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
          totalSpent: 4496, // 898 + 599 + 2999
          avgOrderValue: 1499,
          loyaltyStatus: 'Silver',
          customerSince: '2024-08-15',
          favoriteCategory: 'Mobile Accessories'
        }
      },
      'sarathy@gmail.com': {
        orders: [
          {
            id: 'ORD1701234567893',
            customerName: 'Sarathy Kumar',
            customerEmail: 'sarathy@gmail.com',
            items: [
              { productName: 'Bluetooth Speaker', price: 1299, quantity: 1 }
            ],
            totalAmount: 1299,
            status: 'shipped',
            paymentStatus: 'paid',
            paymentMethod: 'UPI',
            orderDate: '2024-11-29T14:20:00Z',
            trackingNumber: 'TRK567890',
            shippingAddress: '456 Anna Salai, Chennai, Tamil Nadu 600002'
          }
        ],
        issues: [],
        analytics: {
          totalOrders: 1,
          totalSpent: 1299,
          avgOrderValue: 1299,
          loyaltyStatus: 'Bronze',
          customerSince: '2024-11-29',
          favoriteCategory: 'Audio'
        }
      },
      'customer@example.com': {
        orders: [
          {
            id: 'ORD1764509345725',
            customerName: 'Flutter Customer',
            customerEmail: 'customer@example.com',
            items: [
              { productName: 'iPhone Case - Blue', price: 599, quantity: 1 },
              { productName: 'Power Bank 10000mAh', price: 1299, quantity: 1 },
              { productName: 'Wireless Earbuds Pro', price: 2999, quantity: 1 },
              { productName: 'Screen Protector', price: 299, quantity: 1 }
            ],
            totalAmount: 5196,
            status: 'confirmed',
            paymentStatus: 'pending',
            paymentMethod: 'Payment Pending',
            orderDate: '2025-11-30T13:30:00Z',
            trackingNumber: 'TRK990805',
            shippingAddress: '123 Main Street, City, State 12345'
          },
          {
            id: 'ORD1764509080331',
            customerName: 'Flutter Customer',
            customerEmail: 'customer@example.com',
            items: [
              { productName: 'Bluetooth Speaker', price: 1899, quantity: 1 }
            ],
            totalAmount: 1899,
            status: 'confirmed',
            paymentStatus: 'pending',
            paymentMethod: 'Payment Pending',
            orderDate: '2025-11-30T13:25:00Z',
            trackingNumber: 'TRK304527',
            shippingAddress: '123 Main Street, City, State 12345'
          }
        ],
        issues: [],
        analytics: {
          totalOrders: 2,
          totalSpent: 7095, // 5196 + 1899
          avgOrderValue: 3547,
          loyaltyStatus: 'Gold',
          customerSince: '2025-11-30',
          favoriteCategory: 'Electronics'
        }
      }
    };
    
    const customerData = mockCustomerData[customerEmail];
    
    if (customerData) {
      console.log(`✅ Found customer data for: ${customerEmail}`);
      return customerData;
    } else {
      console.log(`⚠️ No specific data found for: ${customerEmail}, using default demo data`);
      // Return demo data for any customer not in our mock database
      return {
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
  } catch (error) {
    console.log('Error getting customer data:', error.message);
    return null;
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

    console.log('Request Data:', JSON.stringify(requestData, null, 2));

    const visitorInfo = extractVisitorInfo(context);
    
    // Handle SalesIQ preview mode - if visitor name is "Priya", use priya@gmail.com
    if (visitorInfo.name === 'Priya' && (!visitorInfo.email || visitorInfo.email === 'Not provided')) {
      visitorInfo.email = 'priya@gmail.com';
      visitorInfo.name = 'Priya Sharma';
      console.log('🎭 Preview mode detected - using Priya Sharma demo data');
    }

    // Handle Sarathy preview mode
    if (visitorInfo.name === 'Sarathy' && (!visitorInfo.email || visitorInfo.email === 'Not provided')) {
      visitorInfo.email = 'sarathy@gmail.com';
      visitorInfo.name = 'Sarathy Kumar';
      console.log('🎭 Preview mode detected - using Sarathy Kumar demo data');
    }

    // Handle any customer with real orders from Flutter app
    if (!visitorInfo.email || visitorInfo.email === 'Not provided') {
      // If no email provided, use a default customer with real orders
      visitorInfo.email = 'customer@example.com';
      visitorInfo.name = 'Flutter Customer';
      console.log('🎭 No email provided - using Flutter customer demo data');
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
