import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import { useMutation, useLazyQuery, useQuery } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOGIN, CHECK_USER_EXISTS, CENTERS, SEND_OTP, VERIFY_OTP, UPDATE_PASSWORD, UPDATE_FCM_TOKEN } from '../apollo/queries';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot Password states
  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: Enter Mobile, 2: Enter OTP, 3: Set New Password
  const [forgotMobile, setForgotMobile] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [checkUserExists, { loading: checkingUser }] = useLazyQuery(CHECK_USER_EXISTS);
  const [login, { loading: loggingIn }] = useMutation(LOGIN);
  const { data: centerData } = useQuery(CENTERS);
  
  const [sendOtp, { loading: sendingOtp }] = useMutation(SEND_OTP);
  const [verifyOtp, { loading: verifyingOtp }] = useMutation(VERIFY_OTP);
  const [updatePassword, { loading: updatingPassword }] = useMutation(UPDATE_PASSWORD);
  const [updateFcmToken] = useMutation(UPDATE_FCM_TOKEN);
  
  const center = centerData?.centers?.[0];

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

  const handleLogin = async () => {
    if (mobile.length < 10) {
      Alert.alert('Error', 'Please enter a valid mobile number');
      return;
    }

    if (!password || password.length < 6) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    try {
      // Check if user exists
      const { data: userData } = await checkUserExists({ variables: { mobile } });
      
      if (!userData?.checkUserExists) {
        Alert.alert(
          'User Not Registered',
          'Please sign up to continue.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Up', onPress: () => navigation.navigate('SignupStep1') }
          ]
        );
        return;
      }

      // Login with password
      const { data } = await login({ variables: { mobile, password } });
      
      if (data?.login?.token) {
        // Check if user is a worker or admin
        if (data.login.user.role === 'WORKER' || data.login.user.role === 'ADMIN') {
          Alert.alert(
            'Wrong App',
            'You are registered as staff. Please use the Company App to login.',
            [{ text: 'OK' }]
          );
          return;
        }

        await AsyncStorage.setItem('token', data.login.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.login.user));
        
        // Register for push notifications immediately after login
        registerForPushNotifications();
        
        navigation.replace('Home');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid mobile number or password');
    }
  };

  const handleForgotPasswordOpen = () => {
    setForgotPasswordModalVisible(true);
    setForgotPasswordStep(1);
    setForgotMobile('');
    setForgotOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleForgotPasswordClose = () => {
    setForgotPasswordModalVisible(false);
    setForgotPasswordStep(1);
    setForgotMobile('');
    setForgotOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSendOtp = async () => {
    if (forgotMobile.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      // Check if user exists
      const { data: userData } = await checkUserExists({ variables: { mobile: forgotMobile } });
      
      if (!userData?.checkUserExists) {
        Alert.alert('Error', 'No account found with this mobile number. Please sign up first.');
        return;
      }

      await sendOtp({ variables: { mobile: forgotMobile } });
      Alert.alert('Success', 'OTP sent to your mobile number');
      setForgotPasswordStep(2);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (forgotOtp.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP');
      return;
    }

    try {
      await verifyOtp({ variables: { mobile: forgotMobile, code: forgotOtp } });
      Alert.alert('Success', 'OTP verified successfully');
      setForgotPasswordStep(3);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid OTP');
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      await updatePassword({ variables: { mobile: forgotMobile, password: newPassword } });
      Alert.alert(
        'Success',
        'Password reset successfully! Please login with your new password.',
        [
          {
            text: 'OK',
            onPress: () => {
              handleForgotPasswordClose();
              setMobile(forgotMobile);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reset password');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with Gradient Background */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.logoContainer}>
            {center?.logoUrl ? (
              <Image 
                source={{ uri: center.logoUrl }} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.logoPlaceholderText}>🚗</Text>
            )}
          </View>
          <Text style={styles.title}>{center?.name || 'Vehicle Wash'}</Text>
          <Text style={styles.subtitle}>Professional car care at your doorstep</Text>
        </LinearGradient>

        {/* Login Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>
            Sign in to book your vehicle wash
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter mobile number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={10}
                value={mobile}
                onChangeText={setMobile}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, (loggingIn || checkingUser) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loggingIn || checkingUser}
          >
            {(loggingIn || checkingUser) ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign In</Text>
                <Text style={styles.buttonIcon}>→</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPasswordLink}
            onPress={handleForgotPasswordOpen}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signupLinkContainer}
            onPress={() => navigation.navigate('SignupStep1')}
          >
            <Text style={styles.signupText}>Don't have an account? </Text>
            <Text style={styles.signupLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Forgot Password Modal */}
        <Modal
          visible={forgotPasswordModalVisible}
          transparent
          animationType="slide"
          onRequestClose={handleForgotPasswordClose}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalKeyboardView}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {forgotPasswordStep === 1 && '🔐 Forgot Password'}
                    {forgotPasswordStep === 2 && '✉️ Verify OTP'}
                    {forgotPasswordStep === 3 && '🔑 Set New Password'}
                  </Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={handleForgotPasswordClose}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Step 1: Enter Mobile Number */}
                {forgotPasswordStep === 1 && (
                  <>
                    <Text style={styles.modalDescription}>
                      Enter your registered mobile number to receive an OTP
                    </Text>
                    <View style={styles.modalInputContainer}>
                      <Text style={styles.modalLabel}>Mobile Number</Text>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.countryCode}>+91</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter mobile number"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="phone-pad"
                          maxLength={10}
                          value={forgotMobile}
                          onChangeText={setForgotMobile}
                        />
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.modalButton, sendingOtp && styles.buttonDisabled]}
                      onPress={handleSendOtp}
                      disabled={sendingOtp}
                    >
                      {sendingOtp ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Send OTP</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                {/* Step 2: Verify OTP */}
                {forgotPasswordStep === 2 && (
                  <>
                    <Text style={styles.modalDescription}>
                      Enter the 6-digit OTP sent to +91 {forgotMobile}
                    </Text>
                    <View style={styles.modalInputContainer}>
                      <Text style={styles.modalLabel}>OTP Code</Text>
                      <TextInput
                        style={styles.otpInput}
                        placeholder="Enter 6-digit OTP"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={forgotOtp}
                        onChangeText={setForgotOtp}
                      />
                    </View>
                    <TouchableOpacity
                      style={[styles.modalButton, verifyingOtp && styles.buttonDisabled]}
                      onPress={handleVerifyOtp}
                      disabled={verifyingOtp}
                    >
                      {verifyingOtp ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Verify OTP</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.resendOtpButton}
                      onPress={handleSendOtp}
                      disabled={sendingOtp}
                    >
                      <Text style={styles.resendOtpText}>
                        {sendingOtp ? 'Sending...' : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Step 3: Set New Password */}
                {forgotPasswordStep === 3 && (
                  <>
                    <Text style={styles.modalDescription}>
                      Create a new password for your account
                    </Text>
                    <View style={styles.modalInputContainer}>
                      <Text style={styles.modalLabel}>New Password</Text>
                      <View style={styles.passwordInputWrapper}>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="Enter new password (min 6 characters)"
                          placeholderTextColor="#9CA3AF"
                          secureTextEntry={!showNewPassword}
                          value={newPassword}
                          onChangeText={setNewPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowNewPassword(!showNewPassword)}
                        >
                          <Text style={styles.eyeIcon}>{showNewPassword ? '👁️' : '👁️‍🗨️'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.modalInputContainer}>
                      <Text style={styles.modalLabel}>Confirm Password</Text>
                      <View style={styles.passwordInputWrapper}>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="Confirm new password"
                          placeholderTextColor="#9CA3AF"
                          secureTextEntry={!showConfirmPassword}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.modalButton, updatingPassword && styles.buttonDisabled]}
                      onPress={handleResetPassword}
                      disabled={updatingPassword}
                    >
                      {updatingPassword ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.buttonText}>Reset Password</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>

        {/* Features Section */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>⚡</Text>
            <Text style={styles.featureText}>Quick Service</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>💧</Text>
            <Text style={styles.featureText}>Eco-Friendly</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎯</Text>
            <Text style={styles.featureText}>Best Quality</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholderText: {
    fontSize: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  formCard: {
    margin: 24,
    marginTop: -20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  countryCode: {
    paddingLeft: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeButton: {
    padding: 16,
  },
  eyeIcon: {
    fontSize: 20,
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
  signupLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  signupText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  featureItem: {
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  forgotPasswordLink: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKeyboardView: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: 'bold',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInputContainer: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  modalButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  resendOtpButton: {
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
  },
  resendOtpText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
});
