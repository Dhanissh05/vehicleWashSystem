import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { ManualPaymentModal } from '../components/ManualPaymentModal';

const GET_BODY_REPAIR_VEHICLES = gql`
  query GetBodyRepairVehicles {
    vehicles(limit: 100) {
      id
      vehicleNumber
      vehicleType
      carCategory
      brand
      model
      serviceType
      status
      receivedAt
      bodyRepairAssessmentAt
      bodyRepairInProgressAt
      bodyRepairPaintingAt
      bodyRepairCompleteAt
      readyAt
      customer {
        name
        mobile
      }
      worker {
        name
      }
      payment {
        id
        status
        amount
        method
      }
    }
  }
`;

const UPDATE_VEHICLE_STATUS = gql`
  mutation UpdateVehicleStatus($input: UpdateVehicleStatusInput!) {
    updateVehicleStatus(input: $input) {
      id
      status
      bodyRepairAssessmentAt
      bodyRepairInProgressAt
      bodyRepairPaintingAt
      bodyRepairCompleteAt
      readyAt
    }
  }
`;

export default function BodyRepairCycleScreen({ navigation }: any) {
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const { data, loading, refetch } = useQuery(GET_BODY_REPAIR_VEHICLES, {
    fetchPolicy: 'network-only',
  });

  const [updateStatus, { loading: updating }] = useMutation(UPDATE_VEHICLE_STATUS, {
    refetchQueries: [{ query: GET_BODY_REPAIR_VEHICLES }],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'BODY_REPAIR_ASSESSMENT':
        return '#3B82F6';
      case 'BODY_REPAIR_IN_PROGRESS':
        return '#F59E0B';
      case 'BODY_REPAIR_PAINTING':
        return '#8B5CF6';
      case 'BODY_REPAIR_COMPLETE':
        return '#10B981';
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
      case 'BODY_REPAIR_ASSESSMENT':
        return 'Assessment';
      case 'BODY_REPAIR_IN_PROGRESS':
        return 'Repair In Progress';
      case 'BODY_REPAIR_PAINTING':
        return 'Painting';
      case 'BODY_REPAIR_COMPLETE':
        return 'Repair Complete';
      case 'READY_FOR_PICKUP':
        return 'Ready for Pickup';
      case 'DELIVERED':
        return 'Delivered';
      default:
        return status;
    }
  };

  const getStatusOptions = (currentStatus: string) => {
    const bodyRepairStatuses = [
      'BODY_REPAIR_ASSESSMENT',
      'BODY_REPAIR_IN_PROGRESS',
      'BODY_REPAIR_PAINTING',
      'BODY_REPAIR_COMPLETE',
      'READY_FOR_PICKUP',
      'DELIVERED',
    ];
    const currentIndex = bodyRepairStatuses.indexOf(currentStatus);
    
    if (currentIndex === -1) return [];
    
    const options = [];
    
    // Add previous status (if exists)
    if (currentIndex > 0) {
      options.push(bodyRepairStatuses[currentIndex - 1]);
    }
    
    // Add next status (if exists)
    if (currentIndex < bodyRepairStatuses.length - 1) {
      options.push(bodyRepairStatuses[currentIndex + 1]);
    }
    
    return options;
  };

  const handleOpenModal = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setNotes('');
    const statusOptions = getStatusOptions(vehicle.status);
    if (statusOptions.length > 0) {
      setSelectedStatus(statusOptions[0]);
    }
    setModalVisible(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedVehicle || !selectedStatus) return;

    // Check if trying to mark as DELIVERED
    if (selectedStatus === 'DELIVERED') {
      const payment = selectedVehicle.payment;
      
      if (!payment) {
        Alert.alert(
          'Payment Required',
          'Payment has not been initiated for this vehicle. Please ensure the customer has paid before marking as delivered.',
          [{ text: 'OK' }]
        );
        return;
      }

      if (payment.status !== 'PAID') {
        Alert.alert(
          'Payment Not Completed',
          `Payment status is "${payment.status}". The customer must complete payment before the vehicle can be marked as delivered.\n\nPayment Amount: ₹${payment.amount}\nPayment Method: ${payment.method}`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    try {
      await updateStatus({
        variables: {
          input: {
            vehicleId: selectedVehicle.id,
            status: selectedStatus,
            notes: notes || null,
          },
        },
      });

      Alert.alert('Success', `Vehicle status updated to ${getStatusText(selectedStatus)}`);
      setModalVisible(false);
      setSelectedVehicle(null);
      refetch();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderVehicle = ({ item }: any) => {
    const statusOptions = getStatusOptions(item.status);
    const canUpdate = statusOptions.length > 0 && item.status !== 'DELIVERED';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => canUpdate && handleOpenModal(item)}
        disabled={!canUpdate}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.vehicleNumber}>{item.vehicleNumber}</Text>
            <Text style={styles.vehicleInfo}>
              {item.vehicleType === 'TWO_WHEELER' ? '🏍️' : '🚗'} {item.brand} {item.model}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Customer:</Text>
            <Text style={styles.value}>{item.customer.name || item.customer.mobile}</Text>
          </View>

          {item.worker && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Worker:</Text>
              <Text style={styles.value}>{item.worker.name}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.label}>Payment:</Text>
            {item.payment ? (
              <View style={[
                styles.paymentBadge,
                item.payment.status === 'PAID' ? styles.paymentPaid : styles.paymentPending
              ]}>
                <Text style={[
                  styles.paymentText,
                  item.payment.status === 'PAID' ? styles.paymentTextPaid : styles.paymentTextPending
                ]}>
                  {item.payment.status === 'PAID' ? '✓ Paid' : item.payment.status}
                </Text>
              </View>
            ) : (
              <Text style={styles.value}>Not Initiated</Text>
            )}
          </View>

          {item.payment && item.payment.status === 'MANUAL_PENDING' && (
            <TouchableOpacity
              style={styles.confirmPaymentButton}
              onPress={() => {
                setSelectedVehicle(item);
                setPaymentModalVisible(true);
              }}
            >
              <Text style={styles.confirmPaymentButtonText}>
                ✓ Confirm Payment Received
              </Text>
            </TouchableOpacity>
          )}

          {canUpdate && (
            <View style={styles.actionHint}>
              <Text style={styles.actionHintText}>
                Tap to update status ({statusOptions.length} option{statusOptions.length > 1 ? 's' : ''} available)
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Filter body repair vehicles (exclude DELIVERED and WASH service type)
  const bodyRepairVehicles = data?.vehicles?.filter(
    (v: any) => v.serviceType === 'BODY_REPAIR' && v.status !== 'DELIVERED'
  ) || [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Body Repair & Painting</Text>
        <View style={styles.backButton} />
      </View>

      {loading && !data ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={styles.loader} />
      ) : (
        <FlatList
          data={bodyRepairVehicles}
          renderItem={renderVehicle}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔧</Text>
              <Text style={styles.emptyText}>No active body repair vehicles</Text>
              <Text style={styles.emptySubtext}>All vehicles have been delivered</Text>
            </View>
          }
        />
      )}

      {/* Update Status Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Body Repair Status</Text>

            {selectedVehicle && (
              <>
                <View style={styles.modalVehicleInfo}>
                  <Text style={styles.modalVehicleNumber}>{selectedVehicle.vehicleNumber}</Text>
                  <Text style={styles.modalCustomer}>{selectedVehicle.customer.name}</Text>
                  <Text style={styles.modalCurrentStatus}>
                    Current: {getStatusText(selectedVehicle.status)}
                  </Text>
                </View>

                <Text style={styles.label}>Select New Status</Text>
                <View style={styles.statusOptionsContainer}>
                  {getStatusOptions(selectedVehicle.status).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        selectedStatus === status && styles.statusOptionActive,
                      ]}
                      onPress={() => setSelectedStatus(status)}
                    >
                      <View style={[
                        styles.statusOptionDot,
                        { backgroundColor: getStatusColor(status) },
                        selectedStatus === status && styles.statusOptionDotActive,
                      ]} />
                      <Text style={[
                        styles.statusOptionText,
                        selectedStatus === status && styles.statusOptionTextActive,
                      ]}>
                        {getStatusText(status)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add any notes..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleUpdateStatus}
                    disabled={updating}
                  >
                    {updating ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Update Status</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Manual Payment Modal */}
      {selectedVehicle?.payment && (
        <ManualPaymentModal
          visible={paymentModalVisible}
          onClose={() => setPaymentModalVisible(false)}
          payment={selectedVehicle.payment}
          vehicleNumber={selectedVehicle.vehicleNumber}
          onPaymentConfirmed={() => {
            refetch();
            setPaymentModalVisible(false);
          }}
        />
      )}
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
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#8B5CF6',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: '#fff',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  loader: {
    marginTop: 40,
  },
  list: {
    padding: 16,
  },
  card: {
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
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    width: 80,
  },
  value: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  actionHint: {
    backgroundColor: '#EDE9FE',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  actionHintText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalVehicleInfo: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalVehicleNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalCustomer: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  modalCurrentStatus: {
    fontSize: 13,
    color: '#8B5CF6',
    marginTop: 8,
    fontWeight: '600',
  },
  statusOptionsContainer: {
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 10,
  },
  statusOptionActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3E8FF',
  },
  statusOptionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  statusOptionDotActive: {
    borderWidth: 3,
    borderColor: '#8B5CF6',
  },
  statusOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  statusOptionTextActive: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 8,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
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
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentPaid: {
    backgroundColor: '#D1FAE5',
  },
  paymentPending: {
    backgroundColor: '#FEF3C7',
  },
  paymentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  paymentTextPaid: {
    color: '#059669',
  },
  paymentTextPending: {
    color: '#D97706',
  },
  confirmPaymentButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  confirmPaymentButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
