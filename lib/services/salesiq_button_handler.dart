// 🤖 SalesIQ Automatic Button Handler Service
// File: lib/services/salesiq_button_handler.dart
// 
// This service uses webhook integration to send button containers
// from the SalesIQ bot side when users send messages.

import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';

class SalesIQButtonHandler {
  static SalesIQButtonHandler? _instance;
  static SalesIQButtonHandler get instance => _instance ??= SalesIQButtonHandler._();
  
  SalesIQButtonHandler._();

  bool _isInitialized = false;
  Timer? _debounceTimer;
  
  // Webhook configuration
  static const String _webhookUrl = 'https://nonchivalrous-paranoidly-cara.ngrok-free.dev'; // Update with your webhook URL
  
  String? _currentCustomerEmail;
  String? _currentChatId;

  /// Initialize the button handler
  Future<void> initialize() async {
    if (_isInitialized) {
      return;
    }

    try {
      _isInitialized = true;
    } catch (e) {
      // Silent fail - won't break app
    }
  }

  /// Set current customer context
  void setCustomerContext(String customerEmail, {String? chatId}) {
    _currentCustomerEmail = customerEmail;
    _currentChatId = chatId;
  }

  /// Trigger button container manually (call this when user sends a message)
  Future<void> triggerButtonContainer() async {
    // Cancel any pending debounce timer
    _debounceTimer?.cancel();

    // Debounce to avoid multiple triggers
    _debounceTimer = Timer(Duration(milliseconds: 500), () {
      _sendButtonContainer();
    });
  }

  /// Send button container via webhook
  Future<void> _sendButtonContainer() async {
    try {
      if (_currentCustomerEmail == null) {
        return;
      }

      // Send request to webhook to trigger bot message with buttons
      final response = await http.post(
        Uri.parse('$_webhookUrl/api/send-button-container'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'customer_email': _currentCustomerEmail,
          'chat_id': _currentChatId,
          'buttons': [
            {
              'id': 'cancel_order',
              'label': '❌ Cancel Order',
              'action': 'cancel'
            },
            {
              'id': 'return_order',
              'label': '↩️ Return Order',
              'action': 'return'
            }
          ],
          'message': '🔧 Quick Actions - How can I help you with your order?',
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        }),
      ).timeout(Duration(seconds: 5));

      if (response.statusCode == 200) {
        // Button container sent successfully via webhook
      }
    } catch (e) {
      // Silent fail - won't break user experience
    }
  }

  /// Handle button click from webhook callback
  Future<void> handleButtonClick(String buttonId, String action) async {
    try {
      switch (action) {
        case 'cancel':
          await _handleCancelOrder();
          break;
        case 'return':
          await _handleReturnOrder();
          break;
      }
    } catch (e) {
      // Silent fail
    }
  }

  /// Handle cancel order button click
  Future<void> _handleCancelOrder() async {
    try {
      // Send follow-up message via webhook
      await http.post(
        Uri.parse('$_webhookUrl/api/send-message'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'customer_email': _currentCustomerEmail,
          'message': 'Your request has been cancelled.',
          'type': 'bot_message',
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        }),
      ).timeout(Duration(seconds: 5));
    } catch (e) {
      // Silent fail
    }
  }

  /// Handle return order button click
  Future<void> _handleReturnOrder() async {
    try {
      // Send follow-up message via webhook
      await http.post(
        Uri.parse('$_webhookUrl/api/send-message'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'customer_email': _currentCustomerEmail,
          'message': 'You have been returned to the previous menu.',
          'type': 'bot_message',
          'timestamp': DateTime.now().millisecondsSinceEpoch,
        }),
      ).timeout(Duration(seconds: 5));
    } catch (e) {
      // Silent fail
    }
  }

  /// Reset session state
  void resetSession() {
    _currentCustomerEmail = null;
    _currentChatId = null;
    _debounceTimer?.cancel();
  }

  /// Dispose resources
  void dispose() {
    _debounceTimer?.cancel();
    _isInitialized = false;
  }
}

// Usage:
/*
// Set customer context when they login:
SalesIQButtonHandler.instance.setCustomerContext('customer@example.com');

// Trigger button container manually when needed:
await SalesIQButtonHandler.instance.triggerButtonContainer();

// Reset on logout:
SalesIQButtonHandler.instance.resetSession();
*/