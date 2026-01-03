import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useMutation, useQuery, gql } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOGIN = gql`
  mutation Login($mobile: String!, $password: String!) {
    login(mobile: $mobile, password: $password) {
      token
      user {
        id
        mobile
        name
        role
      }
    }
  }
`;

const GET_CENTER = gql`
  query GetCenter {
    centers {
      id
      name
      logoUrl
    }
  }
`;

export default function LoginScreen({ navigation }: any) {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'WORKER'>('ADMIN');

  const [login, { loading }] = useMutation(LOGIN);
  const { data } = useQuery(GET_CENTER, {
    errorPolicy: 'ignore',
    fetchPolicy: 'cache-first',
  });
  
  const center = data?.centers?.[0];

  const handleLogin = async () => {
    if (mobile.length < 10 || !password) {
      Alert.alert('Error', 'Please enter valid credentials');
      return;
    }

    try {
      const { data } = await login({ variables: { mobile, password } });
      
      if (data.login.user.role === 'CUSTOMER') {
        Alert.alert(
          'Wrong App',
          'You are registered as a customer. Please use the Customer App with OTP to login.',
          [{ text: 'OK' }]
        );
        return;
      }

      await AsyncStorage.setItem('token', data.login.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.login.user));
      await AsyncStorage.setItem('isLoggedIn', 'true');
      
      const isPasscodeSetup = await AsyncStorage.getItem('isPasscodeSetup');
      
      if (isPasscodeSetup === 'true') {
        navigation.replace('PasscodeUnlock');
      } else {
        navigation.replace('PasscodeSetup');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid credentials');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              {center?.logoUrl ? (
                <Image
                  source={{ uri: center.logoUrl }}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>🏢</Text>
                </View>
              )}
            </View>
            <Text style={styles.title}>{center?.name || 'Main Wash Center'}</Text>
            <Text style={styles.subtitle}>Admin & Worker Portal</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Login As</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[styles.roleButton, selectedRole === 'ADMIN' && styles.roleButtonActive]}
                onPress={() => setSelectedRole('ADMIN')}
              >
                <Text style={[styles.roleText, selectedRole === 'ADMIN' && styles.roleTextActive]}>
                  👨‍💼 Admin
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleButton, selectedRole === 'WORKER' && styles.roleButtonActive]}
                onPress={() => setSelectedRole('WORKER')}
              >
                <Text style={[styles.roleText, selectedRole === 'WORKER' && styles.roleTextActive]}>
                  👷 Worker
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your mobile number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={10}
              value={mobile}
              onChangeText={setMobile}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
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
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 56,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3E8FF',
  },
  roleText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  roleTextActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
