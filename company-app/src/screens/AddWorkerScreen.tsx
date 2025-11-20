import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Clipboard,
} from 'react-native';
import { useMutation, gql } from '@apollo/client';

const CREATE_WORKER = gql`
  mutation CreateWorker($input: CreateWorkerInput!) {
    createWorker(input: $input) {
      user {
        id
        name
        mobile
        email
        role
      }
      workerCode
      plainPassword
    }
  }
`;

const SEND_WORKER_CREDENTIALS_SMS = gql`
  mutation SendWorkerCredentialsSms($mobile: String!, $workerCode: String!, $password: String!) {
    sendWorkerCredentialsSms(mobile: $mobile, workerCode: $workerCode, password: $password)
  }
`;

export default function AddWorkerScreen() {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [credentials, setCredentials] = useState<{
    workerCode: string;
    password: string;
    mobile: string;
  } | null>(null);

  const [createWorker, { loading }] = useMutation(CREATE_WORKER, {
    fetchPolicy: 'no-cache',
    onCompleted: (data) => {
      console.log('Worker created successfully:', data);
      const { workerCode, plainPassword, user } = data.createWorker;
      setCredentials({
        workerCode,
        password: plainPassword,
        mobile: user.mobile,
      });
      setShowCredentials(true);
      // Clear form
      setName('');
      setMobile('');
      setEmail('');
    },
    onError: (error) => {
      console.error('GraphQL Error:', error);
      console.error('Network Error:', error.networkError);
      console.error('GraphQL Errors:', error.graphQLErrors);
      
      let errorMessage = error.message || 'Failed to create worker';
      
      // Check for unique constraint error
      if (errorMessage.includes('Unique constraint') && errorMessage.includes('mobile')) {
        errorMessage = 'This mobile number is already registered. Please use a different mobile number.';
      }
      
      Alert.alert('Error', errorMessage);
    },
  });

  const [sendSMS, { loading: sendingSMS }] = useMutation(SEND_WORKER_CREDENTIALS_SMS, {
    onCompleted: () => {
      Alert.alert('Success', 'Credentials sent via SMS');
    },
    onError: (error) => {
      Alert.alert('SMS Error', error.message);
    },
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter worker name');
      return;
    }

    if (!mobile.trim()) {
      Alert.alert('Validation Error', 'Please enter mobile number');
      return;
    }

    if (mobile.length !== 10) {
      Alert.alert('Validation Error', 'Mobile number must be 10 digits');
      return;
    }

    if (email && !email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter valid email');
      return;
    }

    // Generate a random secure password
    const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

    const inputData: any = {
      name: name.trim(),
      mobile: mobile.trim(),
      password: randomPassword,
    };

    // Only add email if it's provided
    if (email.trim()) {
      inputData.email = email.trim();
    }

    console.log('Creating worker with input:', inputData);

    createWorker({
      variables: {
        input: inputData,
      },
    });
  };

  const handleSendSMS = () => {
    if (!credentials) return;

    sendSMS({
      variables: {
        mobile: credentials.mobile,
        workerCode: credentials.workerCode,
        password: credentials.password,
      },
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  const downloadCredentials = () => {
    if (!credentials) return;
    
    const text = `Worker Credentials\n\nWorker Code: ${credentials.workerCode}\nPassword: ${credentials.password}\nMobile: ${credentials.mobile}\n\nPlease keep these credentials safe.`;
    
    Alert.alert(
      'Credentials',
      text,
      [
        {
          text: 'Copy All',
          onPress: () => {
            Clipboard.setString(text);
            Alert.alert('Copied', 'All credentials copied to clipboard');
          },
        },
        { text: 'OK' },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add New Worker</Text>
        <Text style={styles.subtitle}>
          Create a new worker account with auto-generated credentials
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter worker name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="10 digit mobile number"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="worker@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Create Worker</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ What happens next?</Text>
          <Text style={styles.infoText}>
            • A unique worker code will be generated{'\n'}
            • A secure password will be created{'\n'}
            • Credentials will be shown on screen{'\n'}
            • You can send credentials via SMS{'\n'}
            • Worker can login using mobile/code + password
          </Text>
        </View>
      </View>

      {/* Credentials Modal */}
      <Modal
        visible={showCredentials}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCredentials(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎉 Worker Created!</Text>
              <Text style={styles.modalSubtitle}>
                Save these credentials securely
              </Text>
            </View>

            {credentials && (
              <View style={styles.credentialsContainer}>
                <View style={styles.credentialRow}>
                  <View style={styles.credentialInfo}>
                    <Text style={styles.credentialLabel}>Worker Code</Text>
                    <Text style={styles.credentialValue}>
                      {credentials.workerCode}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(credentials.workerCode, 'Worker Code')}
                  >
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.credentialRow}>
                  <View style={styles.credentialInfo}>
                    <Text style={styles.credentialLabel}>Password</Text>
                    <Text style={styles.credentialValue}>
                      {credentials.password}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyButton}
                    onPress={() => copyToClipboard(credentials.password, 'Password')}
                  >
                    <Text style={styles.copyButtonText}>Copy</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.credentialRow}>
                  <View style={styles.credentialInfo}>
                    <Text style={styles.credentialLabel}>Mobile</Text>
                    <Text style={styles.credentialValue}>
                      {credentials.mobile}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.smsButton}
                onPress={handleSendSMS}
                disabled={sendingSMS}
              >
                {sendingSMS ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.smsButtonText}>📱 Send via SMS</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.downloadButton}
                onPress={downloadCredentials}
              >
                <Text style={styles.downloadButtonText}>📋 Copy All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCredentials(false)}
              >
                <Text style={styles.closeButtonText}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Make sure to save these credentials. They won't be shown again!
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
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
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  credentialsContainer: {
    marginBottom: 24,
  },
  credentialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  credentialInfo: {
    flex: 1,
  },
  credentialLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  credentialValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  copyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalActions: {
    marginBottom: 16,
  },
  smsButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  smsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  downloadButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
});
