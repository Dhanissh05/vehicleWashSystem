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
} from 'react-native';
import { useLazyQuery } from '@apollo/client';
import { LinearGradient } from 'expo-linear-gradient';
import { CHECK_USER_EXISTS } from '../apollo/queries';

interface SignupStep1Props {
  navigation: any;
}

/**
 * SIGNUP SCREEN 1: Basic Info Collection
 * Collects: Name (required), Email (optional), Mobile (required)
 * Validates client-side and sends OTP on submit
 */
export default function SignupStep1Screen({ navigation }: SignupStep1Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [dob, setDob] = useState('');
  const [errors, setErrors] = useState<any>({});

  const [checkUserExists, { loading }] = useLazyQuery(CHECK_USER_EXISTS);

  // Client-side validation
  const validate = () => {
    const newErrors: any = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Mobile validation
    if (!mobile) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[6-9]\d{9}$/.test(mobile)) {
      newErrors.mobile = 'Please enter a valid 10-digit mobile number';
    }

    // DOB validation
    if (!dob.trim()) {
      newErrors.dob = 'Date of Birth is required';
    } else {
      // Validate date format DD/MM/YYYY
      const datePattern = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
      if (!datePattern.test(dob)) {
        newErrors.dob = 'Please enter date in DD/MM/YYYY format';
      } else {
        // Check if date is valid and user is at least 13 years old
        const [day, month, year] = dob.split('/').map(Number);
        const birthDate = new Date(year, month - 1, day);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (birthDate > today) {
          newErrors.dob = 'Date of birth cannot be in the future';
        } else if (age < 13 || (age === 13 && monthDiff < 0)) {
          newErrors.dob = 'You must be at least 13 years old';
        }
      }
    }

    // Email validation (optional but must be valid if provided)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) {
      return;
    }

    try {
      // Check if user already exists
      const { data } = await checkUserExists({ variables: { mobile } });
      
      if (data?.checkUserExists) {
        Alert.alert(
          'User Already Registered',
          'This mobile number is already registered. Please login instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Login', onPress: () => navigation.navigate('Login') }
          ]
        );
        return;
      }

      // Navigate to address details screen with user data
      navigation.navigate('SignupStep2', {
        name,
        email: email || null,
        mobile,
        dob,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to verify user');
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
            <Text style={styles.iconText}>✨</Text>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </LinearGradient>

        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.progressIndicator}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
          </View>

          <Text style={styles.stepTitle}>Step 1 of 4</Text>
          <Text style={styles.stepSubtitle}>Let's start with your details</Text>

          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors({ ...errors, name: null });
              }}
              autoCapitalize="words"
            />
            {errors.name && (
              <Text style={styles.errorText}>{errors.name}</Text>
            )}
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email (Optional)</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Enter your email"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* DOB Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Date of Birth <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.dob && styles.inputError]}
              placeholder="DD/MM/YYYY"
              placeholderTextColor="#9CA3AF"
              value={dob}
              onChangeText={(text) => {
                // Auto-format date as user types
                let formatted = text.replace(/[^0-9]/g, '');
                if (formatted.length >= 2) {
                  formatted = formatted.slice(0, 2) + '/' + formatted.slice(2);
                }
                if (formatted.length >= 5) {
                  formatted = formatted.slice(0, 5) + '/' + formatted.slice(5, 9);
                }
                setDob(formatted);
                if (errors.dob) setErrors({ ...errors, dob: null });
              }}
              keyboardType="number-pad"
              maxLength={10}
            />
            {errors.dob && (
              <Text style={styles.errorText}>{errors.dob}</Text>
            )}
          </View>

          {/* Mobile Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Mobile Number <Text style={styles.required}>*</Text>
            </Text>
            <View style={[styles.phoneInputWrapper, errors.mobile && styles.inputError]}>
              <Text style={styles.countryCode}>+91</Text>
              <TextInput
                style={styles.phoneInput}
                placeholder="Enter mobile number"
                placeholderTextColor="#9CA3AF"
                value={mobile}
                onChangeText={(text) => {
                  setMobile(text.replace(/[^0-9]/g, ''));
                  if (errors.mobile) setErrors({ ...errors, mobile: null });
                }}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            {errors.mobile && (
              <Text style={styles.errorText}>{errors.mobile}</Text>
            )}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Continue</Text>
                <Text style={styles.buttonIcon}>→</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginLink}>
            <Text style={styles.loginLinkText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLinkButton}>Login</Text>
            </TouchableOpacity>
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
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
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
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  phoneInputWrapper: {
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
  phoneInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
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
    marginTop: 8,
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
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginLinkButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
});
