import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { MY_PAYMENTS } from '../apollo/queries';

const PaymentsScreen = () => {
  const { data, loading, error, refetch } = useQuery(MY_PAYMENTS, {
    fetchPolicy: 'network-only',
    onError: (err) => {
      console.log('Payment query error:', err);
      console.log('Error details:', JSON.stringify(err, null, 2));
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'VERIFIED':
      case 'PAID':
        return '#10B981'; // Green
      case 'PENDING':
      case 'MANUAL_PENDING':
        return '#F59E0B'; // Orange
      case 'FAILED':
      case 'REJECTED':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'PAID':
        return 'Paid';
      case 'VERIFIED':
        return 'Verified';
      case 'PENDING':
        return 'Pending';
      case 'MANUAL_PENDING':
        return 'Verification Pending';
      case 'FAILED':
        return 'Failed';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  };

  const getMethodText = (method: string) => {
    switch (method) {
      case 'ONLINE':
        return 'Online Payment';
      case 'CASH':
        return 'Cash';
      case 'GPAY':
        return 'GPay';
      case 'UPI':
        return 'UPI';
      default:
        return method;
    }
  };

  const getModeIcon = (paymentMode: string) => {
    switch (paymentMode) {
      case 'GATEWAY':
        return '💳';
      case 'MANUAL':
        return '💵';
      default:
        return '💰';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>❌</Text>
        <Text style={styles.errorText}>Failed to load payments</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    );
  }

  const payments = data?.myPayments || [];

  if (payments.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
      >
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyText}>No Payment History</Text>
          <Text style={styles.emptySubtext}>
            Your payment history will appear here once you make payments.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const totalAmount = payments.reduce(
    (sum: number, payment: any) => 
      payment.status === 'SUCCESS' || payment.status === 'VERIFIED' || payment.status === 'PAID'
        ? sum + payment.amount 
        : sum, 
    0
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} />
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>Payment History</Text>
        
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Paid</Text>
          <Text style={styles.summaryAmount}>₹{totalAmount.toFixed(2)}</Text>
          <Text style={styles.summarySubtext}>
            {payments.length} transaction{payments.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Payment Cards */}
        {payments.map((payment: any) => (
          <View key={payment.id} style={styles.paymentCard}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleIcon}>
                  {payment.vehicle?.vehicleType === 'CAR' ? '🚗' : '🏍️'}
                </Text>
                <View>
                  <Text style={styles.vehicleNumber}>
                    {payment.vehicle?.vehicleNumber}
                  </Text>
                  {payment.vehicle?.brand && (
                    <Text style={styles.vehicleBrand}>
                      {payment.vehicle.brand} {payment.vehicle.model}
                    </Text>
                  )}
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(payment.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {getStatusText(payment.status)}
                </Text>
              </View>
            </View>

            {/* Amount Section */}
            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>Amount</Text>
              <Text style={styles.amountValue}>₹{payment.amount.toFixed(2)}</Text>
            </View>

            {/* Details Table */}
            <View style={styles.detailsTable}>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Payment Mode</Text>
                <View style={styles.tableValueRow}>
                  <Text style={styles.tableIcon}>{getModeIcon(payment.paymentMode)}</Text>
                  <Text style={styles.tableValue}>{getMethodText(payment.method)}</Text>
                </View>
              </View>

              {payment.razorpayPaymentId && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Transaction ID</Text>
                  <Text style={[styles.tableValue, styles.transactionId]} numberOfLines={1}>
                    {payment.razorpayPaymentId}
                  </Text>
                </View>
              )}

              {payment.razorpayOrderId && (
                <View style={styles.tableRow}>
                  <Text style={styles.tableLabel}>Order ID</Text>
                  <Text style={[styles.tableValue, styles.transactionId]} numberOfLines={1}>
                    {payment.razorpayOrderId}
                  </Text>
                </View>
              )}

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Date</Text>
                <Text style={styles.tableValue}>
                  {new Date(payment.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>

              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Time</Text>
                <Text style={styles.tableValue}>
                  {new Date(payment.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>
          </View>
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
    marginBottom: 20,
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
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#E0F2FE',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#BFDBFE',
  },
  paymentCard: {
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
    fontSize: 28,
    marginRight: 12,
  },
  vehicleNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  vehicleBrand: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  amountSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#10B981',
  },
  detailsTable: {
    gap: 12,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    textAlign: 'right',
  },
  tableValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tableIcon: {
    fontSize: 16,
  },
  transactionId: {
    fontSize: 11,
    fontFamily: 'monospace',
    flex: 1,
  },
});

export default PaymentsScreen;
