// 🏆 Flutter Integration for Smart Customer Timeline Widget
// Connects your Flutter app with the SalesIQ webhook for 360° customer view

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class CustomerTimelineService {
  static const String _baseUrl = 'https://5fed36bc3505.ngrok-free.app'; // Update with your webhook URL
  static const String _timelineEndpoint = '/webhook';
  
  // 📱 FLUTTER APP ACTIVITY TRACKING
  
  /// Track user login activity
  static Future<void> trackLogin(String userEmail) async {
    await _trackActivity(userEmail, 'Login', 'User logged in via Flutter app');
  }
  
  /// Track profile updates
  static Future<void> trackProfileUpdate(String userEmail) async {
    await _trackActivity(userEmail, 'Profile Update', 'Updated profile information');
  }
  
  /// Track feature usage
  static Future<void> trackFeatureUsage(String userEmail, String feature, int durationMinutes) async {
    await _trackActivity(
      userEmail, 
      'Feature Usage', 
      'Used $feature for $durationMinutes minutes'
    );
  }
  
  /// Track chat interactions
  static Future<void> trackChatInteraction(String userEmail, int durationMinutes) async {
    await _trackActivity(
      userEmail, 
      'Chat Interaction', 
      'Used SalesIQ chat for $durationMinutes minutes'
    );
  }
  
  /// Track purchase attempts
  static Future<void> trackPurchaseAttempt(String userEmail, String productName, double amount) async {
    await _trackActivity(
      userEmail, 
      'Purchase Attempt', 
      'Attempted to purchase $productName for \$${amount.toStringAsFixed(2)}'
    );
  }
  
  /// Track app crashes or errors
  static Future<void> trackError(String userEmail, String errorType, String errorMessage) async {
    await _trackActivity(
      userEmail, 
      'Error Occurred', 
      'Error: $errorType - $errorMessage'
    );
  }
  
  /// Track custom customer activity (public method)
  static Future<void> trackCustomerActivity(String userEmail, String action, String details) async {
    await _trackActivity(userEmail, action, details);
  }
  
  // 🔄 SYNC WITH SALESIQ WEBHOOK
  
  /// Send activity data to the Smart Timeline Webhook
  static Future<void> _trackActivity(String userEmail, String action, String details) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final activities = prefs.getStringList('user_activities_$userEmail') ?? [];
      
      final activity = {
        'id': 'app_${DateTime.now().millisecondsSinceEpoch}',
        'date': DateTime.now().toIso8601String().split('T')[0],
        'time': DateTime.now().toIso8601String(),
        'action': action,
        'details': details,
        'platform': 'Flutter App',
        'type': 'app_activity',
        'userEmail': userEmail,
      };
      
      activities.add(jsonEncode(activity));
      
      // Keep only last 50 activities to prevent storage bloat
      if (activities.length > 50) {
        activities.removeRange(0, activities.length - 50);
      }
      
      await prefs.setStringList('user_activities_$userEmail', activities);
      
      // Also send to webhook if available
      await _sendToWebhook(activity);
      
      print('📱 Tracked activity: $action for $userEmail');
    } catch (e) {
      print('❌ Error tracking activity: $e');
    }
  }
  
  /// Send activity to the Smart Timeline Webhook
  static Future<void> _sendToWebhook(Map<String, dynamic> activity) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/api/flutter-activity'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode(activity),
      ).timeout(const Duration(seconds: 5));
      
      if (response.statusCode == 200) {
        print('✅ Activity sent to webhook successfully');
      }
    } catch (e) {
      print('⚠️ Could not send to webhook: $e');
      // Fail silently - local storage is the backup
    }
  }
  
  // 📊 GET USER TIMELINE DATA
  
  /// Get user's activity timeline from local storage
  static Future<List<Map<String, dynamic>>> getUserTimeline(String userEmail) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final activities = prefs.getStringList('user_activities_$userEmail') ?? [];
      
      return activities.map((activityJson) {
        return Map<String, dynamic>.from(jsonDecode(activityJson));
      }).toList()
        ..sort((a, b) => b['time'].compareTo(a['time'])); // Most recent first
    } catch (e) {
      print('❌ Error getting user timeline: $e');
      return [];
    }
  }
  
  /// Get user statistics
  static Future<Map<String, dynamic>> getUserStats(String userEmail) async {
    try {
      final timeline = await getUserTimeline(userEmail);
      
      final stats = {
        'totalActivities': timeline.length,
        'loginCount': timeline.where((a) => a['action'] == 'Login').length,
        'chatSessions': timeline.where((a) => a['action'] == 'Chat Interaction').length,
        'featureUsage': timeline.where((a) => a['action'] == 'Feature Usage').length,
        'lastActivity': timeline.isNotEmpty ? timeline.first['date'] : 'No activity',
        'memberSince': timeline.isNotEmpty ? timeline.last['date'] : 'Unknown',
      };
      
      return stats;
    } catch (e) {
      print('❌ Error getting user stats: $e');
      return {};
    }
  }
  
  // 🔗 SALESIQ INTEGRATION HELPERS
  
  /// Initialize SalesIQ with customer timeline context
  static Future<void> initializeSalesIQWithContext(String userEmail, String userName) async {
    try {
      final stats = await getUserStats(userEmail);
      final timeline = await getUserTimeline(userEmail);
      
      // This data will be available to the SalesIQ widget
      final contextData = {
        'email': userEmail,
        'name': userName,
        'app_stats': stats,
        'recent_activities': timeline.take(5).toList(),
        'integration_source': 'flutter_app'
      };
      
      // Store context for SalesIQ to access
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('salesiq_context_$userEmail', jsonEncode(contextData));
      
      print('✅ SalesIQ context initialized for $userName');
    } catch (e) {
      print('❌ Error initializing SalesIQ context: $e');
    }
  }
  
  /// Clear user data (for logout)
  static Future<void> clearUserData(String userEmail) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('user_activities_$userEmail');
      await prefs.remove('salesiq_context_$userEmail');
      
      print('🧹 Cleared data for $userEmail');
    } catch (e) {
      print('❌ Error clearing user data: $e');
    }
  }
}

// 📱 USAGE EXAMPLES:
/*

// Track user login
await CustomerTimelineService.trackLogin('user@example.com');

// Track feature usage
await CustomerTimelineService.trackFeatureUsage('user@example.com', 'Chat Feature', 15);

// Track profile update
await CustomerTimelineService.trackProfileUpdate('user@example.com');

// Initialize SalesIQ with context
await CustomerTimelineService.initializeSalesIQWithContext('user@example.com', 'John Doe');

// Get user timeline
final timeline = await CustomerTimelineService.getUserTimeline('user@example.com');

// Get user stats
final stats = await CustomerTimelineService.getUserStats('user@example.com');

*/
