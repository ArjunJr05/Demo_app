package com.example.salesiq;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.zoho.salesiqembed.ZohoSalesIQ;
import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        
        if (remoteMessage.getData().size() > 0) {
            Map<String, String> data = remoteMessage.getData();
            
            // Handle SalesIQ notification
            ZohoSalesIQ.Notification.handle(this.getApplicationContext(), data);
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        
        // Register the token with Zoho SalesIQ
        // Pass true for testing, false for production
        ZohoSalesIQ.Notification.enablePush(token, true);
    }
}