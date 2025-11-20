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
} from 'react-native';
import { useMutation, useLazyQuery, useQuery } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEND_OTP, VERIFY_OTP, CHECK_USER_EXISTS, CENTERS } from '../apollo/queries';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const [checkUserExists, { loading: checkingUser }] = useLazyQuery(CHECK_USER_EXISTS);
  const [sendOtp, { loading: sendingOtp }] = useMutation(SEND_OTP);
  const [verifyOtp, { loading: verifyingOtp }] = useMutation(VERIFY_OTP);
  const { data: centerData } = useQuery(CENTERS);
  
  const center = centerData?.centers?.[0];

  const handleSendOtp = async () => {
    if (mobile.length < 10) {
      Alert.alert('Error', 'Please enter a valid mobile number');
      return;
    }

    try {
      // Check if user exists before sending OTP
      const { data } = await checkUserExists({ variables: { mobile } });
      
      if (!data?.checkUserExists) {
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

      await sendOtp({ variables: { mobile } });
      setOtpSent(true);
      Alert.alert('Success', 'OTP sent! Check the backend console for the OTP code.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    try {
      const { data } = await verifyOtp({ variables: { mobile, code: otp } });
      await AsyncStorage.setItem('token', data.verifyOtp.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.verifyOtp.user));
      navigation.replace('Home');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid OTP');
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
          <Text style={styles.formTitle}>
            {otpSent ? 'Enter OTP' : 'Welcome Back'}
          </Text>
          <Text style={styles.formSubtitle}>
            {otpSent 
              ? 'We sent a 6-digit code to your mobile' 
              : 'Sign in to book your vehicle wash'}
          </Text>

          {!otpSent ? (
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
          ) : (
            <>
              <View style={styles.mobileDisplay}>
                <Text style={styles.mobileLabel}>Sent to:</Text>
                <Text style={styles.mobileNumber}>+91 {mobile}</Text>
                <TouchableOpacity onPress={() => {
                  setOtpSent(false);
                  setOtp('');
                }}>
                  <Text style={styles.changeButton}>Change</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.otpContainer}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  autoFocus
                />
              </View>

              <Text style={styles.otpHint}>
                💡 Check the backend console for the OTP code
              </Text>
            </>
          )}

          <TouchableOpacity
            style={[styles.button, (sendingOtp || verifyingOtp || checkingUser) && styles.buttonDisabled]}
            onPress={otpSent ? handleVerifyOtp : handleSendOtp}
            disabled={sendingOtp || verifyingOtp || checkingUser}
          >
            {(sendingOtp || verifyingOtp || checkingUser) ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>
                  {otpSent ? 'Verify & Continue' : 'Send OTP'}
                </Text>
                <Text style={styles.buttonIcon}>{otpSent ? '✓' : '→'}</Text>
              </>
            )}
          </TouchableOpacity>

          {otpSent && (
            <TouchableOpacity
              style={styles.resendContainer}
              onPress={handleSendOtp}
              disabled={sendingOtp}
            >
              <Text style={styles.resendText}>Didn't receive code? </Text>
              <Text style={styles.resendLink}>Resend OTP</Text>
            </TouchableOpacity>
          )}

          {!otpSent && (
            <TouchableOpacity
              style={styles.signupLinkContainer}
              onPress={() => navigation.navigate('SignupStep1')}
            >
              <Text style={styles.signupText}>Don't have an account? </Text>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          )}
        </View>

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
  mobileDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  mobileLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  mobileNumber: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  changeButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  otpContainer: {
    marginBottom: 12,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: 'bold',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  otpHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
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
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
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
});
