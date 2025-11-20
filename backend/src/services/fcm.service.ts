/**
 * Firebase Cloud Messaging (FCM) Service
 * 
 * This service handles push notifications to mobile devices.
 * 
 * Setup Instructions:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Download service account JSON from Project Settings > Service Accounts
 * 3. Save the JSON file as firebase-service-account.json in the project root
 * 4. Set FIREBASE_SERVICE_ACCOUNT_PATH in .env
 * 
 * OR use the simpler HTTP v1 API:
 * 5. Get Server Key from Cloud Messaging settings
 * 6. Set FCM_SERVER_KEY in .env
 */

interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  image?: string;
}

/**
 * Send push notification using FCM HTTP v1 API
 * 
 * @param fcmToken - Device FCM registration token
 * @param payload - Notification payload
 * @returns Promise<boolean> - Success status
 * 
 * TODO: For production deployment:
 * 1. Uncomment the axios import and implementation below
 * 2. Add your FCM_SERVER_KEY to .env file
 * 3. Test with real device FCM tokens
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    // Check if FCM is configured
    if (!process.env.FCM_SERVER_KEY) {
      console.warn('⚠️  FCM_SERVER_KEY not configured. Push notification not sent.');
      console.log('📲 [MOCK] Push Notification:');
      console.log(`   To: ${fcmToken.substring(0, 20)}...`);
      console.log(`   Title: ${payload.title}`);
      console.log(`   Body: ${payload.body}`);
      return true; // Return true in development for testing
    }

    // TODO: Uncomment this section for production
    /*
    const axios = require('axios');
    
    const message = {
      to: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
        sound: 'default',
        ...(payload.image && { image: payload.image }),
      },
      data: payload.data || {},
      priority: 'high',
    };

    const response = await axios.post(
      'https://fcm.googleapis.com/fcm/send',
      message,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${process.env.FCM_SERVER_KEY}`,
        },
      }
    );

    if (response.data.success === 1) {
      console.log(`✅ Push notification sent successfully to ${fcmToken.substring(0, 20)}...`);
      return true;
    } else {
      console.error('❌ FCM send failed:', response.data);
      return false;
    }
    */

    // Development mock - remove this when implementing real FCM
    console.log('\n📲 PUSH NOTIFICATION (Mock)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Title: ${payload.title}`);
    console.log(`Body: ${payload.body}`);
    console.log(`Token: ${fcmToken.substring(0, 30)}...`);
    if (payload.data) {
      console.log(`Data: ${JSON.stringify(payload.data)}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return true;
  } catch (error) {
    console.error('Push notification error:', error);
    return false;
  }
}

/**
 * Send vehicle ready notification
 */
export async function sendVehicleReadyNotification(
  fcmToken: string,
  vehicleNumber: string,
  amount: number
): Promise<boolean> {
  return await sendPushNotification(fcmToken, {
    title: '🚗 Vehicle Ready for Pickup!',
    body: `Your vehicle ${vehicleNumber} is ready. Amount: ₹${amount}`,
    data: {
      type: 'VEHICLE_READY',
      vehicleNumber,
      amount: amount.toString(),
    },
  });
}

/**
 * Send vehicle received notification
 */
export async function sendVehicleReceivedNotification(
  fcmToken: string,
  vehicleNumber: string
): Promise<boolean> {
  return await sendPushNotification(fcmToken, {
    title: '✅ Vehicle Received',
    body: `We have received your vehicle ${vehicleNumber}. Washing will begin shortly.`,
    data: {
      type: 'VEHICLE_RECEIVED',
      vehicleNumber,
    },
  });
}

/**
 * Send payment reminder notification
 */
export async function sendPaymentReminderNotification(
  fcmToken: string,
  vehicleNumber: string,
  amount: number
): Promise<boolean> {
  return await sendPushNotification(fcmToken, {
    title: '💳 Payment Pending',
    body: `Payment of ₹${amount} is pending for ${vehicleNumber}. Please complete payment.`,
    data: {
      type: 'PAYMENT_REMINDER',
      vehicleNumber,
      amount: amount.toString(),
    },
  });
}

/**
 * Send bulk notifications to multiple tokens
 */
export async function sendBulkNotifications(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(
    tokens.map((token) => sendPushNotification(token, payload))
  );

  const success = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - success;

  console.log(`📊 Bulk notification results: ${success} success, ${failed} failed`);

  return { success, failed };
}

/**
 * Validate FCM token format
 */
export function isValidFcmToken(token: string): boolean {
  // FCM tokens are typically 152-163 characters long
  return !!token && token.length >= 140 && token.length <= 200;
}
