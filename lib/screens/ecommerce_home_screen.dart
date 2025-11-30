// 🛍️ E-Commerce Home Screen with SalesIQ Integration
import 'package:flutter/material.dart';
import 'package:salesiq_mobilisten/salesiq_mobilisten.dart';
import '../models/product.dart';
import '../models/order.dart';
import '../services/ecommerce_service.dart';
import '../services/customer_timeline_service.dart';
import 'order_details_screen.dart';

class ECommerceHomeScreen extends StatefulWidget {
  final String customerEmail;
  final String customerName;

  const ECommerceHomeScreen({
    Key? key,
    required this.customerEmail,
    required this.customerName,
  }) : super(key: key);

  @override
  _ECommerceHomeScreenState createState() => _ECommerceHomeScreenState();
}

class _ECommerceHomeScreenState extends State<ECommerceHomeScreen> {
  List<Product> products = [];
  List<OrderItem> cart = [];
  List<Order> orders = [];
  List<OrderItem> favoriteProducts = [];

  @override
  void initState() {
    super.initState();
    _loadData();
    _initializeSalesIQ();
  }

  Future<void> _loadData() async {
    setState(() {
      products = ECommerceService.sampleProducts;
    });
    
    print('🔄 Loading orders for customer: ${widget.customerEmail}');
    final customerOrders = await ECommerceService.getCustomerOrders(widget.customerEmail);
    print('📦 Found ${customerOrders.length} orders for ${widget.customerEmail}');
    
    setState(() {
      orders = customerOrders;
    });
  }

