import 'package:flutter/material.dart';
import 'package:salesiq_mobilisten/salesiq_mobilisten.dart';


/// Wrapper screen for SalesIQ chat with image upload button
class SalesIQChatWithUpload extends StatefulWidget {
  final String customerEmail;
  final String? orderId;

  const SalesIQChatWithUpload({
    Key? key,
    required this.customerEmail,
    this.orderId,
  }) : super(key: key);

  @override
  State<SalesIQChatWithUpload> createState() => _SalesIQChatWithUploadState();
}

class _SalesIQChatWithUploadState extends State<SalesIQChatWithUpload> {
  @override
  void initState() {
    super.initState();
    // Open SalesIQ chat
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ZohoSalesIQ.present();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // SalesIQ chat will be shown as overlay
          Container(
            color: Colors.transparent,
          ),
          
          // Upload button overlay
          // SalesIQUploadButton(
          //   customerEmail: widget.customerEmail,
          //   orderId: widget.orderId,
          //   onUploadSuccess: (imageUrl) {
          //     print('✅ Image uploaded: $imageUrl');
          //     // Optionally send message to chat
          //     _sendImageUrlToChat(imageUrl);
          //   },
          // ),
        ],
      ),
    );
  }

  void _sendImageUrlToChat(String imageUrl) {
    // Show success message
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Image uploaded! URL: $imageUrl'),
        backgroundColor: Colors.green,
        duration: Duration(seconds: 3),
      ),
    );
  }
}
