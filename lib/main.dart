import 'dart:async';
import 'dart:io' as io;
import 'package:flutter/material.dart';
import 'package:salesiq_mobilisten/salesiq_mobilisten.dart';
import 'package:salesiq_customer_widget/salesiq_customer_widget.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'firebase_options.dart';
import 'services/customer_timeline_service.dart';
import 'services/ecommerce_customer_service.dart';
import 'screens/login_screen.dart';
import 'screens/order_details_screen.dart';
import 'models/order.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  print("Handling a background message: ${message.messageId}");
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  
  // Set up background message handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  
  runApp(MyApp());
}

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  @override
  void initState() {
    super.initState();
    initPlatformState();
    _initializeServices();
  }

  Future<void> _initializeServices() async {
    try {
      // Wait a bit to ensure Firebase is fully initialized
      await Future.delayed(Duration(milliseconds: 500));
      
      // Initialize your SalesIQ Customer Widget package
      await _initializeSalesIQCustomerWidget();
      
      // Initialize SalesIQ after Firebase is ready
      await initMobilisten();
      await setupPushNotifications();
    } catch (e) {
      print("Service initialization error: $e");
    }
  }

  Future<void> _initializeSalesIQCustomerWidget() async {
    try {
      // Initialize your published package with your webhook URL
      await SalesIQCustomerService.initialize(
        SalesIQConfig.production(
          webhookUrl: 'https://webhook-nine-rust.vercel.app',
          salesiqAppKey: 't1OeQIU%2FmlrpMxqTO39iHaNPA0sI%2BHQ5AizEotzng3Wwtr%2BIsn9ZOK3%2B0ClJaj9X_in',
          salesiqAccessKey: 'VXYedrQX8SnJRvzO%2FuvqFQjlbXi6YSbBo5L%2BVmToUTRNngPRgRjQqbwuU8T0jVeq%2FZYBNOatAgBBvd07aqZoqLAU%2F2ZD3bgmOwWB9jE6YMDrVyEdG%2BORHA%3D%3D',
        ),
      );
      
      print("✅ SalesIQ Customer Widget initialized successfully!");
    } catch (e) {
      print("❌ SalesIQ Customer Widget initialization error: $e");
    }
  }

  Future<void> initMobilisten() async {
    if (io.Platform.isIOS || io.Platform.isAndroid) {
      try {
        // For Android, initialization is done in MyApplication.kt
        // For iOS, we still need to initialize here
        if (io.Platform.isIOS) {
          await ZohoSalesIQ.init(
            't1OeQIU%2FmlrpMxqTO39iHaNPA0sI%2BHQ5AizEotzng3Wwtr%2BIsn9ZOK3%2B0ClJaj9X_in',
            'VXYedrQX8SnJRvzO%2FuvqFQjlbXi6YSbBo5L%2BVmToUTRNngPRgRjQqbwuU8T0jVeq%2FZYBNOatAgBBvd07aqZoqLAU%2F2ZD3bgmOwWB9jE6YMDrVyEdG%2BORHA%3D%3D'
          );
          ZohoSalesIQ.setThemeColorForiOS("#6d85fc");
        }
        ZohoSalesIQ.launcher.show(VisibilityMode.always);
      } catch (e) {
        print("Mobilisten setup error: $e");
      }
    }
  }

  Future<void> setupPushNotifications() async {
    final FirebaseMessaging messaging = FirebaseMessaging.instance;

    // Request permission for iOS
    if (io.Platform.isIOS) {
      NotificationSettings settings = await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );
      print('User granted permission: ${settings.authorizationStatus}');
    }

    // Get FCM token
    String? token = await messaging.getToken();
    if (token != null) {
      print("FCM Token: $token");
      // Note: Push notification registration is handled in native code
      // For Android: MyFirebaseMessagingService.onNewToken() calls MobilistenPlugin.enablePush()
      // For iOS: Handle in AppDelegate.swift with registerForRemoteNotifications
    }

    // Listen for token refresh
    messaging.onTokenRefresh.listen((newToken) {
      print("FCM Token refreshed: $newToken");
      // Token refresh is also handled in native code
    });

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('Got a message whilst in the foreground!');
      print('Message data: ${message.data}');

      // The native services handle notification display
      // Just log for debugging purposes
      if (message.notification != null) {
        print('Message also contained a notification: ${message.notification}');
      }
    });

    // Handle when user taps on notification
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('A new onMessageOpenedApp event was published!');
      print('Notification clicked: ${message.data}');
    });

    // Check if app was opened from a terminated state via notification
    RemoteMessage? initialMessage = await messaging.getInitialMessage();
    if (initialMessage != null) {
      print('App opened from terminated state via notification');
      print('Initial message data: ${initialMessage.data}');
    }
  }

  Future<void> initPlatformState() async {
    if (!mounted) return;
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '🛍️ E-Commerce with Smart SalesIQ',
      home: LoginScreen(),
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.blue,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      routes: {
        '/order-details': (context) {
          final order = ModalRoute.of(context)!.settings.arguments;
          return OrderDetailsScreen(order: order as Order);
        },
      },
    );
  }
}

