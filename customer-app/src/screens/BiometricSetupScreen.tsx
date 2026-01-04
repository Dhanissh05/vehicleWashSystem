import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { useMutation } from '@apollo/client';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { gql } from '@apollo/client';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const SETUP_BIOMETRIC = gql`
  mutation SetupBiometric($input: BiometricSetupInput!) {
    setupBiometric(input: $input) {
      id
      biometricEnabled
    }
  }
`;

const UPDATE_FCM_TOKEN = gql`
  mutation UpdateFcmToken($token: String!) {
    updateFcmToken(token: $token)
  }
`;

interface BiometricSetupProps {
  navigation: any;
  route: any;
}

export default function BiometricSetupScreen({ navigation, route }: BiometricSetupProps) {
  const { mobile } = route.params;
  
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string>('');

  const [setupBiometric, { loading }] = useMutation(SETUP_BIOMETRIC);
  const [updateFcmToken] = useMutation(UPDATE_FCM_TOKEN);

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  // Register for push notifications
  const registerForPushNotifications = async () => {
    try {
      if (!Device.isDevice) {
        console.log('⚠️ Must use physical device for Push Notifications');
        return;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Push notification permission denied');
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
      }

      // Get Expo Push Token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'fd7406bb-f1f5-4e5f-981e-1fd91b5286f2',
      });
      
      const token = tokenData.data;
      console.log('✅ Got Expo Push Token:', token);

      // Send token to backend
      await updateFcmToken({ variables: { token } });
      console.log('✅ FCM token registered with backend');
    } catch (error) {
      console.error('❌ Error registering push notifications:', error);
    }
  };

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (compatible && enrolled) {
        setBiometricAvailable(true);
        
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Fingerprint');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('Iris');
        } else {
          setBiometricType('Biometric');
        }
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
    }
  };

  const handleEnableBiometric = async (enabled: boolean) => {
    if (enabled) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: `Enable ${biometricType} login`,
          fallbackLabel: 'Use password instead',
          disableDeviceFallback: false,
        });

        if (result.success) {
          const biometricKey = `biometric_${mobile}_${Date.now()}`;
          await AsyncStorage.setItem(`biometric_key_${mobile}`, biometricKey);
          setBiometricEnabled(true);
          
          try {
            await setupBiometric({
              variables: {
                input: {
                  enabled: true,
                  publicKey: biometricKey,
                },
              },
            });
          } catch (error) {
            console.error('Failed to update biometric setting on server:', error);
          }
          
          Alert.alert(
            'Success!',
            `${biometricType} login has been enabled for your account.`
          );
        } else {
          Alert.alert(
            'Authentication Failed',
            'Biometric authentication was not successful. You can enable it later from settings.'
          );
        }
      } catch (error) {
        console.error('Biometric authentication error:', error);
        Alert.alert(
          'Error',
          'Failed to setup biometric authentication. Please try again later.'
        );
      }
    } else {
      setBiometricEnabled(false);
      await AsyncStorage.removeItem(`biometric_key_${mobile}`);
    }
  };

  const handleContinue = async () => {
    if (!biometricEnabled) {
      try {
        await setupBiometric({
          variables: {
            input: {
              enabled: false,
              publicKey: '',
            },
          },
        });
      } catch (error) {
        console.error('Failed to update biometric setting:', error);
      }
    }

    // HomeScreen will handle push notification registration
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeMain' }],
    });
  };

  const handleSkip = () => {
    // HomeScreen will handle push notification registration
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeMain' }],
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>
              {biometricType === 'Face ID' ? '👤' : '👆'}
            </Text>
          </View>
          <Text style={styles.title}>Setup {biometricType || 'Biometric'}</Text>
          <Text style={styles.subtitle}>Quick and secure access</Text>
        </LinearGradient>

        <View style={styles.formCard}>
          <Text style={styles.stepTitle}>One Last Step!</Text>
          <Text style={styles.stepSubtitle}>Setup biometric login (optional)</Text>

          {biometricAvailable ? (
            <>
              <View style={styles.biometricCard}>
                <View style={styles.biometricHeader}>
                  <Text style={styles.biometricIcon}>
                    {biometricType === 'Face ID' ? '👤' : '👆'}
                  </Text>
                  <View style={styles.biometricTextContainer}>
                    <Text style={styles.biometricTitle}>
                      Enable {biometricType} Login
                    </Text>
                    <Text style={styles.biometricSubtitle}>
                      Login quickly and securely using your {biometricType.toLowerCase()}
                    </Text>
                  </View>
                  <Switch
                    value={biometricEnabled}
                    onValueChange={handleEnableBiometric}
                    trackColor={{ false: '#E5E7EB', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitsTitle}>Benefits:</Text>
                <View style={styles.benefit}>
                  <Text style={styles.benefitIcon}>✓</Text>
                  <Text style={styles.benefitText}>Fast and convenient login</Text>
                </View>
                <View style={styles.benefit}>
                  <Text style={styles.benefitIcon}>✓</Text>
                  <Text style={styles.benefitText}>Secure authentication</Text>
                </View>
                <View style={styles.benefit}>
                  <Text style={styles.benefitIcon}>✓</Text>
                  <Text style={styles.benefitText}>No need to remember passwords</Text>
                </View>
                <View style={styles.benefit}>
                  <Text style={styles.benefitIcon}>✓</Text>
                  <Text style={styles.benefitText}>Can be disabled anytime from settings</Text>
                </View>
              </View>

              {biometricEnabled && (
                <View style={styles.successBanner}>
                  <Text style={styles.successIcon}>✓</Text>
                  <Text style={styles.successText}>
                    {biometricType} login successfully enabled!
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.unavailableCard}>
              <Text style={styles.unavailableIcon}>ℹ️</Text>
              <Text style={styles.unavailableTitle}>Biometric Not Available</Text>
              <Text style={styles.unavailableText}>
                Your device doesn't support biometric authentication or it's not set up.
                You can set it up later from your device settings.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>
                  {biometricEnabled ? 'Continue' : 'Continue Without Biometric'}
                </Text>
                <Text style={styles.buttonIcon}>→</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  formCard: {
    marginTop: -20,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 40,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  biometricCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  biometricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  biometricIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  biometricTextContainer: {
    flex: 1,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  biometricSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  benefitsContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitIcon: {
    fontSize: 16,
    color: '#10B981',
    marginRight: 8,
  },
  benefitText: {
    fontSize: 14,
    color: '#374151',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 20,
    color: '#10B981',
    marginRight: 8,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  unavailableCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  unavailableIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  unavailableTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
    textAlign: 'center',
  },
  unavailableText: {
    fontSize: 14,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  buttonIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  skipButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
});
