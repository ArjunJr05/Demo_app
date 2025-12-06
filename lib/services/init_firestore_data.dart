import '../models/product.dart';
import 'firestore_service.dart';
import 'ecommerce_service.dart';

/// Helper class to initialize Firestore with sample data
class InitFirestoreData {
  /// Add sample products to Firestore (run this once)
  static Future<void> addSampleProducts() async {
    try {
      print('🔄 Adding sample products to Firestore...');
      
      // Get sample products from ECommerceService
      List<Product> sampleProducts = ECommerceService.sampleProducts;
      
      // Add all products to Firestore
      await FirestoreService.addMultipleProducts(sampleProducts);
      
      print('✅ Successfully added ${sampleProducts.length} products to Firestore!');
    } catch (e) {
      print('❌ Error adding sample products: $e');
    }
  }
  
  /// Check if products exist in Firestore
  static Future<bool> productsExist() async {
    try {
      List<Product> products = await FirestoreService.getProducts();
      return products.isNotEmpty;
    } catch (e) {
      return false;
    }
  }
  
  /// Initialize Firestore with sample data if needed
  static Future<void> initializeIfNeeded() async {
    bool exists = await productsExist();
    if (!exists) {
      print('📦 No products found in Firestore. Adding sample products...');
      await addSampleProducts();
    } else {
      print('✅ Products already exist in Firestore');
    }
  }
}
