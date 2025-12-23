import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useQuery, useMutation, gql } from '@apollo/client';

const SLOT_BOOKING_BY_ID = gql`
  query SlotBookingById($id: ID!) {
    slotBookingById(id: $id) {
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
      rejectionReason
      cancelledByRole
      cancelledByName
      cancelledAt
      verifiedAt
      createdAt
      center {
        name
        address
      }
      services {
        id
        serviceType
        status
        startedAt
        startedBy
        completedAt
        completedBy
        cancelledAt
        cancelledBy
        cancelledByRole
        cancelledByName
        notes
        createdAt
      }
    }
  }
`;

const CANCEL_SLOT_BY_STAFF = gql`
  mutation CancelSlotByStaff($bookingId: ID!) {
    cancelSlotByStaff(bookingId: $bookingId) {
      id
      status
      cancelledByRole
      cancelledByName
      cancelledAt
      services {
        id
        status
      }
    }
  }
`;

const START_SERVICE = gql`
  mutation StartService($serviceId: ID!) {
    startService(serviceId: $serviceId) {
      id
      status
      startedAt
    }
  }
`;

const UPDATE_SERVICE_STATUS = gql`
  mutation UpdateServiceStatus($serviceId: ID!, $status: SlotServiceStatus!, $notes: String) {
    updateServiceStatus(serviceId: $serviceId, status: $status, notes: $notes) {
      id
      status
      completedAt
    }
  }
`;

