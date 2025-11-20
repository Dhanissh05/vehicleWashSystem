import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const GET_CENTER = gql`
  query GetCenter {
    centers {
      id
      name
      address
      mobile
      email
      latitude
      longitude
      logoUrl
    }
  }
`;

const UPDATE_CENTER = gql`
  mutation UpdateCenter($input: UpdateCenterInput!) {
    updateCenter(input: $input) {
      id
      name
      address
      mobile
      email
    }
  }
`;

const UPDATE_LOGO = gql`
  mutation UpdateCompanyLogo($input: UpdateLogoInput!) {
    updateCompanyLogo(input: $input) {
      id
      logoUrl
    }
  }
`;

const GET_ME = gql`
  query GetMe {
    me {
      id
      name
      email
      mobile
      role
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

const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      name
      email
      mobile
    }
  }
`;

export default function SettingsScreen({ navigation }: any) {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Profile update states
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileMobile, setProfileMobile] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);

  const { data, loading, refetch } = useQuery(GET_CENTER);
  const { data: userData, loading: userLoading, refetch: refetchUser } = useQuery(GET_ME);
  const [updateCenter, { loading: updating }] = useMutation(UPDATE_CENTER, {
    refetchQueries: [{ query: GET_CENTER }],
  });
  const [updateLogo] = useMutation(UPDATE_LOGO, {
    refetchQueries: [{ query: GET_CENTER }],
  });
  const [sendProfileOtp] = useMutation(SEND_PROFILE_OTP);
  const [verifyProfileOtp] = useMutation(VERIFY_PROFILE_OTP);
  const [updateProfile, { loading: updatingProfile }] = useMutation(UPDATE_PROFILE, {
    refetchQueries: [{ query: GET_ME }],
  });

  const center = data?.centers?.[0];
  const currentUser = userData?.me;

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload logo');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const imageUri = asset.uri;
        
        // Validate file type - only allow JPEG, PNG, WebP
        const fileExtension = imageUri.split('.').pop()?.toLowerCase();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        
        if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
          Alert.alert(
            'Invalid File Type', 
            'Please select a valid image file (JPEG, PNG, or WebP only)'
          );
          return;
        }
        
        // Validate MIME type if available
        if (asset.type && asset.type !== 'image') {
          Alert.alert('Invalid File', 'Please select an image file');
          return;
        }
        
        setUploadingLogo(true);
        
        // In a real app, you would upload to a storage service (AWS S3, Cloudinary, etc.)
        // For now, we'll use the local URI (in production, replace with actual upload)
        await updateLogo({
          variables: {
            input: {
              centerId: center.id,
              logoUrl: imageUri,
            },
          },
        });
        
        Alert.alert('Success', 'Logo updated successfully');
        setUploadingLogo(false);
        refetch();
      }
    } catch (error) {
      setUploadingLogo(false);
      Alert.alert('Error', 'Failed to upload logo');
      console.error('Logo upload error:', error);
    }
  };

  const handleEditCenter = () => {
    if (center) {
      setName(center.name);
      setAddress(center.address);
      setMobile(center.mobile);
      setEmail(center.email || '');
      setEditModalVisible(true);
    }
  };

  const handleUpdateCenter = async () => {
    if (!name.trim() || !address.trim() || mobile.length < 10) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      await updateCenter({
        variables: {
          input: {
            id: center.id,
            name,
            address,
            mobile,
            email: email || null,
          },
        },
      });
      Alert.alert('Success', 'Center details updated successfully!');
      setEditModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Profile update handlers
  const handleEditProfile = () => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfileEmail(currentUser.email || '');
      setProfileMobile(currentUser.mobile || '');
      setEmailOtpSent(false);
      setMobileOtpSent(false);
      setEmailVerified(false);
      setMobileVerified(false);
      setEmailOtp('');
      setMobileOtp('');
      setProfileModalVisible(true);
    }
  };

  const handleSendEmailOtp = async () => {
    if (!profileEmail || !profileEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      const { data } = await sendProfileOtp({
        variables: {
          type: 'EMAIL',
          value: profileEmail,
        },
      });
      Alert.alert('Success', data.sendProfileOtp.message);
      setEmailOtpSent(true);
      setEmailVerified(false);
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
          value: profileEmail,
          code: emailOtp,
        },
      });
      Alert.alert('Success', 'Email verified successfully');
      setEmailVerified(true);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSendMobileOtp = async () => {
    if (!profileMobile || profileMobile.length < 10) {
      Alert.alert('Error', 'Please enter a valid mobile number');
      return;
    }

    try {
      const { data } = await sendProfileOtp({
        variables: {
          type: 'MOBILE',
          value: profileMobile,
        },
      });
      Alert.alert('Success', data.sendProfileOtp.message);
      setMobileOtpSent(true);
      setMobileVerified(false);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (!mobileOtp || mobileOtp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    try {
      await verifyProfileOtp({
        variables: {
          type: 'MOBILE',
          value: profileMobile,
          code: mobileOtp,
        },
      });
      Alert.alert('Success', 'Mobile number verified successfully');
      setMobileVerified(true);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleUpdateProfile = async () => {
    const input: any = {};

    // Name can be updated without OTP
    if (profileName !== currentUser?.name) {
      input.name = profileName;
    }

    // Email requires OTP verification
    if (profileEmail !== currentUser?.email) {
      if (!emailVerified) {
        Alert.alert('Error', 'Please verify your email with OTP first');
        return;
      }
      input.email = profileEmail;
      input.emailOtp = emailOtp;
    }

    // Mobile requires OTP verification
    if (profileMobile !== currentUser?.mobile) {
      if (!mobileVerified) {
        Alert.alert('Error', 'Please verify your mobile number with OTP first');
        return;
      }
      input.mobile = profileMobile;
      input.mobileOtp = mobileOtp;
    }

    if (Object.keys(input).length === 0) {
      Alert.alert('Info', 'No changes detected');
      return;
    }

    try {
      await updateProfile({
        variables: { input },
      });
      Alert.alert('Success', 'Profile updated successfully!');
      setProfileModalVisible(false);
      refetchUser();
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Manage your wash center</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={styles.loader} />
      ) : (
        <View style={styles.content}>
          {/* Company Logo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Company Logo</Text>
            <View style={styles.logoCard}>
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
                    <Text style={styles.noLogoText}>No logo uploaded</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickImage}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.uploadButtonIcon}>📷</Text>
                    <Text style={styles.uploadButtonText}>
                      {center?.logoUrl ? 'Change Logo' : 'Upload Logo'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.logoHint}>
                Recommended: Square image, 512x512px or larger{'\n'}
                Accepted formats: JPEG, PNG, WebP
              </Text>
            </View>
          </View>

          {/* My Profile */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Profile</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditProfile}
              >
                <Text style={styles.editButtonText}>✏️ Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{currentUser?.name || 'Not set'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{currentUser?.email || 'Not set'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mobile</Text>
                <Text style={styles.infoValue}>{currentUser?.mobile}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={[styles.infoValue, styles.roleText]}>
                  {currentUser?.role === 'ADMIN' ? '👨‍💼 Admin' : '👷 Worker'}
                </Text>
              </View>
            </View>
          </View>

          {/* Center Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Center Information</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handleEditCenter}
              >
                <Text style={styles.editButtonText}>✏️ Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{center?.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{center?.address}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mobile</Text>
                <Text style={styles.infoValue}>{center?.mobile}</Text>
              </View>
              {center?.email && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{center.email}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Account Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleLogout}
            >
              <Text style={styles.actionIcon}>🚪</Text>
              <Text style={styles.actionText}>Logout</Text>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.infoCard}>
              <Text style={styles.appVersion}>Vehicle Wash System v1.0.0</Text>
              <Text style={styles.appCopyright}>© 2025 All Rights Reserved</Text>
            </View>
          </View>
        </View>
      )}

      {/* Edit Center Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Center Details</Text>

            <Text style={styles.label}>Center Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Enter center name"
            />

            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter full address"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Mobile Number *</Text>
            <TextInput
              style={styles.input}
              value={mobile}
              onChangeText={setMobile}
              placeholder="Enter mobile number"
              keyboardType="phone-pad"
              maxLength={10}
            />

            <Text style={styles.label}>Email (Optional)</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email address"
              keyboardType="email-address"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateCenter}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Profile</Text>

              {/* Name Field */}
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={profileName}
                onChangeText={setProfileName}
                placeholder="Enter your name"
              />

              {/* Email Field with OTP */}
              <Text style={styles.label}>Email</Text>
              <View style={styles.otpFieldContainer}>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  value={profileEmail}
                  onChangeText={(text) => {
                    setProfileEmail(text);
                    setEmailOtpSent(false);
                    setEmailVerified(false);
                    setEmailOtp('');
                  }}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                />
                {profileEmail !== currentUser?.email && (
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

              {emailOtpSent && !emailVerified && profileEmail !== currentUser?.email && (
                <>
                  <Text style={styles.otpHint}>
                    📧 OTP sent to {profileEmail}. Check console for now.
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

              {/* Mobile Field with OTP */}
              <Text style={styles.label}>Mobile Number</Text>
              <View style={styles.otpFieldContainer}>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  value={profileMobile}
                  onChangeText={(text) => {
                    setProfileMobile(text);
                    setMobileOtpSent(false);
                    setMobileVerified(false);
                    setMobileOtp('');
                  }}
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                {profileMobile !== currentUser?.mobile && (
                  <TouchableOpacity
                    style={[styles.otpButton, mobileVerified && styles.otpButtonVerified]}
                    onPress={handleSendMobileOtp}
                    disabled={mobileVerified}
                  >
                    <Text style={styles.otpButtonText}>
                      {mobileVerified ? '✓ Verified' : 'Send OTP'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {mobileOtpSent && !mobileVerified && profileMobile !== currentUser?.mobile && (
                <>
                  <Text style={styles.otpHint}>
                    📱 OTP sent to {profileMobile}. Check console for now.
                  </Text>
                  <View style={styles.otpVerifyContainer}>
                    <TextInput
                      style={[styles.input, styles.otpCodeInput]}
                      value={mobileOtp}
                      onChangeText={setMobileOtp}
                      placeholder="Enter 6-digit OTP"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <TouchableOpacity
                      style={styles.verifyButton}
                      onPress={handleVerifyMobileOtp}
                    >
                      <Text style={styles.verifyButtonText}>Verify</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <Text style={styles.infoText}>
                💡 Email and mobile number changes require OTP verification
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setProfileModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleUpdateProfile}
                  disabled={updatingProfile}
                >
                  {updatingProfile ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  loader: {
    marginTop: 40,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  logoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoContainer: {
    width: 120,
    height: 120,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 48,
    marginBottom: 8,
  },
  noLogoText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  uploadButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoHint: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  editButton: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionArrow: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  appVersion: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 4,
  },
  appCopyright: {
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
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  roleText: {
    fontSize: 15,
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  otpFieldContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  otpInput: {
    flex: 1,
  },
  otpButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  otpButtonVerified: {
    backgroundColor: '#10B981',
  },
  otpButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  otpHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  otpVerifyContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  otpCodeInput: {
    flex: 1,
  },
  verifyButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
