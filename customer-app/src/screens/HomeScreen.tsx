import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MY_VEHICLES, CENTERS, PRICING, SYSTEM_CONFIG } from '../apollo/queries';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import MenuModal from '../components/CustomDrawer';
import { PaymentMethodModal } from '../components/PaymentMethodModal';
import { OnlinePaymentModal } from '../components/OnlinePaymentModal';
import { Audio } from 'expo-av';

const UPDATE_FCM_TOKEN = gql`
  mutation UpdateFcmToken($token: String!) {
    updateFcmToken(token: $token) {
      id
    }
  }
`;

export default function HomeScreen({ navigation }: any) {
  const [isScreenFocused, setIsScreenFocused] = React.useState(true);
  
  const { data, loading, refetch, error } = useQuery(MY_VEHICLES, {
    fetchPolicy: 'cache-and-network',
    pollInterval: isScreenFocused ? 10000 : 0, // Poll only when screen is focused
    notifyOnNetworkStatusChange: false,
  });
  const { data: centerData, refetch: refetchCenter, error: centerError } = useQuery(CENTERS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: isScreenFocused ? 10000 : 0, // Poll only when screen is focused
    notifyOnNetworkStatusChange: false,
  });
  const { data: pricingData } = useQuery(PRICING);
  const { data: configData } = useQuery(SYSTEM_CONFIG, {
    variables: { key: 'ENABLE_SLOT_BOOKING' },
    fetchPolicy: 'network-only',
  });
  
  const [userName, setUserName] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [onlinePaymentModalVisible, setOnlinePaymentModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>('');
  const playedReadyVehicles = useRef<Set<string>>(new Set());
  const hasRegisteredPushNotifications = useRef(false);

  const [updateFcmToken] = useMutation(UPDATE_FCM_TOKEN);
  const slotBookingEnabled = configData?.systemConfig?.value === 'true';
  const currentCenter = centerData?.centers?.[0];
  const serviceUnavailable =
    !centerError &&
    (!currentCenter || currentCenter.subscriptionStatus === 'EXPIRED' || currentCenter.subscriptionStatus === 'LOCKED');

  // Register for push notifications on first mount
  useEffect(() => {
    const registerPushNotifications = async () => {
      if (hasRegisteredPushNotifications.current) {
        return; // Already registered
      }

      try {
        console.log('🔔 [HomeScreen] Starting push notification registration...');
        
        if (!Device.isDevice) {
          console.log('⚠️ [HomeScreen] Must use physical device for Push Notifications');
          return;
        }

        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        console.log('📱 [HomeScreen] Current permission status:', existingStatus);
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
          console.log('📱 [HomeScreen] New permission status:', status);
        }
        
        if (finalStatus !== 'granted') {
          console.log('❌ [HomeScreen] Push notification permission denied');
          return;
        }

        // Set up Android notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
          console.log('📱 [HomeScreen] Android notification channel created');
        }

        // Get Expo Push Token
        console.log('🔑 [HomeScreen] Getting Expo Push Token...');
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'fd7406bb-f1f5-4e5f-981e-1fd91b5286f2',
        });
        
        const token = tokenData.data;
        console.log('✅ [HomeScreen] Got Expo Push Token:', token);

        // Send token to backend
        console.log('📤 [HomeScreen] Sending token to backend...');
        const result = await updateFcmToken({ variables: { token } });
        console.log('✅ [HomeScreen] FCM token registered with backend:', result);
        
        hasRegisteredPushNotifications.current = true;
      } catch (error: any) {
        console.error('❌ [HomeScreen] Error registering push notifications:', error);
        console.error('❌ [HomeScreen] Error details:', error.message, error.graphQLErrors);
      }
    };

    registerPushNotifications();
  }, []); // Run only once on mount

  // Track screen focus state for smart polling
  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      refetch();
      refetchCenter();
      
      return () => {
        setIsScreenFocused(false);
      };
    }, [refetch, refetchCenter])
  );

  // Play sound and show payment modal when vehicle becomes READY_FOR_PICKUP
  React.useEffect(() => {
    const playReadySound = async () => {
      console.log('🔊 Playing ready for pickup notification sound...');
      try {
        // Configure audio mode
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        
        // Try to load and play the notification sound
        try {
          console.log('📂 Loading notification.mp3...');
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/notification.mp3')
          );
          console.log('▶️ Playing sound...');
          await sound.playAsync();
          console.log('✅ Sound played successfully!');
          
          // Unload sound after it finishes playing
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.didJustFinish) {
              console.log('🔚 Sound finished, unloading...');
              sound.unloadAsync();
            }
          });
        } catch (soundError) {
          console.log('❌ Notification sound error:', soundError);
        }
      } catch (error) {
        console.log('❌ Error setting audio mode:', error);
      }
    };

    console.log('🔍 Checking for ready vehicles...', {
      hasData: !!data?.myVehicles,
      vehicleCount: data?.myVehicles?.length || 0,
    });

    if (data?.myVehicles) {
      // Find vehicles that just became READY_FOR_PICKUP and haven't played sound yet
      const readyVehicles = data.myVehicles.filter(
        (v: any) => v.status === 'READY_FOR_PICKUP' && !playedReadyVehicles.current.has(v.id)
      );

      console.log('📊 Vehicle status check:', {
        total: data.myVehicles.length,
        readyForPickup: data.myVehicles.filter((v: any) => v.status === 'READY_FOR_PICKUP').length,
        newReadyVehicles: readyVehicles.length,
        playedBefore: Array.from(playedReadyVehicles.current),
      });

      if (readyVehicles.length > 0) {
        console.log(`🚗 ${readyVehicles.length} vehicle(s) ready for pickup!`);
        console.log('Ready vehicles:', readyVehicles.map((v: any) => ({ id: v.id, number: v.vehicleNumber })));
        
        // Play sound once for ready vehicles
        playReadySound();
        
        // Mark these vehicles as having played sound
        readyVehicles.forEach((v: any) => {
          playedReadyVehicles.current.add(v.id);
        });
      }

      // Clean up tracking for vehicles that are no longer READY_FOR_PICKUP
      const currentReadyIds = new Set(
        data.myVehicles
          .filter((v: any) => v.status === 'READY_FOR_PICKUP')
          .map((v: any) => v.id)
      );
      playedReadyVehicles.current.forEach((id) => {
        if (!currentReadyIds.has(id)) {
          playedReadyVehicles.current.delete(id);
        }
      });

      // Show payment modal for ready vehicles without payment
      const readyVehicle = data.myVehicles.find(
        (v: any) => v.status === 'READY_FOR_PICKUP' && !v.payment
      );
      if (readyVehicle) {
        setSelectedVehicle(readyVehicle);
        setPaymentModalVisible(true);
      }
    }
  }, [data]);

  // Debug logging
  React.useEffect(() => {
    console.log('HomeScreen - Query state:', { 
      loading, 
      hasData: !!data, 
      vehiclesCount: data?.myVehicles?.length,
      error: error?.message 
    });
    if (data?.myVehicles) {
      console.log('Vehicles:', JSON.stringify(data.myVehicles, null, 2));
    }
    if (centerData?.centers?.[0]) {
      console.log('Center data:', JSON.stringify(centerData.centers[0], null, 2));
    } else {
      console.log('No center data available');
    }
    if (centerError) {
      console.error('CENTERS query error:', centerError);
    }
  }, [data, loading, error, centerData, centerError]);

  // Load user data and refetch vehicles whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
      refetch(); // Refetch vehicles when screen comes into focus
      refetchCenter(); // Refetch center data for slot info
    }, [refetch, refetchCenter])
  );

  const loadUserData = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUserName(user.name || user.mobile);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTERED':
        return '#9CA3AF';
      case 'RECEIVED':
        return '#3B82F6';
      case 'WASHING':
        return '#F59E0B';
      case 'READY_FOR_PICKUP':
        return '#10B981';
      case 'DELIVERED':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'REGISTERED':
        return 'Registered';
      case 'RECEIVED':
        return 'Received';
      case 'WASHING':
        return 'Washing';
      case 'READY_FOR_PICKUP':
        return 'Ready for Pickup';
      case 'DELIVERED':
        return 'Delivered';
      default:
        return status;
    }
  };

  const renderVehicle = ({ item }: any) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.vehicleNumber}>{item.vehicleNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.vehicleInfo}>
          {item.vehicleType === 'CAR' ? '🚗' : '🏍️'} {item.brand} {item.model}
        </Text>
        <Text style={styles.vehicleColor}>Color: {item.color || 'N/A'}</Text>
        
        {item.worker && (
          <Text style={styles.workerInfo}>
            👷 Worker: {item.worker.name || item.worker.mobile}
          </Text>
        )}

        {/* Show pricing breakdown for multiple services */}
        {item.slotBooking?.services && item.slotBooking.services.length > 0 && (
          <View style={styles.pricingBreakdown}>
            <Text style={styles.pricingBreakdownTitle}>Services:</Text>
            {item.slotBooking.services.map((service: any) => (
              (service.pricing || service.customPrice) && (
                <View key={service.id} style={styles.pricingBreakdownItem}>
                  <Text style={styles.pricingBreakdownService}>
                    {service.serviceType === 'CAR_WASH' ? '🚗 Car Wash' :
                     service.serviceType === 'TWO_WHEELER_WASH' ? '🏍️ Two Wheeler' :
                     '🔧 Body Repair'}
                    {' - '}{service.pricing?.categoryName || service.customPricingName || 'Custom'}
                  </Text>
                  <Text style={styles.pricingBreakdownPrice}>₹{service.pricing?.price || service.customPrice}</Text>
                </View>
              )
            ))}
            {/* Total Amount */}
            {(() => {
              const total = item.slotBooking.services.reduce((sum: number, service: any) => {
                return sum + (service.pricing?.price || service.customPrice || 0);
              }, 0);
              return total > 0 ? (
                <View style={styles.totalAmountContainer}>
                  <Text style={styles.totalAmountLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>₹{total}</Text>
                </View>
              ) : null;
            })()}
          </View>
        )}

        {/* Show single pricing for single service */}
        {item.pricing && (!item.slotBooking?.services || item.slotBooking.services.length <= 1) && (
          <Text style={styles.pricingInfo}>
            📋 Category: {item.pricing.categoryName}
          </Text>
        )}

        {item.payment && (
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentAmount}>₹{item.payment.amount}</Text>
            <Text style={[
              styles.paymentStatus,
              { color: item.payment.status === 'PAID' ? '#10B981' : '#F59E0B' }
            ]}>
              {item.payment.status}
            </Text>
          </View>
        )}

        {/* Pay Now Button for READY_FOR_PICKUP without payment or with pending payment */}
        {item.status === 'READY_FOR_PICKUP' && (!item.payment || item.payment.status === 'MANUAL_PENDING') && (
          <TouchableOpacity
            style={styles.payNowButton}
            onPress={() => {
              setSelectedVehicle(item);
              setPaymentModalVisible(true);
            }}
          >
            <Text style={styles.payNowButtonText}>
              💳 {item.payment ? 'Change Payment Method' : 'Pay Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {item.receivedAt && (
        <Text style={styles.timestamp}>
          Received: {new Date(item.receivedAt).toLocaleDateString()}
        </Text>
      )}
      {!item.receivedAt && item.status === 'REGISTERED' && (
        <Text style={styles.timestamp}>
          Registered: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Menu Modal */}
      <MenuModal 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        navigation={navigation}
      />
      
      {/* Header with Menu Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>My Vehicles</Text>
        </View>
        <View style={styles.menuButton} />
      </View>

      <View style={styles.header}>
        {userName ? (
          <Text style={styles.welcomeText}>Welcome, {userName}</Text>
        ) : null}
        <Text style={styles.subtitle}>Track your vehicle wash status</Text>
      </View>

      {serviceUnavailable && (
        <View style={styles.serviceUnavailableBanner}>
          <Text style={styles.serviceUnavailableText}>Service unavailable.</Text>
        </View>
      )}

      {/* Slot Availability Banner */}
      <View style={styles.slotBanner}>
        {centerData?.centers?.[0] ? (
          <>
            {centerData.centers[0].availableSlotsTwoWheeler === 0 && centerData.centers[0].availableSlotsCar === 0 ? (
              <View style={styles.slotFullBanner}>
                <Text style={styles.slotFullIcon}>⚠️</Text>
                <View style={styles.slotTextContainer}>
                  <Text style={styles.slotFullTitle}>All Slots Full Today</Text>
                  <Text style={styles.slotFullDescription}>
                    All slots are currently occupied. Please check back later.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.slotAvailableBanner}>
                <Text style={styles.slotAvailableTitle}>✓ Slots Available Today</Text>
                <View style={styles.slotInfoRow}>
                  <View style={[
                    styles.slotTypeInfo,
                    centerData.centers[0].availableSlotsTwoWheeler === 0 
                      ? styles.slotFull
                      : centerData.centers[0].availableSlotsTwoWheeler <= 2
                      ? styles.slotLow
                      : styles.slotNormal
                  ]}>
                    <Text style={styles.slotTypeIcon}>🏍️</Text>
                    <Text style={styles.slotTypeLabel}>Two-Wheeler</Text>
                    <Text style={[
                      styles.slotTypeText,
                      centerData.centers[0].availableSlotsTwoWheeler === 0 && styles.slotFullText,
                      centerData.centers[0].availableSlotsTwoWheeler <= 2 && centerData.centers[0].availableSlotsTwoWheeler > 0 && styles.slotLowText
                    ]}>
                      {centerData.centers[0].availableSlotsTwoWheeler}
                    </Text>
                    <Text style={styles.slotAvailableTitle}>
                      {centerData.centers[0].availableSlotsTwoWheeler === 0 
                        ? 'Slots Closed' 
                        : centerData.centers[0].availableSlotsTwoWheeler === 1 
                        ? 'Slot Available' 
                        : 'Slots Available'}
                    </Text>
                    {centerData.centers[0].availableSlotsTwoWheeler === 0 && (
                      <Text style={styles.slotStatusText}>Full</Text>
                    )}
                    {centerData.centers[0].availableSlotsTwoWheeler > 0 && centerData.centers[0].availableSlotsTwoWheeler <= 2 && (
                      <Text style={styles.slotLowLabel}>Low!</Text>
                    )}
                  </View>
                  <View style={[
                    styles.slotTypeInfo,
                    centerData.centers[0].availableSlotsCar === 0 
                      ? styles.slotFull
                      : centerData.centers[0].availableSlotsCar <= 2
                      ? styles.slotLow
                      : styles.slotNormal
                  ]}>
                    <Text style={styles.slotTypeIcon}>🚗</Text>
                    <Text style={styles.slotTypeLabel}>Car</Text>
                    <Text style={[
                      styles.slotTypeText,
                      centerData.centers[0].availableSlotsCar === 0 && styles.slotFullText,
                      centerData.centers[0].availableSlotsCar <= 2 && centerData.centers[0].availableSlotsCar > 0 && styles.slotLowText
                    ]}>
                      {centerData.centers[0].availableSlotsCar}
                    </Text>
                    <Text style={styles.slotAvailableTitle}>
                      {centerData.centers[0].availableSlotsCar === 0 
                        ? 'Slots Closed' 
                        : centerData.centers[0].availableSlotsCar === 1 
                        ? 'Slot Available' 
                        : 'Slots Available'}
                    </Text>
                    {centerData.centers[0].availableSlotsCar === 0 && (
                      <Text style={styles.slotStatusText}>Full</Text>
                    )}
                    {centerData.centers[0].availableSlotsCar > 0 && centerData.centers[0].availableSlotsCar <= 2 && (
                      <Text style={styles.slotLowLabel}>Low!</Text>
                    )}
                  </View>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.slotAvailableBanner}>
            <Text style={styles.slotAvailableTitle}>
              {centerError ? `Error: ${centerError.message}` : serviceUnavailable ? 'Service unavailable.' : 'Loading slot information...'}
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={data?.myVehicles || []}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {error ? (
              <>
                <Text style={styles.emptyText}>Error loading vehicles</Text>
                <Text style={styles.emptySubtext}>{error.message}</Text>
              </>
            ) : (
              <>
                <Text style={styles.emptyText}>No vehicles found</Text>
                <Text style={styles.emptySubtext}>
                  Drop your vehicle at our wash center to get started
                </Text>
              </>
            )}
            <TouchableOpacity 
              style={[styles.addButton, serviceUnavailable && styles.addButtonDisabled]}
              disabled={serviceUnavailable}
              onPress={() => {
                if (serviceUnavailable) {
                  Alert.alert('Service unavailable.', 'Service unavailable.');
                  return;
                }
                navigation.navigate('AddVehicle');
              }}
            >
              <Text style={styles.addButtonText}>Add Your First Vehicle</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Payment Method Modal */}
      {selectedVehicle && (
        <PaymentMethodModal
          visible={paymentModalVisible}
          onClose={() => setPaymentModalVisible(false)}
          vehicleId={selectedVehicle.id}
          existingPayment={selectedVehicle.payment}
          amount={(() => {
            // Calculate total from service pricing if available
            if (selectedVehicle.slotBooking?.services) {
              const total = selectedVehicle.slotBooking.services.reduce(
                (sum: number, svc: any) => sum + (svc.pricing?.price || svc.customPrice || 0), 
                0
              );
              if (total > 0) return total;
            }
            // Fallback to vehicle pricing or default pricing
            return selectedVehicle.pricing?.price ||
              pricingData?.pricing?.find(
                (p: any) =>
                  p.vehicleType === selectedVehicle.vehicleType &&
                  p.carCategory === selectedVehicle.carCategory
              )?.price || 0;
          })()}
          onPaymentInitiated={(paymentId, method) => {
            setSelectedPaymentId(paymentId);
            if (method === 'ONLINE') {
              setOnlinePaymentModalVisible(true);
            } else {
              Alert.alert(
                'Payment Initiated',
                method === 'CASH'
                  ? 'Please pay cash at the counter when you pick up your vehicle.'
                  : 'Please complete the GPay payment and show proof to staff.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      refetch();
                      setPaymentModalVisible(false);
                    },
                  },
                ]
              );
            }
          }}
        />
      )}

      {/* Online Payment Modal */}
      {selectedVehicle && (
        <OnlinePaymentModal
          visible={onlinePaymentModalVisible}
          onClose={() => setOnlinePaymentModalVisible(false)}
          paymentId={selectedPaymentId}
          amount={(() => {
            // Calculate total from service pricing if available
            if (selectedVehicle.slotBooking?.services) {
              const total = selectedVehicle.slotBooking.services.reduce(
                (sum: number, svc: any) => sum + (svc.pricing?.price || svc.customPrice || 0), 
                0
              );
              if (total > 0) return total;
            }
            // Fallback to vehicle pricing or default pricing
            return selectedVehicle.pricing?.price ||
              pricingData?.pricing?.find(
                (p: any) =>
                  p.vehicleType === selectedVehicle.vehicleType &&
                  p.carCategory === selectedVehicle.carCategory
              )?.price || 0;
          })()}
          vehicleNumber={selectedVehicle.vehicleNumber}
          onPaymentSuccess={() => {
            refetch();
            setOnlinePaymentModalVisible(false);
            setPaymentModalVisible(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#3B82F6',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  serviceUnavailableBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FEE2E2',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  serviceUnavailableText: {
    color: '#991B1B',
    fontSize: 16,
    fontWeight: '700',
  },
  slotBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  slotFullBanner: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotFullIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  slotTextContainer: {
    flex: 1,
  },
  slotFullTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  slotFullDescription: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  slotAvailableBanner: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    borderRadius: 12,
    padding: 16,
  },
  slotAvailableIcon: {
    fontSize: 28,
    marginRight: 12,
    color: '#10B981',
    fontWeight: 'bold',
  },
  slotAvailableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 12,
  },
  slotAvailableText: {
    fontSize: 14,
    color: '#065F46',
    lineHeight: 20,
  },
  slotInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 8,
  },
  slotTypeInfo: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  slotNormal: {
    backgroundColor: '#DCFCE7',
    borderColor: '#10B981',
  },
  slotLow: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  slotFull: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  slotTypeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  slotTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    textAlign: 'center',
  },
  slotTypeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'center',
  },
  slotLowText: {
    color: '#D97706',
  },
  slotFullText: {
    color: '#DC2626',
  },
  slotStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  slotLowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 12,
  },
  vehicleInfo: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  vehicleColor: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  workerInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  pricingInfo: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 8,
    fontWeight: '500',
  },
  pricingBreakdown: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  pricingBreakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  pricingBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  pricingBreakdownService: {
    fontSize: 13,
    color: '#1F2937',
    flex: 1,
  },
  pricingBreakdownPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  totalAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE',
  },
  totalAmountLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  payNowButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  payNowButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  addButtonDisabled: {
    opacity: 0.45,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
