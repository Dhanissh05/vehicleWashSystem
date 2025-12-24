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

const GET_ACTIVE_VEHICLES = gql`
  query GetActiveVehicles {
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
      washingAt
      readyAt
      center {
        id
        name
      }
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
      slotBooking {
        id
        carWash
        twoWheelerWash
        bodyRepair
        status
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
  }
`;

const UPDATE_VEHICLE_STATUS = gql`
  mutation UpdateVehicleStatus($input: UpdateVehicleStatusInput!) {
    updateVehicleStatus(input: $input) {
      id
      status
      washingAt
      readyAt
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

export default function WashCycleScreen({ navigation }: any) {
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const { data, loading, refetch, error } = useQuery(GET_ACTIVE_VEHICLES, {
    fetchPolicy: 'network-only',
    onError: (err) => {
      console.error('❌ GraphQL Query Error:', err);
      console.error('❌ Error message:', err.message);
      console.error('❌ Network error:', err.networkError);
      console.error('❌ GraphQL errors:', err.graphQLErrors);
    },
  });

  const [updateStatus, { loading: updating }] = useMutation(UPDATE_VEHICLE_STATUS, {
    refetchQueries: [{ query: GET_ACTIVE_VEHICLES }],
  });

  const [startService] = useMutation(START_SERVICE, {
    onCompleted: () => {
      Alert.alert('Success', 'Service started');
      refetch();
    },
    onError: (error) => {
      console.error('❌ Start service error:', error);
      Alert.alert('Error', error.message || 'Failed to start service');
    },
  });

  const [updateServiceStatus] = useMutation(UPDATE_SERVICE_STATUS, {
    onCompleted: () => {
      Alert.alert('Success', 'Service status updated');
      setServiceModalVisible(false);
      setSelectedService(null);
      setNotes('');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REGISTERED':
        return '#9CA3AF';
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
      case 'REGISTERED':
        return 'Registered';
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

  const getStatusOptions = (currentStatus: string) => {
    // Only allow forward movement in the workflow
    const allStatuses = ['RECEIVED', 'WASHING', 'READY_FOR_PICKUP', 'DELIVERED'];
    const currentIndex = allStatuses.indexOf(currentStatus);
    
    if (currentIndex === -1) return [];
    
    const options = [];
    
    // Only add next status (forward movement only)
    if (currentIndex < allStatuses.length - 1) {
      options.push(allStatuses[currentIndex + 1]);
    }
    
    return options;
  };

  const handleOpenModal = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setNotes('');
    const statusOptions = getStatusOptions(vehicle.status) || [];
    if (statusOptions.length > 0) {
      setSelectedStatus(statusOptions[0]);
    }
    setModalVisible(true);
  };

  const handleStartService = (service: any) => {
    Alert.alert(
      'Start Service',
      `Start ${service.serviceType === 'CAR_WASH' ? 'Car Wash' : 
               service.serviceType === 'TWO_WHEELER_WASH' ? 'Two Wheeler Wash' : 
               'Body Repair'}?`,
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

  const handleOpenServiceModal = (service: any) => {
    setSelectedService(service);
    setNotes('');
    setServiceModalVisible(true);
  };

  const handleSubmitServiceUpdate = (newStatus: string) => {
    if (!selectedService) return;

    updateServiceStatus({
      variables: {
        serviceId: selectedService.id,
        status: newStatus,
        notes: notes || null,
      },
    });
  };

  const handleUpdateStatus = async () => {
    if (!selectedVehicle || !selectedStatus) return;

    // Check if trying to mark as DELIVERED
    if (selectedStatus === 'DELIVERED') {
      const payment = selectedVehicle.payment;
      
      // Check if payment exists and is paid
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
    const statusOptions = getStatusOptions(item.status) || [];
    // Hide vehicle status update for slot booking vehicles with services, 
    // EXCEPT when status is READY_FOR_PICKUP (allow manual delivery confirmation)
    const hasSlotServices = item.slotBooking?.services && item.slotBooking.services.length > 0;
    const isReadyForPickup = item.status === 'READY_FOR_PICKUP';
    const canUpdate = (!hasSlotServices || isReadyForPickup) && statusOptions.length > 0 && item.status !== 'DELIVERED';

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

          {/* Show Services if from slot booking */}
          {item.slotBooking?.services && item.slotBooking.services.length > 0 && (
            <View style={styles.servicesSection}>
              <Text style={styles.servicesTitle}>Services:</Text>
              {(() => {
                // Check if any service is currently in progress
                const hasActiveService = item.slotBooking.services.some(
                  (s: any) => ['STARTED', 'IN_PROGRESS'].includes(s.status)
                );
                
                return item.slotBooking.services.map((service: any) => {
                  const canStartThisService = service.status === 'BOOKED' && !hasActiveService;
                  
                  return (
                <View key={service.id} style={styles.serviceItem}>
                  <View style={styles.serviceHeader}>
                    <Text style={styles.serviceName}>
                      {service.serviceType === 'CAR_WASH' ? '🚗 Car Wash' :
                       service.serviceType === 'TWO_WHEELER_WASH' ? '🏍️ Two Wheeler Wash' :
                       '🔧 Body Repair'}
                    </Text>
                    <View style={[
                      styles.serviceStatusBadge,
                      service.status === 'BOOKED' && styles.serviceBooked,
                      service.status === 'STARTED' && styles.serviceStarted,
                      service.status === 'IN_PROGRESS' && styles.serviceInProgress,
                      service.status === 'COMPLETED' && styles.serviceCompleted,
                      service.status === 'CANCELLED' && styles.serviceCancelled,
                    ]}>
                      <Text style={styles.serviceStatusText}>{service.status}</Text>
                    </View>
                  </View>
                  {service.status === 'CANCELLED' && service.cancelledByName && (
                    <Text style={styles.cancelledInfo}>
                      Cancelled by {service.cancelledByName} on {new Date(service.cancelledAt).toLocaleString()}
                    </Text>
                  )}
                  {service.status === 'BOOKED' && (
                    <TouchableOpacity
                      style={[
                        styles.startServiceButton,
                        !canStartThisService && styles.startServiceButtonDisabled
                      ]}
                      onPress={() => canStartThisService && handleStartService(service)}
                      disabled={!canStartThisService}
                    >
                      <Text style={styles.startServiceButtonText}>
                        {hasActiveService ? '⏳ Wait for current service' : '▶ Start Service'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {(service.status === 'STARTED' || service.status === 'IN_PROGRESS') && (
                    <TouchableOpacity
                      style={styles.updateServiceButton}
                      onPress={() => handleOpenServiceModal(service)}
                    >
                      <Text style={styles.updateServiceButtonText}>Update Status</Text>
                    </TouchableOpacity>
                  )}
                  {service.startedAt && (
                    <Text style={styles.serviceTime}>
                      Started: {new Date(service.startedAt).toLocaleString()}
                    </Text>
                  )}
                </View>
                );
                });
              })()}
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

  // Filter active vehicles (exclude DELIVERED)
  // Show vehicles from slot bookings (new system) or WASH service vehicles (old system)
  const activeVehicles = data?.vehicles?.filter(
    (v: any) => {
      // Exclude delivered vehicles
      if (v.status === 'DELIVERED') return false;
      
      // Exclude vehicles with completely cancelled slot bookings
      if (v.slotBooking?.status === 'CANCELLED') {
        const allServicesCancelled = v.slotBooking.services?.every(
          (s: any) => s.status === 'CANCELLED'
        );
        if (allServicesCancelled) return false;
      }
      
      // Include all vehicles that have a slot booking (new system)
      if (v.slotBooking) return true;
      
      // Include WASH service vehicles (old system without slot booking)
      if (v.serviceType === 'WASH') return true;
      
      return false;
    }
  ) || [];

  // Debug logging
  console.log('=== WASH CYCLE RENDER ===');
  console.log('Loading:', loading);
  console.log('Error:', error);
  console.log('Data:', data);
  console.log('Has vehicles:', !!data?.vehicles);
  console.log('Vehicles count:', data?.vehicles?.length);
  
  if (data?.vehicles) {
    console.log('=== WASH CYCLE DEBUG ===');
    console.log('Total vehicles:', data.vehicles.length);
    console.log('RECEIVED vehicles:', data.vehicles.filter((v: any) => v.status === 'RECEIVED').length);
    console.log('Vehicles with slot bookings:', data.vehicles.filter((v: any) => v.slotBooking).length);
    console.log('WASH service vehicles:', data.vehicles.filter((v: any) => v.serviceType === 'WASH').length);
    console.log('Active vehicles (filtered):', activeVehicles.length);
    
    // Log each vehicle's details
    data.vehicles.forEach((v: any) => {
      console.log(`Vehicle ${v.vehicleNumber}:`, {
        status: v.status,
        serviceType: v.serviceType,
        hasSlotBooking: !!v.slotBooking,
        slotBookingId: v.slotBookingId,
        delivered: v.status === 'DELIVERED',
      });
    });
    
    const receivedWash = data.vehicles.filter((v: any) => 
      v.status === 'RECEIVED' && v.serviceType === 'WASH'
    );
    if (receivedWash.length > 0) {
      console.log('RECEIVED WASH vehicles:', receivedWash.map((v: any) => ({
        number: v.vehicleNumber,
        serviceType: v.serviceType,
        status: v.status,
        hasSlotBooking: !!v.slotBooking,
      })));
    }
    console.log('=== END DEBUG ===');
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Wash Cycle</Text>
        <View style={styles.backButton} />
      </View>

      {loading && !data ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={styles.loader} />
      ) : (
        <FlatList
          data={activeVehicles}
          renderItem={renderVehicle}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyText}>No active vehicles</Text>
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
            <Text style={styles.modalTitle}>Update Status</Text>

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

      {/* Service Update Modal */}
      <Modal
        visible={serviceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setServiceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Service Status</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setServiceModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedService && (
              <>
                <Text style={styles.modalVehicleNumber}>
                  {selectedService.serviceType === 'CAR_WASH' ? '🚗 Car Wash' :
                   selectedService.serviceType === 'TWO_WHEELER_WASH' ? '🏍️ Two Wheeler Wash' :
                   '🔧 Body Repair'}
                </Text>
                <Text style={styles.modalCurrentStatus}>
                  Current: {selectedService.status}
                </Text>

                <Text style={styles.label}>Select New Status</Text>
                <View style={styles.serviceStatusOptions}>
                  {selectedService.status === 'STARTED' && (
                    <TouchableOpacity
                      style={styles.serviceStatusButton}
                      onPress={() => handleSubmitServiceUpdate('IN_PROGRESS')}
                    >
                      <Text style={styles.serviceStatusButtonText}>IN PROGRESS</Text>
                    </TouchableOpacity>
                  )}
                  {(selectedService.status === 'STARTED' || selectedService.status === 'IN_PROGRESS') && (
                    <TouchableOpacity
                      style={[styles.serviceStatusButton, styles.serviceStatusButtonComplete]}
                      onPress={() => handleSubmitServiceUpdate('COMPLETED')}
                    >
                      <Text style={[styles.serviceStatusButtonText, styles.serviceStatusButtonTextComplete]}>
                        COMPLETE
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Add notes about the service..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setServiceModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
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
    fontSize: 20,
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6B7280',
    fontWeight: 'bold',
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
  statusFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  statusFlowItem: {
    alignItems: 'center',
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusFlowText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  statusArrow: {
    fontSize: 24,
    color: '#9CA3AF',
    marginHorizontal: 16,
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
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 15,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
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
  servicesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  servicesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  serviceItem: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  serviceStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  serviceBooked: {
    backgroundColor: '#DBEAFE',
  },
  serviceStarted: {
    backgroundColor: '#FEF3C7',
  },
  serviceInProgress: {
    backgroundColor: '#FECACA',
  },
  serviceCompleted: {
    backgroundColor: '#D1FAE5',
  },
  serviceCancelled: {
    backgroundColor: '#FEE2E2',
  },
  serviceStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  cancelledInfo: {
    fontSize: 12,
    color: '#DC2626',
    fontStyle: 'italic',
    marginTop: 4,
  },
  startServiceButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  startServiceButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  startServiceButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  updateServiceButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  updateServiceButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  serviceTime: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  serviceStatusOptions: {
    marginVertical: 16,
  },
  serviceStatusButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceStatusButtonComplete: {
    backgroundColor: '#10B981',
  },
  serviceStatusButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  serviceStatusButtonTextComplete: {
    color: '#fff',
  },
});
