import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

export default function PasscodeUnlockScreen({ navigation }: any) {
  const [passcode, setPasscode] = useState('');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  const handleNumberPress = async (num: string) => {
    if (passcode.length < 4) {
      const newPasscode = passcode + num;
      setPasscode(newPasscode);
      if (newPasscode.length === 4) {
        setTimeout(() => verifyPasscode(newPasscode), 200);
      }
    }
  };

  const handleBackspace = () => {
    setPasscode(passcode.slice(0, -1));
  };

  const verifyPasscode = async (enteredPasscode: string) => {
    try {
      const storedPasscode = await SecureStore.getItemAsync('app_passcode');
      
      if (enteredPasscode === storedPasscode) {
        navigation.replace('Dashboard');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPasscode('');

        if (newAttempts >= maxAttempts) {
          Alert.alert(
            'Too Many Attempts',
            'You will be logged out for security.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  await AsyncStorage.removeItem('isLoggedIn');
                  await AsyncStorage.removeItem('token');
                  await AsyncStorage.removeItem('user');
                  navigation.replace('Login');
                },
              },
            ]
          );
        } else {
          Alert.alert('Incorrect Passcode', `${maxAttempts - newAttempts} attempts remaining`);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify passcode');
    }
  };

  const handleForgotPasscode = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          'Device Security Not Set Up',
          'Please set up device PIN, pattern, or biometric authentication in your device settings first.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to reset passcode',
        fallbackLabel: 'Use Device PIN',
      });

      if (result.success) {
        setPasscode('');
        setAttempts(0);
        navigation.replace('PasscodeSetup');
      } else {
        Alert.alert('Authentication Failed', 'Please try again');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to authenticate with device security');
    }
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {[...Array(4)].map((_, index) => (
          <View key={index} style={[styles.dot, index < passcode.length && styles.dotFilled]} />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Enter Passcode</Text>
        <Text style={styles.subtitle}>
          {attempts > 0 
            ? `Incorrect passcode. ${maxAttempts - attempts} attempts remaining` 
            : 'Enter your 4-digit passcode to continue'}
        </Text>

        {renderDots()}

        <View style={styles.keypad}>
          {[[1, 2, 3], [4, 5, 6], [7, 8, 9]].map((row, rowIndex) => (
            <View key={rowIndex} style={styles.keypadRow}>
              {row.map((num) => (
                <TouchableOpacity
                  key={num}
                  style={styles.keypadButton}
                  onPress={() => handleNumberPress(num.toString())}
                >
                  <Text style={styles.keypadButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.keypadRow}>
            <View style={styles.keypadButton} />
            <TouchableOpacity style={styles.keypadButton} onPress={() => handleNumberPress('0')}>
              <Text style={styles.keypadButtonText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keypadButton} onPress={handleBackspace}>
              <Text style={styles.keypadButtonText}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={handleForgotPasscode} style={styles.forgotButton}>
          <Text style={styles.forgotButtonText}>Forgot Passcode?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8B5CF6',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    paddingHorizontal: 20,
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
  keypadButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  forgotButton: {
    marginTop: 30,
    padding: 10,
  },
  forgotButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
