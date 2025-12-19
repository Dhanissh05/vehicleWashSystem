/**
 * Firebase Cloud Messaging (FCM) Service
 * 
 * This service handles push notifications to mobile devices using Firebase Admin SDK.
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  image?: string;
}

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
    const serviceAccount = require(path.resolve(serviceAccountPath));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || 'vehiclewash-system',
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    console.warn('⚠️  Push notifications will not work until Firebase is configured');
  }
}

/**
 * Send push notification using Firebase Admin SDK
 * 
 * @param fcmToken - Device FCM registration token
 * @param payload - Notification payload
 * @returns Promise<boolean> - Success status
 */
export async function sendPushNotification(
  fcmToken: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    // Initialize Firebase if not already done
    if (!firebaseInitialized) {
      initializeFirebase();
    }

    // If Firebase is not configured, log mock notification
    if (!firebaseInitialized) {
      console.log('\n📲 PUSH NOTIFICATION (Mock - Firebase not configured)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Title: ${payload.title}`);
      console.log(`Body: ${payload.body}`);
      console.log(`Token: ${fcmToken.substring(0, 30)}...`);
      if (payload.data) {
        console.log(`Data: ${JSON.stringify(payload.data)}`);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return true;
    }

    // Send actual push notification via Firebase
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.image && { imageUrl: payload.image }),
      },
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Push notification sent successfully: ${response}`);
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
