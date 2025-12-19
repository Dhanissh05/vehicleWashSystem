import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useQuery, useMutation, gql } from '@apollo/client';

const SLOT_BOOKINGS = gql`
  query SlotBookings($status: SlotBookingStatus) {
    slotBookings(status: $status) {
      id
      customerMobile
      customerName
      vehicleNumber
      vehicleType
      carWash
      twoWheelerWash
      bodyRepair
      otp
      status
      createdAt
      center {
        name
      }
    }
  }
`;

const VERIFY_SLOT_BOOKING = gql`
  mutation VerifySlotBooking($input: VerifySlotBookingInput!) {
    verifySlotBooking(input: $input) {
      id
      vehicleNumber
      status
    }
  }
`;

const CANCEL_SLOT_BOOKING = gql`
  mutation CancelSlotBooking($bookingId: ID!) {
    cancelSlotBooking(bookingId: $bookingId) {
      id
      status
    }
  }
`;

const GET_SYSTEM_CONFIG = gql`
  query GetSystemConfig($key: String!) {
    systemConfig(key: $key) {
      key
      value
    }
  }
`;

const UPDATE_SYSTEM_CONFIG = gql`
  mutation UpdateSystemConfig($key: String!, $value: String!) {
    updateSystemConfig(key: $key, value: $value) {
      key
      value
    }
  }
`;

