import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import * as ImagePicker from 'expo-image-picker';

const GET_WORKERS = gql`
  query GetWorkers {
    workers {
      id
      mobile
      name
      email
      isActive
      workerCode
      photoUrl
    }
  }
`;

const CREATE_WORKER = gql`
  mutation CreateWorker($input: CreateWorkerInput!) {
    createWorker(input: $input) {
      user {
        id
        mobile
        name
        workerCode
      }
      plainPassword
      workerCode
    }
  }
`;

const TOGGLE_WORKER_STATUS = gql`
  mutation ToggleWorkerStatus($userId: ID!) {
    toggleWorkerStatus(userId: $userId) {
      id
      isActive
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      name
      email
      mobile
      workerCode
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

export default function WorkersScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [idProofType, setIdProofType] = useState('');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [workerPhoto, setWorkerPhoto] = useState('');
  const [showIdProofPicker, setShowIdProofPicker] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editWorkerPhoto, setEditWorkerPhoto] = useState('');
  const [originalMobile, setOriginalMobile] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(true);
  const [emailVerified, setEmailVerified] = useState(true);

  const { data, loading, refetch } = useQuery(GET_WORKERS);
  const [createWorker, { loading: adding }] = useMutation(CREATE_WORKER, {
    refetchQueries: [{ query: GET_WORKERS }],
  });
  const [toggleStatus] = useMutation(TOGGLE_WORKER_STATUS, {
    refetchQueries: [{ query: GET_WORKERS }],
  });
  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER, {
    refetchQueries: [{ query: GET_WORKERS }],
  });
  const [sendOtp, { loading: sendingOtp }] = useMutation(SEND_PROFILE_OTP);
  const [verifyOtp, { loading: verifyingOtp }] = useMutation(VERIFY_PROFILE_OTP);

  const idProofOptions = ['Aadhar Card', 'Driving License', 'Pan Card'];

  const handlePickImage = async () => {
    Alert.alert(
      'Add Worker Photo',
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
              setWorkerPhoto(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Choose from Gallery',
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
              setWorkerPhoto(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleAddWorker = async () => {
    if (!name.trim() || mobile.length < 10) {
      Alert.alert('Error', 'Please enter valid name and mobile number');
      return;
    }

    if (idProofType && !idProofNumber.trim()) {
      Alert.alert('Error', 'Please enter ID proof number');
      return;
    }

    try {
      const inputData: any = {
        name: name.trim(),
        mobile: mobile.trim(),
      };
      
      if (email.trim()) {
        inputData.email = email.trim();
      }

      const result = await createWorker({
        variables: { input: inputData },
      });
      
      const { workerCode, plainPassword } = result.data.createWorker;
      Alert.alert(
        'Success',
        `Worker added successfully!\n\nWorker Code: ${workerCode}\nPassword: ${plainPassword}\n\nPlease save these credentials.`,
        [{ text: 'OK' }]
      );
      setModalVisible(false);
      setName('');
      setMobile('');
      setEmail('');
      setIdProofType('');
      setIdProofNumber('');
      setWorkerPhoto('');
    } catch (error: any) {
      console.error('Add worker error:', error);
      let errorMessage = error.message;
      
      // Check for unique constraint error
      if (errorMessage.includes('Unique constraint') && errorMessage.includes('mobile')) {
        errorMessage = 'This mobile number is already registered. Please use a different mobile number.';
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await toggleStatus({ variables: { userId } });
      Alert.alert('Success', `Worker ${currentStatus ? 'deactivated' : 'activated'}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleEditWorker = (worker: any) => {
    setSelectedWorker(worker);
    setEditName(worker.name || '');
    setEditEmail(worker.email || '');
    setEditMobile(worker.mobile || '');
    setEditWorkerPhoto('');
    setOriginalMobile(worker.mobile || '');
    setOriginalEmail(worker.email || '');
    setMobileOtp('');
    setEmailOtp('');
    setMobileOtpSent(false);
    setEmailOtpSent(false);
    setMobileVerified(true);
    setEmailVerified(true);
    setEditModalVisible(true);
  };

  const handlePickEditImage = async () => {
    Alert.alert(
      'Update Worker Photo',
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
              setEditWorkerPhoto(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Choose from Gallery',
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
              setEditWorkerPhoto(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleSendMobileOtp = async () => {
    if (!editMobile || editMobile.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    if (editMobile === originalMobile) {
      setMobileVerified(true);
      return;
    }

    try {
      const result = await sendOtp({
        variables: {
          type: 'MOBILE',
          value: editMobile,
        },
      });
      if (result.data?.sendProfileOtp?.success) {
        setMobileOtpSent(true);
        setMobileVerified(false);
        Alert.alert('Success', 'OTP sent to mobile number');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (!mobileOtp || mobileOtp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    try {
      const result = await verifyOtp({
        variables: {
          type: 'MOBILE',
          value: editMobile,
          code: mobileOtp,
        },
      });
      if (result.data?.verifyProfileOtp) {
        setMobileVerified(true);
        Alert.alert('Success', 'Mobile number verified');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid OTP');
    }
  };

  const handleSendEmailOtp = async () => {
    if (!editEmail || !editEmail.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (editEmail === originalEmail || !editEmail) {
      setEmailVerified(true);
      return;
    }

    try {
      const result = await sendOtp({
        variables: {
          type: 'EMAIL',
          value: editEmail,
        },
      });
      if (result.data?.sendProfileOtp?.success) {
        setEmailOtpSent(true);
        setEmailVerified(false);
        Alert.alert('Success', 'OTP sent to email address');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    try {
      const result = await verifyOtp({
        variables: {
          type: 'EMAIL',
          value: editEmail,
          code: emailOtp,
        },
      });
      if (result.data?.verifyProfileOtp) {
        setEmailVerified(true);
        Alert.alert('Success', 'Email verified');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Invalid OTP');
    }
  };

  const handleUpdateWorker = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Please enter worker name');
      return;
    }

    if (!editMobile || editMobile.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    if (editEmail && !editEmail.includes('@')) {
      Alert.alert('Error', 'Please enter valid email');
      return;
    }

    // Check if mobile changed and not verified
    if (editMobile !== originalMobile && !mobileVerified) {
      Alert.alert('Error', 'Please verify the new mobile number with OTP');
      return;
    }

    // Check if email changed and not verified
    if (editEmail !== originalEmail && editEmail && !emailVerified) {
      Alert.alert('Error', 'Please verify the new email with OTP');
      return;
    }

    try {
      await updateUser({
        variables: {
          input: {
            userId: selectedWorker.id,
            name: editName.trim(),
            email: editEmail.trim() || null,
            mobile: editMobile.trim(),
          },
        },
      });
      Alert.alert('Success', 'Worker updated successfully!');
      setEditModalVisible(false);
      setSelectedWorker(null);
      setEditName('');
      setEditEmail('');
      setEditMobile('');
      setMobileOtp('');
      setEmailOtp('');
      setMobileOtpSent(false);
      setEmailOtpSent(false);
    } catch (error: any) {
      let errorMessage = error.message;
      if (errorMessage.includes('already registered')) {
        errorMessage = 'This mobile number is already registered. Please use a different number.';
      }
      Alert.alert('Error', errorMessage);
    }
  };

  const renderWorker = ({ item }: any) => (
    <View style={styles.workerCard}>
      <View style={styles.workerRow}>
        <View style={styles.workerPhotoContainer}>
          {item.photoUrl ? (
            <Image source={{ uri: item.photoUrl }} style={styles.workerPhoto} />
          ) : (
            <View style={styles.workerPhotoPlaceholder}>
              <Text style={styles.workerPhotoInitial}>
                {item.name ? item.name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.workerInfo}>
          <View style={styles.workerHeader}>
            <Text style={styles.workerName}>{item.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: item.isActive ? '#10B981' : '#EF4444' }]}>
              <Text style={styles.statusText}>{item.isActive ? 'Active' : 'Inactive'}</Text>
            </View>
          </View>
          <Text style={styles.workerDetail}>📱 {item.mobile}</Text>
          {item.email && <Text style={styles.workerDetail}>📧 {item.email}</Text>}
          <Text style={styles.workerDetail}>🔑 Code: {item.workerCode}</Text>
        </View>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditWorker(item)}
        >
          <Text style={styles.editButtonText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, { backgroundColor: item.isActive ? '#FEE2E2' : '#D1FAE5' }]}
          onPress={() => handleToggleStatus(item.id, item.isActive)}
        >
          <Text style={[styles.toggleText, { color: item.isActive ? '#EF4444' : '#10B981' }]}>
            {item.isActive ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workers</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add Worker</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={styles.loader} />
      ) : (
        <FlatList
          data={data?.workers || []}
          renderItem={renderWorker}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No workers found</Text>
              <Text style={styles.emptySubtext}>Add your first worker to get started</Text>
            </View>
          }
        />
      )}

      {/* Add Worker Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Worker</Text>

            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter worker name"
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

              <Text style={styles.label}>ID Proof Type (Optional)</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowIdProofPicker(true)}
              >
                <Text style={idProofType ? styles.pickerButtonTextSelected : styles.pickerButtonText}>
                  {idProofType || 'Select ID Proof Type'}
                </Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              {idProofType && (
                <>
                  <Text style={styles.label}>
                    {idProofType === 'Aadhar Card' ? 'Aadhar Number' : 
                     idProofType === 'Pan Card' ? 'PAN Number' : 
                     'Driving License Number'} *
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={idProofNumber}
                    onChangeText={setIdProofNumber}
                    placeholder={`Enter ${idProofType} number`}
                    autoCapitalize="characters"
                  />
                </>
              )}

              <Text style={styles.label}>Worker Photo (Optional)</Text>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={handlePickImage}
              >
                {workerPhoto ? (
                  <Image source={{ uri: workerPhoto }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoPlaceholderText}>📷 Tap to add photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  setName('');
                  setMobile('');
                  setEmail('');
                  setIdProofType('');
                  setIdProofNumber('');
                  setWorkerPhoto('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddWorker}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Add Worker</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ID Proof Type Picker Modal */}
      <Modal
        visible={showIdProofPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowIdProofPicker(false)}
      >
        <TouchableOpacity 
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowIdProofPicker(false)}
        >
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Select ID Proof Type</Text>
            {idProofOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.pickerOption}
                onPress={() => {
                  setIdProofType(option);
                  setIdProofNumber('');
                  setShowIdProofPicker(false);
                }}
              >
                <Text style={styles.pickerOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.pickerOption, styles.pickerClearOption]}
              onPress={() => {
                setIdProofType('');
                setIdProofNumber('');
                setShowIdProofPicker(false);
              }}
            >
              <Text style={styles.pickerClearText}>Clear Selection</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Worker Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Worker</Text>
              <Text style={styles.scrollHint}>Scroll down for more options ↓</Text>
            </View>
            
            <ScrollView 
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter worker name"
              />

              <Text style={styles.label}>Mobile Number *</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputWithButton]}
                  value={editMobile}
                  onChangeText={(text) => {
                    setEditMobile(text);
                    if (text !== originalMobile) {
                      setMobileVerified(false);
                      setMobileOtpSent(false);
                    } else {
                      setMobileVerified(true);
                    }
                  }}
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={!mobileOtpSent}
                />
                {editMobile !== originalMobile && !mobileVerified && (
                  <TouchableOpacity
                    style={styles.otpButton}
                    onPress={handleSendMobileOtp}
                    disabled={sendingOtp}
                  >
                    <Text style={styles.otpButtonText}>
                      {mobileOtpSent ? 'Resend' : 'Send OTP'}
                    </Text>
                  </TouchableOpacity>
                )}
                {mobileVerified && editMobile !== originalMobile && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ Verified</Text>
                  </View>
                )}
              </View>

              {mobileOtpSent && !mobileVerified && (
                <View style={styles.otpSection}>
                  <TextInput
                    style={styles.input}
                    value={mobileOtp}
                    onChangeText={setMobileOtp}
                    placeholder="Enter 6-digit OTP"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={handleVerifyMobileOtp}
                    disabled={verifyingOtp}
                  >
                    {verifyingOtp ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.verifyButtonText}>Verify Mobile OTP</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.label}>Email (Optional)</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputWithButton]}
                  value={editEmail}
                  onChangeText={(text) => {
                    setEditEmail(text);
                    if (text !== originalEmail && text) {
                      setEmailVerified(false);
                      setEmailOtpSent(false);
                    } else {
                      setEmailVerified(true);
                    }
                  }}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  editable={!emailOtpSent}
                />
                {editEmail && editEmail !== originalEmail && !emailVerified && (
                  <TouchableOpacity
                    style={styles.otpButton}
                    onPress={handleSendEmailOtp}
                    disabled={sendingOtp}
                  >
                    <Text style={styles.otpButtonText}>
                      {emailOtpSent ? 'Resend' : 'Send OTP'}
                    </Text>
                  </TouchableOpacity>
                )}
                {emailVerified && editEmail && editEmail !== originalEmail && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ Verified</Text>
                  </View>
                )}
              </View>

              {emailOtpSent && !emailVerified && (
                <View style={styles.otpSection}>
                  <TextInput
                    style={styles.input}
                    value={emailOtp}
                    onChangeText={setEmailOtp}
                    placeholder="Enter 6-digit OTP"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={handleVerifyEmailOtp}
                    disabled={verifyingOtp}
                  >
                    {verifyingOtp ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.verifyButtonText}>Verify Email OTP</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.label}>Update Worker Photo (Optional)</Text>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={handlePickEditImage}
              >
                {editWorkerPhoto ? (
                  <Image source={{ uri: editWorkerPhoto }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoPlaceholderText}>📷 Tap to update photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditModalVisible(false);
                  setSelectedWorker(null);
                  setEditName('');
                  setEditEmail('');
                  setEditMobile('');
                  setEditWorkerPhoto('');
                  setMobileOtp('');
                  setEmailOtp('');
                  setMobileOtpSent(false);
                  setEmailOtpSent(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateWorker}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loader: {
    marginTop: 40,
  },
  list: {
    padding: 16,
  },
  workerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  workerPhotoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  workerPhoto: {
    width: '100%',
    height: '100%',
  },
  workerPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workerPhotoInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  workerInfo: {
    flex: 1,
    marginBottom: 12,
  },
  workerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  workerDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  editButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  editButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleText: {
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    marginBottom: 12,
  },
  scrollHint: {
    fontSize: 12,
    color: '#8B5CF6',
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalScrollView: {
    flexGrow: 1,
    flexShrink: 1,
    marginBottom: 12,
  },
  modalScrollContent: {
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWithButton: {
    flex: 1,
  },
  otpButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  otpButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  otpSection: {
    marginTop: 8,
    gap: 8,
  },
  verifyButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  pickerButtonTextSelected: {
    fontSize: 16,
    color: '#1F2937',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#6B7280',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1F2937',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  pickerClearOption: {
    backgroundColor: '#FEE2E2',
  },
  pickerClearText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '600',
  },
  photoButton: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    borderStyle: 'dashed',
    overflow: 'hidden',
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
