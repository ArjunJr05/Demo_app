import 'package:flutter/material.dart';
import 'package:salesiq_mobilisten/salesiq_mobilisten.dart';
import 'dart:io' show Platform;

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SalesIQ Form Trigger Demo',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
      ),
      home: const SalesIQFormTriggerPage(),
    );
  }
}

class SalesIQFormTriggerPage extends StatefulWidget {
  const SalesIQFormTriggerPage({Key? key}) : super(key: key);

  @override
  State<SalesIQFormTriggerPage> createState() => _SalesIQFormTriggerPageState();
}

class _SalesIQFormTriggerPageState extends State<SalesIQFormTriggerPage> with WidgetsBindingObserver {
  bool _isSalesIQInitialized = false;
  bool _isVisitorDataSet = false;
  String _debugLog = '';
  
  // User data - replace with your actual user data
  final String _userName = 'Arjun Kumar';
  final String _userEmail = 'arjunfree256@gmail.com';
  final String _userPhone = '+919876543210';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeSalesIQ();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _addDebugLog('App lifecycle changed: $state');
    if (state == AppLifecycleState.resumed) {
      _addDebugLog('App resumed - SalesIQ should be active');
    }
  }

  void _addDebugLog(String message) {
    final timestamp = DateTime.now().toString().substring(11, 19);
    setState(() {
      _debugLog = '[$timestamp] $message\n$_debugLog';
    });
    print('🔍 SalesIQ Debug: $message');
  }

  Future<void> _initializeSalesIQ() async {
    try {
      _addDebugLog('Starting SalesIQ initialization...');

      // Step 1: Initialize SDK with your App and Access Keys
      // Replace with your actual keys from SalesIQ Settings → Brands → Installation
      const String appKey = 'YOUR_APP_KEY_HERE'; // e.g., 'siq123456789'
      const String accessKey = 'YOUR_ACCESS_KEY_HERE'; // e.g., 'abc123...'

      if (appKey == 'YOUR_APP_KEY_HERE' || accessKey == 'YOUR_ACCESS_KEY_HERE') {
        _addDebugLog('❌ ERROR: Please set your SalesIQ App Key and Access Key');
        return;
      }

      await ZohoSalesIQ.init(appKey, accessKey);
      _addDebugLog('✅ SalesIQ SDK initialized');

      // Step 2: Enable SDK
      await ZohoSalesIQ.enableInAppNotification();
      _addDebugLog('✅ In-app notifications enabled');

      // Step 3: Set launcher visibility (show chat icon)
      await ZohoSalesIQ.showLauncher(true);
      _addDebugLog('✅ Chat launcher visible');

      // Step 4: Register event listeners
      _registerSalesIQListeners();

      // Step 5: Set visitor information immediately
      await _setVisitorInformation();

      // Step 6: Track page for trigger
      ZohoSalesIQ.setPageTitle('APP_LAUNCH');
      _addDebugLog('✅ Page title APP_LAUNCH tracked');

      setState(() {
        _isSalesIQInitialized = true;
      });

      _addDebugLog('🎉 SalesIQ fully initialized and ready');

    } catch (e) {
      _addDebugLog('❌ SalesIQ initialization error: $e');
    }
  }

  void _registerSalesIQListeners() {
    _addDebugLog('Registering SalesIQ event listeners...');

    // Note: SalesIQ Flutter SDK v5.x uses platform channels for events
    // Event listeners are handled natively, not via Dart callbacks
    // We rely on native lifecycle events instead
    
    _addDebugLog('✅ Using native event handling');
  }

  Future<void> _setVisitorInformation() async {
    try {
      _addDebugLog('Setting visitor information...');

      // Set visitor name
      await ZohoSalesIQ.setVisitorName(_userName);
      _addDebugLog('✅ Visitor name set: $_userName');

      // Set visitor email
      await ZohoSalesIQ.setVisitorEmail(_userEmail);
      _addDebugLog('✅ Visitor email set: $_userEmail');

      // Set visitor contact number
      await ZohoSalesIQ.setVisitorContactNumber(_userPhone);
      _addDebugLog('✅ Visitor phone set: $_userPhone');

      // Set custom visitor info (additional fields)
      await ZohoSalesIQ.setVisitorAddInfo('User Type', 'Job Applicant');
      await ZohoSalesIQ.setVisitorAddInfo('Platform', Platform.isAndroid ? 'Android' : 'iOS');
      await ZohoSalesIQ.setVisitorAddInfo('App Version', '1.0.0');
      _addDebugLog('✅ Additional visitor info set');

      setState(() {
        _isVisitorDataSet = true;
      });

      _addDebugLog('🎉 All visitor information set successfully');

    } catch (e) {
      _addDebugLog('❌ Error setting visitor info: $e');
    }
  }

  Future<void> _openChatAndTriggerForm() async {
    if (!_isSalesIQInitialized) {
      _addDebugLog('⚠️ SalesIQ not initialized yet. Please wait...');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('SalesIQ is initializing, please wait...')),
      );
      return;
    }

    try {
      _addDebugLog('Opening SalesIQ chat...');

      // Step 1: Open chat
      ZohoSalesIQ.show();
      _addDebugLog('✅ Chat opened');

      // Step 2: Wait for chat to fully load
      await Future.delayed(const Duration(milliseconds: 1500));

      // Step 3: Send trigger message to activate bot
      // This message will be caught by your SalesIQ bot and trigger the form
      await _sendFormTriggerMessage();

      _addDebugLog('✅ Form trigger sequence completed');

    } catch (e) {
      _addDebugLog('❌ Error opening chat: $e');
    }
  }

  Future<void> _sendFormTriggerMessage() async {
    try {
      _addDebugLog('Sending form trigger message...');

      // Note: SalesIQ Flutter SDK doesn't support sending messages programmatically
      // Solution: Use page tracking to trigger bot
      
      // Set a unique page title that your bot will detect
      ZohoSalesIQ.setPageTitle('RESUME_FORM_TRIGGER');
      _addDebugLog('✅ Page title set to RESUME_FORM_TRIGGER');

      // Set a custom visitor variable that your bot can check
      await ZohoSalesIQ.setVisitorAddInfo('FormTrigger', 'RESUME_UPLOAD');
      _addDebugLog('✅ Visitor trigger variable set');

      _addDebugLog('💡 Bot should now detect trigger and show form');
      _addDebugLog('📝 Configure your SalesIQ bot to respond when:');
      _addDebugLog('   - Page Title = RESUME_FORM_TRIGGER');
      _addDebugLog('   - OR Visitor Info: FormTrigger = RESUME_UPLOAD');

    } catch (e) {
      _addDebugLog('❌ Error sending trigger: $e');
    }
  }

  Future<void> _openChatDirectly() async {
    if (!_isSalesIQInitialized) {
      _addDebugLog('⚠️ SalesIQ not initialized yet');
      return;
    }

    try {
      _addDebugLog('Opening chat directly (no trigger)...');
      ZohoSalesIQ.show();
      _addDebugLog('✅ Chat opened');
    } catch (e) {
      _addDebugLog('❌ Error: $e');
    }
  }

  void _clearDebugLog() {
    setState(() {
      _debugLog = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SalesIQ Form Trigger'),
        elevation: 2,
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Status Card
            Card(
              margin: const EdgeInsets.all(16),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          _isSalesIQInitialized ? Icons.check_circle : Icons.pending,
                          color: _isSalesIQInitialized ? Colors.green : Colors.orange,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'SalesIQ Status',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _isSalesIQInitialized ? 'Initialized ✅' : 'Initializing...',
                      style: TextStyle(
                        color: _isSalesIQInitialized ? Colors.green : Colors.orange,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _isVisitorDataSet ? 'Visitor Data Set ✅' : 'Setting visitor data...',
                      style: TextStyle(
                        color: _isVisitorDataSet ? Colors.green : Colors.orange,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Divider(),
                    const SizedBox(height: 8),
                    Text('User: $_userName', style: const TextStyle(fontSize: 12)),
                    Text('Email: $_userEmail', style: const TextStyle(fontSize: 12)),
                    Text('Phone: $_userPhone', style: const TextStyle(fontSize: 12)),
                  ],
                ),
              ),
            ),

            // Action Buttons
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _isSalesIQInitialized ? _openChatAndTriggerForm : null,
                      icon: const Icon(Icons.upload_file),
                      label: const Text('Open Chat & Trigger Resume Form'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _isSalesIQInitialized ? _openChatDirectly : null,
                      icon: const Icon(Icons.chat),
                      label: const Text('Open Chat (No Trigger)'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Debug Log Section
            Expanded(
              child: Card(
                margin: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Debug Log',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: _clearDebugLog,
                            tooltip: 'Clear log',
                          ),
                        ],
                      ),
                    ),
                    const Divider(height: 1),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(12),
                        child: Text(
                          _debugLog.isEmpty ? 'No logs yet...' : _debugLog,
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
