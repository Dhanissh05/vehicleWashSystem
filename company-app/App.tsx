import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ApolloProvider, ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useVersionChecker } from './src/hooks/useVersionChecker';
import UpdateChecker from './src/components/UpdateChecker';
import BookingNotificationListener from './src/components/BookingNotificationListener';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import PasscodeSetupScreen from './src/screens/PasscodeSetupScreen';
import PasscodeUnlockScreen from './src/screens/PasscodeUnlockScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AddVehicleScreen from './src/screens/AddVehicleScreen';
import WashCycleScreen from './src/screens/WashCycleScreen';
import BodyRepairCycleScreen from './src/screens/BodyRepairCycleScreen';
import WorkersScreen from './src/screens/WorkersScreen';
import PricingScreen from './src/screens/PricingScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SlotsScreen from './src/screens/SlotsScreen';
import WorkerProfileScreen from './src/screens/WorkerProfileScreen';
import SlotBookingsScreen from './src/screens/SlotBookingsScreen';
import SlotBookingDetailScreen from './src/screens/SlotBookingDetailScreen';
import PushNotificationScreen from './src/screens/PushNotificationScreen';
import ManageUsersScreen from './src/screens/ManageUsersScreen';

const Stack = createStackNavigator();

// Apollo Client Setup
const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not defined in .env file');
}

const httpLink = createHttpLink({
  uri: API_URL,
});

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      // Ignore null me errors - these happen when user isn't authenticated
      if (path && path.includes('me') && message.includes('null')) {
        return;
      }
      // Only log once, not on every retry
      if (!message.includes('Unexpected end')) {
        console.log(`[GraphQL error]: ${message}`);
      }
    });
  }
  // Suppress network error spam - only log once
  if (networkError && !networkError.message.includes('Unexpected end')) {
    console.log(`[Network error]: ${networkError}`);
  }
});

const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const apolloClient = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
    },
    query: {
      fetchPolicy: 'network-only',
    },
  },
});

function AppNavigator() {
  const [initialRoute, setInitialRoute] = React.useState<string | null>(null);

  useVersionChecker();

  React.useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const isPasscodeSetup = await AsyncStorage.getItem('isPasscodeSetup');
      
      console.log('[Auth Check] isLoggedIn:', isLoggedIn);
      console.log('[Auth Check] isPasscodeSetup:', isPasscodeSetup);
      
      if (isLoggedIn === 'true' && isPasscodeSetup === 'true') {
        setInitialRoute('PasscodeUnlock');
      } else if (isLoggedIn === 'true' && isPasscodeSetup !== 'true') {
        setInitialRoute('PasscodeSetup');
      } else {
        setInitialRoute('Login');
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      setInitialRoute('Login');
    }
  };

  const handlePasscodeSubmit = async () => {
    const storedPasscode = await AsyncStorage.getItem('app_passcode');
    
    if (passcodeInput === storedPasscode) {
      console.log('[Passcode] Verified successfully');
      setPasscodeModalVisible(false);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= maxAttempts) {
        Alert.alert(
          'Too Many Attempts',
          'You will be logged out for security.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await AsyncStorage.removeItem('token');
                await AsyncStorage.removeItem('user');
                setPasscodeModalVisible(false);
                setInitialRoute('Login');
              },
            },
          ]
        );
      } else {
        setPasscodeInput('');
        Alert.alert('Incorrect Passcode', `${maxAttempts - newAttempts} attempts remaining`);
      }
    }
  };

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: true }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PasscodeSetup" component={PasscodeSetupScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PasscodeUnlock" component={PasscodeUnlockScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="AddVehicle" component={AddVehicleScreen} options={{ title: 'Entry Vehicle' }} />
        <Stack.Screen name="WashCycle" component={WashCycleScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BodyRepairCycle" component={BodyRepairCycleScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Workers" component={WorkersScreen} />
        <Stack.Screen name="Pricing" component={PricingScreen} />
        <Stack.Screen name="Slots" component={SlotsScreen} options={{ title: 'Slot Management' }} />
        <Stack.Screen name="SlotBookings" component={SlotBookingsScreen} options={{ title: 'Slot Bookings' }} />
        <Stack.Screen name="SlotBookingDetail" component={SlotBookingDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ManageUsers" component={ManageUsersScreen} options={{ title: 'Manage Users' }} />
        <Stack.Screen name="PushNotification" component={PushNotificationScreen} options={{ title: 'Push Notification' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="WorkerProfile" component={WorkerProfileScreen} options={{ title: 'My Profile' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
export default function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <AppNavigator />
      <UpdateChecker />
      <BookingNotificationListener />
    </ApolloProvider>
  );
}
