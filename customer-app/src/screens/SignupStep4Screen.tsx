import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useMutation } from '@apollo/client';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEND_OTP, VERIFY_OTP, UPDATE_USER, UPDATE_PASSWORD } from '../apollo/queries';

interface SignupStep4Props {
  navigation: any;
  route: any;
}

/**
 * SIGNUP SCREEN 4: OTP Verification
 * Verifies OTP sent to mobile number
 * Completes the signup process
 */
export default function SignupStep4Screen({ navigation, route }: SignupStep4Props) {
  const { name, email, mobile, dob, address, city, pinCode, password } = route.params;
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<any>([]);

  const [sendOtp, { loading: sending }] = useMutation(SEND_OTP);
  const [verifyOtp, { loading: verifying }] = useMutation(VERIFY_OTP);
  const [updateUser, { loading: updatingUser }] = useMutation(UPDATE_USER);
  const [updatePassword, { loading: updatingPassword }] = useMutation(UPDATE_PASSWORD);

  // Send OTP on component mount
  useEffect(() => {
    handleSendOtp();
  }, []);

  // Timer for resend OTP
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleSendOtp = async () => {
    try {
      await sendOtp({ variables: { mobile } });
      Alert.alert('OTP Sent', 'Please check the backend console for your OTP code.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP');
      return;
    }

    try {
      // Step 1: Verify OTP (this creates the user with mobile only)
      const { data } = await verifyOtp({
        variables: { mobile, code: otpCode },
      });

      if (!data?.verifyOtp?.token || !data?.verifyOtp?.user?.id) {
        throw new Error('Failed to verify OTP');
      }

      // Store token and basic user data
      await AsyncStorage.setItem('token', data.verifyOtp.token);

      // Step 2: Update user with complete profile data
      await updateUser({
        variables: {
          input: {
            userId: data.verifyOtp.user.id,
            name,
            email: email || undefined,
            dateOfBirth: dob,
            address,
            city,
            pinCode,
          },
        },
      });

      // Step 3: Set password
      await updatePassword({
        variables: {
          mobile,
          password,
        },
      });

      // Update AsyncStorage with complete user data
      const completeUser = {
        ...data.verifyOtp.user,
        name,
        email: email || data.verifyOtp.user.email,
      };
      await AsyncStorage.setItem('user', JSON.stringify(completeUser));

      Alert.alert(
        'Success!', 
        'Your account has been created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to biometric setup
              navigation.navigate('BiometricSetup', { mobile });
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid OTP. Please try again.');
      // Clear OTP fields
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResendOtp = async () => {
    try {
      await sendOtp({ variables: { mobile } });
      setTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      Alert.alert('Success', 'OTP has been resent to your mobile number.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
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
        {/* Header */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>📱</Text>
          </View>
          <Text style={styles.title}>Verify Mobile</Text>
          <Text style={styles.subtitle}>Enter the OTP sent to your phone</Text>
        </LinearGradient>

        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.progressIndicator}>
            <View style={styles.progressDot} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
            <View style={styles.progressLine} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>

          <Text style={styles.stepTitle}>Step 4 of 4</Text>
          <Text style={styles.stepSubtitle}>Almost there! Verify your mobile</Text>

          {/* Mobile Display */}
          <View style={styles.mobileDisplay}>
            <Text style={styles.mobileLabel}>OTP sent to:</Text>
            <Text style={styles.mobileNumber}>+91 {mobile}</Text>
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.otpInput}
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={index === 0}
              />
            ))}
          </View>

          <Text style={styles.otpHint}>
            💡 Check the backend console for the OTP code
          </Text>

          {/* Timer / Resend */}
          <View style={styles.resendContainer}>
            {!canResend ? (
              <Text style={styles.timerText}>
                Resend OTP in {timer}s
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResendOtp}
                disabled={sending}
              >
                <Text style={styles.resendButton}>
                  {sending ? 'Sending...' : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.button, (verifying || updatingUser || updatingPassword) && styles.buttonDisabled]}
            onPress={handleVerifyOtp}
            disabled={verifying || updatingUser || updatingPassword}
          >
            {(verifying || updatingUser || updatingPassword) ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Complete Signup</Text>
                <Text style={styles.buttonIcon}>✓</Text>
              </>
            )}
          </TouchableOpacity>
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
    paddingBottom: 40,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  },
  progressIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E5E7EB',
  },
  progressDotActive: {
    backgroundColor: '#667eea',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  progressLine: {
    width: 24,
    height: 2,
    backgroundColor: '#E5E7EB',
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
  mobileDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  mobileLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  mobileNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
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
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  timerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
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
});
