// 🛍️ Dynamic E-Commerce Service - Real Customer Data for SalesIQ
import 'dart:convert';
import 'dart:math';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import '../models/product.dart';
import '../models/order.dart';

class ECommerceService {
  static const String _webhookUrl = 'http://localhost:3000';
  
  // 🛍️ PRODUCT CATALOG
  static List<Product> get sampleProducts => [
    Product(
      id: 'iphone_case_blue',
      name: 'iPhone Case - Blue',
      description: 'Premium silicone case for iPhone with drop protection',
      price: 599.0,
      imageUrl: 'https://via.placeholder.com/300x300/0066CC/FFFFFF?text=iPhone+Case',
      category: 'Mobile Accessories',
      colors: ['Blue', 'Black', 'Red', 'Clear'],
      rating: 4.5,
      reviewCount: 128,
    ),
    Product(
      id: 'screen_protector',
      name: 'Screen Protector',
      description: 'Tempered glass screen protector with 9H hardness',
      price: 299.0,
      imageUrl: 'https://via.placeholder.com/300x300/00AA00/FFFFFF?text=Screen+Guard',
      category: 'Mobile Accessories',
      rating: 4.3,
      reviewCount: 89,
    ),
    Product(
      id: 'wireless_earbuds',
      name: 'Wireless Earbuds Pro',
      description: 'Premium wireless earbuds with noise cancellation',
      price: 2999.0,
      imageUrl: 'https://via.placeholder.com/300x300/FF6600/FFFFFF?text=Earbuds',
      category: 'Audio',
      colors: ['White', 'Black', 'Blue'],
      rating: 4.7,
      reviewCount: 256,
    ),
    Product(
      id: 'power_bank',
      name: 'Power Bank 10000mAh',
      description: 'Fast charging power bank with dual USB ports',
      price: 1299.0,
      imageUrl: 'https://via.placeholder.com/300x300/333333/FFFFFF?text=Power+Bank',
      category: 'Electronics',
      rating: 4.4,
      reviewCount: 167,
    ),
    Product(
      id: 'bluetooth_speaker',
      name: 'Bluetooth Speaker',
      description: 'Portable wireless speaker with rich bass',
      price: 1899.0,
      imageUrl: 'https://via.placeholder.com/300x300/9900CC/FFFFFF?text=Speaker',
      category: 'Audio',
      colors: ['Black', 'Blue', 'Red'],
      rating: 4.6,
      reviewCount: 203,
    ),
  ];

  // 📦 ORDER MANAGEMENT
  static Future<String> createOrder({
    required String customerName,
    required String customerEmail,
    required String customerPhone,
    required List<OrderItem> items,
    required String shippingAddress,
    required String paymentMethod,
    String paymentStatus = 'pending', // New parameter for payment status
  }) async {
    try {
      final orderId = 'ORD${DateTime.now().millisecondsSinceEpoch}';
      final totalAmount = items.fold(0.0, (sum, item) => sum + item.totalPrice);
      
      final order = Order(
        id: orderId,
        customerId: customerEmail, // Using email as customer ID
        customerName: customerName,
        customerEmail: customerEmail,
        customerPhone: customerPhone,
        items: items,
        totalAmount: totalAmount,
        status: OrderStatus.confirmed,
        paymentStatus: _getPaymentStatusFromString(paymentStatus),
        paymentMethod: paymentMethod,
        orderDate: DateTime.now(),
        shippingAddress: shippingAddress,
        trackingNumber: 'TRK${Random().nextInt(999999).toString().padLeft(6, '0')}',
        statusHistory: [
          '${DateTime.now().toString().substring(0, 16)}: Order placed',
          '${DateTime.now().add(Duration(minutes: 5)).toString().substring(0, 16)}: Payment confirmed',
          '${DateTime.now().add(Duration(hours: 1)).toString().substring(0, 16)}: Order confirmed',
        ],
      );

      // Save order locally
      await _saveOrder(order);
      
      // Send to webhook for SalesIQ integration
      await _syncOrderWithWebhook(order);
      
      // Track this activity for timeline
      await _trackCustomerActivity(
        customerEmail, 
        'Order Placed', 
        'Order $orderId placed for ₹${totalAmount.toStringAsFixed(2)}'
      );

      print('✅ Order created: $orderId');
      return orderId;
    } catch (e) {
      print('❌ Error creating order: $e');
      rethrow;
    }
  }

