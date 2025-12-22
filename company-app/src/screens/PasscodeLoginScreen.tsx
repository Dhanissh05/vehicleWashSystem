import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, gql } from '@apollo/client';

const GET_CENTER = gql`
  query GetCenter {
    centers {
      id
      name
      logoUrl
    }
  }
`;

export default function PasscodeLoginScreen({ navigation }: any) {
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('');
  const [userName, setUserName] = useState('');

  const { data } = useQuery(GET_CENTER);
  const center = data?.centers?.[0];

  useEffect(() => {
    loadUserData();
    checkBiometric();
  }, []);

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

  const checkBiometric = async () => {
    try {
      const enabled = await AsyncStorage.getItem('biometric_enabled');
      if (enabled === 'true') {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

        if (hasHardware && isEnrolled) {
          setBiometricAvailable(true);
          setBiometricEnabled(true);
          if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            setBiometricType('Face ID');
          } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            setBiometricType('Fingerprint');
          }
          // Auto-trigger biometric
          setTimeout(() => handleBiometricLogin(), 500);
        }
      }
    } catch (error) {
      console.error('Biometric check error:', error);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Login to Company App',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        navigation.replace('Dashboard');
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
    }
  };

  const handleNumberPress = (num: string) => {
    if (passcode.length < 4) {
      const newPasscode = passcode + num;
      setPasscode(newPasscode);
      if (newPasscode.length === 4) {
        setTimeout(() => verifyPasscode(newPasscode), 200);
      }
    }
  };

  const handleDelete = () => {
    setPasscode(passcode.slice(0, -1));
  };

  const verifyPasscode = async (enteredPasscode: string) => {
    setLoading(true);
    try {
      const storedPasscode = await AsyncStorage.getItem('app_passcode');
      if (enteredPasscode === storedPasscode) {
        navigation.replace('Dashboard');
      } else {
        Alert.alert('Error', 'Incorrect passcode');
        setPasscode('');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify passcode');
      setPasscode('');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasscode = () => {
    Alert.alert(
      'Forgot Passcode',
      'You will need to login with your mobile number and password again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('app_passcode');
            await AsyncStorage.removeItem('passcode_enabled');
            await AsyncStorage.removeItem('biometric_enabled');
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {[...Array(4)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < passcode.length && styles.dotFilled,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderKeypad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', '⌫'],
    ];

    return (
      <View style={styles.keypad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((num, colIndex) => (
              <TouchableOpacity
                key={colIndex}
                style={[styles.keypadButton, num === '' && styles.keypadButtonEmpty]}
                onPress={() => {
                  if (num === '⌫') handleDelete();
                  else if (num !== '') handleNumberPress(num);
                }}
                disabled={num === '' || loading}
              >
                <Text style={styles.keypadButtonText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.container}>
      <View style={styles.content}>
        {/* Logo and Title */}
        <View style={styles.header}>
          {center?.logoUrl ? (
            <Image source={{ uri: center.logoUrl }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoText}>🚗</Text>
            </View>
          )}
          <Text style={styles.centerName}>{center?.name || 'Company App'}</Text>
          {userName && <Text style={styles.userName}>Welcome, {userName}</Text>}
        </View>

        <Text style={styles.title}>Enter Passcode</Text>

        {biometricEnabled && (
          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricLogin}
          >
            <Text style={styles.biometricButtonText}>
              Use {biometricType || 'Biometric'}
            </Text>
          </TouchableOpacity>
        )}

        {loading ? (
          <ActivityIndicator size="large" color="#FFFFFF" style={{ marginVertical: 40 }} />
        ) : (
          renderDots()
        )}

        {renderKeypad()}

        <TouchableOpacity
          style={styles.forgotButton}
          onPress={handleForgotPasscode}
        >
          <Text style={styles.forgotButtonText}>Forgot Passcode?</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  logoText: {
    fontSize: 40,
  },
  centerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  userName: {
    fontSize: 16,
    color: '#E9D5FF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  biometricButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 30,
  },
  biometricButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 60,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginHorizontal: 10,
  },
  dotFilled: {
    backgroundColor: '#FFFFFF',
  },
  keypad: {
    width: '100%',
    maxWidth: 300,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  keypadButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keypadButtonEmpty: {
    backgroundColor: 'transparent',
  },
  keypadButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  forgotButton: {
    marginTop: 30,
    padding: 15,
  },
  forgotButtonText: {
    color: '#E9D5FF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
