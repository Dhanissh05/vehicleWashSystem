import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ApolloProvider, ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View, StyleSheet, Alert } from 'react-native';
import { useVersionChecker } from './src/hooks/useVersionChecker';
import UpdateChecker from './src/components/UpdateChecker';
import BookingNotificationListener from './src/components/BookingNotificationListener';
import { refreshTokenIfNeeded } from './src/utils/tokenRefresh';

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
import EstimationsScreen from './src/screens/EstimationsScreen';
import EstimationFormScreen from './src/screens/EstimationFormScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';
import { withSubscriptionGuard } from './src/components/SubscriptionGuard';

const Stack = createStackNavigator();

// Apollo Client Setup
const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not defined in .env file');
}

const httpLink = createHttpLink({
  uri: API_URL,
});

const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(async ({ message, locations, path }) => {
      // Ignore null me errors - these happen when user isn't authenticated
      if (path && path.includes('me') && message.includes('null')) {
        return;
      }
      // Handle "Not authenticated" errors
      if (message.includes('Not authenticated')) {
        if (!operation.getContext().authErrorLogged) {
          console.log(`[Auth Required]: ${operation.operationName || 'query'}`);
          operation.setContext({ authErrorLogged: true });
          
          // After multiple auth failures, clear the invalid session
          const failureCount = (operation.getContext().authFailureCount || 0) + 1;
          operation.setContext({ authFailureCount: failureCount });
          
          if (failureCount >= 5) {
            console.log('[Auth] Too many failures - clearing invalid session');
            await AsyncStorage.multiRemove(['token', 'isLoggedIn', 'user']);
          }
        }
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
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          vehicles: {
            merge: false, // Always replace with incoming data
          },
        },
      },
      SlotService: {
        fields: {
          pricing: {
            merge: false, // Always replace pricing object
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

const GuardedDashboardScreen = withSubscriptionGuard(DashboardScreen);
const GuardedAddVehicleScreen = withSubscriptionGuard(AddVehicleScreen);
const GuardedWashCycleScreen = withSubscriptionGuard(WashCycleScreen);
const GuardedBodyRepairCycleScreen = withSubscriptionGuard(BodyRepairCycleScreen);
const GuardedWorkersScreen = withSubscriptionGuard(WorkersScreen);
const GuardedPricingScreen = withSubscriptionGuard(PricingScreen);
const GuardedSettingsScreen = withSubscriptionGuard(SettingsScreen);
const GuardedSlotsScreen = withSubscriptionGuard(SlotsScreen);
const GuardedWorkerProfileScreen = withSubscriptionGuard(WorkerProfileScreen);
const GuardedSlotBookingsScreen = withSubscriptionGuard(SlotBookingsScreen);
const GuardedSlotBookingDetailScreen = withSubscriptionGuard(SlotBookingDetailScreen);
const GuardedPushNotificationScreen = withSubscriptionGuard(PushNotificationScreen);
const GuardedManageUsersScreen = withSubscriptionGuard(ManageUsersScreen);
const GuardedEstimationsScreen = withSubscriptionGuard(EstimationsScreen);
const GuardedEstimationFormScreen = withSubscriptionGuard(EstimationFormScreen);
const GuardedSubscriptionScreen = withSubscriptionGuard(SubscriptionScreen, {
  allowRestricted: true,
  showOverdueBanner: false,
});

function AppNavigator() {
  const [initialRoute, setInitialRoute] = React.useState<string | null>(null);
  const [passcodeModalVisible, setPasscodeModalVisible] = React.useState(false);
  const [passcodeInput, setPasscodeInput] = React.useState('');
  const [attempts, setAttempts] = React.useState(0);
  const maxAttempts = 3;

  useVersionChecker();

  React.useEffect(() => {
    checkAuthState();
    
    // Setup auto token refresh every 6 hours
    const refreshInterval = setInterval(() => {
      refreshTokenIfNeeded(apolloClient);
    }, 6 * 60 * 60 * 1000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const checkAuthState = async () => {
    try {
      // Attempt to refresh token if needed
      await refreshTokenIfNeeded(apolloClient);
      
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
      const isPasscodeSetup = await AsyncStorage.getItem('isPasscodeSetup');
      const token = await AsyncStorage.getItem('token');
      
      console.log('[Auth Check] isLoggedIn:', isLoggedIn);
      console.log('[Auth Check] isPasscodeSetup:', isPasscodeSetup);
      console.log('[Auth Check] hasToken:', !!token);
      
      // If no token but marked as logged in, clear the login state
      if (isLoggedIn === 'true' && !token) {
        console.log('[Auth Check] Invalid state detected - clearing login');
        await AsyncStorage.removeItem('isLoggedIn');
        await AsyncStorage.removeItem('isPasscodeSetup');
        setInitialRoute('Login');
        return;
      }
      
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
        <Stack.Screen name="Dashboard" component={GuardedDashboardScreen} />
        <Stack.Screen name="AddVehicle" component={GuardedAddVehicleScreen} options={{ title: 'Entry Vehicle' }} />
        <Stack.Screen name="WashCycle" component={GuardedWashCycleScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BodyRepairCycle" component={GuardedBodyRepairCycleScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Workers" component={GuardedWorkersScreen} />
        <Stack.Screen name="Pricing" component={GuardedPricingScreen} />
        <Stack.Screen name="Slots" component={GuardedSlotsScreen} options={{ title: 'Slot Management' }} />
        <Stack.Screen name="SlotBookings" component={GuardedSlotBookingsScreen} options={{ title: 'Slot Bookings' }} />
        <Stack.Screen name="SlotBookingDetail" component={GuardedSlotBookingDetailScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ManageUsers" component={GuardedManageUsersScreen} options={{ title: 'Manage Users' }} />
        <Stack.Screen name="PushNotification" component={GuardedPushNotificationScreen} options={{ title: 'Push Notification' }} />
        <Stack.Screen name="Estimations" component={GuardedEstimationsScreen} options={{ title: 'Estimations' }} />
        <Stack.Screen name="EstimationForm" component={GuardedEstimationFormScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={GuardedSettingsScreen} />
        <Stack.Screen name="WorkerProfile" component={GuardedWorkerProfileScreen} options={{ title: 'My Profile' }} />
        <Stack.Screen name="Subscription" component={GuardedSubscriptionScreen} options={{ title: 'Subscription' }} />
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
