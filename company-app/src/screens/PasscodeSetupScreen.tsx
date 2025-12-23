import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export default function PasscodeSetupScreen({ navigation }: any) {
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [step, setStep] = useState<'create' | 'confirm'>('create');

  const handleNumberPress = (num: string) => {
    if (step === 'create') {
      if (passcode.length < 4) {
        const newPasscode = passcode + num;
        setPasscode(newPasscode);
        if (newPasscode.length === 4) {
          setTimeout(() => setStep('confirm'), 300);
        }
      }
    } else {
      if (confirmPasscode.length < 4) {
        const newConfirm = confirmPasscode + num;
        setConfirmPasscode(newConfirm);
        if (newConfirm.length === 4) {
          setTimeout(() => handleConfirm(newConfirm), 300);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'create') {
      setPasscode(passcode.slice(0, -1));
    } else {
      setConfirmPasscode(confirmPasscode.slice(0, -1));
    }
  };

  const handleConfirm = async (confirmCode: string) => {
    if (confirmCode !== passcode) {
      Alert.alert('Passcode Mismatch', 'Passcodes do not match. Please try again.', [
        {
          text: 'OK',
          onPress: () => {
            setConfirmPasscode('');
            setStep('create');
            setPasscode('');
          },
        },
      ]);
      return;
    }

    try {
      await SecureStore.setItemAsync('app_passcode', passcode);
      await AsyncStorage.setItem('isPasscodeSetup', 'true');
      navigation.replace('Dashboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to save passcode. Please try again.');
    }
  };

  const renderDots = (count: number) => {
    return (
      <View style={styles.dotsContainer}>
        {[...Array(4)].map((_, index) => (
          <View key={index} style={[styles.dot, index < count && styles.dotFilled]} />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {step === 'create' ? 'Set Your Passcode' : 'Confirm Passcode'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'create' ? 'Create a 4-digit passcode' : 'Re-enter your passcode'}
        </Text>

        {renderDots(step === 'create' ? passcode.length : confirmPasscode.length)}

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
});
