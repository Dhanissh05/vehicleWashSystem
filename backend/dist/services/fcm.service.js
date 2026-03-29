"use strict";
/**
 * Firebase Cloud Messaging (FCM) Service
 *
 * This service handles push notifications to mobile devices using Firebase Admin SDK.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = sendPushNotification;
exports.sendVehicleReadyNotification = sendVehicleReadyNotification;
exports.sendVehicleReceivedNotification = sendVehicleReceivedNotification;
exports.sendPaymentReminderNotification = sendPaymentReminderNotification;
exports.sendBulkNotifications = sendBulkNotifications;
exports.isValidFcmToken = isValidFcmToken;
const admin = __importStar(require("firebase-admin"));
const path = __importStar(require("path"));
// Initialize Firebase Admin SDK
let firebaseInitialized = false;
function initializeFirebase() {
    if (firebaseInitialized)
        return;
    try {
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
        const serviceAccount = require(path.resolve(serviceAccountPath));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID || 'vehiclewash-system',
        });
        firebaseInitialized = true;
        console.log('✅ Firebase Admin SDK initialized');
    }
    catch (error) {
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
async function sendPushNotification(fcmToken, payload) {
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
        const message = {
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
    }
    catch (error) {
        console.error('Push notification error:', error);
        return false;
    }
}
/**
 * Send vehicle ready notification
 */
async function sendVehicleReadyNotification(fcmToken, vehicleNumber, amount) {
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
async function sendVehicleReceivedNotification(fcmToken, vehicleNumber) {
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
async function sendPaymentReminderNotification(fcmToken, vehicleNumber, amount) {
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
async function sendBulkNotifications(tokens, payload) {
    const results = await Promise.allSettled(tokens.map((token) => sendPushNotification(token, payload)));
    const success = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.length - success;
    console.log(`📊 Bulk notification results: ${success} success, ${failed} failed`);
    return { success, failed };
}
/**
 * Validate FCM token format
 */
function isValidFcmToken(token) {
    // FCM tokens are typically 152-163 characters long
    return !!token && token.length >= 140 && token.length <= 200;
}
//# sourceMappingURL=fcm.service.js.map