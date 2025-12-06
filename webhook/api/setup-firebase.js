// 🔥 Firebase Setup Helper Script
// This script helps you set up Firebase Firestore with sample data

const admin = require('firebase-admin');

// Check if service account exists
try {
  const serviceAccount = require('./firebase-service-account.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  const db = admin.firestore();
  console.log('🔥 Firebase initialized successfully!');
  
  // Sample data to add to Firestore
  async function addSampleData() {
    try {
      console.log('📝 Adding sample customer data...');
      
      // Add Priya's customer profile
      await db.collection('customers').doc('priya@gmail.com').set({
        customerName: 'Priya Sharma',
        customerEmail: 'priya@gmail.com',
        customerSince: '2024-08-15',
        phone: '+91-9876543210',
        address: '123 MG Road, Bangalore, Karnataka 560001',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Add sample orders
      const orders = [
        {
          id: 'ORD1701234567890',
          customerEmail: 'priya@gmail.com',
          customerName: 'Priya Sharma',
          items: [
            { productName: 'iPhone Case - Blue', price: 599, quantity: 1, category: 'Mobile Accessories' },
            { productName: 'Screen Protector', price: 299, quantity: 1, category: 'Mobile Accessories' }
          ],
          totalAmount: 898,
          status: 'outForDelivery',
          paymentStatus: 'paid',
          paymentMethod: 'UPI',
          orderDate: admin.firestore.Timestamp.fromDate(new Date('2024-11-28T10:30:00Z')),
          deliveryDate: admin.firestore.Timestamp.fromDate(new Date('2024-11-30T18:00:00Z')),
          trackingNumber: 'TRK123456',
          shippingAddress: '123 MG Road, Bangalore, Karnataka 560001',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'ORD1701234567891',
          customerEmail: 'priya@gmail.com',
          customerName: 'Priya Sharma',
          items: [
            { productName: 'iPhone Case - Blue', price: 599, quantity: 1, category: 'Mobile Accessories' }
          ],
          totalAmount: 599,
          status: 'confirmed',
          paymentStatus: 'pending',
          paymentMethod: 'Cash on Delivery',
          orderDate: admin.firestore.Timestamp.fromDate(new Date('2024-11-30T15:45:00Z')),
          deliveryDate: admin.firestore.Timestamp.fromDate(new Date('2024-12-02T16:00:00Z')),
          trackingNumber: 'TRK845410',
          shippingAddress: '123 MG Road, Bangalore, Karnataka 560001',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        },
        {
          id: 'ORD1701234567892',
          customerEmail: 'priya@gmail.com',
          customerName: 'Priya Sharma',
          items: [
            { productName: 'Wireless Earbuds Pro', price: 2999, quantity: 1, category: 'Audio' }
          ],
          totalAmount: 2999,
          status: 'delivered',
          paymentStatus: 'paid',
          paymentMethod: 'Credit Card',
          orderDate: admin.firestore.Timestamp.fromDate(new Date('2024-10-15T12:20:00Z')),
          trackingNumber: 'TRK789012',
          shippingAddress: '123 MG Road, Bangalore, Karnataka 560001',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        }
      ];
      
      for (const order of orders) {
        await db.collection('orders').doc(order.id).set(order);
        console.log(`✅ Added order: ${order.id}`);
      }
      
      // Add sample issue
      await db.collection('issues').doc('ISS1701234567891').set({
        id: 'ISS1701234567891',
        customerEmail: 'priya@gmail.com',
        orderId: 'ORD1701234567890',
        issueType: 'Product Quality',
        description: 'Wrong color delivered in previous order',
        status: 'Resolved',
        priority: 'Medium',
        resolution: 'Refunded ₹500 for inconvenience',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Sample data added successfully!');
      console.log('🎯 You can now test with priya@gmail.com in SalesIQ');
      
    } catch (error) {
      console.error('❌ Error adding sample data:', error);
    }
    
    process.exit(0);
  }
  
  addSampleData();
  
} catch (error) {
  console.log('⚠️ Firebase service account not found!');
  console.log('📝 To set up Firebase:');
  console.log('1. Go to Firebase Console → Project Settings → Service Accounts');
  console.log('2. Click "Generate new private key"');
  console.log('3. Download the JSON file');
  console.log('4. Rename it to "firebase-service-account.json"');
  console.log('5. Place it in this folder');
  console.log('6. Run: node setup-firebase.js');
  process.exit(1);
}