class MobilistenDemoScreen extends StatelessWidget {
  final TextEditingController _visitorIdController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final buttonStyle = ElevatedButton.styleFrom(
      backgroundColor: Colors.blue,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(50)),
      padding: EdgeInsets.symmetric(vertical: 16),
      textStyle: TextStyle(fontSize: 16),
    );
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.blue,
        title: Text('Mobilisten Demo'),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Image.asset('assets/images/mobilisten_sdk.png',
                  height: 120),
            ),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: () async {
                // Track chat interaction for timeline
                await CustomerTimelineService.trackChatInteraction('demo@example.com', 5);
                ZohoSalesIQ.present();
              },
              style: buttonStyle,
              child: Center(child: Text("🏆 Open Smart Timeline Chat")),
            ),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: () async {
                // Demo: Set customer info using your package
                await ECommerceCustomerService.instance.setCustomerInfo(
                  email: 'customer@example.com',
                  name: 'Flutter Customer',
                  phone: '+1234567890',
                );
                
                // Demo: Track a sample order
                await ECommerceCustomerService.instance.trackOrder(
                  orderId: 'ORD${DateTime.now().millisecondsSinceEpoch}',
                  customerName: 'Flutter Customer',
                  customerEmail: 'customer@example.com',
                  items: [
                    ECommerceOrderItem.create(
                      productName: 'iPhone 15 Pro',
                      price: 999.99,
                      quantity: 1,
                    ),
                    ECommerceOrderItem.create(
                      productName: 'AirPods Pro',
                      price: 249.99,
                      quantity: 1,
                    ),
                  ],
                  totalAmount: 1249.98,
                  status: 'confirmed',
                  paymentStatus: 'paid',
                  paymentMethod: 'Credit Card',
                  trackingNumber: 'TRK${DateTime.now().millisecondsSinceEpoch}',
                  shippingAddress: '123 Main Street, City, State 12345',
                );
                
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text("✅ Customer data tracked! Open SalesIQ to see.")),
                );
              },
              style: buttonStyle.copyWith(
                backgroundColor: WidgetStateProperty.all(Colors.green),
              ),
              child: Center(child: Text("🛍️ Demo: Track Customer Order")),
            ),
            SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Custom launchers:", style: TextStyle(fontSize: 16)),
                Row(
                  children: [
                    FloatingActionButton.extended(
                      heroTag: "chat",
                      backgroundColor: Colors.blue,
                      onPressed: () {
                        ZohoSalesIQ.chat.start("Hello");
                      },
                      label: Icon(Icons.message_rounded),
                    ),
                    SizedBox(width: 12),
                  ],
                )
              ],
            ),
            SizedBox(height: 16),
            ToggleRow(
                label: "Launcher visibility :",
                option1: "Show",
                option2: "Hide",
                onOptionSelected: (String option) {
                  if (option == "Show") {
                    ZohoSalesIQ.launcher.show(VisibilityMode.always);
                  } else {
                    ZohoSalesIQ.launcher.show(VisibilityMode.never);
                  }
                }),
            SizedBox(height: 16),
            ToggleRow(
                label: "Launcher position :",
                option1: "Floating",
                option2: "Static",
                onOptionSelected: (String option) {
                  LauncherProperties launcherProperties;
                  if (option == "Floating") {
                    launcherProperties =
                        LauncherProperties(LauncherMode.floating);
                  } else {
                    launcherProperties =
                        LauncherProperties(LauncherMode.static);
                  }
                  ZohoSalesIQ.setLauncherPropertiesForAndroid(
                      launcherProperties);
                }),
            Divider(height: 32),
            TextField(
              maxLength: 100,
              decoration: InputDecoration(
                border: OutlineInputBorder(),
                hintText: "Enter visitor's unique ID",
              ),
              controller: _visitorIdController,
            ),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      ZohoSalesIQ.registerVisitor(_visitorIdController.text)
                          .then((value) => {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text("Visitor registered"),
                                  ),
                                )
                              })
                          .catchError((error) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text("Error registering visitor: $error"),
                          ),
                        );
                      });
                    },
                    style: buttonStyle,
                    child: Text("Login"),
                  ),
                ),
                SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      ZohoSalesIQ.unregisterVisitor();
                    },
                    style: buttonStyle,
                    child: Text("Logout"),
                  ),
                ),
              ],
            ),
            SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {},
              style: buttonStyle,
              child: Center(child: Text("Set visitor details")),
            ),
            SizedBox(height: 24),
            Text("Support language :", style: TextStyle(fontSize: 16)),
            SizedBox(height: 8),
            Row(
              children: [
                _langButton("en"),
                _langDivider(),
                _langButton("fr"),
                _langDivider(),
                _langButton("ar"),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _langButton(String lang) {
    return TextButton(
        onPressed: () {
          ZohoSalesIQ.setLanguage(lang);
        },
        child: Text(lang.toUpperCase(), style: TextStyle(color: Colors.blue)));
  }

  Widget _langDivider() {
    return Text("|", style: TextStyle(color: Colors.grey));
  }
}

class ToggleRow extends StatefulWidget {
  final String label;
  final String option1;
  final String option2;
  final Function(String) onOptionSelected;

  const ToggleRow({
    required this.label,
    required this.option1,
    required this.option2,
    required this.onOptionSelected,
    Key? key,
  }) : super(key: key);

  @override
  _ToggleRowState createState() => _ToggleRowState(onOptionSelected);
}

class _ToggleRowState extends State<ToggleRow> {
  bool isFirstSelected = true;
  final Function(String) onOptionSelected;

  _ToggleRowState(this.onOptionSelected);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(widget.label, style: TextStyle(fontSize: 16)),
        Container(
          height: 36,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              GestureDetector(
                onTap: () {
                  setState(() {
                    isFirstSelected = true;
                    onOptionSelected.call(widget.option1);
                  });
                },
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: isFirstSelected ? Colors.blue : Colors.transparent,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(8),
                      bottomLeft: Radius.circular(8),
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    widget.option1,
                    style: TextStyle(
                      color: isFirstSelected ? Colors.white : Colors.black,
                    ),
                  ),
                ),
              ),
              GestureDetector(
                onTap: () {
                  setState(() {
                    isFirstSelected = false;
                    onOptionSelected.call(widget.option2);
                  });
                },
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: !isFirstSelected ? Colors.blue : Colors.transparent,
                    borderRadius: BorderRadius.only(
                      topRight: Radius.circular(8),
                      bottomRight: Radius.circular(8),
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    widget.option2,
                    style: TextStyle(
                      color: !isFirstSelected ? Colors.white : Colors.black,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}