/**
 * Firebase Cloud Messaging (FCM) Service
 *
 * This service handles push notifications to mobile devices using Firebase Admin SDK.
 */
interface PushNotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    image?: string;
}
/**
 * Send push notification using Firebase Admin SDK
 *
 * @param fcmToken - Device FCM registration token
 * @param payload - Notification payload
 * @returns Promise<boolean> - Success status
 */
export declare function sendPushNotification(fcmToken: string, payload: PushNotificationPayload): Promise<boolean>;
/**
 * Send vehicle ready notification
 */
export declare function sendVehicleReadyNotification(fcmToken: string, vehicleNumber: string, amount: number): Promise<boolean>;
/**
 * Send vehicle received notification
 */
export declare function sendVehicleReceivedNotification(fcmToken: string, vehicleNumber: string): Promise<boolean>;
/**
 * Send payment reminder notification
 */
export declare function sendPaymentReminderNotification(fcmToken: string, vehicleNumber: string, amount: number): Promise<boolean>;
/**
 * Send bulk notifications to multiple tokens
 */
export declare function sendBulkNotifications(tokens: string[], payload: PushNotificationPayload): Promise<{
    success: number;
    failed: number;
}>;
/**
 * Validate FCM token format
 */
export declare function isValidFcmToken(token: string): boolean;
export {};
//# sourceMappingURL=fcm.service.d.ts.map