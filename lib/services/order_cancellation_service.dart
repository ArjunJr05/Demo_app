// 🔥 PRODUCTION-READY ORDER CANCELLATION SERVICE FOR FLUTTER
// File: lib/services/order_cancellation_service.dart
//
// This service handles order cancellation flow:
// 1. Fetches cancellable orders directly from Firestore
// 2. Displays order selection UI
// 3. Shows cancellation form
// 4. Submits cancellation request to webhook
// 5. Updates SalesIQ chat with confirmation

import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:cloud_firestore/cloud_firestore.dart';

class OrderCancellationService {
  // 🔧 UPDATE THIS URL based on your environment:
  // - Local testing: 'http://localhost:3000'
  // - Production: 'https://your-ngrok-url.ngrok-free.dev'
  static const String WEBHOOK_BASE_URL = 'http://localhost:3000';
  static const String WEBHOOK_SECRET = 'your_shared_secret_here_change_in_production';
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  
  // ✅ STEP 1: FETCH CANCELLABLE ORDERS DIRECTLY FROM FIRESTORE
  static Future<List<CancellableOrder>> fetchCancellableOrders(String customerEmail, {String? customerId}) async {
    try {
      print('🔍 Fetching cancellable orders from Firestore for: $customerEmail');
      
      // If customerId is not provided, we need to find it first
      String? userId = customerId;
      if (userId == null) {
        // Query users collection to find user by email
        QuerySnapshot userSnapshot = await _firestore
            .collection('users')
            .where('email', isEqualTo: customerEmail)
            .limit(1)
            .get();
        
        if (userSnapshot.docs.isEmpty) {
          print('⚠️ No user found with email: $customerEmail');
          return [];
        }
        
        userId = userSnapshot.docs.first.id;
        print('✅ Found user ID: $userId');
      }
      
      // ✅ NEW: Query from users/{userId}/orders subcollection
      QuerySnapshot snapshot = await _firestore
          .collection('users')
          .doc(userId)
          .collection('orders')
          .orderBy('orderDate', descending: true)
          .get();
      
      List<CancellableOrder> cancellableOrders = [];
      
      for (var doc in snapshot.docs) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        
        // Parse status - handle both enum format and string format
        String status = '';
        if (data['status'] != null) {
          status = data['status'].toString().toLowerCase();
          // Remove enum prefix if present (e.g., "OrderStatus.confirmed" -> "confirmed")
          if (status.contains('.')) {
            status = status.split('.').last;
          }
        }
        
        // Only include orders that can be cancelled
        if (status == 'confirmed' || status == 'processing' || status == 'pending') {
          // Get product name from items array
          String productName = 'Product';
          if (data['items'] != null && (data['items'] as List).isNotEmpty) {
            productName = data['items'][0]['productName'] ?? 'Product';
          }
          
          // Convert Timestamp to DateTime
          DateTime? orderDate;
          if (data['orderDate'] is Timestamp) {
            orderDate = (data['orderDate'] as Timestamp).toDate();
          }
          
          cancellableOrders.add(CancellableOrder(
            id: doc.id,
            productName: productName,
            totalAmount: (data['totalAmount'] ?? 0).toDouble(),
            status: status,
            orderDate: orderDate?.toIso8601String() ?? DateTime.now().toIso8601String(),
            paymentMethod: data['paymentMethod'] ?? 'Unknown',
            paymentStatus: data['paymentStatus']?.toString().split('.').last ?? 'pending',
            items: data['items'] ?? [],
          ));
        }
      }
      
      print('✅ Found ${cancellableOrders.length} cancellable orders from Firestore');
      return cancellableOrders;
    } catch (e) {
      print('❌ Error fetching cancellable orders from Firestore: $e');
      print('❌ Error type: ${e.runtimeType}');
      return [];
    }
  }
  
  // ✅ STEP 2: SUBMIT CANCELLATION REQUEST
  static Future<CancellationResponse> submitCancellation({
    required String orderId,
    required String customerEmail,
    required String cancellationReason,
    required String refundMethod,
    String? bankDetails,
  }) async {
    try {
      print('📤 Submitting cancellation request for order: $orderId');
      
      final response = await http.post(
        Uri.parse('$WEBHOOK_BASE_URL/salesiq/form-submit'),
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': WEBHOOK_SECRET,
        },
        body: jsonEncode({
          'order_id': orderId,
          'user_id': customerEmail,
          'action': 'cancel',
          'cancellation_reason': cancellationReason,
          'refund_method': refundMethod,
          'bank_details': bankDetails,
          'date': DateTime.now().toIso8601String(),
          'idempotency_token': 'flutter_${DateTime.now().millisecondsSinceEpoch}',
          'source': 'flutter_app',
        }),
      ).timeout(Duration(seconds: 15));
      
      print('📥 Response status: ${response.statusCode}');
      print('📥 Response body: ${response.body}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return CancellationResponse.fromJson(data);
      } else {
        return CancellationResponse(
          success: false,
          message: 'Failed to cancel order: ${response.statusCode}',
        );
      }
    } catch (e) {
      print('❌ Error submitting cancellation: $e');
      return CancellationResponse(
        success: false,
        message: 'Error: $e',
      );
    }
  }
  
  // ✅ STEP 3: NOTIFY SALESIQ CHAT (Optional - updates chat automatically)
  static Future<void> notifySalesIQChat({
    required String orderId,
    required String message,
  }) async {
    try {
      await http.post(
        Uri.parse('$WEBHOOK_BASE_URL/api/salesiq-notify'),
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': WEBHOOK_SECRET,
        },
        body: jsonEncode({
          'order_id': orderId,
          'message': message,
          'timestamp': DateTime.now().toIso8601String(),
        }),
      ).timeout(Duration(seconds: 5));
    } catch (e) {
      print('⚠️ Failed to notify SalesIQ: $e');
    }
  }
}

