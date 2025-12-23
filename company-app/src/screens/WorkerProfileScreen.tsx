import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, gql } from '@apollo/client';
import * as ImagePicker from 'expo-image-picker';

const GET_ME = gql`
  query GetMe {
    me {
      id
      name
      email
      mobile
      role
      photoUrl
    }
  }
`;

const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      email
      mobile
      photoUrl
    }
  }
`;

const CHANGE_PASSWORD = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input) {
      id
    }
  }
`;

const SEND_PROFILE_OTP = gql`
  mutation SendProfileOtp($type: String!, $value: String!) {
    sendProfileOtp(type: $type, value: $value) {
      success
      message
    }
  }
`;

const VERIFY_PROFILE_OTP = gql`
  mutation VerifyProfileOtp($type: String!, $value: String!, $code: String!) {
    verifyProfileOtp(type: $type, value: $value, code: $code)
  }
`;

export default function WorkerProfileScreen({ navigation }: any) {
  const { data, loading, refetch } = useQuery(GET_ME);
  const [updateProfile, { loading: updatingProfile }] = useMutation(UPDATE_PROFILE, {
    refetchQueries: [{ query: GET_ME }],
  });
  const [changePassword, { loading: changingPassword }] = useMutation(CHANGE_PASSWORD);
  const [sendProfileOtp] = useMutation(SEND_PROFILE_OTP);
  const [verifyProfileOtp] = useMutation(VERIFY_PROFILE_OTP);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showEditEmail, setShowEditEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePickImage = async () => {
    Alert.alert(
      'Update Profile Picture',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            
            if (permissionResult.granted === false) {
              Alert.alert('Permission Required', 'Please allow access to your camera');
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });

            if (!result.canceled) {
              await handleUploadPhoto(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Choose from Library',
          onPress: async () => {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (permissionResult.granted === false) {
              Alert.alert('Permission Required', 'Please allow access to your photos');
              return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.7,
            });

            if (!result.canceled) {
              await handleUploadPhoto(result.assets[0].uri);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleUploadPhoto = async (photoUri: string) => {
    try {
      setUploadingPhoto(true);
      
      // Get the file name
      const fileName = photoUri.split('/').pop() || 'profile.jpg';
      const fileType = fileName.split('.').pop() || 'jpg';

      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri: photoUri,
        name: fileName,
        type: `image/${fileType}`,
      } as any);

      // Get token
      const token = await AsyncStorage.getItem('token');

      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
      if (!API_BASE_URL) {
        throw new Error('EXPO_PUBLIC_API_BASE_URL is not defined in .env file');
      }

      // Upload to server
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const { url } = await response.json();

      // Update profile with photo URL
      await updateProfile({
        variables: {
          input: {
            photoUrl: url,
          },
        },
      });

      Alert.alert('Success', 'Profile picture updated successfully');
      setUploadingPhoto(false);
    } catch (error: any) {
      setUploadingPhoto(false);
      Alert.alert('Error', error.message || 'Failed to upload photo');
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    try {
      await changePassword({
        variables: {
          input: {
            currentPassword,
            newPassword,
          },
        },
      });

      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Password changed successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change password');
    }
  };

  const handleSendEmailOtp = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      const { data } = await sendProfileOtp({
        variables: {
          type: 'EMAIL',
          value: newEmail,
        },
      });
      Alert.alert('Success', data.sendProfileOtp.message);
      setEmailOtpSent(true);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    try {
      await verifyProfileOtp({
        variables: {
          type: 'EMAIL',
          value: newEmail,
          code: emailOtp,
        },
      });
      setEmailVerified(true);
      Alert.alert('Success', 'Email verified successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleUpdateEmail = async () => {
    if (!emailVerified) {
      Alert.alert('Error', 'Please verify your email with OTP first');
      return;
    }

    try {
      await updateProfile({
        variables: {
          input: {
            email: newEmail,
            emailOtp: emailOtp,
          },
        },
      });

      setShowEditEmail(false);
      setNewEmail('');
      setEmailOtp('');
      setEmailOtpSent(false);
      setEmailVerified(false);
      Alert.alert('Success', 'Email updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  const user = data?.me;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.photoContainer}
            onPress={handlePickImage}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <ActivityIndicator size="large" color="#8B5CF6" />
            ) : user?.photoUrl ? (
              <Image
                source={{ uri: user.photoUrl }}
                style={styles.profilePhoto}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Text style={styles.cameraIconText}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name || 'Worker'}</Text>
          <Text style={styles.mobile}>{user?.mobile}</Text>
          {user?.email && <Text style={styles.email}>{user.email}</Text>}
        </View>

        {/* Profile Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => {
              setNewEmail(user?.email || '');
              setShowEditEmail(true);
            }}
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionIcon}>📧</Text>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Email Address</Text>
                <Text style={styles.optionDescription}>
                  {user?.email || 'Not set'}
                </Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => setShowChangePassword(true)}
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionIcon}>🔒</Text>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Change Password</Text>
                <Text style={styles.optionDescription}>
                  Update your account password
                </Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => refetch()}
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionIcon}>🔄</Text>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Refresh Profile</Text>
                <Text style={styles.optionDescription}>
                  Update profile information
                </Text>
              </View>
            </View>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>🚪 Logout</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Vehicle Wash System v1.0.0</Text>
        </View>
      </View>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangePassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              secureTextEntry
              autoCapitalize="none"
            />

            <Text style={styles.passwordHint}>
              Password must be at least 6 characters long
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setShowChangePassword(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Email Modal */}
      <Modal
        visible={showEditEmail}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditEmail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Email</Text>
            
            <Text style={styles.label}>Email Address</Text>
            <View style={styles.otpFieldContainer}>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={newEmail}
                onChangeText={(text) => {
                  setNewEmail(text);
                  setEmailOtpSent(false);
                  setEmailVerified(false);
                  setEmailOtp('');
                }}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {newEmail !== user?.email && (
                <TouchableOpacity
                  style={[styles.otpButton, emailVerified && styles.otpButtonVerified]}
                  onPress={handleSendEmailOtp}
                  disabled={emailVerified}
                >
                  <Text style={styles.otpButtonText}>
                    {emailVerified ? '✓ Verified' : 'Send OTP'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {emailOtpSent && !emailVerified && (
              <>
                <Text style={styles.otpHint}>
                  📧 OTP sent to {newEmail}. Check console for now.
                </Text>
                <View style={styles.otpVerifyContainer}>
                  <TextInput
                    style={[styles.input, styles.otpCodeInput]}
                    value={emailOtp}
                    onChangeText={setEmailOtp}
                    placeholder="Enter 6-digit OTP"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={handleVerifyEmailOtp}
                  >
                    <Text style={styles.verifyButtonText}>Verify</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={styles.infoText}>
              💡 Email change requires OTP verification
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setNewEmail('');
                  setEmailOtp('');
                  setEmailOtpSent(false);
                  setEmailVerified(false);
                  setShowEditEmail(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateEmail}
                disabled={updatingProfile || !emailVerified}
              >
                {updatingProfile ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  photoPlaceholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  cameraIconText: {
    fontSize: 18,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  mobile: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  arrowIcon: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 12,
  },
  passwordHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 20,
  },
  otpFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  otpInput: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  otpButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  otpButtonVerified: {
    backgroundColor: '#10B981',
  },
  otpButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  otpHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  otpVerifyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  otpCodeInput: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  verifyButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
