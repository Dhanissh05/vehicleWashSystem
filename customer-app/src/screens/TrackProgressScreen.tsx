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
 * Shows horizontal timeline for both Wash and Body Repair services
 * 
 * For WASH service (3 steps):
 * 1. Vehicle Dropped (RECEIVED)
 * 2. Washing in Progress (WASHING)
 * 3. Ready for Pickup (READY_FOR_PICKUP)
 * 
 * For BODY_REPAIR service (5 steps):
 * 1. Assessment (BODY_REPAIR_ASSESSMENT)
 * 2. Repair In Progress (BODY_REPAIR_IN_PROGRESS)
 * 3. Painting (BODY_REPAIR_PAINTING)
 * 4. Repair Complete (BODY_REPAIR_COMPLETE)
 * 5. Ready for Pickup (READY_FOR_PICKUP)
 * 
 * Each step shows timestamp when status was updated
 * Completed steps are colored, current step is animated, future steps are grey
 */
export default function TrackProgressScreen({ navigation, route }: TrackProgressScreenProps) {
  const vehicleId = route?.params?.vehicleId;
  
  const { data, loading, refetch } = useQuery(MY_VEHICLES, {
    pollInterval: 10000, // Poll every 10 seconds for real-time updates
  });

  // Find specific vehicle or use first active vehicle
  const vehicle = vehicleId
    ? data?.myVehicles?.find((v: any) => v.id === vehicleId)
    : data?.myVehicles?.find((v: any) => v.status !== 'DELIVERED');

  const getStepStatus = (stepStatus: string) => {
    if (!vehicle) return 'pending';
    
    const serviceType = vehicle.serviceType || 'WASH';
    
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

  // Determine which steps to show based on service type
  const serviceType = vehicle?.serviceType || 'WASH';
  
  const washSteps = [
    {
      status: 'RECEIVED',
      icon: '📍',
      title: 'Vehicle Dropped',
      description: 'Vehicle received at center',
      timestamp: vehicle?.receivedAt,
    },
    {
      status: 'WASHING',
      icon: '💧',
      title: 'Washing in Progress',
      description: 'Your vehicle is being washed',
      timestamp: vehicle?.washingAt,
    },
    {
      status: 'READY_FOR_PICKUP',
      icon: '✅',
      title: 'Ready for Pickup',
      description: 'Vehicle is ready to collect',
      timestamp: vehicle?.readyAt,
    },
  ];

  const bodyRepairSteps = [
    {
      status: 'BODY_REPAIR_ASSESSMENT',
      icon: '🔍',
      title: 'Assessment',
      description: 'Damage assessment in progress',
      timestamp: vehicle?.bodyRepairAssessmentAt,
    },
    {
      status: 'BODY_REPAIR_IN_PROGRESS',
      icon: '🔧',
      title: 'Repair In Progress',
      description: 'Body repair work ongoing',
      timestamp: vehicle?.bodyRepairInProgressAt,
    },
    {
      status: 'BODY_REPAIR_PAINTING',
      icon: '🎨',
      title: 'Painting',
      description: 'Painting and finishing',
      timestamp: vehicle?.bodyRepairPaintingAt,
    },
    {
      status: 'BODY_REPAIR_COMPLETE',
      icon: '✨',
      title: 'Repair Complete',
      description: 'All work completed',
      timestamp: vehicle?.bodyRepairCompleteAt,
    },
    {
      status: 'READY_FOR_PICKUP',
      icon: '✅',
      title: 'Ready for Pickup',
      description: 'Vehicle is ready to collect',
      timestamp: vehicle?.readyAt,
    },
  ];

  const steps = serviceType === 'BODY_REPAIR' ? bodyRepairSteps : washSteps;

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
          Real-time {serviceType === 'BODY_REPAIR' ? 'body repair' : 'wash'} status
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
      >
        {vehicle ? (
          <>
            {/* Vehicle Info Card */}
            <View style={styles.vehicleCard}>
              <View style={styles.vehicleHeader}>
                <Text style={styles.vehicleNumber}>{vehicle.vehicleNumber}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(vehicle.status) }
                ]}>
                  <Text style={styles.statusText}>{getStatusLabel(vehicle.status)}</Text>
                </View>
              </View>
              <Text style={styles.vehicleInfo}>
                {vehicle.vehicleType === 'CAR' ? '🚗' : '🏍️'} {vehicle.brand} {vehicle.model}
              </Text>
              {vehicle.worker && (
                <Text style={styles.workerInfo}>
                  👷 Worker: {vehicle.worker.name || vehicle.worker.mobile}
                </Text>
              )}
            </View>

            {/* Progress Timeline - Horizontal */}
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

            {/* Payment Info */}
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
    marginBottom: 12,
  },
  vehicleNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
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
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