export default function SlotBookingsScreen({ navigation }: any) {
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [otpInput, setOtpInput] = useState('');

  const { data, loading, refetch } = useQuery(SLOT_BOOKINGS, {
    variables: { status: filter === 'PENDING' ? 'PENDING' : null },
    fetchPolicy: 'network-only',
  });

  const { data: configData, refetch: refetchConfig } = useQuery(GET_SYSTEM_CONFIG, {
    variables: { key: 'ENABLE_SLOT_BOOKING' },
    fetchPolicy: 'network-only',
  });

  const slotBookingEnabled = configData?.systemConfig?.value === 'true';

  const [updateSystemConfig] = useMutation(UPDATE_SYSTEM_CONFIG, {
    onCompleted: () => {
      refetchConfig();
    },
  });

  const [verifyBooking, { loading: verifying }] = useMutation(VERIFY_SLOT_BOOKING, {
    onCompleted: () => {
      Alert.alert('Success', 'Booking verified and vehicle added');
      setShowVerifyModal(false);
      setOtpInput('');
      setSelectedBooking(null);
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const [cancelBooking] = useMutation(CANCEL_SLOT_BOOKING, {
    onCompleted: () => {
      Alert.alert('Success', 'Booking cancelled');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleToggleSlotBooking = async (value: boolean) => {
    try {
      await updateSystemConfig({
        variables: {
          key: 'ENABLE_SLOT_BOOKING',
          value: value.toString(),
        },
      });
      Alert.alert('Success', `Slot Booking ${value ? 'enabled' : 'disabled'} for customers`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update setting');
    }
  };

  const handleVerify = (booking: any) => {
    setSelectedBooking(booking);
    setShowVerifyModal(true);
  };

  const handleSubmitOtp = () => {
    if (!otpInput.trim()) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }

    verifyBooking({
      variables: {
        input: {
          bookingId: selectedBooking.id,
          otp: otpInput,
        },
      },
    });
  };

  const handleCancel = (bookingId: string) => {
    Alert.alert('Cancel Booking', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: () => cancelBooking({ variables: { bookingId } }),
      },
    ]);
  };

  const renderBooking = ({ item }: any) => {
    const services = [];
    if (item.carWash) services.push('🚗 Car Wash');
    if (item.twoWheelerWash) services.push('🏍️ Two Wheeler');
    if (item.bodyRepair) services.push('🔧 Body Repair');

    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingHeader}>
          <View>
            <Text style={styles.vehicleNumber}>{item.vehicleNumber}</Text>
            <Text style={styles.customerName}>{item.customerName || item.customerMobile}</Text>
          </View>
          <View style={[styles.statusBadge, styles[`status${item.status}`]]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.services}>
          {services.map((service, index) => (
            <View key={index} style={styles.serviceTag}>
              <Text style={styles.serviceTagText}>{service}</Text>
            </View>
          ))}
        </View>

        <View style={styles.info}>
          <Text style={styles.infoLabel}>Type:</Text>
          <Text style={styles.infoValue}>{item.vehicleType}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoLabel}>Mobile:</Text>
          <Text style={styles.infoValue}>{item.customerMobile}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.infoLabel}>Booking Time:</Text>
          <Text style={styles.infoValue}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>

        {item.status === 'PENDING' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={() => handleVerify(item)}
            >
              <Text style={styles.verifyButtonText}>✓ Verify & Enter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancel(item.id)}
            >
              <Text style={styles.cancelButtonText}>✕ Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Slot Bookings</Text>
        
        {/* Enable/Disable Toggle */}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>
            Customer Slot Booking: {slotBookingEnabled ? '✓ Enabled' : '✕ Disabled'}
          </Text>
          <Switch
            value={slotBookingEnabled}
            onValueChange={handleToggleSlotBooking}
            trackColor={{ false: '#E5E7EB', true: '#A78BFA' }}
            thumbColor={slotBookingEnabled ? '#8B5CF6' : '#9CA3AF'}
          />
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'PENDING' && styles.filterButtonActive]}
            onPress={() => setFilter('PENDING')}
          >
            <Text style={[styles.filterText, filter === 'PENDING' && styles.filterTextActive]}>
              Pending
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'ALL' && styles.filterButtonActive]}
            onPress={() => setFilter('ALL')}
          >
            <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>
              All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <FlatList
          data={data?.slotBookings || []}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No bookings found</Text>
            </View>
          }
        />
      )}

      <Modal visible={showVerifyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify Booking</Text>

            {selectedBooking && (
              <View style={styles.bookingDetails}>
                <Text style={styles.modalVehicle}>{selectedBooking.vehicleNumber}</Text>
                <Text style={styles.modalCustomer}>{selectedBooking.customerName}</Text>
              </View>
            )}

            <Text style={styles.modalLabel}>Enter OTP</Text>
            <TextInput
              style={styles.otpInput}
              value={otpInput}
              onChangeText={setOtpInput}
              placeholder="6-digit OTP"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowVerifyModal(false);
                  setOtpInput('');
                  setSelectedBooking(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalVerifyButton}
                onPress={handleSubmitOtp}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalVerifyText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { backgroundColor: '#FFF', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  filterContainer: { flexDirection: 'row', gap: 12 },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  filterButtonActive: { borderColor: '#8B5CF6', backgroundColor: '#8B5CF6' },
  filterText: { fontSize: 14, color: '#666' },
  filterTextActive: { color: '#FFF', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  bookingCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  vehicleNumber: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  customerName: { fontSize: 14, color: '#666', marginTop: 4 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusPENDING: { backgroundColor: '#FFF3CD' },
  statusVERIFIED: { backgroundColor: '#D1E7DD' },
  statusCANCELLED: { backgroundColor: '#F8D7DA' },
  statusText: { fontSize: 12, fontWeight: '600' },
  services: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  serviceTag: { backgroundColor: '#F0F8FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  serviceTagText: { fontSize: 12, color: '#007AFF' },
  info: { flexDirection: 'row', marginBottom: 6 },
  infoLabel: { fontSize: 14, color: '#666', width: 120 },
  infoValue: { fontSize: 14, color: '#1A1A1A', flex: 1 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  verifyButton: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  cancelButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#999' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, width: '85%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  bookingDetails: { alignItems: 'center', marginBottom: 20, padding: 12, backgroundColor: '#F5F7FA', borderRadius: 8 },
  modalVehicle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  modalCustomer: { fontSize: 14, color: '#666', marginTop: 4 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#333' },
  otpInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, color: '#666', fontWeight: '600' },
  modalVerifyButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  modalVerifyText: { fontSize: 16, color: '#FFF', fontWeight: '600' },
});
