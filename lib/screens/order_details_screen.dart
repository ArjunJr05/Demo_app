// 📦 Modern Order Details Screen
import 'package:flutter/material.dart';
import 'package:salesiq_mobilisten/salesiq_mobilisten.dart';
import '../models/order.dart';
import '../widgets/cancel_return_form.dart';
import '../services/ecommerce_service.dart';
import '../services/customer_timeline_service.dart';

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
  Order? _currentOrder;

  @override
  void initState() {
    super.initState();
    _currentOrder = widget.order;
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
                          color: _getStatusColor(_currentOrder?.status ?? widget.order.status),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _currentOrder?.statusText ?? widget.order.statusText,
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
                          SizedBox(height: 20),
                          
                          // Contextual Action Button
                          _buildContextualActionButton(screenWidth, isTablet),
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
              heroTag: 'track_order_btn',
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
              heroTag: 'support_btn',
              onPressed: () async {
                // Contact support with SalesIQ integration
                await CustomerTimelineService.trackChatInteraction(
                  _currentOrder?.customerEmail ?? widget.order.customerEmail, 
                  0
                );
                ZohoSalesIQ.present();
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
              Flexible(
                child: Text(
                  'Order #${widget.order.id}',
                  style: TextStyle(
                    fontSize: isTablet ? 20 : 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              SizedBox(width: 8),
              Container(
                padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: _getPaymentStatusColor(_currentOrder?.paymentStatus ?? widget.order.paymentStatus),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Text(
                  _currentOrder?.paymentStatusText ?? widget.order.paymentStatusText,
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
          _buildInfoRow('Order Date', _formatDate(_currentOrder?.orderDate ?? widget.order.orderDate)),
          _buildInfoRow('Customer', _currentOrder?.customerName ?? widget.order.customerName),
          _buildInfoRow('Email', _currentOrder?.customerEmail ?? widget.order.customerEmail),
          _buildInfoRow('Phone', _currentOrder?.customerPhone ?? widget.order.customerPhone),
          if ((_currentOrder?.trackingNumber ?? widget.order.trackingNumber) != null)
            _buildInfoRow('Tracking', _currentOrder?.trackingNumber ?? widget.order.trackingNumber!),
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
            'Order Items (${_currentOrder?.items.length ?? widget.order.items.length})',
            style: TextStyle(
              fontSize: isTablet ? 18 : 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          SizedBox(height: 16),
          ...(_currentOrder?.items ?? widget.order.items).map((item) => _buildOrderItem(item, isTablet)),
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
                '₹${_currentOrder?.totalAmount.toStringAsFixed(0) ?? widget.order.totalAmount.toStringAsFixed(0)}',
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
                    _currentOrder?.shippingAddress ?? widget.order.shippingAddress,
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
          _buildInfoRow('Payment Method', _currentOrder?.paymentMethod ?? widget.order.paymentMethod),
          _buildInfoRow('Payment Status', _currentOrder?.paymentStatusText ?? widget.order.paymentStatusText),
          _buildInfoRow('Total Paid', '₹${_currentOrder?.totalAmount.toStringAsFixed(0) ?? widget.order.totalAmount.toStringAsFixed(0)}'),
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
          _buildTimelineItem('Order Placed', _formatDate(_currentOrder?.orderDate ?? widget.order.orderDate), true),
          _buildTimelineItem('Payment Confirmed', _formatDate(_currentOrder?.orderDate ?? widget.order.orderDate), (_currentOrder?.paymentStatus ?? widget.order.paymentStatus) == PaymentStatus.paid),
          _buildTimelineItem('Processing', 'In progress...', (_currentOrder?.status.index ?? widget.order.status.index) >= OrderStatus.processing.index),
          _buildTimelineItem('Shipped', (_currentOrder?.trackingNumber ?? widget.order.trackingNumber) ?? 'Pending...', (_currentOrder?.status.index ?? widget.order.status.index) >= OrderStatus.shipped.index),
          _buildTimelineItem('Delivered', (_currentOrder?.deliveryDate ?? widget.order.deliveryDate) != null ? _formatDate(_currentOrder?.deliveryDate ?? widget.order.deliveryDate!) : 'Pending...', (_currentOrder?.status ?? widget.order.status) == OrderStatus.delivered),
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
            Text('Order #${_currentOrder?.id ?? widget.order.id}'),
            SizedBox(height: 16),
            if ((_currentOrder?.trackingNumber ?? widget.order.trackingNumber) != null)
              Text('Tracking Number: ${_currentOrder?.trackingNumber ?? widget.order.trackingNumber}')
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


  Widget _buildContextualActionButton(double screenWidth, bool isTablet) {
    final currentOrder = _currentOrder ?? widget.order;
    
    // Determine which action button to show based on order status
    Widget? actionButton;
    
    if (currentOrder.status == OrderStatus.confirmed || 
        currentOrder.status == OrderStatus.processing) {
      // Show Cancel button for "Yet to be shipped" orders
      actionButton = SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () => _showCancelReturnForm('cancel'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.orange,
            foregroundColor: Colors.white,
            padding: EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          icon: Icon(Icons.cancel_outlined),
          label: Text(
            'Cancel Order',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      );
    } else if (currentOrder.status == OrderStatus.shipped || 
               currentOrder.status == OrderStatus.outForDelivery) {
      // Show Return button for "Dispatched" orders
      actionButton = SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () => _showCancelReturnForm('return'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
            padding: EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          icon: Icon(Icons.keyboard_return_outlined),
          label: Text(
            'Return Order',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      );
    }
    
    // If no action button should be shown, return empty container
    if (actionButton == null) {
      return SizedBox.shrink();
    }
    
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
            'Order Actions',
            style: TextStyle(
              fontSize: isTablet ? 18 : 16,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          SizedBox(height: 16),
          actionButton,
        ],
      ),
    );
  }
  
  void _showCancelReturnForm(String action) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => CancelReturnForm(
        order: _currentOrder ?? widget.order,
        action: action,
        onSubmit: _handleCancelReturnSubmit,
      ),
    );
  }
  
  Future<void> _handleCancelReturnSubmit(Map<String, dynamic> formData) async {
    try {
      final action = formData['action'];
      
      // Call backend API
      final success = await ECommerceService.submitCancelReturn(formData);
      
      if (success) {
        // Update order status locally
        final newStatus = action == 'cancel' ? OrderStatus.cancelled : OrderStatus.returned;
        
        // Update the current order state
        setState(() {
          _currentOrder = Order(
            id: (_currentOrder ?? widget.order).id,
            customerId: (_currentOrder ?? widget.order).customerId,
            customerName: (_currentOrder ?? widget.order).customerName,
            customerEmail: (_currentOrder ?? widget.order).customerEmail,
            customerPhone: (_currentOrder ?? widget.order).customerPhone,
            items: (_currentOrder ?? widget.order).items,
            totalAmount: (_currentOrder ?? widget.order).totalAmount,
            status: newStatus,
            paymentStatus: action == 'cancel' ? PaymentStatus.refunded : (_currentOrder ?? widget.order).paymentStatus,
            paymentMethod: (_currentOrder ?? widget.order).paymentMethod,
            orderDate: (_currentOrder ?? widget.order).orderDate,
            deliveryDate: (_currentOrder ?? widget.order).deliveryDate,
            shippingAddress: (_currentOrder ?? widget.order).shippingAddress,
            trackingNumber: (_currentOrder ?? widget.order).trackingNumber,
            statusHistory: [
              ...(_currentOrder ?? widget.order).statusHistory,
              '${DateTime.now().toString().substring(0, 16)}: Order ${action}led by customer'
            ],
            notes: (_currentOrder ?? widget.order).notes,
            refundDetails: RefundDetails.fromJson(formData['refund_details']),
            idempotencyToken: formData['idempotency_token'],
          );
        });
        
        // Show success message
        _showSuccessAcknowledgement(action, formData);
        
        // Notify SalesIQ
        await _notifySalesIQ(action, formData);
        
      } else {
        throw Exception('Failed to process ${action} request');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
  
  void _showSuccessAcknowledgement(String action, Map<String, dynamic> formData) {
    final isCancel = action == 'cancel';
    final refundDetails = RefundDetails.fromJson(formData['refund_details']);
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            Icon(
              Icons.check_circle,
              color: Colors.green,
              size: 28,
            ),
            SizedBox(width: 12),
            Text(isCancel ? 'Order Cancelled' : 'Order Returned'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isCancel 
                ? 'Order cancelled successfully!' 
                : 'Order returned successfully!',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
              ),
            ),
            SizedBox(height: 16),
            Container(
              padding: EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Refund Details',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
                  SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Refund Amount:'),
                      Text(
                        '₹${refundDetails.refundableAmount.toStringAsFixed(2)}',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Colors.green,
                        ),
                      ),
                    ],
                  ),
                  SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Refund Method:'),
                      Text(_getRefundMethodLabel(refundDetails.refundMethod)),
                    ],
                  ),
                  if (refundDetails.refundReference != null) ...[
                    SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Reference:'),
                        Text(refundDetails.refundReference!),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Navigate back to orders list
              Navigator.pop(context);
            },
            child: Text('Back to Orders'),
          ),
        ],
      ),
    );
  }
  
  Future<void> _notifySalesIQ(String action, Map<String, dynamic> formData) async {
    try {
      final customerEmail = (_currentOrder ?? widget.order).customerEmail;
      final orderId = (_currentOrder ?? widget.order).id;
      
      // Track the cancel/return action for SalesIQ timeline
      await CustomerTimelineService.trackCustomerActivity(
        customerEmail,
        action == 'cancel' ? 'Order Cancelled' : 'Order Returned',
        'Order $orderId ${action}led by customer. Reason: ${formData['reason']}',
      );
      
      // Send notification to SalesIQ operators
      await ECommerceService.notifySalesIQOperator(
        customerEmail: customerEmail,
        orderId: orderId,
        action: action,
        reason: formData['reason'],
      );
      
    } catch (e) {
      print('Error notifying SalesIQ: $e');
    }
  }
  
  String _getRefundMethodLabel(RefundMethod method) {
    switch (method) {
      case RefundMethod.original_payment:
        return 'Original Payment';
      case RefundMethod.store_credit:
        return 'Store Credit';
      case RefundMethod.bank_transfer:
        return 'Bank Transfer';
    }
  }
}
