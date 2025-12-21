import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export async function sendExpoPushNotification(
  expoPushToken: string,
  title: string,
  body: string
): Promise<boolean> {
  if (!Expo.isExpoPushToken(expoPushToken)) {
    console.log(`❌ Invalid Expo push token: ${expoPushToken}`);
    return false;
  }

  const message: ExpoPushMessage = {
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
  } catch (error) {
    console.error('❌ Expo notification error:', error);
    return false;
  }
}
