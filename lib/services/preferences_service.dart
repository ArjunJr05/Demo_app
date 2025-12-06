import 'package:shared_preferences/shared_preferences.dart';

class PreferencesService {
  static const String _keyIsLoggedIn = 'isLoggedIn';
  static const String _keyUserId = 'userId';
  static const String _keyUserEmail = 'userEmail';
  static const String _keyUserName = 'userName';

  // ==================== LOGIN STATE ====================

  /// Save login state
  static Future<void> saveLoginState({
    required String userId,
    required String email,
    required String name,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_keyIsLoggedIn, true);
      await prefs.setString(_keyUserId, userId);
      await prefs.setString(_keyUserEmail, email);
      await prefs.setString(_keyUserName, name);
      print('✅ Login state saved');
    } catch (e) {
      print('❌ Error saving login state: $e');
    }
  }

  /// Check if user is logged in
  static Future<bool> isLoggedIn() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getBool(_keyIsLoggedIn) ?? false;
    } catch (e) {
      print('❌ Error checking login state: $e');
      return false;
    }
  }

  /// Get saved user ID
  static Future<String?> getUserId() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_keyUserId);
    } catch (e) {
      print('❌ Error getting user ID: $e');
      return null;
    }
  }

  /// Get saved user email
  static Future<String?> getUserEmail() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_keyUserEmail);
    } catch (e) {
      print('❌ Error getting user email: $e');
      return null;
    }
  }

  /// Get saved user name
  static Future<String?> getUserName() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_keyUserName);
    } catch (e) {
      print('❌ Error getting user name: $e');
      return null;
    }
  }

  /// Get all saved user data
  static Future<Map<String, String?>> getSavedUserData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return {
        'userId': prefs.getString(_keyUserId),
        'email': prefs.getString(_keyUserEmail),
        'name': prefs.getString(_keyUserName),
      };
    } catch (e) {
      print('❌ Error getting saved user data: $e');
      return {};
    }
  }

  /// Clear login state (logout)
  static Future<void> clearLoginState() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_keyIsLoggedIn);
      await prefs.remove(_keyUserId);
      await prefs.remove(_keyUserEmail);
      await prefs.remove(_keyUserName);
      print('✅ Login state cleared');
    } catch (e) {
      print('❌ Error clearing login state: $e');
    }
  }

  /// Clear all preferences
  static Future<void> clearAll() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      print('✅ All preferences cleared');
    } catch (e) {
      print('❌ Error clearing preferences: $e');
    }
  }
}
