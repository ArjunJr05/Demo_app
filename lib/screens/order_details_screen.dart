// 📦 Modern Order Details Screen
import 'package:flutter/material.dart';
import '../models/order.dart';

class OrderDetailsScreen extends StatefulWidget {
  final Order order;

  const OrderDetailsScreen({
    Key? key,
    required this.order,
  }) : super(key: key);

  @override
  _OrderDetailsScreenState createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends State<OrderDetailsScreen>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: Duration(milliseconds: 800),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
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
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF667eea),
              Color(0xFF764ba2),
              Color(0xFFf093fb),
            ],
          ),
        ),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: Column(
              children: [
                // Modern Header
                Container(
                  padding: EdgeInsets.fromLTRB(
                    screenWidth * 0.05,
                    screenHeight * 0.02,
                    screenWidth * 0.05,
                    screenHeight * 0.02,
                  ),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          padding: EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withOpacity(0.3)),
                          ),
                          child: Icon(
                            Icons.arrow_back_ios_new,
                            color: Colors.white,
                            size: 18,
                          ),
                        ),
                      ),
                      SizedBox(width: 16),
                      Expanded(
                        child: Text(
                          'Order Details',
                          style: TextStyle(
                            fontSize: isTablet ? 24 : 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      Container(
                        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: _getStatusColor(widget.order.status),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          widget.order.statusText,
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                // Content
                Expanded(
                  child: Container(
                    margin: EdgeInsets.only(top: 20),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade50,
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(30),
                        topRight: Radius.circular(30),
                      ),
                    ),
                    child: SingleChildScrollView(
                      padding: EdgeInsets.all(screenWidth * 0.05),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Order Info Card
                          _buildOrderInfoCard(screenWidth, isTablet),
                          SizedBox(height: 20),

                          // Items Section
                          _buildItemsSection(screenWidth, isTablet),
                          SizedBox(height: 20),

                          // Shipping Info Card
                          _buildShippingInfoCard(screenWidth, isTablet),
                          SizedBox(height: 20),

                          // Payment Info Card
                          _buildPaymentInfoCard(screenWidth, isTablet),
                          SizedBox(height: 20),

                          // Order Timeline
                          _buildOrderTimeline(screenWidth, isTablet),
                          SizedBox(height: 100), // Bottom padding
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),

      // Modern Action Buttons
      floatingActionButton: Container(
        margin: EdgeInsets.only(bottom: 20),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            FloatingActionButton.extended(
              onPressed: () {
                // Track order functionality
                _showTrackingDialog();
              },
              backgroundColor: Color(0xFF667eea),
              foregroundColor: Colors.white,
              icon: Icon(Icons.location_on_rounded),
              label: Text('Track Order'),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(25),
              ),
            ),
            FloatingActionButton.extended(
              onPressed: () {
                // Contact support
                _showSupportDialog();
              },
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
              icon: Icon(Icons.support_agent_rounded),
              label: Text('Support'),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(25),
              ),
            ),
          ],
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  Widget _buildOrderInfoCard(double screenWidth, bool isTablet) {
    return Container(
      padding: EdgeInsets.all(20),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Order #${widget.order.id}',
                style: TextStyle(
                  fontSize: isTablet ? 20 : 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _getPaymentStatusColor(widget.order.paymentStatus),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Text(
                  widget.order.paymentStatusText,
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
          _buildInfoRow('Order Date', _formatDate(widget.order.orderDate)),
          _buildInfoRow('Customer', widget.order.customerName),
          _buildInfoRow('Email', widget.order.customerEmail),
          _buildInfoRow('Phone', widget.order.customerPhone),
          if (widget.order.trackingNumber != null)
            _buildInfoRow('Tracking', widget.order.trackingNumber!),
        ],
      ),
    );
  }

  Widget _buildItemsSection(double screenWidth, bool isTablet) {
    return Container(
      padding: EdgeInsets.all(20),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Order Items (${widget.order.items.length})',
            style: TextStyle(
              fontSize: isTablet ? 18 : 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          SizedBox(height: 16),
          ...widget.order.items.map((item) => _buildOrderItem(item, isTablet)),
          Divider(height: 30),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total Amount',
                style: TextStyle(
                  fontSize: isTablet ? 18 : 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              Text(
                '₹${widget.order.totalAmount.toStringAsFixed(0)}',
                style: TextStyle(
                  fontSize: isTablet ? 20 : 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF667eea),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOrderItem(OrderItem item, bool isTablet) {
    return Container(
      margin: EdgeInsets.only(bottom: 12),
      padding: EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              color: Colors.grey.shade200,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Image.network(
                _getProductImageUrl(item.productName),
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return Icon(Icons.shopping_bag, color: Colors.grey);
                },
              ),
            ),
          ),
          SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: isTablet ? 16 : 14,
                    color: Colors.black87,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                SizedBox(height: 4),
                Text(
                  'Qty: ${item.quantity} × ₹${item.price.toStringAsFixed(0)}',
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: isTablet ? 14 : 12,
                  ),
                ),
                if (item.selectedColor != null || item.selectedSize != null)
                  Text(
                    '${item.selectedColor ?? ''} ${item.selectedSize ?? ''}',
                    style: TextStyle(
                      color: Colors.grey.shade500,
                      fontSize: 11,
                    ),
                  ),
              ],
            ),
          ),
          Text(
            '₹${item.totalPrice.toStringAsFixed(0)}',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: isTablet ? 16 : 14,
              color: Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShippingInfoCard(double screenWidth, bool isTablet) {
    return Container(
      padding: EdgeInsets.all(20),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Shipping Information',
            style: TextStyle(
              fontSize: isTablet ? 18 : 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          SizedBox(height: 16),
          Container(
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(Icons.location_on, color: Color(0xFF667eea)),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    widget.order.shippingAddress,
                    style: TextStyle(
                      fontSize: isTablet ? 14 : 13,
                      color: Colors.black87,
                      height: 1.4,
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

  Widget _buildPaymentInfoCard(double screenWidth, bool isTablet) {
    return Container(
      padding: EdgeInsets.all(20),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Payment Information',
            style: TextStyle(
              fontSize: isTablet ? 18 : 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          SizedBox(height: 16),
          _buildInfoRow('Payment Method', widget.order.paymentMethod),
          _buildInfoRow('Payment Status', widget.order.paymentStatusText),
          _buildInfoRow('Total Paid', '₹${widget.order.totalAmount.toStringAsFixed(0)}'),
        ],
      ),
    );
  }

  Widget _buildOrderTimeline(double screenWidth, bool isTablet) {
    return Container(
      padding: EdgeInsets.all(20),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Order Timeline',
            style: TextStyle(
              fontSize: isTablet ? 18 : 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          SizedBox(height: 16),
          _buildTimelineItem('Order Placed', _formatDate(widget.order.orderDate), true),
          _buildTimelineItem('Payment Confirmed', _formatDate(widget.order.orderDate), widget.order.paymentStatus == PaymentStatus.paid),
          _buildTimelineItem('Processing', 'In progress...', widget.order.status.index >= OrderStatus.processing.index),
          _buildTimelineItem('Shipped', widget.order.trackingNumber ?? 'Pending...', widget.order.status.index >= OrderStatus.shipped.index),
          _buildTimelineItem('Delivered', widget.order.deliveryDate != null ? _formatDate(widget.order.deliveryDate!) : 'Pending...', widget.order.status == OrderStatus.delivered),
        ],
      ),
    );
  }

  Widget _buildTimelineItem(String title, String subtitle, bool isCompleted) {
    return Container(
      margin: EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: isCompleted ? Color(0xFF667eea) : Colors.grey.shade300,
              borderRadius: BorderRadius.circular(10),
            ),
            child: isCompleted
                ? Icon(Icons.check, color: Colors.white, size: 14)
                : null,
          ),
          SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    color: isCompleted ? Colors.black87 : Colors.grey.shade600,
                  ),
                ),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.grey.shade600,
              fontSize: 13,
            ),
          ),
          Flexible(
            child: Text(
              value,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 13,
                color: Colors.black87,
              ),
              textAlign: TextAlign.right,
            ),
          ),
        ],
      ),
    );
  }

  String _getProductImageUrl(String productName) {
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
    return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop';
  }

  Color _getStatusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.delivered:
        return Colors.green;
      case OrderStatus.shipped:
      case OrderStatus.outForDelivery:
        return Colors.blue;
      case OrderStatus.cancelled:
      case OrderStatus.returned:
        return Colors.red;
      default:
        return Colors.orange;
    }
  }

  Color _getPaymentStatusColor(PaymentStatus status) {
    switch (status) {
      case PaymentStatus.paid:
        return Colors.green;
      case PaymentStatus.failed:
        return Colors.red;
      case PaymentStatus.refunded:
        return Colors.purple;
      default:
        return Colors.orange;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} at ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }

  void _showTrackingDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Track Your Order'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Order #${widget.order.id}'),
            SizedBox(height: 16),
            if (widget.order.trackingNumber != null)
              Text('Tracking Number: ${widget.order.trackingNumber}')
            else
              Text('Tracking number will be available once shipped.'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Close'),
          ),
        ],
      ),
    );
  }

  void _showSupportDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('Contact Support'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Need help with your order?'),
            SizedBox(height: 16),
            Text('Order #${widget.order.id}'),
            SizedBox(height: 16),
            Text('Our support team is here to help!'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Open SalesIQ chat or support system
            },
            child: Text('Chat Now'),
          ),
        ],
      ),
    );
  }
}
