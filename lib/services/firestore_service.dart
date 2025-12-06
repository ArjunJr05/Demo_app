import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/product.dart';
import '../models/order.dart' as app_order;

class FirestoreService {
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ==================== USERS COLLECTION ====================

  /// Save user data to Firestore after signup
  static Future<void> saveUserData({
    required String userId,
    required String email,
    required String name,
    String? phone,
  }) async {
    try {
      print('🔄 Attempting to save user data for: $email (ID: $userId)');
      
      await _firestore.collection('users').doc(userId).set({
        'email': email,
        'name': name,
        'phone': phone ?? '',
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
      
      print('✅ User data saved to Firestore: $email');
    } catch (e) {
      print('❌ Error saving user data: $e');
      print('❌ Error type: ${e.runtimeType}');
      // Don't throw error - allow signup to continue even if Firestore save fails
    }
  }

  /// Get user data from Firestore
  static Future<Map<String, dynamic>?> getUserData(String userId) async {
    try {
      DocumentSnapshot doc = await _firestore.collection('users').doc(userId).get();
      if (doc.exists) {
        return doc.data() as Map<String, dynamic>?;
      }
      return null;
    } catch (e) {
      print('❌ Error getting user data: $e');
      return null;
    }
  }

  /// Update user data
  static Future<void> updateUserData({
    required String userId,
    String? name,
    String? phone,
  }) async {
    try {
      Map<String, dynamic> updates = {
        'updatedAt': FieldValue.serverTimestamp(),
      };
      
      if (name != null) updates['name'] = name;
      if (phone != null) updates['phone'] = phone;

      await _firestore.collection('users').doc(userId).update(updates);
      print('✅ User data updated');
    } catch (e) {
      print('❌ Error updating user data: $e');
      throw 'Failed to update user data';
    }
  }

  // ==================== PRODUCTS COLLECTION ====================

  /// Fetch all products from Firestore
  static Future<List<Product>> getProducts() async {
    try {
      QuerySnapshot snapshot = await _firestore.collection('products').get();
      
      List<Product> products = snapshot.docs.map((doc) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        return Product.fromJson(data);
      }).toList();
      
      print('✅ Fetched ${products.length} products from Firestore');
      return products;
    } catch (e) {
      print('❌ Error fetching products: $e');
      return [];
    }
  }

  /// Add a product to Firestore (for initial setup)
  static Future<void> addProduct(Product product) async {
    try {
      await _firestore.collection('products').doc(product.id).set(product.toJson());
      print('✅ Product added: ${product.name}');
    } catch (e) {
      print('❌ Error adding product: $e');
      throw 'Failed to add product';
    }
  }

  /// Add multiple products at once (for initial setup)
  static Future<void> addMultipleProducts(List<Product> products) async {
    try {
      WriteBatch batch = _firestore.batch();
      
      for (Product product in products) {
        DocumentReference docRef = _firestore.collection('products').doc(product.id);
        batch.set(docRef, product.toJson());
      }
      
      await batch.commit();
      print('✅ Added ${products.length} products to Firestore');
    } catch (e) {
      print('❌ Error adding multiple products: $e');
      throw 'Failed to add products';
    }
  }

  /// Get a single product by ID
  static Future<Product?> getProduct(String productId) async {
    try {
      DocumentSnapshot doc = await _firestore.collection('products').doc(productId).get();
      if (doc.exists) {
        return Product.fromJson(doc.data() as Map<String, dynamic>);
      }
      return null;
    } catch (e) {
      print('❌ Error getting product: $e');
      return null;
    }
  }

  // ==================== CART SUBCOLLECTION ====================

  /// Add product to cart
  static Future<void> addToCart({
    required String userId,
    required String productId,
    required String productName,
    required double price,
    required String imageUrl,
    required int quantity,
    String? selectedColor,
    String? selectedSize,
  }) async {
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('cart')
          .doc(productId)
          .set({
        'productId': productId,
        'productName': productName,
        'price': price,
        'imageUrl': imageUrl,
        'quantity': quantity,
        'selectedColor': selectedColor,
        'selectedSize': selectedSize,
        'addedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
      
      print('✅ Added to cart: $productName');
    } catch (e) {
      print('❌ Error adding to cart: $e');
      throw 'Failed to add to cart';
    }
  }

  /// Get cart items
  static Future<List<app_order.OrderItem>> getCartItems(String userId) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('users')
          .doc(userId)
          .collection('cart')
          .get();

      List<app_order.OrderItem> cartItems = snapshot.docs.map((doc) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        return app_order.OrderItem(
          productId: data['productId'],
          productName: data['productName'],
          price: data['price'].toDouble(),
          quantity: data['quantity'],
          selectedColor: data['selectedColor'],
          selectedSize: data['selectedSize'],
          imageUrl: data['imageUrl'],
        );
      }).toList();

      print('✅ Fetched ${cartItems.length} cart items');
      return cartItems;
    } catch (e) {
      print('❌ Error fetching cart items: $e');
      return [];
    }
  }

  /// Update cart item quantity
  static Future<void> updateCartQuantity({
    required String userId,
    required String productId,
    required int quantity,
  }) async {
    try {
      if (quantity <= 0) {
        await removeFromCart(userId: userId, productId: productId);
        return;
      }

      await _firestore
          .collection('users')
          .doc(userId)
          .collection('cart')
          .doc(productId)
          .update({'quantity': quantity});
      
      print('✅ Updated cart quantity');
    } catch (e) {
      print('❌ Error updating cart quantity: $e');
      throw 'Failed to update cart';
    }
  }

  /// Remove item from cart
  static Future<void> removeFromCart({
    required String userId,
    required String productId,
  }) async {
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('cart')
          .doc(productId)
          .delete();
      
      print('✅ Removed from cart');
    } catch (e) {
      print('❌ Error removing from cart: $e');
      throw 'Failed to remove from cart';
    }
  }

  /// Clear entire cart
  static Future<void> clearCart(String userId) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('users')
          .doc(userId)
          .collection('cart')
          .get();

      WriteBatch batch = _firestore.batch();
      for (var doc in snapshot.docs) {
        batch.delete(doc.reference);
      }
      await batch.commit();
      
      print('✅ Cart cleared');
    } catch (e) {
      print('❌ Error clearing cart: $e');
      throw 'Failed to clear cart';
    }
  }

  // ==================== FAVORITES SUBCOLLECTION ====================

  /// Add product to favorites
  static Future<void> addToFavorites({
    required String userId,
    required String productId,
    required String productName,
    required double price,
    required String imageUrl,
    String? category,
  }) async {
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('favorites')
          .doc(productId)
          .set({
        'productId': productId,
        'productName': productName,
        'price': price,
        'imageUrl': imageUrl,
        'category': category,
        'addedAt': FieldValue.serverTimestamp(),
      });
      
      print('✅ Added to favorites: $productName');
    } catch (e) {
      print('❌ Error adding to favorites: $e');
      throw 'Failed to add to favorites';
    }
  }

  /// Remove from favorites
  static Future<void> removeFromFavorites({
    required String userId,
    required String productId,
  }) async {
    try {
      await _firestore
          .collection('users')
          .doc(userId)
          .collection('favorites')
          .doc(productId)
          .delete();
      
      print('✅ Removed from favorites');
    } catch (e) {
      print('❌ Error removing from favorites: $e');
      throw 'Failed to remove from favorites';
    }
  }

  /// Get favorite products
  static Future<List<Map<String, dynamic>>> getFavorites(String userId) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('users')
          .doc(userId)
          .collection('favorites')
          .orderBy('addedAt', descending: true)
          .get();

      List<Map<String, dynamic>> favorites = snapshot.docs.map((doc) {
        return doc.data() as Map<String, dynamic>;
      }).toList();

      print('✅ Fetched ${favorites.length} favorites');
      return favorites;
    } catch (e) {
      print('❌ Error fetching favorites: $e');
      return [];
    }
  }

  /// Check if product is in favorites
  static Future<bool> isFavorite({
    required String userId,
    required String productId,
  }) async {
    try {
      DocumentSnapshot doc = await _firestore
          .collection('users')
          .doc(userId)
          .collection('favorites')
          .doc(productId)
          .get();
      
      return doc.exists;
    } catch (e) {
      print('❌ Error checking favorite status: $e');
      return false;
    }
  }

  // ==================== ORDERS COLLECTION ====================

  /// Create a new order
  static Future<String> createOrder({
    required String customerId,
    required String customerName,
    required String customerEmail,
    required String customerPhone,
    required String shippingAddress,
    required List<app_order.OrderItem> items,
    required double totalAmount,
    required String paymentMethod,
    DateTime? deliveryDate,
  }) async {
    try {
      // Generate order ID
      String orderId = 'ORD${DateTime.now().millisecondsSinceEpoch}';
      
      // Calculate delivery date for each item (7 days from now if not provided)
      DateTime defaultDeliveryDate = deliveryDate ?? DateTime.now().add(Duration(days: 7));
      
      // Create order data
      Map<String, dynamic> orderData = {
        'id': orderId,
        'customerId': customerId,
        'customerName': customerName,
        'customerEmail': customerEmail,
        'customerPhone': customerPhone,
        'shippingAddress': shippingAddress,
        'items': items.map((item) {
          Map<String, dynamic> itemData = item.toJson();
          // Add delivery date to each item
          itemData['deliveryDate'] = Timestamp.fromDate(defaultDeliveryDate);
          return itemData;
        }).toList(),
        'totalAmount': totalAmount,
        'status': app_order.OrderStatus.pending.toString(),
        'paymentStatus': app_order.PaymentStatus.pending.toString(),
        'paymentMethod': paymentMethod,
        'orderDate': FieldValue.serverTimestamp(),
        'deliveryDate': Timestamp.fromDate(defaultDeliveryDate),
        'trackingNumber': null,
        'statusHistory': ['Order placed at ${DateTime.now().toString()}'],
        'notes': null,
        'createdAt': FieldValue.serverTimestamp(),
      };

      await _firestore.collection('orders').doc(orderId).set(orderData);
      print('✅ Order created: $orderId');
      
      return orderId;
    } catch (e) {
      print('❌ Error creating order: $e');
      throw 'Failed to create order';
    }
  }

  /// Get all orders for a customer
  static Future<List<app_order.Order>> getCustomerOrders(String customerId) async {
    try {
      QuerySnapshot snapshot = await _firestore
          .collection('orders')
          .where('customerId', isEqualTo: customerId)
          .orderBy('orderDate', descending: true)
          .get();

      List<app_order.Order> orders = snapshot.docs.map((doc) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        
        // Convert Firestore Timestamps to DateTime strings for Order.fromJson
        if (data['orderDate'] is Timestamp) {
          data['orderDate'] = (data['orderDate'] as Timestamp).toDate().toIso8601String();
        }
        if (data['deliveryDate'] is Timestamp) {
          data['deliveryDate'] = (data['deliveryDate'] as Timestamp).toDate().toIso8601String();
        }
        
        return app_order.Order.fromJson(data);
      }).toList();

      print('✅ Fetched ${orders.length} orders for customer: $customerId');
      return orders;
    } catch (e) {
      print('❌ Error fetching customer orders: $e');
      return [];
    }
  }

  /// Get a single order by ID
  static Future<app_order.Order?> getOrder(String orderId) async {
    try {
      DocumentSnapshot doc = await _firestore.collection('orders').doc(orderId).get();
      if (doc.exists) {
        Map<String, dynamic> data = doc.data() as Map<String, dynamic>;
        
        // Convert Timestamps
        if (data['orderDate'] is Timestamp) {
          data['orderDate'] = (data['orderDate'] as Timestamp).toDate().toIso8601String();
        }
        if (data['deliveryDate'] is Timestamp) {
          data['deliveryDate'] = (data['deliveryDate'] as Timestamp).toDate().toIso8601String();
        }
        
        return app_order.Order.fromJson(data);
      }
      return null;
    } catch (e) {
      print('❌ Error getting order: $e');
      return null;
    }
  }

  /// Update order status
  static Future<void> updateOrderStatus({
    required String orderId,
    required app_order.OrderStatus status,
    String? trackingNumber,
  }) async {
    try {
      Map<String, dynamic> updates = {
        'status': status.toString(),
        'updatedAt': FieldValue.serverTimestamp(),
      };

      if (trackingNumber != null) {
        updates['trackingNumber'] = trackingNumber;
      }

      // Add to status history
      updates['statusHistory'] = FieldValue.arrayUnion([
        'Status updated to ${status.toString()} at ${DateTime.now().toString()}'
      ]);

      await _firestore.collection('orders').doc(orderId).update(updates);
      print('✅ Order status updated: $orderId -> $status');
    } catch (e) {
      print('❌ Error updating order status: $e');
      throw 'Failed to update order status';
    }
  }

  /// Update payment status
  static Future<void> updatePaymentStatus({
    required String orderId,
    required app_order.PaymentStatus paymentStatus,
  }) async {
    try {
      await _firestore.collection('orders').doc(orderId).update({
        'paymentStatus': paymentStatus.toString(),
        'updatedAt': FieldValue.serverTimestamp(),
      });
      print('✅ Payment status updated: $orderId -> $paymentStatus');
    } catch (e) {
      print('❌ Error updating payment status: $e');
      throw 'Failed to update payment status';
    }
  }
}
