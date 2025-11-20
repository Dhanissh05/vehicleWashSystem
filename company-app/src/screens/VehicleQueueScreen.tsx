import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, gql } from '@apollo/client';

const VEHICLES = gql`
  query Vehicles($status: String) {
    vehicles(status: $status) {
      id
      vehicleNumber
      vehicleType
      carCategory
      model
      brand
      color
      status
      receivedAt
      washingAt
      readyAt
      deliveredAt
      notes
      customer {
        id
        name
        mobile
      }
      worker {
        id
        name
        mobile
      }
      payment {
        id
        amount
        status
        method
      }
    }
  }
`;

const UPDATE_VEHICLE_STATUS = gql`
  mutation UpdateVehicleStatus($vehicleId: Int!, $status: String!) {
    updateVehicleStatus(vehicleId: $vehicleId, status: $status) {
      id
      status
      washingAt
      readyAt
      deliveredAt
    }
  }
`;

export default function VehicleQueueScreen() {
  const [selectedFilter, setSelectedFilter] = useState<string | undefined>(undefined);
  const { data, loading, refetch } = useQuery(VEHICLES, {
    variables: { status: selectedFilter },
    pollInterval: 10000, // Poll every 10 seconds
  });

  const [updateStatus, { loading: updating }] = useMutation(UPDATE_VEHICLE_STATUS, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return '#3B82F6';
      case 'WASHING':
        return '#F59E0B';
      case 'READY_FOR_PICKUP':
        return '#10B981';
      case 'DELIVERED':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'Received';
      case 'WASHING':
        return 'Washing';
      case 'READY_FOR_PICKUP':
        return 'Ready for Pickup';
      case 'DELIVERED':
        return 'Delivered';
      default:
        return status;
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    switch (currentStatus) {
      case 'RECEIVED':
        return 'WASHING';
      case 'WASHING':
        return 'READY_FOR_PICKUP';
      case 'READY_FOR_PICKUP':
        return 'DELIVERED';
      default:
        return null;
    }
  };

  const handleStatusUpdate = (vehicleId: number, currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) {
      Alert.alert('Info', 'Vehicle is already delivered');
      return;
    }

    Alert.alert(
      'Update Status',
      `Update vehicle status to ${getStatusText(nextStatus)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: () => {
            updateStatus({
              variables: {
                vehicleId: parseInt(vehicleId.toString()),
                status: nextStatus,
              },
            });
          },
        },
      ]
    );
  };

  const renderFilterButton = (label: string, status: string | undefined) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        selectedFilter === status && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(status)}
    >
      <Text
        style={[
          styles.filterButtonText,
          selectedFilter === status && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderVehicle = ({ item }: any) => {
    const nextStatus = getNextStatus(item.status);
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.vehicleNumber}>{item.vehicleNumber}</Text>
            <Text style={styles.customerName}>
              👤 {item.customer.name}
            </Text>
            <Text style={styles.customerMobile}>
              📱 {item.customer.mobile}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.vehicleInfo}>
            {item.vehicleType === 'CAR' ? '🚗' : '🏍️'}{' '}
            {item.brand} {item.model}
            {item.carCategory && ` (${item.carCategory})`}
          </Text>
          <Text style={styles.vehicleColor}>Color: {item.color || 'N/A'}</Text>

          {item.worker && (
            <Text style={styles.workerInfo}>
              👷 Worker: {item.worker.name || item.worker.mobile}
            </Text>
          )}

          {item.payment && (
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentAmount}>₹{item.payment.amount}</Text>
              <Text
                style={[
                  styles.paymentStatus,
                  { color: item.payment.status === 'PAID' ? '#10B981' : '#F59E0B' },
                ]}
              >
                {item.payment.status}
              </Text>
            </View>
          )}

          {item.notes && (
            <Text style={styles.notes}>📝 {item.notes}</Text>
          )}
        </View>

        <View style={styles.timestamps}>
          <Text style={styles.timestamp}>
            Received: {new Date(item.receivedAt).toLocaleString()}
          </Text>
          {item.washingAt && (
            <Text style={styles.timestamp}>
              Washing: {new Date(item.washingAt).toLocaleString()}
            </Text>
          )}
          {item.readyAt && (
            <Text style={styles.timestamp}>
              Ready: {new Date(item.readyAt).toLocaleString()}
            </Text>
          )}
          {item.deliveredAt && (
            <Text style={styles.timestamp}>
              Delivered: {new Date(item.deliveredAt).toLocaleString()}
            </Text>
          )}
        </View>

        {nextStatus && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: getStatusColor(nextStatus) }]}
            onPress={() => handleStatusUpdate(item.id, item.status)}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>
                Mark as {getStatusText(nextStatus)}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vehicle Queue</Text>
        <Text style={styles.subtitle}>
          {data?.vehicles?.length || 0} vehicle(s)
        </Text>
      </View>

      <View style={styles.filterContainer}>
        {renderFilterButton('All', undefined)}
        {renderFilterButton('Received', 'RECEIVED')}
        {renderFilterButton('Washing', 'WASHING')}
        {renderFilterButton('Ready', 'READY_FOR_PICKUP')}
        {renderFilterButton('Delivered', 'DELIVERED')}
      </View>

      <FlatList
        data={data?.vehicles || []}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No vehicles found</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter
                ? 'Try changing the filter'
                : 'Vehicles will appear here once received'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingTop: 20,
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  customerMobile: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    marginBottom: 12,
  },
  vehicleInfo: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  vehicleColor: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  workerInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  notes: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  timestamps: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  actionButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
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
    textAlign: 'center',
  },
});