export default function SlotBookingDetailScreen({ route, navigation }: any) {
  const { bookingId } = route.params;
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [notes, setNotes] = useState('');

  const { data, loading, refetch } = useQuery(SLOT_BOOKING_BY_ID, {
    variables: { id: bookingId },
    fetchPolicy: 'network-only',
  });

  const [cancelSlot] = useMutation(CANCEL_SLOT_BY_STAFF, {
    onCompleted: () => {
      Alert.alert('Success', 'Slot booking cancelled');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const [startService] = useMutation(START_SERVICE, {
    onCompleted: () => {
      Alert.alert('Success', 'Service started');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const [updateServiceStatus] = useMutation(UPDATE_SERVICE_STATUS, {
    onCompleted: () => {
      Alert.alert('Success', 'Service status updated');
      setShowStatusModal(false);
      setSelectedService(null);
      setNotes('');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const booking = data?.slotBookingById;

  const handleCancelSlot = () => {
    Alert.alert(
      'Cancel Slot Booking',
      'This will cancel all services. Are you sure?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            cancelSlot({ variables: { bookingId } });
          },
        },
      ]
    );
  };

  const handleStartService = (service: any) => {
    Alert.alert(
      'Start Service',
      `Start ${getServiceName(service.serviceType)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            startService({ variables: { serviceId: service.id } });
          },
        },
      ]
    );
  };

  const handleUpdateStatus = (service: any) => {
    setSelectedService(service);
    setNotes('');
    setShowStatusModal(true);
  };

  const submitStatusUpdate = (status: string) => {
    if (!selectedService) return;

    updateServiceStatus({
      variables: {
        serviceId: selectedService.id,
        status,
        notes: notes || null,
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#F59E0B';
      case 'VERIFIED':
        return '#10B981';
      case 'CANCELLED':
        return '#EF4444';
      case 'REJECTED':
        return '#DC2626';
      case 'BOOKED':
        return '#3B82F6';
      case 'STARTED':
        return '#8B5CF6';
      case 'IN_PROGRESS':
        return '#F59E0B';
      case 'COMPLETED':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getServiceName = (serviceType: string) => {
    switch (serviceType) {
      case 'CAR_WASH':
        return 'Car Wash';
      case 'TWO_WHEELER_WASH':
        return 'Two Wheeler Wash';
      case 'BODY_REPAIR':
        return 'Body Repair';
      default:
        return serviceType;
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'CAR_WASH':
        return '🚗';
      case 'TWO_WHEELER_WASH':
        return '🏍️';
      case 'BODY_REPAIR':
        return '🔧';
      default:
        return '📋';
    }
  };

  const getAvailableStatuses = (currentStatus: string) => {
    switch (currentStatus) {
      case 'BOOKED':
        return [];
      case 'STARTED':
        return ['IN_PROGRESS'];
      case 'IN_PROGRESS':
        return ['COMPLETED'];
      case 'COMPLETED':
        return [];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Slot Details</Text>
          <View style={styles.placeholder} />
        </View>
        <ActivityIndicator size="large" color="#8B5CF6" style={styles.loader} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Slot Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Booking not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Slot Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.statusBadgeContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(booking.status) },
              ]}
            >
              <Text style={styles.statusBadgeText}>{booking.status}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Customer & Vehicle</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Customer:</Text>
            <Text style={styles.value}>{booking.customerName || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Mobile:</Text>
            <Text style={styles.value}>{booking.customerMobile}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Vehicle:</Text>
            <Text style={styles.value}>{booking.vehicleNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Type:</Text>
            <Text style={styles.value}>
              {booking.vehicleType === 'CAR' ? '🚗 Car' : '🏍️ Two Wheeler'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Booked:</Text>
            <Text style={styles.value}>
              {new Date(booking.createdAt).toLocaleString()}
            </Text>
          </View>

          {booking.verifiedAt && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Verified:</Text>
              <Text style={styles.value}>
                {new Date(booking.verifiedAt).toLocaleString()}
              </Text>
            </View>
          )}

          {booking.cancelledByRole && (
            <View style={styles.cancellationInfo}>
              <Text style={styles.cancellationTitle}>❌ Cancelled</Text>
              <Text style={styles.cancellationText}>
                By {booking.cancelledByRole} {booking.cancelledByName}
              </Text>
              <Text style={styles.cancellationDate}>
                {new Date(booking.cancelledAt).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Services</Text>
          {booking.services?.map((service: any) => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceIcon}>{getServiceIcon(service.serviceType)}</Text>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>
                    {getServiceName(service.serviceType)}
                  </Text>
                  <View
                    style={[
                      styles.serviceStatusBadge,
                      { backgroundColor: getStatusColor(service.status) },
                    ]}
                  >
                    <Text style={styles.serviceStatusText}>{service.status}</Text>
                  </View>
                </View>
              </View>

              {service.startedAt && (
                <Text style={styles.serviceTimestamp}>
                  ⏱️ Started: {new Date(service.startedAt).toLocaleString()}
                </Text>
              )}
              {service.completedAt && (
                <Text style={styles.serviceTimestamp}>
                  ✅ Completed: {new Date(service.completedAt).toLocaleString()}
                </Text>
              )}
              {service.cancelledAt && (
                <View style={styles.serviceCancellation}>
                  <Text style={styles.serviceCancellationText}>
                    Cancelled by {service.cancelledByRole} {service.cancelledByName}
                  </Text>
                  <Text style={styles.serviceTimestamp}>
                    {new Date(service.cancelledAt).toLocaleString()}
                  </Text>
                </View>
              )}
              {service.notes && (
                <Text style={styles.serviceNotes}>📝 {service.notes}</Text>
              )}

              <View style={styles.serviceActions}>
                {service.status === 'BOOKED' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleStartService(service)}
                  >
                    <Text style={styles.actionButtonText}>▶️ Start Service</Text>
                  </TouchableOpacity>
                )}
                {['STARTED', 'IN_PROGRESS'].includes(service.status) && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonUpdate]}
                    onPress={() => handleUpdateStatus(service)}
                  >
                    <Text style={styles.actionButtonText}>Update Status</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {booking.status !== 'CANCELLED' && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelSlot}>
            <Text style={styles.cancelButtonText}>🚫 Cancel Entire Slot</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Service Status</Text>

            {selectedService && (
              <>
                <Text style={styles.modalServiceName}>
                  {getServiceIcon(selectedService.serviceType)}{' '}
                  {getServiceName(selectedService.serviceType)}
                </Text>
                <Text style={styles.modalCurrentStatus}>
                  Current: {selectedService.status}
                </Text>

                <View style={styles.statusOptions}>
                  {getAvailableStatuses(selectedService.status).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={styles.statusOption}
                      onPress={() => submitStatusUpdate(status)}
                    >
                      <Text style={styles.statusOptionText}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add notes..."
                  placeholderTextColor="#9CA3AF"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />

                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowStatusModal(false);
                    setSelectedService(null);
                    setNotes('');
                  }}
                >
                  <Text style={styles.modalCancelButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#1F2937',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  loader: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFF',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBadgeContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  cancellationInfo: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  cancellationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 4,
  },
  cancellationText: {
    fontSize: 13,
    color: '#991B1B',
  },
  cancellationDate: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 4,
  },
  serviceCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  serviceStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  serviceStatusText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  serviceTimestamp: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  serviceCancellation: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  serviceCancellationText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '500',
  },
  serviceNotes: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    flex: 1,
  },
  actionButtonUpdate: {
    backgroundColor: '#F59E0B',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  modalServiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalCurrentStatus: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  statusOptions: {
    marginBottom: 16,
  },
  statusOption: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusOptionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalCancelButton: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalCancelButtonText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
