import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Image,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, gql } from '@apollo/client';
import CalendarIcon from './CalendarIcon';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GET_CENTER = gql`
  query GetCenter {
    centers {
      id
      logoUrl
    }
    me {
      id
      name
      photoUrl
      role
    }
    mySubscriptionStatus {
      status
    }
  }
`;

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export default function MenuModal({ visible, onClose, navigation }: MenuModalProps) {
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [scrollKey, setScrollKey] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { data, refetch } = useQuery(GET_CENTER);
  const insets = useSafeAreaInsets();
  const subscriptionStatus = data?.mySubscriptionStatus?.status;
  const isRestricted = subscriptionStatus === 'EXPIRED' || subscriptionStatus === 'LOCKED';
  
  const center = data?.centers?.[0];

  useEffect(() => {
    if (visible) {
      console.log('📂 MenuModal - Opening drawer menu');
      loadUserData();
      refetch(); // Refetch to get latest user data including photo
      // Force ScrollView to remount by changing key
      setScrollKey(prev => prev + 1);
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const loadUserData = async () => {
    try {
      setLoadingUser(true);
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUserName(user.name || user.mobile);
        setUserRole(user.role);
        console.log('🔍 MenuModal - User Role:', user.role);
        console.log('🔍 MenuModal - User Name:', user.name);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    onClose();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const handleNavigate = (screen: string) => {
    onClose();
    navigation.navigate(screen);
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-280, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <Animated.View 
          style={[styles.menuContainer, { transform: [{ translateX }] }]}
          onStartShouldSetResponder={() => true}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoPlaceholder}>
              {data?.me?.photoUrl ? (
                <Image
                  source={{ uri: data.me.photoUrl }}
                  style={styles.logoImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.logoText}>
                  {(data?.me?.name || userName)?.charAt(0)?.toUpperCase() || (userRole === 'ADMIN' ? '👨‍💼' : '👷')}
                </Text>
              )}
            </View>
            <Text style={styles.welcomeText}>Welcome</Text>
            <Text style={styles.userName}>{data?.me?.name || userName}</Text>
            <Text style={styles.userRole}>{data?.me?.role || userRole}</Text>
          </View>

          {/* Menu Items */}
          <ScrollView 
            key={scrollKey}
            style={styles.menuSection} 
            showsVerticalScrollIndicator={true}
            bounces={true}
            scrollEnabled={true}
            nestedScrollEnabled={true}
            removeClippedSubviews={false}
            contentContainerStyle={styles.scrollContent}
          >
            {isRestricted ? (
              <>
                <View style={styles.restrictedBanner}>
                  <Text style={styles.restrictedTitle}>Access Restricted</Text>
                  <Text style={styles.restrictedText}>
                    Your plan has expired. Please make a payment to continue using services.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('Subscription')}
                >
                  <Text style={styles.menuIcon}>🧾</Text>
                  <Text style={styles.menuText}>Subscription</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, {
                    borderTopWidth: 2,
                    borderTopColor: '#EF4444',
                    marginTop: 20,
                    paddingTop: 20,
                    backgroundColor: '#FEE2E2',
                    paddingBottom: 40
                  }]}
                  onPress={handleLogout}
                >
                  <Text style={styles.menuIcon}>🚪</Text>
                  <Text style={[styles.menuText, { color: '#EF4444', fontWeight: '700', fontSize: 18 }]}>LOGOUT</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('Dashboard')}
                >
                  <Text style={styles.menuIcon}>📊</Text>
                  <Text style={styles.menuText}>Dashboard</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('AddVehicle')}
                >
                  <Text style={styles.menuIcon}>🚗</Text>
                  <Text style={styles.menuText}>Entry Vehicle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('WashCycle')}
                >
                  <Text style={styles.menuIcon}>🔄</Text>
                  <Text style={styles.menuText}>Wash Cycle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('Slots')}
                >
                  <Text style={styles.menuIcon}>🎫</Text>
                  <Text style={styles.menuText}>Slot Management</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('SlotBookings')}
                >
                  <View style={styles.menuIcon}>
                    <CalendarIcon size={24} />
                  </View>
                  <Text style={styles.menuText}>Slot Bookings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('Estimations')}
                >
                  <Text style={styles.menuIcon}>📄</Text>
                  <Text style={styles.menuText}>Estimations</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('Subscription')}
                >
                  <Text style={styles.menuIcon}>🧾</Text>
                  <Text style={styles.menuText}>Subscription</Text>
                </TouchableOpacity>

                {userRole === 'WORKER' && (
                  <>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleNavigate('WorkerProfile')}
                    >
                      <Text style={styles.menuIcon}>👤</Text>
                      <Text style={styles.menuText}>My Profile</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.menuItem, {
                        borderTopWidth: 2,
                        borderTopColor: '#EF4444',
                        marginTop: 20,
                        paddingTop: 20,
                        backgroundColor: '#FEE2E2',
                        paddingBottom: 40
                      }]}
                      onPress={handleLogout}
                    >
                      <Text style={styles.menuIcon}>🚪</Text>
                      <Text style={[styles.menuText, { color: '#EF4444', fontWeight: '700', fontSize: 18 }]}>LOGOUT</Text>
                    </TouchableOpacity>
                  </>
                )}

                {userRole === 'ADMIN' && (
                  <>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleNavigate('Workers')}
                    >
                      <Text style={styles.menuIcon}>👷</Text>
                      <Text style={styles.menuText}>Workers</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleNavigate('ManageUsers')}
                    >
                      <Text style={styles.menuIcon}>👥</Text>
                      <Text style={styles.menuText}>Manage Users</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleNavigate('Pricing')}
                    >
                      <Text style={styles.menuIcon}>💰</Text>
                      <Text style={styles.menuText}>Pricing</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleNavigate('PushNotification')}
                    >
                      <Text style={styles.menuIcon}>📢</Text>
                      <Text style={styles.menuText}>Push Notification</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleNavigate('Settings')}
                    >
                      <Text style={styles.menuIcon}>⚙️</Text>
                      <Text style={styles.menuText}>Settings</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.menuItem, {
                        borderTopWidth: 2,
                        borderTopColor: '#EF4444',
                        marginTop: 20,
                        paddingTop: 20,
                        backgroundColor: '#FEE2E2',
                        paddingBottom: 40
                      }]}
                      onPress={handleLogout}
                    >
                      <Text style={styles.menuIcon}>🚪</Text>
                      <Text style={[styles.menuText, { color: '#EF4444', fontWeight: '700', fontSize: 18 }]}>LOGOUT</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </ScrollView>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    width: 280,
    height: '100%',
    backgroundColor: '#fff',
    flexDirection: 'column',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoText: {
    fontSize: 40,
  },
  welcomeText: {
    color: '#E9D5FF',
    fontSize: 14,
    marginBottom: 4,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userRole: {
    color: '#E9D5FF',
    fontSize: 12,
    marginTop: 4,
  },
  menuSection: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 120,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
  },
  menuText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  restrictedBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  restrictedTitle: {
    color: '#991B1B',
    fontWeight: '700',
    marginBottom: 4,
  },
  restrictedText: {
    color: '#7F1D1D',
    fontSize: 12,
    lineHeight: 18,
  },
  logoutSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginTop: 20,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    backgroundColor: '#fff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
  },
  logoutText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
});
