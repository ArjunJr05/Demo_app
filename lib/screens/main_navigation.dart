import 'package:flutter/material.dart';
import 'package:salesiq_mobilisten/salesiq_mobilisten.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../services/customer_timeline_service.dart';
import '../services/firestore_service.dart';
import '../models/order.dart';
import 'ecommerce_home_screen.dart';
import 'favorites_screen.dart';

class MainNavigation extends StatefulWidget {
  final String customerEmail;
  final String customerName;

  const MainNavigation({
    Key? key,
    required this.customerEmail,
    required this.customerName,
  }) : super(key: key);

  @override
  _MainNavigationState createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;
  late List<Widget> _screens;

  @override
  void initState() {
    super.initState();
    _screens = [
      ECommerceHomeScreen(
        customerEmail: widget.customerEmail,
        customerName: widget.customerName,
      ),
      FavoritesScreen(),
      MyOrdersScreen(
        customerEmail: widget.customerEmail,
        orders: [],
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 10,
              offset: Offset(0, -5),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(
                  icon: Icons.home_rounded,
                  label: 'Home',
                  index: 0,
                ),
                _buildNavItem(
                  icon: Icons.favorite_rounded,
                  label: 'Favorites',
                  index: 1,
                ),
                _buildNavItem(
                  icon: Icons.receipt_long_rounded,
                  label: 'Orders',
                  index: 2,
                ),
                _buildNavItem(
                  icon: Icons.chat_bubble_rounded,
                  label: 'Support',
                  index: 3,
                  onTap: () async {
                    await CustomerTimelineService.trackChatInteraction(
                      widget.customerEmail,
                      0,
                    );
                    ZohoSalesIQ.present();
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required IconData icon,
    required String label,
    required int index,
    VoidCallback? onTap,
  }) {
    final isSelected = _currentIndex == index && onTap == null;

    return GestureDetector(
      onTap: () {
        if (onTap != null) {
          onTap();
        } else {
          setState(() {
            _currentIndex = index;
          });
        }
      },
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? Color(0xFF667eea).withOpacity(0.1)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? Color(0xFF667eea) : Colors.grey.shade600,
              size: 24,
            ),
            SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                color: isSelected ? Color(0xFF667eea) : Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
