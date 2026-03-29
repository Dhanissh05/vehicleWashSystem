"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendExpoPushNotification = sendExpoPushNotification;
const expo_server_sdk_1 = require("expo-server-sdk");
const expo = new expo_server_sdk_1.Expo();
async function sendExpoPushNotification(expoPushToken, title, body) {
    if (!expo_server_sdk_1.Expo.isExpoPushToken(expoPushToken)) {
        console.log(`❌ Invalid Expo push token: ${expoPushToken}`);
        return false;
    }
    const message = {
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data: { timestamp: Date.now() },
    };
    try {
        const tickets = await expo.sendPushNotificationsAsync([message]);
        console.log('✅ Expo notification sent:', tickets);
        return true;
    }
    catch (error) {
        console.error('❌ Expo notification error:', error);
        return false;
    }
}
//# sourceMappingURL=expo-push.service.js.map