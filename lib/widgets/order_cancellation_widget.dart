// 🎨 PRODUCTION-READY ORDER CANCELLATION UI WIDGET
// File: lib/widgets/order_cancellation_widget.dart
//
// This widget provides a complete UI for order cancellation:
// 1. Order selection list
// 2. Cancellation form
// 3. Success/error feedback

import 'package:flutter/material.dart';
import '../services/order_cancellation_service.dart';

class OrderCancellationWidget extends StatefulWidget {
  final String customerEmail;
  final Function(String message)? onSuccess;
  final Function(String error)? onError;
  
  const OrderCancellationWidget({
    Key? key,
    required this.customerEmail,
    this.onSuccess,
    this.onError,
  }) : super(key: key);
  
  @override
  _OrderCancellationWidgetState createState() => _OrderCancellationWidgetState();
}

class _OrderCancellationWidgetState extends State<OrderCancellationWidget> {
  List<CancellableOrder> _orders = [];
  CancellableOrder? _selectedOrder;
  bool _isLoading = false;
  bool _showForm = false;
  
  // Form controllers
  final TextEditingController _reasonController = TextEditingController();
  String _refundMethod = 'original_payment';
  final TextEditingController _bankDetailsController = TextEditingController();
  
  @override
  void initState() {
    super.initState();
    _loadOrders();
  }
  
  @override
  void dispose() {
    _reasonController.dispose();
    _bankDetailsController.dispose();
    super.dispose();
  }
  
  // ✅ LOAD CANCELLABLE ORDERS
  Future<void> _loadOrders() async {
    setState(() {
      _isLoading = true;
    });
    
    try {
      final orders = await OrderCancellationService.fetchCancellableOrders(
        widget.customerEmail,
      );
      
      setState(() {
        _orders = orders;
        _isLoading = false;
      });
      
      if (orders.isEmpty) {
        widget.onError?.call('No cancellable orders found');
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      widget.onError?.call('Failed to load orders: $e');
    }
  }
  
  // ✅ SELECT ORDER AND SHOW FORM
  void _selectOrder(CancellableOrder order) {
    setState(() {
      _selectedOrder = order;
      _showForm = true;
    });
  }
  
  // ✅ SUBMIT CANCELLATION
  Future<void> _submitCancellation() async {
    if (_selectedOrder == null) return;
    
    // Validate
    if (_reasonController.text.trim().isEmpty) {
      widget.onError?.call('Please provide a cancellation reason');
      return;
    }
    
    if (_refundMethod == 'bank_transfer' && _bankDetailsController.text.trim().isEmpty) {
      widget.onError?.call('Please provide bank account details');
      return;
    }
    
    setState(() {
      _isLoading = true;
    });
    
    try {
      final response = await OrderCancellationService.submitCancellation(
        orderId: _selectedOrder!.id,
        customerEmail: widget.customerEmail,
        cancellationReason: _reasonController.text.trim(),
        refundMethod: _refundMethod,
        bankDetails: _refundMethod == 'bank_transfer' 
            ? _bankDetailsController.text.trim() 
            : null,
      );
      
      setState(() {
        _isLoading = false;
      });
      
      if (response.success) {
        widget.onSuccess?.call(response.message);
        
        // Notify SalesIQ chat
        await OrderCancellationService.notifySalesIQChat(
          orderId: _selectedOrder!.id,
          message: '✅ Order ${_selectedOrder!.id} cancelled successfully!',
        );
        
        // Reset form
        setState(() {
          _showForm = false;
          _selectedOrder = null;
          _reasonController.clear();
          _bankDetailsController.clear();
        });
        
        // Reload orders
        _loadOrders();
      } else {
        widget.onError?.call(response.message);
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      widget.onError?.call('Error: $e');
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Center(
        child: CircularProgressIndicator(),
      );
    }
    
    if (_showForm && _selectedOrder != null) {
      return _buildCancellationForm();
    }
    
    return _buildOrderList();
  }
  
  // 📋 BUILD ORDER LIST
  Widget _buildOrderList() {
    if (_orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No cancellable orders found',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Orders can only be cancelled if they are in\n"Confirmed" or "Processing" status',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      );
    }
    
    return ListView.builder(
      itemCount: _orders.length,
      itemBuilder: (context, index) {
        final order = _orders[index];
        return Card(
          margin: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: ListTile(
            leading: Icon(Icons.shopping_bag, color: Colors.orange),
            title: Text(
              'Order ${order.id}',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(height: 4),
                Text(order.productName),
                SizedBox(height: 4),
                Text(
                  '₹${order.totalAmount.toStringAsFixed(2)}',
                  style: TextStyle(
                    color: Colors.green,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            trailing: Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () => _selectOrder(order),
          ),
        );
      },
    );
  }
  
  // 📝 BUILD CANCELLATION FORM
  Widget _buildCancellationForm() {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              IconButton(
                icon: Icon(Icons.arrow_back),
                onPressed: () {
                  setState(() {
                    _showForm = false;
                    _selectedOrder = null;
                  });
                },
              ),
              Text(
                'Cancel Order',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          SizedBox(height: 16),
          
          // Order Details (Readonly)
          Card(
            color: Colors.grey[100],
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildReadonlyField('Order ID', _selectedOrder!.id),
                  SizedBox(height: 8),
                  _buildReadonlyField('Product', _selectedOrder!.productName),
                  SizedBox(height: 8),
                  _buildReadonlyField(
                    'Order Amount',
                    '₹${_selectedOrder!.totalAmount.toStringAsFixed(2)}',
                  ),
                ],
              ),
            ),
          ),
          SizedBox(height: 24),
          
          // Cancellation Reason
          Text(
            'Reason for Cancellation *',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 8),
          TextField(
            controller: _reasonController,
            maxLines: 4,
            maxLength: 500,
            decoration: InputDecoration(
              hintText: 'Please tell us why you want to cancel this order...',
              border: OutlineInputBorder(),
            ),
          ),
          SizedBox(height: 24),
          
          // Refund Method
          Text(
            'Refund Method *',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _refundMethod,
            decoration: InputDecoration(
              border: OutlineInputBorder(),
            ),
            items: [
              DropdownMenuItem(
                value: 'original_payment',
                child: Text('Original Payment Method'),
              ),
              DropdownMenuItem(
                value: 'wallet',
                child: Text('Wallet Credit'),
              ),
              DropdownMenuItem(
                value: 'store_credit',
                child: Text('Store Credit'),
              ),
              DropdownMenuItem(
                value: 'bank_transfer',
                child: Text('Bank Transfer'),
              ),
            ],
            onChanged: (value) {
              setState(() {
                _refundMethod = value!;
              });
            },
          ),
          SizedBox(height: 24),
          
          // Bank Details (Conditional)
          if (_refundMethod == 'bank_transfer') ...[
            Text(
              'Bank Account Details *',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            TextField(
              controller: _bankDetailsController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Account Number, IFSC Code, Account Holder Name',
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(height: 24),
          ],
          
          // Submit Button
          SizedBox(
            width: double.infinity,
            height: 50,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _submitCancellation,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
              ),
              child: _isLoading
                  ? CircularProgressIndicator(color: Colors.white)
                  : Text(
                      'Submit Cancellation Request',
                      style: TextStyle(fontSize: 16),
                    ),
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildReadonlyField(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 120,
          child: Text(
            '$label:',
            style: TextStyle(fontWeight: FontWeight.w500),
          ),
        ),
        Expanded(
          child: Text(value),
        ),
      ],
    );
  }
}
