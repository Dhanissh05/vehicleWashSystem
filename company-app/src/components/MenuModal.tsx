import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, gql } from '@apollo/client';

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
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { data, refetch } = useQuery(GET_CENTER);
  
  const center = data?.centers?.[0];

  useEffect(() => {
    if (visible) {
      loadUserData();
      refetch(); // Refetch to get latest user data including photo
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
        setUserRole(user.role);
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
          <View style={styles.menuSection}>
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
              <Text style={styles.menuText}>Slots</Text>
            </TouchableOpacity>

            {userRole === 'WORKER' && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('WorkerProfile')}
              >
                <Text style={styles.menuIcon}>👤</Text>
                <Text style={styles.menuText}>My Profile</Text>
              </TouchableOpacity>
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
                  onPress={() => handleNavigate('Pricing')}
                >
                  <Text style={styles.menuIcon}>💰</Text>
                  <Text style={styles.menuText}>Pricing</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleNavigate('Settings')}
                >
                  <Text style={styles.menuIcon}>⚙️</Text>
                  <Text style={styles.menuText}>Settings</Text>
                </TouchableOpacity>
              </>
            )}
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