// 📦 DATA MODELS

class CancellableOrder {
  final String id;
  final String productName;
  final double totalAmount;
  final String status;
  final String orderDate;
  final String paymentMethod;
  final String paymentStatus;
  final List<dynamic> items;
  
  CancellableOrder({
    required this.id,
    required this.productName,
    required this.totalAmount,
    required this.status,
    required this.orderDate,
    required this.paymentMethod,
    required this.paymentStatus,
    this.items = const [],
  });
  
  factory CancellableOrder.fromJson(Map<String, dynamic> json) {
    return CancellableOrder(
      id: json['id'] ?? json['order_id'] ?? '',
      productName: json['product_name'] ?? 'Product',
      totalAmount: (json['total_amount'] ?? 0).toDouble(),
      status: json['status'] ?? 'confirmed',
      orderDate: json['orderDate'] ?? '',
      paymentMethod: json['paymentMethod'] ?? 'Unknown',
      paymentStatus: json['paymentStatus'] ?? 'pending',
      items: json['items'] ?? [],
    );
  }
}

class CancellationResponse {
  final bool success;
  final String message;
  final String? orderId;
  final String? newStatus;
  final RefundInfo? refund;
  
  CancellationResponse({
    required this.success,
    required this.message,
    this.orderId,
    this.newStatus,
    this.refund,
  });
  
  factory CancellationResponse.fromJson(Map<String, dynamic> json) {
    return CancellationResponse(
      success: json['success'] ?? false,
      message: json['message'] ?? 'Unknown response',
      orderId: json['order_id'],
      newStatus: json['new_status'],
      refund: json['refund'] != null ? RefundInfo.fromJson(json['refund']) : null,
    );
  }
}

class RefundInfo {
  final double amount;
  final String reference;
  final String method;
  final String status;
  
  RefundInfo({
    required this.amount,
    required this.reference,
    required this.method,
    required this.status,
  });
  
  factory RefundInfo.fromJson(Map<String, dynamic> json) {
    return RefundInfo(
      amount: (json['amount'] ?? 0).toDouble(),
      reference: json['reference'] ?? '',
      method: json['method'] ?? 'original_payment',
      status: json['status'] ?? 'initiated',
    );
  }
}
