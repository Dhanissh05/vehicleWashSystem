import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, gql } from '@apollo/client';
import { SYSTEM_CONFIG } from '../apollo/queries';
import CalendarIcon from './CalendarIcon';

const GET_USER_PROFILE = gql`
  query GetUserProfile {
    me {
      id
      name
      photoUrl
    }
  }
`;

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
}

export default function MenuModal({ visible, onClose, navigation }: MenuModalProps) {
  const [userName, setUserName] = useState('Guest');
  const { data: userData, refetch: refetchUser } = useQuery(GET_USER_PROFILE, {
    fetchPolicy: 'network-only',
  });
  const { data: configData, refetch: refetchConfig } = useQuery(SYSTEM_CONFIG, {
    variables: { key: 'ENABLE_SLOT_BOOKING' },
    fetchPolicy: 'network-only',
  });
  const userPhoto = userData?.me?.photoUrl;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const slotBookingEnabled = configData?.systemConfig?.value === 'true';

  // Load user data whenever modal becomes visible
  useEffect(() => {
    if (visible) {
      loadUserData();
      // Refetch user profile and config to get latest data
      refetchUser();
      refetchConfig();
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
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUserName(user.name || user.mobile);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    onClose();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Landing' }],
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
          {/* Header with User Profile Picture */}
          <View style={styles.header}>
            <View style={styles.logoPlaceholder}>
              {userPhoto ? (
                <Image 
                  source={{ uri: userPhoto }} 
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.logoPlaceholderText}>
                  {(userData?.me?.name || userName)?.charAt(0)?.toUpperCase() || '👤'}
                </Text>
              )}
            </View>
            <Text style={styles.welcomeText}>Welcome</Text>
            <Text style={styles.userName}>{userData?.me?.name || userName}</Text>
          </View>

          {/* Menu Items */}
          <View style={styles.menuSection}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('HomeMain')}
            >
              <Text style={styles.menuIcon}>🏠</Text>
              <Text style={styles.menuText}>My Vehicles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('AddVehicle')}
            >
              <Text style={styles.menuIcon}>➕</Text>
              <Text style={styles.menuText}>Add Vehicle</Text>
            </TouchableOpacity>

            {slotBookingEnabled && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('SlotBooking')}
                >
                  <View style={styles.menuIcon}>
                    <CalendarIcon size={24} />
                  </View>
                  <Text style={styles.menuText}>Slot Booking</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('BookedSlots')}
                >
                  <Text style={styles.menuIcon}>📋</Text>
                  <Text style={styles.menuText}>Booked Slots</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('TrackProgress')}
            >
              <Text style={styles.menuIcon}>📍</Text>
              <Text style={styles.menuText}>Track Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('Payments')}
            >
              <Text style={styles.menuIcon}>💳</Text>
              <Text style={styles.menuText}>Payments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleNavigate('Profile')}
            >
              <Text style={styles.menuIcon}>👤</Text>
              <Text style={styles.menuText}>Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Footer with Logout */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
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
  },
  header: {
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#3B82F6',
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
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  logoPlaceholderText: {
    fontSize: 40,
  },
  welcomeText: {
    color: '#E0E7FF',
    fontSize: 14,
    marginBottom: 4,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuSection: {
    flex: 1,
    paddingTop: 20,
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
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 20,
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
