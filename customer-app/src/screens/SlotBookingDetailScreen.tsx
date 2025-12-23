import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

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
      }
    }
  }
`;

const CANCEL_SLOT_BOOKING = gql`
  mutation CancelSlotBooking($bookingId: ID!) {
    cancelSlotBooking(bookingId: $bookingId) {
      id
      status
      cancelledByRole
      cancelledByName
      cancelledAt
      services {
        id
        status
        cancelledAt
      }
    }
  }
`;

const CANCEL_SERVICE = gql`
  mutation CancelService($serviceId: ID!) {
    cancelService(serviceId: $serviceId) {
      id
      status
      cancelledAt
      cancelledBy
      cancelledByRole
      cancelledByName
    }
  }
`;

export default function SlotBookingDetailScreen({ route, navigation }: any) {
  const { bookingId } = route.params;
  const [cancelling, setCancelling] = useState(false);

  const { data, loading, refetch } = useQuery(SLOT_BOOKING_BY_ID, {
    variables: { id: bookingId },
    fetchPolicy: 'network-only',
  });

  const [cancelSlot] = useMutation(CANCEL_SLOT_BOOKING, {
    onCompleted: () => {
      Alert.alert('Success', 'Slot booking cancelled successfully');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
      setCancelling(false);
    },
  });

  const [cancelService] = useMutation(CANCEL_SERVICE, {
    onCompleted: () => {
      Alert.alert('Success', 'Service cancelled successfully');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const booking = data?.slotBookingById;

  const handleCancelSlot = () => {
    const anyServiceStarted = booking?.services?.some(
      (s: any) => ['STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(s.status)
    );

    if (anyServiceStarted) {
      Alert.alert(
        'Cannot Cancel',
        'One or more services have already started. You cannot cancel the entire slot now.'
      );
      return;
    }

    Alert.alert(
      'Cancel Slot Booking',
      'Are you sure you want to cancel this entire slot booking?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await cancelSlot({ variables: { bookingId } });
            } catch (error) {
              setCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelService = (service: any) => {
    if (['STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(service.status)) {
      Alert.alert(
        'Cannot Cancel',
        'This service has already started and cannot be cancelled.'
      );
      return;
    }

    Alert.alert(
      'Cancel Service',
      `Are you sure you want to cancel ${getServiceName(service.serviceType)}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            cancelService({ variables: { serviceId: service.id } });
          },
        },
      ]
    );
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

  const canCancelSlot =
    booking.status === 'PENDING' || booking.status === 'VERIFIED';
  const anyServiceStarted = booking.services?.some((s: any) =>
    ['STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(s.status)
  );

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

          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Vehicle Number:</Text>
            <Text style={styles.value}>{booking.vehicleNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Vehicle Type:</Text>
            <Text style={styles.value}>
              {booking.vehicleType === 'CAR' ? '🚗 Car' : '🏍️ Two Wheeler'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Center:</Text>
            <Text style={styles.value}>{booking.center.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Booked On:</Text>
            <Text style={styles.value}>
              {new Date(booking.createdAt).toLocaleString()}
            </Text>
          </View>

          {booking.status === 'PENDING' && (
            <View style={styles.otpContainer}>
              <Text style={styles.otpLabel}>Verification OTP:</Text>
              <Text style={styles.otpValue}>{booking.otp}</Text>
              <Text style={styles.otpHint}>
                Show this OTP to the admin/worker for verification
              </Text>
            </View>
          )}

          {booking.cancelledByRole && (
            <View style={styles.cancellationInfo}>
              <Text style={styles.cancellationTitle}>❌ Cancellation Information</Text>
              <Text style={styles.cancellationText}>
                Slot has been cancelled by {booking.cancelledByRole}{' '}
                {booking.cancelledByName}
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
                  Started: {new Date(service.startedAt).toLocaleString()}
                </Text>
              )}
              {service.completedAt && (
                <Text style={styles.serviceTimestamp}>
                  Completed: {new Date(service.completedAt).toLocaleString()}
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

              {service.status === 'BOOKED' && canCancelSlot && (
                <TouchableOpacity
                  style={styles.cancelServiceButton}
                  onPress={() => handleCancelService(service)}
                >
                  <Text style={styles.cancelServiceButtonText}>Cancel Service</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {canCancelSlot && !anyServiceStarted && booking.status !== 'CANCELLED' && (
          <TouchableOpacity
            style={styles.cancelSlotButton}
            onPress={handleCancelSlot}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.cancelSlotButtonText}>Cancel Entire Slot</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    marginBottom: 12,
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
  otpContainer: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  otpLabel: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 4,
  },
  otpValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 4,
  },
  otpHint: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 8,
  },
  cancellationInfo: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  cancellationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  cancellationText: {
    fontSize: 14,
    color: '#991B1B',
    marginBottom: 4,
  },
  cancellationDate: {
    fontSize: 12,
    color: '#B91C1C',
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
  cancelServiceButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  cancelServiceButtonText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelSlotButton: {
    backgroundColor: '#EF4444',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelSlotButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
