import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';

export default function PasscodeSetupScreen({ navigation, route }: any) {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('');

  React.useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      if (hasHardware && isEnrolled) {
        setBiometricAvailable(true);
        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Fingerprint');
        }
      }
    } catch (error) {
      console.error('Biometric check error:', error);
    }
  };

  const handleNumberPress = (num: string) => {
    if (step === 'create') {
      if (passcode.length < 4) {
        setPasscode(passcode + num);
        if (passcode.length === 3) {
          setTimeout(() => setStep('confirm'), 300);
        }
      }
    } else {
      if (confirmPasscode.length < 4) {
        const newConfirm = confirmPasscode + num;
        setConfirmPasscode(newConfirm);
        if (newConfirm.length === 4) {
          setTimeout(() => verifyPasscode(newConfirm), 300);
        }
      }
    }
  };

  const handleDelete = () => {
    if (step === 'create') {
      setPasscode(passcode.slice(0, -1));
    } else {
      setConfirmPasscode(confirmPasscode.slice(0, -1));
    }
  };

  const verifyPasscode = async (confirm: string) => {
    if (passcode !== confirm) {
      Alert.alert('Error', 'Passcodes do not match. Please try again.');
      setPasscode('');
      setConfirmPasscode('');
      setStep('create');
      return;
    }

    setLoading(true);
    try {
      // Save passcode
      await AsyncStorage.setItem('app_passcode', passcode);
      await AsyncStorage.setItem('passcode_enabled', 'true');

      // Ask for biometric setup if available
      if (biometricAvailable) {
        Alert.alert(
          'Enable Biometric Login',
          `Would you like to enable ${biometricType} for faster login?`,
          [
            {
              text: 'Skip',
              onPress: () => navigation.replace('Dashboard'),
            },
            {
              text: 'Enable',
              onPress: async () => {
                const result = await LocalAuthentication.authenticateAsync({
                  promptMessage: `Enable ${biometricType}`,
                });
                if (result.success) {
                  await AsyncStorage.setItem('biometric_enabled', 'true');
                  Alert.alert('Success', `${biometricType} enabled successfully!`);
                }
                navigation.replace('Dashboard');
              },
            },
          ]
        );
      } else {
        Alert.alert('Success', 'Passcode set successfully!');
        navigation.replace('Dashboard');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save passcode');
    } finally {
      setLoading(false);
    }
  };

  const renderDots = (count: number) => {
    return (
      <View style={styles.dotsContainer}>
        {[...Array(4)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index < count && styles.dotFilled,
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
                disabled={num === ''}
              >
                <Text style={styles.keypadButtonText}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {step === 'create' ? 'Create Passcode' : 'Confirm Passcode'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'create'
            ? 'Enter a 4-digit passcode for quick login'
            : 'Re-enter your passcode to confirm'}
        </Text>

        {renderDots(step === 'create' ? passcode.length : confirmPasscode.length)}
        {renderKeypad()}

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => {
            Alert.alert(
              'Skip Passcode Setup',
              'You will need to enter your mobile and password every time to login. Continue?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Skip',
                  onPress: async () => {
                    await AsyncStorage.setItem('passcode_enabled', 'false');
                    navigation.replace('Dashboard');
                  },
                },
              ]
            );
          }}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#E9D5FF',
    textAlign: 'center',
    marginBottom: 50,
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
  skipButton: {
    marginTop: 40,
    padding: 15,
  },
  skipButtonText: {
    color: '#E9D5FF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
