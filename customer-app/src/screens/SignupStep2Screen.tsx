import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SignupStep2Props {
  navigation: any;
  route: any;
}

/**
 * SIGNUP SCREEN 2: Address Details
 * Collects: Address (required), City (required), Pin code (required)
 */
export default function SignupStep2Screen({ navigation, route }: SignupStep2Props) {
  const { name, email, mobile, dob } = route.params;
  
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [errors, setErrors] = useState<any>({});

  // Validation
  const validate = () => {
    const newErrors: any = {};

    // Address validation
    if (!address.trim()) {
      newErrors.address = 'Address is required';
    } else if (address.trim().length < 10) {
      newErrors.address = 'Please enter a complete address';
    }

    // City validation
    if (!city.trim()) {
      newErrors.city = 'City is required';
    } else if (city.trim().length < 2) {
      newErrors.city = 'Please enter a valid city name';
    }

    // Pin code validation
    if (!pinCode) {
      newErrors.pinCode = 'Pin code is required';
    } else if (!/^\d{6}$/.test(pinCode)) {
      newErrors.pinCode = 'Please enter a valid 6-digit pin code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) {
      return;
    }

    // Navigate to password creation screen with user data
    navigation.navigate('SignupStep3', {
      name,
      email,
      mobile,
      dob,
      address,
      city,
      pinCode,
    });
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
            <Text style={styles.iconText}>📍</Text>
          </View>
          <Text style={styles.title}>Address Details</Text>
          <Text style={styles.subtitle}>Where can we reach you?</Text>
        </LinearGradient>

        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.progressIndicator}>
            <View style={styles.progressDot} />
            <View style={styles.progressLine} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
            <View style={styles.progressLine} />
            <View style={styles.progressDot} />
          </View>

          <Text style={styles.stepTitle}>Step 2 of 4</Text>
          <Text style={styles.stepSubtitle}>Tell us your location</Text>

          {/* Address Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Address <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.address && styles.inputError]}
              placeholder="Enter your full address"
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                if (errors.address) setErrors({ ...errors, address: null });
              }}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {errors.address && (
              <Text style={styles.errorText}>{errors.address}</Text>
            )}
          </View>

          {/* City Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              City <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.city && styles.inputError]}
              placeholder="Enter your city"
              placeholderTextColor="#9CA3AF"
              value={city}
              onChangeText={(text) => {
                setCity(text);
                if (errors.city) setErrors({ ...errors, city: null });
              }}
              autoCapitalize="words"
            />
            {errors.city && (
              <Text style={styles.errorText}>{errors.city}</Text>
            )}
          </View>

          {/* Pin Code Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Pin Code <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.pinCode && styles.inputError]}
              placeholder="Enter 6-digit pin code"
              placeholderTextColor="#9CA3AF"
              value={pinCode}
              onChangeText={(text) => {
                setPinCode(text.replace(/[^0-9]/g, ''));
                if (errors.pinCode) setErrors({ ...errors, pinCode: null });
              }}
              keyboardType="number-pad"
              maxLength={6}
            />
            {errors.pinCode && (
              <Text style={styles.errorText}>{errors.pinCode}</Text>
            )}
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleContinue}
          >
            <Text style={styles.buttonText}>Continue</Text>
            <Text style={styles.buttonIcon}>→</Text>
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
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  inputError: {
    borderColor: '#EF4444',
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
});
