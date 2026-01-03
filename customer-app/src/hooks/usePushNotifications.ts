import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { useMutation, gql } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UPDATE_FCM_TOKEN = gql`
  mutation UpdateFcmToken($token: String!) {
    updateFcmToken(token: $token) {
      id
      name
    }
  }
`;

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();
  const [updateFcmToken] = useMutation(UPDATE_FCM_TOKEN);
  const hasRegistered = useRef(false);

  useEffect(() => {
    // Check if user is logged in first
    checkAndRegister();

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received:', notification);
    });

    // Listen for notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  async function checkAndRegister() {
    // Only register if user is logged in
    const userToken = await AsyncStorage.getItem('token');
    if (userToken && !hasRegistered.current) {
      await registerForPushNotificationsAsync();
      hasRegistered.current = true;
    }
  }

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Failed to get push token for push notification!');
        return;
      }
      
      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: 'fd7406bb-f1f5-4e5f-981e-1fd91b5286f2',
        })).data;
        console.log('✅ Expo Push Token:', token);

        // Send token to backend
        try {
          await updateFcmToken({ variables: { token } });
          console.log('✅ FCM token registered with backend');
        } catch (error: any) {
          console.error('❌ Failed to register FCM token:', error.message);
        }
      } catch (error) {
        console.error('❌ Error getting push token:', error);
      }
    } else {
      console.log('⚠️  Must use physical device for Push Notifications');
    }

    return token;
  }

  return null;
}
