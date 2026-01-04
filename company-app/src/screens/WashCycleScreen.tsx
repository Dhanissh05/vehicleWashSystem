import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Linking,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';
import { useFocusEffect } from '@react-navigation/native';
import { ManualPaymentModal } from '../components/ManualPaymentModal';

const GET_ACTIVE_VEHICLES = gql`
  query GetActiveVehicles {
    vehicles(limit: 50) {
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
      pricing {
        id
        categoryName
        price
        vehicleType
      }
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
          pricing {
            id
            categoryName
            price
            vehicleType
          }
          customPrice
          customPricingName
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

const GET_PRICING_OPTIONS = gql`
  query GetPricingOptions {
    pricing {
      id
      vehicleType
      categoryName
      price
      description
    }
  }
`;

const UPDATE_VEHICLE_PRICING = gql`
  mutation UpdateVehiclePricing($input: UpdateVehiclePricingInput!) {
    updateVehiclePricing(input: $input) {
      id
      pricing {
        id
        categoryName
        price
      }
      payment {
        id
        amount
      }
    }
  }
`;

const UPDATE_SERVICE_PRICING = gql`
  mutation UpdateServicePricing($input: UpdateServicePricingInput!) {
    updateServicePricing(input: $input) {
      id
      pricing {
        id
        categoryName
        price
        vehicleType
      }
      customPrice
      customPricingName
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

const DELETE_PAYMENT = gql`
  mutation DeletePayment($vehicleId: ID!) {
    deletePayment(vehicleId: $vehicleId)
  }
`;

const ADJUST_PAYMENT = gql`
  mutation AdjustPayment($vehicleId: ID!) {
    adjustPayment(vehicleId: $vehicleId) {
      id
      amount
      status
      method
    }
  }
`;

const CONFIRM_BILL = gql`
  mutation ConfirmBill($vehicleId: ID!) {
    confirmBill(vehicleId: $vehicleId) {
      id
      status
      readyAt
    }
  }
`;

export default function WashCycleScreen({ navigation }: any) {
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [customPriceModalVisible, setCustomPriceModalVisible] = useState(false);
  const [customPrice, setCustomPrice] = useState('');
  const [customPricingName, setCustomPricingName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, loading, refetch, error, networkStatus } = useQuery(GET_ACTIVE_VEHICLES, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 5000,
    errorPolicy: 'ignore',
    notifyOnNetworkStatusChange: true,
  });

  const { data: pricingData, error: pricingError } = useQuery(GET_PRICING_OPTIONS, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    onError: (error) => {
      console.error('Pricing fetch error:', error);
      Alert.alert('Error', 'Failed to load pricing options. Please try again.');
    },
  });

  // Auto-refetch when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

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

  const [updateVehiclePricing] = useMutation(UPDATE_VEHICLE_PRICING, {
    onCompleted: () => {
      Alert.alert('Success', 'Pricing category updated successfully');
      setPricingModalVisible(false);
      setSelectedVehicle(null);
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const [updateServicePricing, { loading: updatingServicePricing }] = useMutation(UPDATE_SERVICE_PRICING, {
    refetchQueries: [{ query: GET_ACTIVE_VEHICLES }],
    awaitRefetchQueries: true,
    onCompleted: async (mutationData) => {
      console.log('Service pricing updated and refetched:', mutationData);
      
      setPricingModalVisible(false);
      setSelectedService(null);
      setSelectedVehicle(null);
      
      // Force re-render with new key
      setRefreshKey(prev => prev + 1);
      
      Alert.alert('Success', 'Service pricing updated successfully');
    },
    onError: (error) => {
      console.error('Update pricing error:', error);
      Alert.alert('Error', error.message);
    },
  });

  const [deletePayment] = useMutation(DELETE_PAYMENT, {
    onCompleted: () => {
      Alert.alert('Success', 'Payment reset successfully');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const [adjustPayment] = useMutation(ADJUST_PAYMENT, {
    onCompleted: (data) => {
      Alert.alert(
        'Payment Adjusted',
        `Payment amount updated to ₹${data.adjustPayment.amount}. Customer will need to complete payment again.`,
        [{ text: 'OK' }]
      );
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const [confirmBill] = useMutation(CONFIRM_BILL, {
    onCompleted: () => {
      Alert.alert(
        'Success',
        'Bill confirmed! Vehicle marked as Ready for Pickup. Customer has been notified.',
        [{ text: 'OK' }]
      );
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
            <View style={styles.customerInfo}>
              <Text style={styles.value}>{item.customer.name || item.customer.mobile}</Text>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => {
                  const phoneNumber = `tel:${item.customer.mobile}`;
                  Linking.openURL(phoneNumber).catch(() => {
                    Alert.alert('Error', 'Unable to make call');
                  });
                }}
              >
                <Text style={styles.callButtonText}>📞 Call</Text>
              </TouchableOpacity>
            </View>
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
                  const pricingKey = `${service.id}-${service.pricing?.id || 'none'}-${service.customPrice || 'none'}-${refreshKey}`;
                  
                  return (
                <View key={pricingKey} style={styles.serviceItem}>
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
                  
                  {/* Service Pricing */}
                  <View style={styles.servicePricingRow}>
                    <Text style={styles.servicePricingLabel}>Price: </Text>
                    {service.pricing ? (
                      <>
                        <Text style={styles.servicePricingText}>
                          {service.pricing.categoryName} - ₹{service.pricing.price}
                        </Text>
                        {!item.payment && service.status !== 'CANCELLED' && (
                          <View style={styles.servicePricingButtons}>
                            <TouchableOpacity
                              style={styles.changeServicePricingButton}
                              onPress={() => {
                                setSelectedService(service);
                                setSelectedVehicle(item);
                                setPricingModalVisible(true);
                              }}
                            >
                              <Text style={styles.changeServicePricingButtonText}>Change</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.resetServicePricingButton}
                              onPress={() => {
                                Alert.alert(
                                  'Reset Pricing',
                                  'Remove pricing for this service?',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Reset',
                                      style: 'destructive',
                                      onPress: () => {
                                        updateServicePricing({
                                          variables: {
                                            input: {
                                              serviceId: service.id,
                                              pricingId: null,
                                            },
                                          },
                                        });
                                      },
                                    },
                                  ]
                                );
                              }}
                            >
                              <Text style={styles.resetServicePricingButtonText}>Reset</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </>
                    ) : service.customPrice ? (
                      <>
                        <Text style={styles.servicePricingText}>
                          {service.customPricingName || 'Custom'} - ₹{service.customPrice}
                        </Text>
                        {!item.payment && service.status !== 'CANCELLED' && (
                          <View style={styles.servicePricingButtons}>
                            <TouchableOpacity
                              style={styles.changeServicePricingButton}
                              onPress={() => {
                                setSelectedService(service);
                                setSelectedVehicle(item);
                                setPricingModalVisible(true);
                              }}
                            >
                              <Text style={styles.changeServicePricingButtonText}>Change</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.resetServicePricingButton}
                              onPress={() => {
                                Alert.alert(
                                  'Reset Pricing',
                                  'Remove pricing for this service?',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                      text: 'Reset',
                                      style: 'destructive',
                                      onPress: () => {
                                        updateServicePricing({
                                          variables: {
                                            input: {
                                              serviceId: service.id,
                                              customPrice: null,
                                              customPricingName: null,
                                            },
                                          },
                                        });
                                      },
                                    },
                                  ]
                                );
                              }}
                            >
                              <Text style={styles.resetServicePricingButtonText}>Reset</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </>
                    ) : (
                      service.status !== 'CANCELLED' && (
                        <TouchableOpacity
                          style={styles.selectServicePricingButton}
                          onPress={() => {
                            setSelectedService(service);
                            setSelectedVehicle(item);
                            setPricingModalVisible(true);
                          }}
                        >
                          <Text style={styles.selectServicePricingButtonText}>+ Select</Text>
                        </TouchableOpacity>
                      )
                    )}
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

          {/* Vehicle-level Pricing Category (only show for vehicles without slot bookings or legacy pricing) */}
          {!item.slotBooking && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Category:</Text>
              <View style={styles.pricingRow}>
                {item.pricing ? (
                  <>
                    <Text style={styles.pricingText}>
                      {item.pricing.categoryName} - ₹{item.pricing.price}
                    </Text>
                    {!item.payment && (
                      <TouchableOpacity
                        style={styles.changePricingButton}
                        onPress={() => {
                          setSelectedVehicle(item);
                          setPricingModalVisible(true);
                        }}
                      >
                        <Text style={styles.changePricingButtonText}>Change</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.selectPricingButton}
                    onPress={() => {
                      setSelectedVehicle(item);
                      setPricingModalVisible(true);
                    }}
                  >
                    <Text style={styles.selectPricingButtonText}>+ Select Category</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.label}>Payment:</Text>
            <View>
              {item.payment ? (
                <>
                  <View style={[
                    styles.paymentBadge,
                    item.payment.status === 'PAID' ? styles.paymentPaid : styles.paymentPending
                  ]}>
                    <Text style={[
                      styles.paymentText,
                      item.payment.status === 'PAID' ? styles.paymentTextPaid : styles.paymentTextPending
                    ]}>
                      {item.payment.status === 'PAID' ? '✓ Paid' : item.payment.status} - ₹{item.payment.amount}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  {(() => {
                    const totalAmount = item.slotBooking?.services?.reduce((sum: number, svc: any) => 
                      sum + (svc.pricing?.price || svc.customPrice || 0), 0) || 0;
                    return totalAmount > 0 ? (
                      <Text style={styles.estimatedAmount}>Est. Total: ₹{totalAmount}</Text>
                    ) : (
                      <Text style={styles.value}>Not Initiated</Text>
                    );
                  })()}
                </>
              )}
            </View>
          </View>

          {item.payment && item.payment.status === 'MANUAL_PENDING' && (
            <View style={styles.paymentActions}>
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
              
              <TouchableOpacity
                style={styles.resetPaymentButton}
                onPress={() => {
                  Alert.alert(
                    'Reset Payment',
                    'Are you sure you want to reset this payment? This will allow changing the pricing.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Reset',
                        style: 'destructive',
                        onPress: () => {
                          deletePayment({
                            variables: { vehicleId: item.id },
                          });
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.resetPaymentButtonText}>🔄 Reset Payment</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Adjust Payment button for any payment status before delivery */}
          {item.payment && item.payment.status !== 'PAID' && item.status !== 'DELIVERED' && (
            <TouchableOpacity
              style={styles.adjustPaymentButton}
              onPress={() => {
                // Calculate current total
                const currentTotal = item.slotBooking?.services?.reduce((sum: number, svc: any) => 
                  sum + (svc.pricing?.price || svc.customPrice || 0), 0) || 0;
                
                Alert.alert(
                  'Adjust Payment Amount',
                  `Current pricing total: ₹${currentTotal}\n\nThis will reset the payment and ask the customer to pay the updated amount. Are you sure?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Adjust Payment',
                      onPress: () => {
                        adjustPayment({
                          variables: { vehicleId: item.id },
                        });
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.adjustPaymentButtonText}>💰 Adjust Payment</Text>
            </TouchableOpacity>
          )}

          {/* Confirm Bill button when all services completed but not ready for pickup */}
          {item.slotBooking?.services && 
           item.slotBooking.services.length > 0 && 
           item.slotBooking.services.every((s: any) => s.status === 'COMPLETED' || s.status === 'CANCELLED') &&
           item.status !== 'READY_FOR_PICKUP' && 
           item.status !== 'DELIVERED' && (
            <TouchableOpacity
              style={styles.confirmBillButton}
              onPress={() => {
                // Calculate total
                const total = item.slotBooking.services.reduce((sum: number, svc: any) => 
                  sum + (svc.pricing?.price || svc.customPrice || 0), 0);
                
                // Check if all completed services have pricing
                const completedServices = item.slotBooking.services.filter((s: any) => s.status === 'COMPLETED');
                const missingPricing = completedServices.filter((s: any) => !s.pricing && !s.customPrice);
                
                if (missingPricing.length > 0) {
                  Alert.alert(
                    'Pricing Required',
                    `Please set pricing for ${missingPricing.length} service(s) before confirming the bill.`,
                    [{ text: 'OK' }]
                  );
                  return;
                }
                
                Alert.alert(
                  'Confirm Bill',
                  `Total Amount: ₹${total}\n\nThis will mark the vehicle as Ready for Pickup and notify the customer to make payment. Continue?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Confirm Bill',
                      onPress: () => {
                        confirmBill({
                          variables: { vehicleId: item.id },
                        });
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.confirmBillButtonText}>✓ Confirm Bill & Notify Customer</Text>
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
  const filteredVehicles = useMemo(() => {
    if (!data?.vehicles) return [];
    
    const query = debouncedSearch.toLowerCase();
    
    return data.vehicles.filter((v: any) => {
      // Exclude delivered
      if (v.status === 'DELIVERED') return false;
      
      // Exclude cancelled bookings
      if (v.slotBooking?.status === 'CANCELLED') {
        if (v.slotBooking.services?.every((s: any) => s.status === 'CANCELLED')) {
          return false;
        }
      }
      
      // Include slot bookings or WASH service
      if (!v.slotBooking && v.serviceType !== 'WASH') return false;
      
      // Search filter
      if (!query) return true;
      
      const num = (v.vehicleNumber || '').toLowerCase();
      const mobile = (v.customer?.mobile || '').toLowerCase();
      const name = (v.customer?.name || '').toLowerCase();
      
      return num.includes(query) || mobile.includes(query) || name.includes(query);
    });
  }, [data?.vehicles, debouncedSearch]);

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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by vehicle number, mobile, or name..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading && !data ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredVehicles}
          renderItem={renderVehicle}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={10}
          windowSize={10}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyText}>
                {debouncedSearch ? 'No vehicles found' : 'No active vehicles'}
              </Text>
              <Text style={styles.emptySubtext}>
                {debouncedSearch ? 'Try a different search term' : 'All vehicles have been delivered'}
              </Text>
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
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <View style={styles.modalContent} pointerEvents="auto">
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

      {/* Pricing Category Selection Modal */}
      <Modal
        visible={pricingModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPricingModalVisible(false)}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <View style={styles.modalContent} pointerEvents="auto">
            <Text style={styles.modalTitle}>Select Pricing Category</Text>
            <Text style={styles.modalSubtitle}>
              Vehicle: {selectedVehicle?.vehicleNumber}
              {selectedService && ` - ${
                selectedService.serviceType === 'CAR_WASH' ? 'Car Wash' :
                selectedService.serviceType === 'TWO_WHEELER_WASH' ? 'Two Wheeler Wash' :
                'Body Repair'
              }`}
            </Text>

            <View style={styles.pricingOptions}>
              {updatingServicePricing && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#8B5CF6" />
                  <Text style={styles.loadingText}>Updating pricing...</Text>
                </View>
              )}
              {!pricingData?.pricing || pricingData.pricing.length === 0 ? (
                <Text style={styles.noPricingText}>No pricing categories available</Text>
              ) : (
                pricingData.pricing
                  ?.filter((p: any) => {
                    // Filter pricing based on service type if selecting for specific service
                    if (selectedService) {
                      if (selectedService.serviceType === 'CAR_WASH') {
                        return p.vehicleType === 'CAR' || p.vehicleType === selectedVehicle?.vehicleType;
                      } else if (selectedService.serviceType === 'TWO_WHEELER_WASH') {
                        return p.vehicleType === 'TWO_WHEELER';
                      } else if (selectedService.serviceType === 'BODY_REPAIR') {
                        return p.vehicleType === 'BODY_REPAIR' || p.vehicleType === 'PAINTING';
                      }
                    }
                    // Filter for vehicle-level pricing
                    if (selectedVehicle?.serviceType === 'BODY_REPAIR') {
                      return p.vehicleType === 'BODY_REPAIR';
                    } else if (selectedVehicle?.serviceType === 'WASH') {
                      return p.vehicleType === selectedVehicle?.vehicleType;
                    }
                    return true;
                  })
                  .map((pricing: any) => {
                    const isSelected = selectedService 
                      ? selectedService.pricing?.id === pricing.id
                      : selectedVehicle?.pricing?.id === pricing.id;
                      
                    return (
                    <TouchableOpacity
                      key={pricing.id}
                      style={[
                        styles.pricingOption,
                        isSelected && styles.pricingOptionSelected,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        console.log('Pricing option pressed:', pricing.categoryName, pricing.id);
                        if (selectedService) {
                          console.log('Updating service pricing for service:', selectedService.id);
                          // Update service pricing
                          updateServicePricing({
                            variables: {
                              input: {
                                serviceId: selectedService.id,
                                pricingId: pricing.id,
                              },
                            },
                          }).catch((err) => {
                            console.error('Mutation error:', err);
                            Alert.alert('Error', `Failed to update pricing: ${err.message}`);
                          });
                        } else {
                          console.log('Updating vehicle pricing for vehicle:', selectedVehicle.id);
                          // Update vehicle pricing (legacy)
                          updateVehiclePricing({
                            variables: {
                              input: {
                                vehicleId: selectedVehicle.id,
                                pricingId: pricing.id,
                              },
                            },
                          }).catch((err) => {
                            console.error('Mutation error:', err);
                            Alert.alert('Error', `Failed to update pricing: ${err.message}`);
                          });
                        }
                      }}
                    >
                      <View style={styles.pricingOptionLeft}>
                        <Text style={styles.pricingOptionName}>{pricing.categoryName}</Text>
                        {pricing.description && (
                          <Text style={styles.pricingOptionDescription}>{pricing.description}</Text>
                        )}
                      </View>
                      <Text style={styles.pricingOptionPrice}>₹{pricing.price}</Text>
                    </TouchableOpacity>
                  );
                  })
              )}
            </View>

            {/* Custom Pricing Option */}
            {selectedService && (
              <TouchableOpacity
                style={styles.customPricingButton}
                onPress={() => {
                  setPricingModalVisible(false);
                  setCustomPriceModalVisible(true);
                }}
              >
                <Text style={styles.customPricingButtonText}>💰 Enter Custom Amount</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.closePricingButton}
              onPress={() => setPricingModalVisible(false)}
            >
              <Text style={styles.closePricingButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Pricing Modal */}
      <Modal
        visible={customPriceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomPriceModalVisible(false)}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <View style={styles.modalContent} pointerEvents="auto">
            <Text style={styles.modalTitle}>Enter Custom Amount</Text>
            <Text style={styles.modalSubtitle}>
              Vehicle: {selectedVehicle?.vehicleNumber}
              {selectedService && ` - ${
                selectedService.serviceType === 'CAR_WASH' ? 'Car Wash' :
                selectedService.serviceType === 'TWO_WHEELER_WASH' ? 'Two Wheeler Wash' :
                'Body Repair'
              }`}
            </Text>

            <TextInput
              style={styles.customPriceInput}
              placeholder="Pricing Name (e.g., Special Service)"
              value={customPricingName}
              onChangeText={setCustomPricingName}
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              style={styles.customPriceInput}
              placeholder="Enter amount (₹)"
              value={customPrice}
              onChangeText={setCustomPrice}
              keyboardType="numeric"
              placeholderTextColor="#9CA3AF"
            />

            <View style={styles.customPriceButtons}>
              <TouchableOpacity
                style={styles.customPriceCancelButton}
                onPress={() => {
                  setCustomPriceModalVisible(false);
                  setCustomPrice('');
                  setCustomPricingName('');
                }}
              >
                <Text style={styles.customPriceCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.customPriceSaveButton,
                  !customPrice && styles.customPriceSaveButtonDisabled
                ]}
                disabled={!customPrice}
                onPress={() => {
                  const amount = parseFloat(customPrice);
                  if (isNaN(amount) || amount <= 0) {
                    Alert.alert('Invalid Amount', 'Please enter a valid amount');
                    return;
                  }

                  updateServicePricing({
                    variables: {
                      input: {
                        serviceId: selectedService.id,
                        customPrice: amount,
                        customPricingName: customPricingName || 'Custom',
                      },
                    },
                  });
                  setCustomPriceModalVisible(false);
                  setCustomPrice('');
                  setCustomPricingName('');
                }}
              >
                <Text style={styles.customPriceSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Service Update Modal */}
      <Modal
        visible={serviceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setServiceModalVisible(false)}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <View style={styles.modalContent} pointerEvents="auto">
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
  customerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  callButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
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
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  confirmPaymentButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  paymentActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  resetPaymentButton: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    alignItems: 'center',
  },
  resetPaymentButtonText: {
    color: '#D97706',
    fontWeight: 'bold',
    fontSize: 13,
  },
  adjustPaymentButton: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    alignItems: 'center',
    marginTop: 8,
  },
  adjustPaymentButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 13,
  },
  confirmBillButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#059669',
  },
  confirmBillButtonText: {
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearIcon: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: 'bold',
  },
  // Pricing styles
  pricingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pricingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  servicePricingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  changePricingButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  changePricingButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  resetServicePricingButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  resetServicePricingButtonText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  selectPricingButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  selectPricingButtonText: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '600',
  },
  pricingOptions: {
    maxHeight: 400,
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  noPricingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    padding: 20,
  },
  pricingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  pricingOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  pricingOptionLeft: {
    flex: 1,
  },
  pricingOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  pricingOptionDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  pricingOptionPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
    marginLeft: 12,
  },
  closePricingButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closePricingButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  servicePricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  servicePricingLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  servicePricingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    flex: 1,
  },
  changeServicePricingButton: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#3B82F6',
    marginLeft: 8,
  },
  changeServicePricingButtonText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
  selectServicePricingButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  selectServicePricingButtonText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '600',
  },
  estimatedAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
  customPricingButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  customPricingButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  customPriceInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  customPriceButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  customPriceCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  customPriceCancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  customPriceSaveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  customPriceSaveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  customPriceSaveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
