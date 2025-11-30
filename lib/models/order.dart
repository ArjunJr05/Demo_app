// 📦 E-Commerce Order Model
import 'product.dart';

enum OrderStatus {
  pending,
  confirmed,
  processing,
  shipped,
  outForDelivery,
  delivered,
  cancelled,
  returned
}

enum PaymentStatus {
  pending,
  paid,
  failed,
  refunded
}

class OrderItem {
  final String productId;
  final String productName;
  final double price;
  final int quantity;
  final String? selectedColor;
  final String? selectedSize;
  final String imageUrl;

  OrderItem({
    required this.productId,
    required this.productName,
    required this.price,
    required this.quantity,
    this.selectedColor,
    this.selectedSize,
    required this.imageUrl,
  });

  double get totalPrice => price * quantity;

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'productName': productName,
      'price': price,
      'quantity': quantity,
      'selectedColor': selectedColor,
      'selectedSize': selectedSize,
      'imageUrl': imageUrl,
    };
  }

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      productId: json['productId'],
      productName: json['productName'],
      price: json['price'].toDouble(),
      quantity: json['quantity'],
      selectedColor: json['selectedColor'],
      selectedSize: json['selectedSize'],
      imageUrl: json['imageUrl'],
    );
  }
}

class Order {
  final String id;
  final String customerId;
  final String customerName;
  final String customerEmail;
  final String customerPhone;
  final List<OrderItem> items;
  final double totalAmount;
  final OrderStatus status;
  final PaymentStatus paymentStatus;
  final String paymentMethod;
  final DateTime orderDate;
  final DateTime? deliveryDate;
  final String shippingAddress;
  final String? trackingNumber;
  final List<String> statusHistory;
  final String? notes;

  Order({
    required this.id,
    required this.customerId,
    required this.customerName,
    required this.customerEmail,
    required this.customerPhone,
    required this.items,
    required this.totalAmount,
    required this.status,
    required this.paymentStatus,
    required this.paymentMethod,
    required this.orderDate,
    this.deliveryDate,
    required this.shippingAddress,
    this.trackingNumber,
    this.statusHistory = const [],
    this.notes,
  });

  String get statusText {
    switch (status) {
      case OrderStatus.pending:
        return 'Order Placed';
      case OrderStatus.confirmed:
        return 'Confirmed';
      case OrderStatus.processing:
        return 'Processing';
      case OrderStatus.shipped:
        return 'Shipped';
      case OrderStatus.outForDelivery:
        return 'Out for Delivery';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.cancelled:
        return 'Cancelled';
      case OrderStatus.returned:
        return 'Returned';
    }
  }

  String get paymentStatusText {
    switch (paymentStatus) {
      case PaymentStatus.pending:
        return 'Payment Pending';
      case PaymentStatus.paid:
        return 'Paid Successfully';
      case PaymentStatus.failed:
        return 'Payment Failed';
      case PaymentStatus.refunded:
        return 'Refunded';
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customerId': customerId,
      'customerName': customerName,
      'customerEmail': customerEmail,
      'customerPhone': customerPhone,
      'items': items.map((item) => item.toJson()).toList(),
      'totalAmount': totalAmount,
      'status': status.toString(),
      'paymentStatus': paymentStatus.toString(),
      'paymentMethod': paymentMethod,
      'orderDate': orderDate.toIso8601String(),
      'deliveryDate': deliveryDate?.toIso8601String(),
      'shippingAddress': shippingAddress,
      'trackingNumber': trackingNumber,
      'statusHistory': statusHistory,
      'notes': notes,
    };
  }

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'],
      customerId: json['customerId'],
      customerName: json['customerName'],
      customerEmail: json['customerEmail'],
      customerPhone: json['customerPhone'],
      items: (json['items'] as List).map((item) => OrderItem.fromJson(item)).toList(),
      totalAmount: json['totalAmount'].toDouble(),
      status: OrderStatus.values.firstWhere((e) => e.toString() == json['status']),
      paymentStatus: PaymentStatus.values.firstWhere((e) => e.toString() == json['paymentStatus']),
      paymentMethod: json['paymentMethod'],
      orderDate: DateTime.parse(json['orderDate']),
      deliveryDate: json['deliveryDate'] != null ? DateTime.parse(json['deliveryDate']) : null,
      shippingAddress: json['shippingAddress'],
      trackingNumber: json['trackingNumber'],
      statusHistory: List<String>.from(json['statusHistory'] ?? []),
      notes: json['notes'],
    );
  }
}
