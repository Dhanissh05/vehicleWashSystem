import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ApolloProvider } from '@apollo/client';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { apolloClient } from './src/apollo/client';
import { useVersionChecker } from './src/hooks/useVersionChecker';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import UpdateChecker from './src/components/UpdateChecker';

// Screens
import LandingScreen from './src/screens/LandingScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupStep1Screen from './src/screens/SignupStep1Screen';
import SignupStep2Screen from './src/screens/SignupStep2Screen';
import SignupStep3Screen from './src/screens/SignupStep3Screen';
import SignupStep4Screen from './src/screens/SignupStep4Screen';
import BiometricSetupScreen from './src/screens/BiometricSetupScreen';
import HomeScreen from './src/screens/HomeScreen';
import AddVehicleScreen from './src/screens/AddVehicleScreen';
import TrackProgressScreen from './src/screens/TrackProgressScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SlotBookingScreen from './src/screens/SlotBookingScreen';
import SlotBookingDetailScreen from './src/screens/SlotBookingDetailScreen';
import BookedSlotsScreen from './src/screens/BookedSlotsScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRoute, setInitialRoute] = useState('Landing');

  // Check for version updates on app start
  useVersionChecker();

  // Register for push notifications (disabled for Expo Go, needs development build)
  usePushNotifications();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userJson = await AsyncStorage.getItem('user');
      
      if (token && userJson) {
        const user = JSON.parse(userJson);
        
        // Check if biometric is enabled for this user
        const biometricKey = await AsyncStorage.getItem(`biometric_key_${user.mobile}`);
        const biometricEnabled = !!biometricKey;
        
        if (biometricEnabled) {
          // Check if device supports biometric
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          
          if (hasHardware && isEnrolled) {
            // Authenticate with biometric
            const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Login with biometric',
              cancelLabel: 'Cancel',
              disableDeviceFallback: false,
            });
            
            if (result.success) {
              setInitialRoute('Home');
            } else {
              // Biometric failed, go to landing
              setInitialRoute('Landing');
            }
          } else {
            // Device doesn't support biometric, go directly to home
            setInitialRoute('Home');
          }
        } else {
          // No biometric enabled, go directly to home
          setInitialRoute('Home');
        }
      } else {
        // No token, show landing page
        setInitialRoute('Landing');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setInitialRoute('Landing');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
        <Stack.Navigator 
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: {
              backgroundColor: '#3B82F6',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Landing" 
            component={LandingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="SignupStep1" 
            component={SignupStep1Screen}
            options={{ title: 'Sign Up - Step 1' }}
          />
          <Stack.Screen 
            name="SignupStep2" 
            component={SignupStep2Screen}
            options={{ title: 'Sign Up - Step 2' }}
          />
          <Stack.Screen 
            name="SignupStep3" 
            component={SignupStep3Screen}
            options={{ title: 'Sign Up - Step 3' }}
          />
          <Stack.Screen 
            name="SignupStep4" 
            component={SignupStep4Screen}
            options={{ title: 'Sign Up - Step 4' }}
          />
          <Stack.Screen 
            name="BiometricSetup" 
            component={BiometricSetupScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="HomeMain" 
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="AddVehicle" 
            component={AddVehicleScreen}
            options={{ title: 'Add Vehicle' }}
          />
          <Stack.Screen 
            name="TrackProgress" 
            component={TrackProgressScreen}
            options={{ title: 'Track Wash Progress' }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{ title: 'My Profile' }}
          />
          <Stack.Screen 
            name="SlotBooking" 
            component={SlotBookingScreen}
            options={{ title: 'Book a Slot' }}
          />
          <Stack.Screen 
            name="SlotBookingDetail" 
            component={SlotBookingDetailScreen}
            options={{ title: 'Slot Details' }}
          />
          <Stack.Screen 
            name="BookedSlots" 
            component={BookedSlotsScreen}
            options={{ title: 'My Booked Slots' }}
          />
          <Stack.Screen 
            name="Payments" 
            component={PaymentsScreen}
            options={{ title: 'Payment History' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
  );
}

export default function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <AppNavigator />
      <UpdateChecker />
    </ApolloProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});
