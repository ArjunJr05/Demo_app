import 'package:salesiq_customer_widget/salesiq_customer_widget.dart';

/// E-commerce integration service for SalesIQ Customer Widget
class ECommerceCustomerService {
  static ECommerceCustomerService? _instance;
  static ECommerceCustomerService get instance => _instance ??= ECommerceCustomerService._();
  
  ECommerceCustomerService._();

  /// Set customer information when they login/register
  Future<void> setCustomerInfo({
    required String email,
    required String name,
    String? phone,
  }) async {
    try {
      await SalesIQCustomerService.instance.setCustomerInfo(
        email: email,
        name: name,
        phone: phone,
      );
      print("✅ Customer info set for SalesIQ: $name ($email)");
    } catch (e) {
      print("❌ Error setting customer info: $e");
    }
  }

  /// Track order when customer places an order
  Future<void> trackOrder({
    required String orderId,
    required String customerName,
    required String customerEmail,
    required List<OrderItem> items,
    required double totalAmount,
    required String status,
    required String paymentStatus,
    required String paymentMethod,
    String? trackingNumber,
    String? shippingAddress,
  }) async {
    try {
      final order = CustomerOrder(
        id: orderId,
        customerName: customerName,
        customerEmail: customerEmail,
        items: items,
        totalAmount: totalAmount,
        status: status,
        paymentStatus: paymentStatus,
        paymentMethod: paymentMethod,
        orderDate: DateTime.now().toIso8601String(),
        trackingNumber: trackingNumber,
        shippingAddress: shippingAddress,
      );

      await SalesIQCustomerService.instance.trackOrder(order);
      print("✅ Order tracked for SalesIQ: $orderId");
    } catch (e) {
      print("❌ Error tracking order: $e");
    }
  }

  /// Track support issue when customer reports a problem
  Future<void> trackSupportIssue({
    required String issueId,
    required String issueType,
    required String description,
    String? orderId,
    String priority = 'medium',
  }) async {
    try {
      final issue = SupportIssue(
        id: issueId,
        orderId: orderId,
        issueType: issueType,
        description: description,
        status: 'open',
        createdAt: DateTime.now().toIso8601String(),
        priority: priority,
      );

      await SalesIQCustomerService.instance.trackIssue(issue);
      print("✅ Support issue tracked for SalesIQ: $issueId");
    } catch (e) {
      print("❌ Error tracking support issue: $e");
    }
  }

  /// Show SalesIQ chat widget
  Future<void> showSupportChat() async {
    try {
      await SalesIQCustomerService.instance.showChat();
    } catch (e) {
      print("❌ Error showing support chat: $e");
    }
  }

  /// Hide SalesIQ chat widget
  Future<void> hideSupportChat() async {
    try {
      await SalesIQCustomerService.instance.hideChat();
    } catch (e) {
      print("❌ Error hiding support chat: $e");
    }
  }

  /// Sync all customer data with webhook
  Future<void> syncCustomerData(String customerEmail) async {
    try {
      await SalesIQCustomerService.instance.syncWithWebhook(customerEmail);
      print("✅ Customer data synced with webhook: $customerEmail");
    } catch (e) {
      print("❌ Error syncing customer data: $e");
    }
  }
}

/// Helper class to create order items easily
class ECommerceOrderItem {
  static OrderItem create({
    required String productName,
    required double price,
    required int quantity,
  }) {
    return OrderItem(
      productName: productName,
      price: price,
      quantity: quantity,
    );
  }
}

/// Example usage in your e-commerce app:
/// 
/// // When customer logs in
/// await ECommerceCustomerService.instance.setCustomerInfo(
///   email: 'customer@example.com',
///   name: 'John Doe',
///   phone: '+1234567890',
/// );
/// 
/// // When customer places an order
/// await ECommerceCustomerService.instance.trackOrder(
///   orderId: 'ORD123456',
///   customerName: 'John Doe',
///   customerEmail: 'customer@example.com',
///   items: [
///     ECommerceOrderItem.create(
///       productName: 'iPhone 15 Pro',
///       price: 999.99,
///       quantity: 1,
///     ),
///   ],
///   totalAmount: 999.99,
///   status: 'confirmed',
///   paymentStatus: 'paid',
///   paymentMethod: 'Credit Card',
///   trackingNumber: 'TRK789',
///   shippingAddress: '123 Main St, City, State',
/// );
/// 
/// // When customer reports an issue
/// await ECommerceCustomerService.instance.trackSupportIssue(
///   issueId: 'ISS123',
///   issueType: 'Product Issue',
///   description: 'Screen protector missing from order',
///   orderId: 'ORD123456',
///   priority: 'high',
/// );
/// 
/// // Show support chat
/// await ECommerceCustomerService.instance.showSupportChat();
