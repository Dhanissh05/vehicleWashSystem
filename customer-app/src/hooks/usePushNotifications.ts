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
  const registrationAttempts = useRef(0);

  useEffect(() => {
    console.log('🔔 [usePushNotifications] Hook initialized');
    
    // Check immediately on mount
    checkAndRegister();

    // Set up interval to check for login status changes
    // More aggressive: check every 2 seconds for first minute, then every 10 seconds
    const quickInterval = setInterval(() => {
      if (!hasRegistered.current && registrationAttempts.current < 30) {
        checkAndRegister();
      }
    }, 2000); // Check every 2 seconds initially

    const slowInterval = setInterval(() => {
      if (!hasRegistered.current) {
        checkAndRegister();
      }
    }, 10000); // Then check every 10 seconds

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received:', notification);
    });

    // Listen for notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
    });

    return () => {
      clearInterval(quickInterval);
      clearInterval(slowInterval);
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  async function checkAndRegister() {
    registrationAttempts.current++;
    
    // Only register if user is logged in
    const userToken = await AsyncStorage.getItem('token');
    
    if (!userToken) {
      if (registrationAttempts.current === 1 || registrationAttempts.current % 5 === 0) {
        console.log(`⏳ [usePushNotifications] Waiting for user login... (attempt ${registrationAttempts.current})`);
      }
      return;
    }
    
    if (hasRegistered.current) {
      return;
    }
    
    console.log(`🔔 [usePushNotifications] User logged in, attempting registration (attempt ${registrationAttempts.current})`);
    const success = await registerForPushNotificationsAsync();
    
    if (success) {
      hasRegistered.current = true;
      console.log('✅ [usePushNotifications] Registration completed and marked successful');
    }
  }

  async function registerForPushNotificationsAsync(): Promise<boolean> {
    try {
      console.log('📱 [usePushNotifications] Starting registration...');
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
        console.log('📱 [usePushNotifications] Android channel configured');
      }

      if (!Device.isDevice) {
        console.log('⚠️ [usePushNotifications] Not a physical device, skipping');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      console.log('📱 [usePushNotifications] Permission status:', existingStatus);
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('📱 [usePushNotifications] Permission requested, result:', status);
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ [usePushNotifications] Permission denied');
        return false;
      }
      
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'fd7406bb-f1f5-4e5f-981e-1fd91b5286f2',
        });
        const token = tokenData.data;
        console.log('✅ [usePushNotifications] Got Expo Push Token:', token);

        // Send token to backend
        try {
          const result = await updateFcmToken({ variables: { token } });
          console.log('✅ [usePushNotifications] FCM token registered with backend:', result.data);
          return true;
        } catch (error: any) {
          console.error('❌ [usePushNotifications] Failed to register FCM token:', error.message);
          if (error.graphQLErrors) {
            console.error('❌ [usePushNotifications] GraphQL errors:', JSON.stringify(error.graphQLErrors));
          }
          return false;
        }
      } catch (error) {
        console.error('❌ [usePushNotifications] Error getting push token:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ [usePushNotifications] Registration failed:', error);
      return false;
    }
  }

  return null;
}
