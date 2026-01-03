import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { LinearGradient } from 'expo-linear-gradient';
import { MY_VEHICLES } from '../apollo/queries';

const { width } = Dimensions.get('window');

interface TrackProgressScreenProps {
  navigation: any;
  route?: any;
}

/**
 * Track Progress Screen
 * Shows progress for all active vehicles with individual services from slot booking
 * 
 * If vehicle has slot booking with multiple services (e.g., Car Wash + Body Repair),
 * shows separate progress tracking for each service
 * 
 * Each service shows its status:
 * - BOOKED (waiting to start)
 * - STARTED (service has begun)
 * - IN_PROGRESS (actively being worked on)
 * - COMPLETED (service finished)
 * 
 * Falls back to legacy vehicle status tracking if no slot booking exists
 */
export default function TrackProgressScreen({ navigation, route }: TrackProgressScreenProps) {
  const vehicleId = route?.params?.vehicleId;
  
  const { data, loading, refetch } = useQuery(MY_VEHICLES, {
    pollInterval: 10000, // Poll every 10 seconds for real-time updates
  });

  // State for accordion expansion - track which services are expanded
  const [expandedServices, setExpandedServices] = React.useState<{[key: string]: boolean}>({});
  const [expandedVehicles, setExpandedVehicles] = React.useState<{[key: string]: boolean}>({});

  // Get all active vehicles (not DELIVERED)
  // Also filter out vehicles where ALL slot booking services are CANCELLED
  const activeVehicles = data?.myVehicles?.filter((v: any) => {
    // Don't show delivered vehicles
    if (v.status === 'DELIVERED') return false;
    
    // If vehicle has slot booking with services
    if (v.slotBooking?.services && v.slotBooking.services.length > 0) {
      // Check if ALL services are cancelled
      const allServicesCancelled = v.slotBooking.services.every(
        (service: any) => service.status === 'CANCELLED'
      );
      // Don't show if all services are cancelled
      if (allServicesCancelled) return false;
    }
    
    return true;
  }) || [];
  
  // If vehicleId is provided, show only that vehicle, otherwise show all active vehicles
  const vehiclesToShow = vehicleId 
    ? activeVehicles.filter((v: any) => v.id === vehicleId)
    : activeVehicles;

  // Toggle vehicle accordion
  const toggleVehicle = (vehicleId: string) => {
    setExpandedVehicles(prev => ({
      ...prev,
      [vehicleId]: !prev[vehicleId]
    }));
  };

  // Toggle service accordion
  const toggleService = (serviceId: string) => {
    setExpandedServices(prev => ({
      ...prev,
      [serviceId]: !prev[serviceId]
    }));
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
        return '⚙️';
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

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return '#3B82F6';
      case 'STARTED':
        return '#F59E0B';
      case 'IN_PROGRESS':
        return '#EF4444';
      case 'COMPLETED':
        return '#10B981';
      case 'CANCELLED':
        return '#6B7280';
      default:
        return '#9CA3AF';
    }
  };

  const getServiceStatusLabel = (status: string) => {
    switch (status) {
      case 'BOOKED':
        return 'Waiting to Start';
      case 'STARTED':
        return 'Started';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const renderServiceProgress = (service: any) => {
    const isExpanded = expandedServices[service.id] || false;
    const isCancelled = service.status === 'CANCELLED';
    
    const steps = [
      { status: 'BOOKED', label: 'Booked', icon: '📋' },
      { status: 'STARTED', label: 'Started', icon: '▶️' },
      { status: 'IN_PROGRESS', label: 'In Progress', icon: '⚙️' },
      { status: 'COMPLETED', label: 'Completed', icon: '✅' },
    ];

    const currentStepIndex = steps.findIndex(s => s.status === service.status);

    return (
      <View style={[styles.serviceCard, isCancelled && styles.serviceCancelled]}>
        <TouchableOpacity 
          style={styles.serviceHeader}
          onPress={() => toggleService(service.id)}
          activeOpacity={0.7}
        >
          <View style={styles.serviceIconContainer}>
            <Text style={[styles.serviceIcon, isCancelled && styles.serviceIconCancelled]}>
              {isCancelled ? '❌' : getServiceIcon(service.serviceType)}
            </Text>
            <View style={styles.serviceInfo}>
              <Text style={[styles.serviceName, isCancelled && styles.serviceNameCancelled]}>
                {getServiceName(service.serviceType)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[
              styles.serviceStatusBadge,
              { backgroundColor: getServiceStatusColor(service.status) }
            ]}>
              <Text style={styles.serviceStatusText}>{getServiceStatusLabel(service.status)}</Text>
            </View>
            <Text style={styles.accordionIcon}>{isExpanded ? '▼' : '▶'}</Text>
          </View>
        </TouchableOpacity>

        {/* Service Progress Steps - Only show when expanded and not cancelled */}
        {isExpanded && !isCancelled && (
          <>
            <View style={styles.serviceSteps}>
              {steps.map((step, index) => {
                const isCompleted = index < currentStepIndex;
                const isActive = index === currentStepIndex;
                const isPending = index > currentStepIndex;

                return (
                  <View key={step.status} style={styles.stepRow}>
                    <View style={[
                      styles.stepDot,
                      isCompleted && styles.stepDotCompleted,
                      isActive && styles.stepDotActive,
                      isPending && styles.stepDotPending,
                    ]}>
                      <Text style={styles.stepDotIcon}>{step.icon}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[
                        styles.stepLabel,
                        isPending && styles.stepLabelPending,
                      ]}>
                        {step.label}
                      </Text>
                      {isActive && service.startedAt && (
                        <Text style={styles.stepTime}>
                          {formatTimestamp(service.startedAt)}
                        </Text>
                      )}
                      {isCompleted && service.completedAt && step.status === 'COMPLETED' && (
                        <Text style={styles.stepTime}>
                          {formatTimestamp(service.completedAt)}
                        </Text>
                      )}
                    </View>
                    {index < steps.length - 1 && (
                      <View style={[
                        styles.stepConnector,
                        isCompleted && styles.stepConnectorCompleted,
                      ]} />
                    )}
                  </View>
                );
              })}
            </View>

            {service.notes && (
              <View style={styles.serviceNotes}>
                <Text style={styles.serviceNotesLabel}>Notes:</Text>
                <Text style={styles.serviceNotesText}>{service.notes}</Text>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '---';
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Track Progress</Text>
        <Text style={styles.headerSubtitle}>
          Real-time service progress tracking
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
      >
        {vehiclesToShow && vehiclesToShow.length > 0 ? (
          vehiclesToShow.map((vehicle: any) => {
            const hasSlotServices = vehicle?.slotBooking?.services && vehicle.slotBooking.services.length > 0;
            const serviceType = vehicle?.serviceType || 'WASH';
            
            const washSteps = [
              { status: 'RECEIVED', icon: '📥', title: 'Received', description: 'Vehicle checked in', timestamp: vehicle.receivedAt },
              { status: 'WASHING', icon: '🚿', title: 'Washing', description: 'Cleaning in progress', timestamp: vehicle.washingAt },
              { status: 'READY_FOR_PICKUP', icon: '✅', title: 'Ready', description: 'Ready for pickup', timestamp: vehicle.readyAt },
            ];

            const bodyRepairSteps = [
              { status: 'RECEIVED', icon: '📥', title: 'Received', description: 'Vehicle checked in', timestamp: vehicle.receivedAt },
              { status: 'BODY_REPAIR_ASSESSMENT', icon: '🔍', title: 'Assessment', description: 'Damage evaluation', timestamp: vehicle.bodyRepairAssessmentAt },
              { status: 'BODY_REPAIR_IN_PROGRESS', icon: '🔧', title: 'Repair Work', description: 'Fixing in progress', timestamp: vehicle.bodyRepairInProgressAt },
              { status: 'BODY_REPAIR_PAINTING', icon: '🎨', title: 'Painting', description: 'Paint application', timestamp: vehicle.bodyRepairPaintingAt },
              { status: 'BODY_REPAIR_COMPLETE', icon: '✨', title: 'Repair Complete', description: 'All work completed', timestamp: vehicle.bodyRepairCompleteAt },
              { status: 'READY_FOR_PICKUP', icon: '✅', title: 'Ready for Pickup', description: 'Vehicle is ready to collect', timestamp: vehicle.readyAt },
            ];

            const steps = serviceType === 'BODY_REPAIR' ? bodyRepairSteps : washSteps;
            
            // Helper function to get step status for legacy timeline
            const getStepStatus = (stepStatus: string) => {
              let statusOrder: string[];
              if (serviceType === 'BODY_REPAIR') {
                statusOrder = [
                  'BODY_REPAIR_ASSESSMENT',
                  'BODY_REPAIR_IN_PROGRESS',
                  'BODY_REPAIR_PAINTING',
                  'BODY_REPAIR_COMPLETE',
                  'READY_FOR_PICKUP',
                  'DELIVERED'
                ];
              } else {
                statusOrder = ['RECEIVED', 'WASHING', 'READY_FOR_PICKUP', 'DELIVERED'];
              }
              
              const currentIndex = statusOrder.indexOf(vehicle.status);
              const stepIndex = statusOrder.indexOf(stepStatus);
              
              if (stepIndex < currentIndex) return 'completed';
              if (stepIndex === currentIndex) return 'active';
              return 'pending';
            };
            
            const isVehicleExpanded = expandedVehicles[vehicle.id] || false;
            const serviceCount = vehicle.slotBooking?.services?.length || 0;
            
            return (
              <View key={vehicle.id} style={styles.vehicleCard}>
                {/* Vehicle Header - Always visible, clickable to expand/collapse */}
                <TouchableOpacity 
                  style={styles.vehicleHeader}
                  onPress={() => toggleVehicle(vehicle.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.vehicleNumber}>{vehicle.vehicleNumber}</Text>
                    {hasSlotServices && (
                      <Text style={styles.vehicleServiceCount}>
                        {serviceCount} Service{serviceCount > 1 ? 's' : ''} Booked
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(vehicle.status) }
                    ]}>
                      <Text style={styles.statusText}>{getStatusLabel(vehicle.status)}</Text>
                    </View>
                    <Text style={styles.accordionIcon}>{isVehicleExpanded ? '▼' : '▶'}</Text>
                  </View>
                </TouchableOpacity>

                {/* Vehicle Details - Show when expanded */}
                {isVehicleExpanded && (
                  <>
                    <View style={styles.vehicleDetails}>
                      <Text style={styles.vehicleInfo}>
                        {vehicle.vehicleType === 'CAR' ? '🚗' : '🏍️'} {vehicle.brand} {vehicle.model}
                      </Text>
                      {vehicle.worker && (
                        <Text style={styles.workerInfo}>
                          👷 Worker: {vehicle.worker.name || vehicle.worker.mobile}
                        </Text>
                      )}
                    </View>

                    {/* Show individual services if from slot booking */}
                    {hasSlotServices ? (
                      <View style={styles.servicesContainer}>
                        {vehicle.slotBooking.services.map((service: any) => (
                          <View key={service.id}>
                            {renderServiceProgress(service)}
                          </View>
                        ))}
                      </View>
                    ) : (
                      <>
                    {/* Legacy Progress Timeline - Horizontal (for non-slot vehicles) */}
                    <View style={styles.timelineContainer}>
                      <Text style={styles.timelineTitle}>
                        {serviceType === 'BODY_REPAIR' ? 'Body Repair Progress' : 'Wash Progress'}
                      </Text>
              
              {/* Horizontal Steps */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stepsContainer}
              >
                {steps.map((step, index) => {
                  const stepStatus = getStepStatus(step.status);
                  
                  return (
                    <React.Fragment key={step.status}>
                      {/* Step */}
                      <View style={styles.stepContainer}>
                        {/* Icon Circle */}
                        <View style={[
                          styles.stepCircle,
                          stepStatus === 'completed' && styles.stepCircleCompleted,
                          stepStatus === 'active' && styles.stepCircleActive,
                        ]}>
                          <Text style={[
                            styles.stepIcon,
                            stepStatus === 'pending' && styles.stepIconPending,
                          ]}>
                            {step.icon}
                          </Text>
                        </View>
                        
                        {/* Step Info */}
                        <Text style={[
                          styles.stepTitle,
                          stepStatus === 'pending' && styles.stepTitlePending,
                        ]}>
                          {step.title}
                        </Text>
                        <Text style={styles.stepDescription}>{step.description}</Text>
                        
                        {/* Timestamp */}
                        <View style={[
                          styles.timestampBadge,
                          stepStatus !== 'pending' && styles.timestampBadgeActive,
                        ]}>
                          <Text style={[
                            styles.timestampText,
                            stepStatus !== 'pending' && styles.timestampTextActive,
                          ]}>
                            {formatTimestamp(step.timestamp)}
                          </Text>
                        </View>
                      </View>

                      {/* Connection Line */}
                      {index < steps.length - 1 && (
                        <View style={styles.connectionLineContainer}>
                          <View style={[
                            styles.connectionLine,
                            stepStatus === 'completed' && styles.connectionLineCompleted,
                          ]} />
                        </View>
                      )}
                    </React.Fragment>
                  );
                })}
              </ScrollView>
            </View>
              </>
            )}

            {/* Payment Info - Show for all vehicles */}
            {vehicle.payment && (
              <View style={styles.paymentCard}>
                <Text style={styles.paymentTitle}>Payment Details</Text>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Amount:</Text>
                  <Text style={styles.paymentAmount}>₹{vehicle.payment.amount}</Text>
                </View>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Status:</Text>
                  <Text style={[
                    styles.paymentStatus,
                    { color: vehicle.payment.status === 'PAID' ? '#10B981' : '#F59E0B' }
                  ]}>
                    {vehicle.payment.status}
                  </Text>
                </View>
                {vehicle.payment.method && (
                  <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Method:</Text>
                    <Text style={styles.paymentMethod}>{vehicle.payment.method}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Action Message */}
            {vehicle.status === 'READY_FOR_PICKUP' && (
              <View style={styles.actionBanner}>
                <Text style={styles.actionIcon}>🎉</Text>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>Vehicle is Ready!</Text>
                  <Text style={styles.actionSubtitle}>
                    Your vehicle is {serviceType === 'BODY_REPAIR' ? 'repaired' : 'washed'} and ready for pickup
                  </Text>
                </View>
              </View>
            )}

            {(vehicle.status === 'WASHING' || 
              vehicle.status === 'BODY_REPAIR_ASSESSMENT' ||
              vehicle.status === 'BODY_REPAIR_IN_PROGRESS' ||
              vehicle.status === 'BODY_REPAIR_PAINTING' ||
              vehicle.status === 'BODY_REPAIR_COMPLETE') && (
              <View style={styles.infoBanner}>
                <Text style={styles.infoIcon}>🔄</Text>
                <Text style={styles.infoText}>
                  {serviceType === 'BODY_REPAIR' 
                    ? 'Your vehicle is currently being repaired. Please wait...'
                    : 'Your vehicle is currently being washed. Please wait...'}
                </Text>
              </View>
            )}
                  </>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No Active Vehicles</Text>
            <Text style={styles.emptyText}>
              You don't have any vehicles currently in service.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.emptyButtonText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Helper functions
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

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'RECEIVED':
      return 'Received';
    case 'WASHING':
      return 'Washing';
    case 'READY_FOR_PICKUP':
      return 'Ready';
    case 'DELIVERED':
      return 'Delivered';
    default:
      return status;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 0,
  },
  vehicleNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  vehicleServiceCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  vehicleDetails: {
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  vehicleInfo: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  workerInfo: {
    fontSize: 14,
    color: '#6B7280',
  },
  timelineContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 24,
  },
  stepsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 16,
  },
  stepContainer: {
    width: 120,
    alignItems: 'center',
  },
  stepCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepCircleActive: {
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  stepIcon: {
    fontSize: 28,
  },
  stepIconPending: {
    opacity: 0.5,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  stepTitlePending: {
    color: '#9CA3AF',
  },
  stepDescription: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  timestampBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timestampBadgeActive: {
    backgroundColor: '#DBEAFE',
  },
  timestampText: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  timestampTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  connectionLineContainer: {
    width: 40,
    alignItems: 'center',
    marginTop: 30,
  },
  connectionLine: {
    height: 4,
    width: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  connectionLineCompleted: {
    backgroundColor: '#10B981',
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6B7280',
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
  paymentMethod: {
    fontSize: 14,
    color: '#1F2937',
  },
  actionBanner: {
    flexDirection: 'row',
    backgroundColor: '#D1FAE5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  actionIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#047857',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for service-based tracking
  servicesContainer: {
    marginTop: 8,
  },
  servicesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 0,
  },
  accordionIcon: {
    fontSize: 16,
    color: '#6B7280',
    marginLeft: 8,
  },
  serviceIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  serviceStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  serviceStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  serviceSteps: {
    marginTop: 20,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepDotCompleted: {
    backgroundColor: '#10B981',
  },
  stepDotActive: {
    backgroundColor: '#F59E0B',
  },
  stepDotPending: {
    backgroundColor: '#E5E7EB',
  },
  stepDotIcon: {
    fontSize: 14,
  },
  stepContent: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  stepLabelPending: {
    color: '#9CA3AF',
  },
  stepTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  stepConnector: {
    position: 'absolute',
    left: 11,
    top: 28,
    width: 2,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  stepConnectorCompleted: {
    backgroundColor: '#10B981',
  },
  serviceNotes: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  serviceNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  serviceNotesText: {
    fontSize: 14,
    color: '#1F2937',
    fontStyle: 'italic',
  },
  serviceCancelled: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },
  serviceIconCancelled: {
    opacity: 0.5,
  },
  serviceNameCancelled: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
