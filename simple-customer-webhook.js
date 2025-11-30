const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
async function sendCustomerWidget(res, visitorInfo) {
  console.log('🎯 Generating Customer Data Widget for Startup');
  console.log('📋 Visitor Info:', JSON.stringify(visitorInfo, null, 2));

  // Get customer data - Simple and Fast
  const customerData = await getCustomerData(visitorInfo.email);
  console.log('📦 Customer Data:', JSON.stringify(customerData, null, 2));
  
  if (!customerData) {
    return res.status(200).json({
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
    });
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

  return res.status(200).json(response);
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

// 🔗 API ENDPOINT TO GET CUSTOMER DATA
app.get('/api/customer/:email', async (req, res) => {
  try {
    const customerEmail = decodeURIComponent(req.params.email);
    console.log(`📡 API request for customer: ${customerEmail}`);
    
    const customerData = await getCustomerData(customerEmail);
    
    if (customerData) {
      res.json(customerData);
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Main Webhook Endpoint
app.post('/webhook', async (req, res) => {
  try {
    console.log('\n📥 ===== CUSTOMER DATA WEBHOOK =====');
    console.log('Timestamp:', new Date().toISOString());

    const requestData = req.body;
    const handler = requestData.handler || requestData.event;
    const context = requestData.context || {};

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

    // Always show the customer data
    return sendCustomerWidget(res, visitorInfo);

  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    
    return res.status(200).json({
      type: 'widget_detail',
      sections: [
        {
          name: 'error',
          layout: 'info',
          title: '❌ Error Loading Customer Data',
          data: [
            { label: 'Error', value: error.message }
          ]
        }
      ]
    });
  }
});

// Handle common typo /webook
app.post('/webook', async (req, res) => {
  try {
    console.log('\n📥 ===== WEBHOOK TYPO HANDLER =====');
    console.log('⚠️ Request came to /webook (missing h)');
    
    // Forward to main webhook logic
    const requestData = req.body;
    const handler = requestData.handler || requestData.event;
    const context = requestData.context || {};

    const visitorInfo = extractVisitorInfo(context);
    
    // Handle SalesIQ preview mode
    if (visitorInfo.name === 'Priya' && (!visitorInfo.email || visitorInfo.email === 'Not provided')) {
      visitorInfo.email = 'priya@gmail.com';
      visitorInfo.name = 'Priya Sharma';
    }

    if (visitorInfo.name === 'Sarathy' && (!visitorInfo.email || visitorInfo.email === 'Not provided')) {
      visitorInfo.email = 'sarathy@gmail.com';
      visitorInfo.name = 'Sarathy Kumar';
    }

    if (!visitorInfo.email || visitorInfo.email === 'Not provided') {
      visitorInfo.email = 'customer@example.com';
      visitorInfo.name = 'Flutter Customer';
    }

    return sendCustomerWidget(res, visitorInfo);
    
  } catch (error) {
    console.error('❌ Webhook typo handler error:', error.message);
    return res.status(200).json({
      type: 'widget_detail',
      sections: [{
        name: 'error',
        layout: 'info',
        title: '❌ Error Loading Customer Data',
        data: [{ label: 'Error', value: error.message }]
      }]
    });
  }
});

// Handle GET requests to /webook (common mistake)
app.get('/webook', (req, res) => {
  res.json({
    message: '⚠️ This is a GET request to /webook',
    note: 'Webhook should be POST request',
    correct_endpoint: '/webhook',
    status: 'Use POST method',
    help: 'Configure your SalesIQ webhook to use POST method'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 SalesIQ Customer Webhook Server',
    description: 'Simple Customer Data Webhook for Startup Support Teams',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      webhook: '/webhook',
      customer: '/api/customer/:email',
      health: '/health'
    },
    github: 'https://github.com/ArjunJr05/customer_widget'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'SalesIQ Customer Webhook',
    version: '1.0.0'
  });
});

// Catch-all for debugging webhook issues
app.all('*', (req, res) => {
  console.log(`🔍 Unhandled request: ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  res.status(404).json({
    error: 'Endpoint not found',
    method: req.method,
    path: req.path,
    message: 'Check your webhook URL configuration',
    available_endpoints: {
      'POST /webhook': 'Main webhook endpoint',
      'POST /webook': 'Webhook with typo support',
      'GET /': 'Server info',
      'GET /health': 'Health check',
      'GET /api/customer/:email': 'Customer API'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 ===== SIMPLE CUSTOMER DATA WIDGET =====');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`⚠️ Typo Support: http://localhost:${PORT}/webook`);
  console.log(`🔗 API URL: http://localhost:${PORT}/api/customer/:email`);
  console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
  console.log('\n💡 Perfect for Startups - No external APIs needed!');
  console.log('🎯 Shows customer orders, issues, and profile data instantly');
  console.log('🔧 Handles both /webhook and /webook endpoints');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Simple Customer Widget...');
  process.exit(0);
});
