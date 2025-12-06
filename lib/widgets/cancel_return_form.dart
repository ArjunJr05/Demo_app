// 📝 Cancel/Return Form Modal Widget
import 'package:flutter/material.dart';
import '../models/order.dart';

class CancelReturnForm extends StatefulWidget {
  final Order order;
  final String action; // 'cancel' or 'return'
  final Function(Map<String, dynamic>) onSubmit;

  const CancelReturnForm({
    Key? key,
    required this.order,
    required this.action,
    required this.onSubmit,
  }) : super(key: key);

  @override
  _CancelReturnFormState createState() => _CancelReturnFormState();
}

class _CancelReturnFormState extends State<CancelReturnForm> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  final _accountReferenceController = TextEditingController();
  
  DateTime _selectedDate = DateTime.now();
  RefundMethod _selectedRefundMethod = RefundMethod.original_payment;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _reasonController.dispose();
    _accountReferenceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isCancel = widget.action == 'cancel';
    final title = isCancel ? 'Cancel Order' : 'Return Order';
    final actionColor = isCancel ? Colors.orange : Colors.blue;

    return Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: SingleChildScrollView(
        padding: EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.black87,
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: Icon(Icons.close, color: Colors.grey.shade600),
                  ),
                ],
              ),
              
              SizedBox(height: 8),
              Text(
                'Order #${widget.order.id}',
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 14,
                ),
              ),
              
              SizedBox(height: 24),
              
              // Date Field
              Text(
                'Date',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                  color: Colors.black87,
                ),
              ),
              SizedBox(height: 8),
              InkWell(
                onTap: _selectDate,
                child: Container(
                  padding: EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.calendar_today, color: actionColor),
                      SizedBox(width: 12),
                      Text(
                        '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
                        style: TextStyle(fontSize: 16),
                      ),
                    ],
                  ),
                ),
              ),
              
              SizedBox(height: 20),
              
              // Reason Field
              Text(
                'Reason *',
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                  color: Colors.black87,
                ),
              ),
              SizedBox(height: 8),
              TextFormField(
                controller: _reasonController,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: isCancel 
                    ? 'Please provide a reason for cancellation...'
                    : 'Please provide a reason for return...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: actionColor, width: 2),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please provide a reason';
                  }
                  return null;
                },
              ),
              
              SizedBox(height: 20),
              
              // Refund Details Section
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
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                        color: Colors.black87,
                      ),
                    ),
                    SizedBox(height: 12),
                    
                    // Refundable Amount
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Refundable Amount:',
                          style: TextStyle(color: Colors.grey.shade700),
                        ),
                        Text(
                          '₹${widget.order.totalAmount.toStringAsFixed(2)}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: Colors.green,
                          ),
                        ),
                      ],
                    ),
                    
                    SizedBox(height: 16),
                    
                    // Refund Method
                    Text(
                      'Refund Method *',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                        color: Colors.black87,
                      ),
                    ),
                    SizedBox(height: 8),
                    
                    ...RefundMethod.values.map((method) => RadioListTile<RefundMethod>(
                      title: Text(_getRefundMethodLabel(method)),
                      subtitle: Text(_getRefundMethodDescription(method)),
                      value: method,
                      groupValue: _selectedRefundMethod,
                      onChanged: (value) {
                        setState(() {
                          _selectedRefundMethod = value!;
                        });
                      },
                      activeColor: actionColor,
                      contentPadding: EdgeInsets.zero,
                    )),
                    
                    // Account Reference (only for bank transfer)
                    if (_selectedRefundMethod == RefundMethod.bank_transfer) ...[
                      SizedBox(height: 16),
                      Text(
                        'Account Reference (Optional)',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 14,
                          color: Colors.black87,
                        ),
                      ),
                      SizedBox(height: 8),
                      TextFormField(
                        controller: _accountReferenceController,
                        decoration: InputDecoration(
                          hintText: 'Enter account reference or notes',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                            borderSide: BorderSide(color: actionColor, width: 2),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              
              SizedBox(height: 32),
              
              // Submit Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitForm,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: actionColor,
                    foregroundColor: Colors.white,
                    padding: EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: _isSubmitting
                    ? Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          ),
                          SizedBox(width: 12),
                          Text('Processing...'),
                        ],
                      )
                    : Text(
                        isCancel ? 'Cancel Order' : 'Return Order',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                ),
              ),
              
              SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _selectDate() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now().subtract(Duration(days: 30)),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: widget.action == 'cancel' ? Colors.orange : Colors.blue,
            ),
          ),
          child: child!,
        );
      },
    );
    
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  String _getRefundMethodLabel(RefundMethod method) {
    switch (method) {
      case RefundMethod.original_payment:
        return 'Original Payment Method';
      case RefundMethod.store_credit:
        return 'Store Credit';
      case RefundMethod.bank_transfer:
        return 'Bank Transfer';
    }
  }

  String _getRefundMethodDescription(RefundMethod method) {
    switch (method) {
      case RefundMethod.original_payment:
        return 'Refund to the original payment method (3-5 business days)';
      case RefundMethod.store_credit:
        return 'Instant store credit for future purchases';
      case RefundMethod.bank_transfer:
        return 'Direct bank transfer (5-7 business days)';
    }
  }

  void _submitForm() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      final refundDetails = RefundDetails(
        refundableAmount: widget.order.totalAmount,
        refundMethod: _selectedRefundMethod,
        accountReference: _selectedRefundMethod == RefundMethod.bank_transfer 
          ? _accountReferenceController.text.trim().isNotEmpty 
            ? _accountReferenceController.text.trim() 
            : null
          : null,
      );

      final formData = {
        'order_id': widget.order.id,
        'user_id': widget.order.customerEmail,
        'action': widget.action,
        'date': _selectedDate.toIso8601String(),
        'reason': _reasonController.text.trim(),
        'refund_details': refundDetails.toJson(),
        'idempotency_token': 'token_${DateTime.now().millisecondsSinceEpoch}_${widget.order.id}',
      };

      await widget.onSubmit(formData);
      
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }
}
