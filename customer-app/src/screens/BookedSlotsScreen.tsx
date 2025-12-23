import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { MY_SLOT_BOOKINGS } from '../apollo/queries';
import CalendarIcon from '../components/CalendarIcon';

const BookedSlotsScreen = ({ navigation }: any) => {
  const { data, loading, error, refetch } = useQuery(MY_SLOT_BOOKINGS, {
    fetchPolicy: 'network-only',
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return '#10B981'; // Green
      case 'PENDING':
        return '#F59E0B'; // Orange
      case 'REJECTED':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'Accepted';
      case 'PENDING':
        return 'Pending';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorText}>Failed to load bookings</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  const bookings = data?.mySlotBookings || [];

  if (bookings.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
      >
        <View style={styles.emptyContainer}>
          <CalendarIcon size={80} />
          <Text style={styles.emptyText}>No Booked Slots</Text>
          <Text style={styles.emptySubtext}>
            You haven't booked any slots yet.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} />
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>My Booked Slots</Text>
        <Text style={styles.subtitle}>
          {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
        </Text>

        {bookings.map((booking: any) => (
          <TouchableOpacity
            key={booking.id}
            style={styles.bookingCard}
            onPress={() => navigation.navigate('SlotBookingDetail', { bookingId: booking.id })}
          >
            {/* Header with Status */}
            <View style={styles.cardHeader}>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleIcon}>
                  {booking.vehicleType === 'CAR' ? '🚗' : '🏍️'}
                </Text>
                <View>
                  <Text style={styles.vehicleNumber}>{booking.vehicleNumber}</Text>
                  <Text style={styles.centerName}>{booking.center?.name}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(booking.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {getStatusText(booking.status)}
                </Text>
              </View>
            </View>

            {/* OTP Section - Only show for PENDING bookings */}
            {booking.status === 'PENDING' && (
              <View style={styles.otpSection}>
                <Text style={styles.otpLabel}>Booking OTP</Text>
                <Text style={styles.otpCode}>{booking.otp}</Text>
                <Text style={styles.otpNote}>
                  Show this OTP to the staff at the center
                </Text>
              </View>
            )}

            {/* Rejection Reason - Show for REJECTED bookings */}
            {booking.status === 'REJECTED' && booking.rejectionReason && (
              <View style={styles.rejectionSection}>
                <Text style={styles.rejectionLabel}>Reason</Text>
                <Text style={styles.rejectionText}>
                  {booking.rejectionReason === 'NO_SHOW' 
                    ? '❌ No Show - Booking timeout exceeded' 
                    : booking.rejectionReason}
                </Text>
              </View>
            )}

            {booking.cancelledByRole && (
              <View style={styles.cancelledSection}>
                <Text style={styles.cancelledLabel}>Cancelled</Text>
                <Text style={styles.cancelledText}>
                  By {booking.cancelledByRole} {booking.cancelledByName}
                </Text>
              </View>
            )}

            {/* Details Table */}
            <View style={styles.detailsTable}>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Customer</Text>
                <Text style={styles.tableValue}>{booking.customerName}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Mobile</Text>
                <Text style={styles.tableValue}>{booking.customerMobile}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Services</Text>
                <Text style={styles.tableValue}>
                  {booking.carWash && '🚗 Car Wash '}
                  {booking.twoWheelerWash && '🏍️ Two Wheeler Wash '}
                  {booking.bodyRepair && '🔧 Body Repair'}
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Booked On</Text>
                <Text style={styles.tableValue}>
                  {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.viewDetailsContainer}>
              <Text style={styles.viewDetailsText}>Tap to view details →</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vehicleIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  centerName: {
    fontSize: 13,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  otpSection: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  otpLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  otpCode: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 6,
    marginBottom: 8,
  },
  otpNote: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  rejectionSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  rejectionText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  cancelledSection: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelledLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  cancelledText: {
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '500',
  },
  detailsTable: {
    gap: 12,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tableLabel: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  tableValue: {
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  viewDetailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  tableLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  tableValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
});

export default BookedSlotsScreen;
