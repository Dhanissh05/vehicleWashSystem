import React from 'react';
import 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ApolloProvider, ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVersionChecker } from './src/hooks/useVersionChecker';
import UpdateChecker from './src/components/UpdateChecker';

// Screens
import LoginScreen from './src/screens/LoginScreen';
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
  link: authLink.concat(httpLink),
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
  // Check for version updates on app start
  useVersionChecker();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: true }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="AddVehicle" component={AddVehicleScreen} options={{ title: 'Entry Vehicle' }} />
        <Stack.Screen name="WashCycle" component={WashCycleScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BodyRepairCycle" component={BodyRepairCycleScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Workers" component={WorkersScreen} />
        <Stack.Screen name="Pricing" component={PricingScreen} />
        <Stack.Screen name="Slots" component={SlotsScreen} options={{ title: 'Slot Management' }} />
        <Stack.Screen name="SlotBookings" component={SlotBookingsScreen} options={{ title: 'Slot Bookings' }} />
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
    </ApolloProvider>
  );
}