  // 📋 GET CUSTOMER ORDERS
  static Future<List<Order>> getCustomerOrders(String customerEmail) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final orderKeys = prefs.getKeys().where((key) => key.startsWith('order_')).toList();
      
      final orders = <Order>[];
      for (final key in orderKeys) {
        final orderJson = prefs.getString(key);
        if (orderJson != null) {
          final order = Order.fromJson(jsonDecode(orderJson));
          if (order.customerEmail == customerEmail) {
            orders.add(order);
          }
        }
      }
      
      // Sort by date (newest first)
      orders.sort((a, b) => b.orderDate.compareTo(a.orderDate));
      return orders;
    } catch (e) {
      print('❌ Error getting customer orders: $e');
      return [];
    }
  }

  // 🔄 UPDATE ORDER STATUS
  static Future<void> updateOrderStatus(String orderId, OrderStatus newStatus) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final orderJson = prefs.getString('order_$orderId');
      
      if (orderJson != null) {
        final orderData = jsonDecode(orderJson);
        final order = Order.fromJson(orderData);
        
        // Update status and add to history
        final updatedOrder = Order(
          id: order.id,
          customerId: order.customerId,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          items: order.items,
          totalAmount: order.totalAmount,
          status: newStatus,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          orderDate: order.orderDate,
          deliveryDate: newStatus == OrderStatus.delivered ? DateTime.now() : order.deliveryDate,
          shippingAddress: order.shippingAddress,
          trackingNumber: order.trackingNumber,
          statusHistory: [
            ...order.statusHistory,
            '${DateTime.now().toString().substring(0, 16)}: ${_getStatusUpdateMessage(newStatus)}'
          ],
          notes: order.notes,
        );
        
        await _saveOrder(updatedOrder);
        await _syncOrderWithWebhook(updatedOrder);
        
        // Track status update
        await _trackCustomerActivity(
          order.customerEmail,
          'Order Updated',
          'Order ${order.id} status changed to ${updatedOrder.statusText}'
        );
        
        print('✅ Order $orderId status updated to ${newStatus.toString()}');
      }
    } catch (e) {
      print('❌ Error updating order status: $e');
    }
  }

  // 🎫 CUSTOMER SUPPORT ISSUES
  static Future<void> reportIssue({
    required String customerEmail,
    required String orderId,
    required String issueType,
    required String description,
  }) async {
    try {
      final issueId = 'ISS${DateTime.now().millisecondsSinceEpoch}';
      
      final issue = {
        'id': issueId,
        'customerEmail': customerEmail,
        'orderId': orderId,
        'issueType': issueType,
        'description': description,
        'status': 'Open',
        'createdAt': DateTime.now().toIso8601String(),
        'priority': _getIssuePriority(issueType),
      };
      
      // Save issue locally
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('issue_$issueId', jsonEncode(issue));
      
      // Track issue for timeline
      await _trackCustomerActivity(
        customerEmail,
        'Issue Reported',
        '$issueType: $description (Issue #$issueId)'
      );
      
      // Send to webhook
      await _syncIssueWithWebhook(issue);
      
      print('✅ Issue reported: $issueId');
    } catch (e) {
      print('❌ Error reporting issue: $e');
    }
  }

  // 📊 GET CUSTOMER ANALYTICS FOR SALESIQ
  static Future<Map<String, dynamic>> getCustomerAnalytics(String customerEmail) async {
    try {
      final orders = await getCustomerOrders(customerEmail);
      final issues = await getCustomerIssues(customerEmail);
      
      final totalSpent = orders.fold(0.0, (sum, order) => sum + order.totalAmount);
      final avgOrderValue = orders.isNotEmpty ? totalSpent / orders.length : 0.0;
      
      return {
        'totalOrders': orders.length,
        'totalSpent': totalSpent,
        'avgOrderValue': avgOrderValue,
        'lastOrderDate': orders.isNotEmpty ? orders.first.orderDate.toIso8601String() : null,
        'openIssues': issues.where((i) => i['status'] == 'Open').length,
        'resolvedIssues': issues.where((i) => i['status'] == 'Resolved').length,
        'favoriteCategory': _getFavoriteCategory(orders),
        'customerSince': orders.isNotEmpty ? orders.last.orderDate.toIso8601String() : null,
        'loyaltyStatus': _getLoyaltyStatus(totalSpent),
      };
    } catch (e) {
      print('❌ Error getting customer analytics: $e');
      return {};
    }
  }

  // 🔄 PRIVATE HELPER METHODS
  static Future<void> _saveOrder(Order order) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('order_${order.id}', jsonEncode(order.toJson()));
  }

  static Future<void> _syncOrderWithWebhook(Order order) async {
    try {
      await http.post(
        Uri.parse('$_webhookUrl/api/customer-data'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'type': 'order',
          'customerEmail': order.customerEmail,
          'data': order.toJson(),
        }),
      ).timeout(Duration(seconds: 5));
    } catch (e) {
      print('⚠️ Could not sync with webhook: $e');
    }
  }

  static Future<void> _syncIssueWithWebhook(Map<String, dynamic> issue) async {
    try {
      await http.post(
        Uri.parse('$_webhookUrl/api/customer-data'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'type': 'issue',
          'customerEmail': issue['customerEmail'],
          'data': issue,
        }),
      ).timeout(Duration(seconds: 5));
    } catch (e) {
      print('⚠️ Could not sync issue with webhook: $e');
    }
  }

  static Future<void> _trackCustomerActivity(String customerEmail, String action, String details) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final activities = prefs.getStringList('activities_$customerEmail') ?? [];
      
      final activity = jsonEncode({
        'id': 'act_${DateTime.now().millisecondsSinceEpoch}',
        'date': DateTime.now().toIso8601String().split('T')[0],
        'time': DateTime.now().toIso8601String(),
        'action': action,
        'details': details,
        'platform': 'E-Commerce App',
        'type': 'ecommerce_activity',
      });
      
      activities.add(activity);
      
      // Keep only last 100 activities
      if (activities.length > 100) {
        activities.removeRange(0, activities.length - 100);
      }
      
      await prefs.setStringList('activities_$customerEmail', activities);
    } catch (e) {
      print('❌ Error tracking activity: $e');
    }
  }

  static Future<List<Map<String, dynamic>>> getCustomerIssues(String customerEmail) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final issueKeys = prefs.getKeys().where((key) => key.startsWith('issue_')).toList();
      
      final issues = <Map<String, dynamic>>[];
      for (final key in issueKeys) {
        final issueJson = prefs.getString(key);
        if (issueJson != null) {
          final issue = jsonDecode(issueJson);
          if (issue['customerEmail'] == customerEmail) {
            issues.add(issue);
          }
        }
      }
      
      return issues;
    } catch (e) {
      print('❌ Error getting customer issues: $e');
      return [];
    }
  }

  static String _getStatusUpdateMessage(OrderStatus status) {
    switch (status) {
      case OrderStatus.processing:
        return 'Order is being processed';
      case OrderStatus.shipped:
        return 'Order has been shipped';
      case OrderStatus.outForDelivery:
        return 'Out for delivery';
      case OrderStatus.delivered:
        return 'Order delivered successfully';
      case OrderStatus.cancelled:
        return 'Order cancelled';
      case OrderStatus.returned:
        return 'Order returned';
      default:
        return 'Status updated';
    }
  }

  static String _getIssuePriority(String issueType) {
    switch (issueType.toLowerCase()) {
      case 'payment':
      case 'refund':
        return 'High';
      case 'delivery':
      case 'product quality':
        return 'Medium';
      default:
        return 'Low';
    }
  }

  static String _getFavoriteCategory(List<Order> orders) {
    final categoryCount = <String, int>{};
    
    for (final order in orders) {
      for (final item in order.items) {
        // You would normally get category from product, for now using a simple mapping
        final category = _getProductCategory(item.productId);
        categoryCount[category] = (categoryCount[category] ?? 0) + 1;
      }
    }
    
    if (categoryCount.isEmpty) return 'None';
    
    return categoryCount.entries.reduce((a, b) => a.value > b.value ? a : b).key;
  }

  static String _getProductCategory(String productId) {
    if (productId.contains('iphone') || productId.contains('screen')) return 'Mobile Accessories';
    if (productId.contains('earbuds') || productId.contains('speaker')) return 'Audio';
    return 'Electronics';
  }

  static String _getLoyaltyStatus(double totalSpent) {
    if (totalSpent >= 10000) return 'Gold';
    if (totalSpent >= 5000) return 'Silver';
    if (totalSpent >= 1000) return 'Bronze';
    return 'New Customer';
  }

  static PaymentStatus _getPaymentStatusFromString(String status) {
    switch (status.toLowerCase()) {
      case 'paid':
        return PaymentStatus.paid;
      case 'pending':
        return PaymentStatus.pending;
      case 'failed':
        return PaymentStatus.failed;
      case 'refunded':
        return PaymentStatus.refunded;
      default:
        return PaymentStatus.pending;
    }
  }

  // 🔄 CANCEL/RETURN ORDER FUNCTIONALITY
  static Future<bool> submitCancelReturn(Map<String, dynamic> formData) async {
    try {
      final orderId = formData['order_id'];
      final action = formData['action'];
      
      print('📝 Submitting ${action} request for order: $orderId');
      
      // Update order status locally
      final newStatus = action == 'cancel' ? OrderStatus.cancelled : OrderStatus.returned;
      await updateOrderStatus(orderId, newStatus);
      
      // Send to webhook for backend processing
      await _syncCancelReturnWithWebhook(formData);
      
      // Track activity
      await _trackCustomerActivity(
        formData['user_id'],
        action == 'cancel' ? 'Order Cancelled' : 'Order Returned',
        'Order $orderId ${action}led by customer. Reason: ${formData['reason']}'
      );
      
      print('✅ ${action} request processed successfully');
      return true;
    } catch (e) {
      print('❌ Error processing ${formData['action']} request: $e');
      return false;
    }
  }
  
  // 📡 NOTIFY SALESIQ OPERATOR
  static Future<void> notifySalesIQOperator({
    required String customerEmail,
    required String orderId,
    required String action,
    required String reason,
  }) async {
    try {
      final notification = {
        'type': 'order_${action}',
        'customerEmail': customerEmail,
        'orderId': orderId,
        'action': action,
        'reason': reason,
        'timestamp': DateTime.now().toIso8601String(),
        'priority': 'high',
        'message': 'Customer ${action}led order $orderId. Reason: $reason',
      };
      
      // Send notification to webhook
      await http.post(
        Uri.parse('$_webhookUrl/api/notifications'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(notification),
      ).timeout(Duration(seconds: 5));
      
      print('✅ SalesIQ operator notified about ${action} request');
    } catch (e) {
      print('⚠️ Could not notify SalesIQ operator: $e');
    }
  }
  
  // 🔄 SYNC CANCEL/RETURN WITH WEBHOOK
  static Future<void> _syncCancelReturnWithWebhook(Map<String, dynamic> formData) async {
    try {
      final endpoint = formData['action'] == 'cancel' 
        ? '/orders/${formData['order_id']}/cancel'
        : '/orders/${formData['order_id']}/return';
        
      await http.post(
        Uri.parse('$_webhookUrl$endpoint'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(formData),
      ).timeout(Duration(seconds: 10));
      
      print('✅ ${formData['action']} request synced with backend');
    } catch (e) {
      print('⚠️ Could not sync ${formData['action']} with backend: $e');
    }
  }
}