  Future<void> _initializeSalesIQ() async {
    // Initialize SalesIQ with customer context
    await CustomerTimelineService.initializeSalesIQWithContext(
      widget.customerEmail,
      widget.customerName,
    );
    
    // Track app login
    await CustomerTimelineService.trackLogin(widget.customerEmail);
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    final isTablet = screenWidth > 600;
    
    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: SafeArea(
        child: Column(
          children: [
            // Modern Header
            Container(
              padding: EdgeInsets.fromLTRB(
                screenWidth * 0.05, 
                screenHeight * 0.025, 
                screenWidth * 0.05, 
                screenHeight * 0.02
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(24),
                  bottomRight: Radius.circular(24),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: Offset(0, 5),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Top Bar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'DEMO',
                        style: TextStyle(
                          fontSize: isTablet ? 32 : 28,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                          letterSpacing: 1.5,
                        ),
                      ),
                      Row(
                        children: [
                          Container(
                            padding: EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(Icons.search, color: Colors.grey.shade600),
                          ),
                          SizedBox(width: 12),
                          GestureDetector(
                            onTap: _showCart,
                            child: Container(
                              padding: EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Badge(
                                label: Text('${cart.length}'),
                                child: Icon(Icons.shopping_bag_outlined, color: Colors.grey.shade600),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  SizedBox(height: 24),
                  
                  // Welcome Section with Hero Banner
                  Container(
                    padding: EdgeInsets.all(screenWidth * 0.05),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Color(0xFF667eea),
                          Color(0xFF764ba2),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Step Into',
                                style: TextStyle(
                                  fontSize: isTablet ? 28 : 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                'Style',
                                style: TextStyle(
                                  fontSize: isTablet ? 28 : 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              SizedBox(height: 8),
                              Text(
                                'New AirMax 270 react\nbrings bold design.',
                                style: TextStyle(
                                  fontSize: isTablet ? 16 : 14,
                                  color: Colors.white.withOpacity(0.9),
                                  height: 1.4,
                                ),
                              ),
                              SizedBox(height: 12),
                              GestureDetector(
                                onTap: () {
                                  // Scroll to products or show featured items
                                },
                                child: Row(
                                  children: [
                                    Text(
                                      'Show more',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w500,
                                        fontSize: isTablet ? 16 : 14,
                                      ),
                                    ),
                                    SizedBox(width: 4),
                                    Icon(
                                      Icons.arrow_forward,
                                      color: Colors.white,
                                      size: isTablet ? 20 : 16,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          width: isTablet ? 140 : 120,
                          height: isTablet ? 120 : 100,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: Image.network(
                              'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop',
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return Icon(
                                  Icons.shopping_bag_rounded,
                                  size: isTablet ? 70 : 60,
                                  color: Colors.white.withOpacity(0.8),
                                );
                              },
                              loadingBuilder: (context, child, loadingProgress) {
                                if (loadingProgress == null) return child;
                                return Center(
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2,
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(height: 20),
                  
                  // Category Tabs
                  Container(
                    height: 50,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        _buildCategoryTab('Men', true),
                        _buildCategoryTab('Woman', false),
                        _buildCategoryTab('Kids', false),
                        _buildCategoryTab('New', false),
                        _buildCategoryTab('Sale', false),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            // Product Grid
            Expanded(
              child: Padding(
                padding: EdgeInsets.all(screenWidth * 0.05),
                child: GridView.builder(
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: isTablet ? 3 : 2,
                    childAspectRatio: isTablet ? 0.8 : 0.7,
                    crossAxisSpacing: screenWidth * 0.04,
                    mainAxisSpacing: screenHeight * 0.025,
                  ),
                  itemCount: products.length,
                  itemBuilder: (context, index) {
                    final product = products[index];
                    return _buildModernProductCard(product);
                  },
                ),
              ),
            ),
          ],
        ),
      ),
      
      // Modern Bottom Navigation
      bottomNavigationBar: Container(
        padding: EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(24),
            topRight: Radius.circular(24),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 10,
              offset: Offset(0, -5),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _buildBottomNavItem(Icons.home_rounded, true),
            GestureDetector(
              onTap: _showFavorites,
              child: _buildBottomNavItemWithBadge(
                Icons.favorite_border_rounded, 
                false, 
                favoriteProducts.length
              ),
            ),
            GestureDetector(
              onTap: _showMyOrders,
              child: _buildBottomNavItem(Icons.receipt_long_rounded, false),
            ),
            GestureDetector(
              onTap: () async {
                await CustomerTimelineService.trackChatInteraction(widget.customerEmail, 0);
                ZohoSalesIQ.present();
              },
              child: _buildBottomNavItem(Icons.support_agent_rounded, false),
            ),
          ],
        ),
      ),
      
      
      
    );
  }

  Widget _buildCategoryTab(String title, bool isSelected) {
    return Container(
      margin: EdgeInsets.only(right: 16),
      child: GestureDetector(
        onTap: () {
          // Handle category selection
        },
        child: Container(
          padding: EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? Color(0xFF667eea) : Colors.transparent,
            borderRadius: BorderRadius.circular(25),
          ),
          child: Text(
            title,
            style: TextStyle(
              color: isSelected ? Colors.white : Colors.grey.shade600,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
              fontSize: 16,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBottomNavItem(IconData icon, bool isSelected) {
    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isSelected ? Color(0xFF667eea).withOpacity(0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        icon,
        color: isSelected ? Color(0xFF667eea) : Colors.grey.shade600,
        size: 24,
      ),
    );
  }

  Widget _buildBottomNavItemWithBadge(IconData icon, bool isSelected, int badgeCount) {
    return Container(
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isSelected ? Color(0xFF667eea).withOpacity(0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Icon(
            icon,
            color: isSelected ? Color(0xFF667eea) : Colors.grey.shade600,
            size: 24,
          ),
          if (badgeCount > 0)
            Positioned(
              right: -6,
              top: -6,
              child: Container(
                padding: EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.red,
                  borderRadius: BorderRadius.circular(10),
                ),
                constraints: BoxConstraints(
                  minWidth: 16,
                  minHeight: 16,
                ),
                child: Text(
                  '$badgeCount',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildModernProductCard(Product product) {
    final isLiked = favoriteProducts.any((item) => item.productId == product.id);
    
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Product Image Container
          Expanded(
            flex: 3,
            child: Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: _getProductColor(product.name),
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                    child: Image.network(
                      _getProductImageUrl(product.name),
                      width: double.infinity,
                      height: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Center(
                          child: Icon(
                            _getProductIcon(product.name),
                            size: 50,
                            color: Colors.white.withOpacity(0.9),
                          ),
                        );
                      },
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return Center(
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        );
                      },
                    ),
                  ),
                  // Heart Icon
                  Positioned(
                    top: 12,
                    right: 12,
                    child: GestureDetector(
                      onTap: () => _toggleFavorite(product),
                      child: Container(
                        padding: EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.9),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Icon(
                          isLiked ? Icons.favorite : Icons.favorite_border,
                          color: isLiked ? Colors.red : Colors.grey.shade600,
                          size: 16,
                        ),
                      ),
                    ),
                  ),
                  if (product.name.toLowerCase().contains('sale') || 
                      product.price < 100) // Show discount for cheaper items
                    Positioned(
                      top: 12,
                      left: 12,
                      child: Container(
                        padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.yellow,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '25%',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.black,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          
          // Product Details
          Container(
            padding: EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  product.name,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                    color: Colors.black87,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 4),
                Text(
                  '₹${product.price.toStringAsFixed(0)}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: Colors.black,
                  ),
                ),
                SizedBox(height: 8),
                
                // Add to Cart Button
                GestureDetector(
                  onTap: () => _addToCart(product),
                  child: Container(
                    width: double.infinity,
                    padding: EdgeInsets.symmetric(vertical: 6),
                    decoration: BoxDecoration(
                      color: Color(0xFF667eea),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'Add to Cart',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 11,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getProductColor(String productName) {
    // Assign colors based on product type
    if (productName.toLowerCase().contains('hoodie') || 
        productName.toLowerCase().contains('shirt')) {
      return Color(0xFFF5F5DC); // Beige
    } else if (productName.toLowerCase().contains('pant') || 
               productName.toLowerCase().contains('jeans')) {
      return Color(0xFFDEB887); // Tan
    } else if (productName.toLowerCase().contains('puffer') || 
               productName.toLowerCase().contains('jacket')) {
      return Color(0xFFCD5C5C); // Red
    } else if (productName.toLowerCase().contains('shoe') || 
               productName.toLowerCase().contains('sneaker')) {
      return Color(0xFFFFE4B5); // Light yellow
    }
    return Color(0xFF667eea); // Default purple
  }

  IconData _getProductIcon(String productName) {
    if (productName.toLowerCase().contains('hoodie') || 
        productName.toLowerCase().contains('shirt')) {
      return Icons.checkroom;
    } else if (productName.toLowerCase().contains('pant') || 
               productName.toLowerCase().contains('jeans')) {
      return Icons.checkroom;
    } else if (productName.toLowerCase().contains('puffer') || 
               productName.toLowerCase().contains('jacket')) {
      return Icons.checkroom;
    } else if (productName.toLowerCase().contains('shoe') || 
               productName.toLowerCase().contains('sneaker')) {
      return Icons.sports_basketball;
    }
    return Icons.shopping_bag;
  }

  String _getProductImageUrl(String productName) {
    // Return different Unsplash images based on product type
    if (productName.toLowerCase().contains('hoodie') || 
        productName.toLowerCase().contains('shirt')) {
      return 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop';
    } else if (productName.toLowerCase().contains('pant') || 
               productName.toLowerCase().contains('jeans')) {
      return 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop';
    } else if (productName.toLowerCase().contains('puffer') || 
               productName.toLowerCase().contains('jacket')) {
      return 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop';
    } else if (productName.toLowerCase().contains('shoe') || 
               productName.toLowerCase().contains('sneaker')) {
      return 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop'; // Default shopping image
  }

  void _toggleFavorite(Product product) {
    setState(() {
      final existingIndex = favoriteProducts.indexWhere((item) => item.productId == product.id);
      if (existingIndex >= 0) {
        favoriteProducts.removeAt(existingIndex);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${product.name} removed from favorites')),
        );
      } else {
        favoriteProducts.add(OrderItem(
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: 1,
          imageUrl: product.imageUrl,
        ));
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${product.name} added to favorites ❤️')),
        );
      }
    });
  }

  void _showFavorites() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.8,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: Column(
          children: [
            Container(
              padding: EdgeInsets.all(20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Favorites ❤️',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${favoriteProducts.length} items',
                    style: TextStyle(
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: favoriteProducts.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.favorite_border,
                            size: 64,
                            color: Colors.grey.shade400,
                          ),
                          SizedBox(height: 16),
                          Text(
                            'No favorites yet',
                            style: TextStyle(
                              fontSize: 18,
                              color: Colors.grey.shade600,
                            ),
                          ),
                          SizedBox(height: 8),
                          Text(
                            'Tap the heart icon on products to add them here!',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: EdgeInsets.symmetric(horizontal: 20),
                      itemCount: favoriteProducts.length,
                      itemBuilder: (context, index) {
                        final item = favoriteProducts[index];
                        return Card(
                          margin: EdgeInsets.only(bottom: 12),
                          child: ListTile(
                            leading: Container(
                              width: 50,
                              height: 50,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(8),
                                color: Colors.grey.shade200,
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(
                                  _getProductImageUrl(item.productName),
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) {
                                    return Icon(Icons.shopping_bag, color: Colors.grey);
                                  },
                                ),
                              ),
                            ),
                            title: Text(item.productName),
                            subtitle: Text('₹${item.price.toStringAsFixed(0)}'),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: Icon(Icons.shopping_cart_outlined),
                                  onPressed: () {
                                    // Convert favorite to cart item
                                    _addToCart(Product(
                                      id: item.productId,
                                      name: item.productName,
                                      description: 'Favorite product',
                                      price: item.price,
                                      imageUrl: item.imageUrl,
                                      category: 'General',
                                    ));
                                  },
                                ),
                                IconButton(
                                  icon: Icon(Icons.favorite, color: Colors.red),
                                  onPressed: () {
                                    setState(() {
                                      favoriteProducts.removeAt(index);
                                    });
                                    Navigator.pop(context);
                                  },
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }


  void _addToCart(Product product) {
    setState(() {
      cart.add(OrderItem(
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1,
        imageUrl: product.imageUrl,
      ));
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${product.name} added to cart'),
        action: SnackBarAction(
          label: 'VIEW CART',
          onPressed: _showCart,
        ),
      ),
    );
  }

  void _showCart() {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Shopping Cart (${cart.length} items)',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 16),
            if (cart.isEmpty)
              Text('Your cart is empty')
            else
              ...cart.map((item) => ListTile(
                title: Text(item.productName),
                subtitle: Text('₹${item.price} x ${item.quantity}'),
                trailing: IconButton(
                  icon: Icon(Icons.remove_circle),
                  onPressed: () {
                    setState(() {
                      cart.remove(item);
                    });
                    Navigator.pop(context);
                  },
                ),
              )),
            if (cart.isNotEmpty) ...[
              Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Total: ₹${cart.fold(0.0, (sum, item) => sum + item.totalPrice).toStringAsFixed(0)}',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  ElevatedButton(
                    onPressed: _checkout,
                    child: Text('Checkout'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _checkout() async {
    if (cart.isEmpty) return;
    
    Navigator.pop(context); // Close cart modal
    
    // Show payment options dialog
    final paymentResult = await _showPaymentOptionsDialog();
    if (paymentResult == null) return;
    
    try {
      final orderId = await ECommerceService.createOrder(
        customerName: widget.customerName,
        customerEmail: widget.customerEmail,
        customerPhone: '+91 9876543210', // In real app, get from user profile
        items: cart,
        shippingAddress: '123 MG Road, Bangalore, Karnataka 560001', // In real app, get from user
        paymentMethod: paymentResult['method'] ?? 'UPI',
        paymentStatus: paymentResult['status'] ?? 'paid',
      );
      
      setState(() {
        cart.clear();
      });
      
      // Track purchase for SalesIQ
      await CustomerTimelineService.trackPurchaseAttempt(
        widget.customerEmail,
        cart.map((item) => item.productName).join(', '),
        cart.fold(0.0, (sum, item) => sum + item.totalPrice),
      );
      
      _loadData(); // Refresh orders
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Order placed successfully! Order ID: $orderId'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 3),
        ),
      );
      
      // Show order confirmation dialog
      _showOrderConfirmation(orderId);
      
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error placing order: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _showOrderConfirmation(String orderId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('🎉 Order Confirmed!'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Your order has been placed successfully.'),
            SizedBox(height: 8),
            Text('Order ID: $orderId', style: TextStyle(fontWeight: FontWeight.bold)),
            SizedBox(height: 16),
            Text('Need help with your order? Chat with our support team!'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              await CustomerTimelineService.trackChatInteraction(widget.customerEmail, 0);
              ZohoSalesIQ.present();
            },
            child: Text('💬 Chat Support'),
          ),
        ],
      ),
    );
  }

  Future<Map<String, String>?> _showPaymentOptionsDialog() async {
    return showDialog<Map<String, String>>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('💳 Choose Payment Method'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Select how you want to pay for your order:'),
            SizedBox(height: 16),
            _buildPaymentOption('UPI', 'paid', '📱 UPI (Instant Payment)', Colors.green),
            SizedBox(height: 8),
            _buildPaymentOption('Credit Card', 'paid', '💳 Credit/Debit Card', Colors.blue),
            SizedBox(height: 8),
            _buildPaymentOption('Cash on Delivery', 'pending', '💵 Cash on Delivery', Colors.orange),
            SizedBox(height: 8),
            _buildPaymentOption('Net Banking', 'pending', '🏦 Net Banking (Pay Later)', Colors.purple),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentOption(String method, String status, String title, Color color) {
    return InkWell(
      onTap: () {
        Navigator.pop(context, {'method': method, 'status': status});
      },
      child: Container(
        padding: EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: color),
          borderRadius: BorderRadius.circular(8),
          color: color.withOpacity(0.1),
        ),
        child: Row(
          children: [
            Icon(Icons.payment, color: color),
            SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.bold)),
                  Text(
                    status == 'paid' ? 'Instant payment' : 'Pay later',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ),
            Icon(Icons.arrow_forward_ios, size: 16, color: color),
          ],
        ),
      ),
    );
  }

  void _showMyOrders() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => MyOrdersScreen(
          customerEmail: widget.customerEmail,
          orders: orders,
        ),
      ),
    );
  }
}

// 📦 Modern My Orders Screen
class MyOrdersScreen extends StatefulWidget {
  final String customerEmail;
  final List<Order> orders;

  const MyOrdersScreen({
    Key? key,
    required this.customerEmail,
    required this.orders,
  }) : super(key: key);

  @override
  _MyOrdersScreenState createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  List<Order> _currentOrders = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _currentOrders = widget.orders;
    _animationController = AnimationController(
      duration: Duration(milliseconds: 600),
      vsync: this,
    );
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final screenHeight = MediaQuery.of(context).size.height;
    final isTablet = screenWidth > 600;

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      body: SafeArea(
        child: Column(
          children: [
            // Modern Header matching home screen
            Container(
              padding: EdgeInsets.fromLTRB(
                screenWidth * 0.05, 
                screenHeight * 0.025, 
                screenWidth * 0.05, 
                screenHeight * 0.02
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(24),
                  bottomRight: Radius.circular(24),
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: Offset(0, 5),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Top Bar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          GestureDetector(
                            onTap: () => Navigator.pop(context),
                            child: Container(
                              padding: EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                Icons.arrow_back_ios_new,
                                color: Colors.grey.shade600,
                                size: 18,
                              ),
                            ),
                          ),
                          SizedBox(width: 16),
                          Text(
                            'My Orders',
                            style: TextStyle(
                              fontSize: isTablet ? 32 : 28,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                              letterSpacing: 1.5,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: Color(0xFF667eea).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          '${_currentOrders.length} Orders',
                          style: TextStyle(
                            color: Color(0xFF667eea),
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 24),
                  
                  // Order Summary Banner
                  Container(
                    padding: EdgeInsets.all(screenWidth * 0.05),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Color(0xFF667eea),
                          Color(0xFF764ba2),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Order',
                                style: TextStyle(
                                  fontSize: isTablet ? 28 : 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                'History',
                                style: TextStyle(
                                  fontSize: isTablet ? 28 : 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              SizedBox(height: 8),
                              Text(
                                'Track your purchases and\nmanage your orders.',
                                style: TextStyle(
                                  fontSize: isTablet ? 16 : 14,
                                  color: Colors.white.withOpacity(0.9),
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          width: isTablet ? 140 : 120,
                          height: isTablet ? 120 : 100,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: Image.network(
                              'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop',
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return Icon(
                                  Icons.receipt_long_rounded,
                                  size: isTablet ? 70 : 60,
                                  color: Colors.white.withOpacity(0.8),
                                );
                              },
                              loadingBuilder: (context, child, loadingProgress) {
                                if (loadingProgress == null) return child;
                                return Center(
                                  child: CircularProgressIndicator(
                                    color: Colors.white,
                                    strokeWidth: 2,
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            // Content
            Expanded(
              child: _isLoading
                  ? Center(
                      child: CircularProgressIndicator(
                        color: Color(0xFF667eea),
                      ),
                    )
                  : _currentOrders.isEmpty
                      ? _buildEmptyState(isTablet)
                      : RefreshIndicator(
                          onRefresh: _refreshOrders,
                          child: _buildOrdersList(screenWidth, isTablet),
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(bool isTablet) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(60),
            ),
            child: Icon(
              Icons.shopping_bag_outlined,
              size: 60,
              color: Colors.grey.shade400,
            ),
          ),
          SizedBox(height: 24),
          Text(
            'No orders yet',
            style: TextStyle(
              fontSize: isTablet ? 22 : 20,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade700,
            ),
          ),
          SizedBox(height: 8),
          Text(
            'Start shopping to see your orders here!',
            style: TextStyle(
              fontSize: isTablet ? 16 : 14,
              color: Colors.grey.shade600,
            ),
            textAlign: TextAlign.center,
          ),
          SizedBox(height: 32),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: Color(0xFF667eea),
              foregroundColor: Colors.white,
              padding: EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(25),
              ),
            ),
            child: Text(
              'Start Shopping',
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _refreshOrders() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      print('🔄 Refreshing orders for customer: ${widget.customerEmail}');
      final refreshedOrders = await ECommerceService.getCustomerOrders(widget.customerEmail);
      print('📦 Refreshed: Found ${refreshedOrders.length} orders');
      
      setState(() {
        _currentOrders = refreshedOrders;
        _isLoading = false;
      });
    } catch (e) {
      print('❌ Error refreshing orders: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  Widget _buildOrdersList(double screenWidth, bool isTablet) {
    return Padding(
      padding: EdgeInsets.all(screenWidth * 0.05),
      child: ListView.builder(
        itemCount: _currentOrders.length,
        itemBuilder: (context, index) {
          final order = _currentOrders[index];
          return SlideTransition(
            position: Tween<Offset>(
              begin: Offset(1, 0),
              end: Offset.zero,
            ).animate(CurvedAnimation(
              parent: _animationController,
              curve: Interval(index * 0.1, 1.0, curve: Curves.easeOut),
            )),
            child: _buildModernOrderCard(order, screenWidth, isTablet),
          );
        },
      ),
    );
  }

  Widget _buildModernOrderCard(Order order, double screenWidth, bool isTablet) {
    return Container(
      margin: EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 15,
            offset: Offset(0, 5),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => OrderDetailsScreen(order: order),
              ),
            );
          },
          child: Padding(
            padding: EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Order #${order.id}',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: isTablet ? 18 : 16,
                              color: Colors.black87,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            _formatDate(order.orderDate),
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: isTablet ? 14 : 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _getStatusColor(order.status),
                        borderRadius: BorderRadius.circular(15),
                      ),
                      child: Text(
                        order.statusText,
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ],
                ),
                
                SizedBox(height: 16),
                
                // Items Preview
                Container(
                  padding: EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.shopping_bag_outlined, 
                           color: Color(0xFF667eea), size: 20),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          '${order.items.length} item${order.items.length > 1 ? 's' : ''}',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: isTablet ? 14 : 13,
                            color: Colors.black87,
                          ),
                        ),
                      ),
                      Text(
                        '₹${order.totalAmount.toStringAsFixed(0)}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: isTablet ? 16 : 15,
                          color: Color(0xFF667eea),
                        ),
                      ),
                    ],
                  ),
                ),
                
                SizedBox(height: 16),
                
                // Action Buttons
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _reportIssue(context, order),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.orange,
                          side: BorderSide(color: Colors.orange),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: Text(
                          'Report Issue',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () async {
                          await CustomerTimelineService.trackChatInteraction(
                              widget.customerEmail, 0);
                          ZohoSalesIQ.present();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Color(0xFF667eea),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: Text(
                          '💬 Support',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  Color _getStatusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.delivered:
        return Colors.green.shade100;
      case OrderStatus.shipped:
      case OrderStatus.outForDelivery:
        return Colors.blue.shade100;
      case OrderStatus.cancelled:
      case OrderStatus.returned:
        return Colors.red.shade100;
      default:
        return Colors.orange.shade100;
    }
  }

  void _reportIssue(BuildContext context, Order order) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Report Issue'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Report an issue with Order ${order.id}'),
            SizedBox(height: 16),
            DropdownButton<String>(
              hint: Text('Select issue type'),
              items: ['Delivery Delay', 'Product Quality', 'Wrong Item', 'Damaged Package']
                  .map((type) => DropdownMenuItem(value: type, child: Text(type)))
                  .toList(),
              onChanged: (value) {
                if (value != null) {
                  Navigator.pop(context);
                  _submitIssue(context, order.id, value);
                }
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
        ],
      ),
    );
  }

  Future<void> _submitIssue(BuildContext context, String orderId, String issueType) async {
    try {
      await ECommerceService.reportIssue(
        customerEmail: widget.customerEmail,
        orderId: orderId,
        issueType: issueType,
        description: 'Customer reported: $issueType',
      );
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Issue reported successfully. Our team will contact you soon.'),
          backgroundColor: Colors.green,
        ),
      );
      
      // Automatically open SalesIQ chat
      await CustomerTimelineService.trackChatInteraction(widget.customerEmail, 0);
      ZohoSalesIQ.present();
      
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error reporting issue: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
