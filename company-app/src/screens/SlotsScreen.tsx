import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, gql } from '@apollo/client';

const GET_CENTER = gql`
  query GetCenter {
    centers {
      id
      name
      dailySlotsTwoWheeler
      availableSlotsTwoWheeler
      dailySlotsCar
      availableSlotsCar
    }
  }
`;

const UPDATE_CENTER_SLOTS = gql`
  mutation UpdateCenterSlots($dailySlotsTwoWheeler: Int!, $dailySlotsCar: Int!) {
    updateCenterSlots(dailySlotsTwoWheeler: $dailySlotsTwoWheeler, dailySlotsCar: $dailySlotsCar) {
      id
      dailySlotsTwoWheeler
      availableSlotsTwoWheeler
      dailySlotsCar
      availableSlotsCar
    }
  }
`;

export default function SlotsScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [dailySlotsTwoWheeler, setDailySlotsTwoWheeler] = useState('');
  const [dailySlotsCar, setDailySlotsCar] = useState('');

  const { data, loading, refetch } = useQuery(GET_CENTER, {
    fetchPolicy: 'network-only',
  });
  const [updateSlots, { loading: updating }] = useMutation(UPDATE_CENTER_SLOTS, {
    refetchQueries: [{ query: GET_CENTER }],
    awaitRefetchQueries: true,
    onCompleted: () => {
      Alert.alert('Success', 'Daily slots updated successfully');
      setIsEditing(false);
      setDailySlotsTwoWheeler('');
      setDailySlotsCar('');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const center = data?.centers?.[0];

  const handleSaveSlots = () => {
    const slotsTwoWheeler = parseInt(dailySlotsTwoWheeler);
    const slotsCar = parseInt(dailySlotsCar);

    if (isNaN(slotsTwoWheeler) || slotsTwoWheeler < 0) {
      Alert.alert('Validation Error', 'Please enter valid two-wheeler slots (0 to close, or positive number)');
      return;
    }

    if (isNaN(slotsCar) || slotsCar < 0) {
      Alert.alert('Validation Error', 'Please enter valid car slots (0 to close, or positive number)');
      return;
    }

    if (slotsTwoWheeler > 100 || slotsCar > 100) {
      Alert.alert('Validation Error', 'Maximum 100 slots allowed per vehicle type');
      return;
    }

    Alert.alert(
      'Confirm Update',
      `Update slots to:\nTwo-Wheeler: ${slotsTwoWheeler}${slotsTwoWheeler === 0 ? ' (CLOSED)' : ''}\nCar: ${slotsCar}${slotsCar === 0 ? ' (CLOSED)' : ''}\n\nThis will reset available slots. Continue?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Update',
          onPress: () => {
            updateSlots({
              variables: { 
                dailySlotsTwoWheeler: slotsTwoWheeler,
                dailySlotsCar: slotsCar,
              },
            });
          },
        },
      ]
    );
  };

  const startEditing = () => {
    if (center) {
      setDailySlotsTwoWheeler(center.dailySlotsTwoWheeler.toString());
      setDailySlotsCar(center.dailySlotsCar.toString());
      setIsEditing(true);
    }
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDailySlotsTwoWheeler('');
    setDailySlotsCar('');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading slot information...</Text>
      </View>
    );
  }

  if (!center) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No center information found</Text>
      </View>
    );
  }

  const usedSlotsTwoWheeler = center.dailySlotsTwoWheeler - center.availableSlotsTwoWheeler;
  const usagePercentageTwoWheeler = (usedSlotsTwoWheeler / center.dailySlotsTwoWheeler) * 100;
  
  const usedSlotsCar = center.dailySlotsCar - center.availableSlotsCar;
  const usagePercentageCar = (usedSlotsCar / center.dailySlotsCar) * 100;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Slot Management</Text>
        <Text style={styles.headerSubtitle}>{center.name}</Text>
      </View>

      {/* Two-Wheeler Slots Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.vehicleIcon}>🏍️</Text>
          <Text style={styles.cardTitle}>Two-Wheeler Slots</Text>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{center.dailySlotsTwoWheeler}</Text>
            <Text style={styles.statLabel}>Daily</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {center.availableSlotsTwoWheeler}
            </Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {usedSlotsTwoWheeler}
            </Text>
            <Text style={styles.statLabel}>Used</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${usagePercentageTwoWheeler}%`,
                  backgroundColor: usagePercentageTwoWheeler >= 90 ? '#EF4444' : '#8B5CF6',
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {usagePercentageTwoWheeler.toFixed(0)}% Capacity Used
          </Text>
        </View>

        {center.availableSlotsTwoWheeler === 0 && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>⚠️ Two-wheeler slots are full!</Text>
          </View>
        )}
      </View>

      {/* Car Slots Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.vehicleIcon}>🚗</Text>
          <Text style={styles.cardTitle}>Car Slots</Text>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{center.dailySlotsCar}</Text>
            <Text style={styles.statLabel}>Daily</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {center.availableSlotsCar}
            </Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {usedSlotsCar}
            </Text>
            <Text style={styles.statLabel}>Used</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${usagePercentageCar}%`,
                  backgroundColor: usagePercentageCar >= 90 ? '#EF4444' : '#3B82F6',
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {usagePercentageCar.toFixed(0)}% Capacity Used
          </Text>
        </View>

        {center.availableSlotsCar === 0 && (
          <View style={styles.alertBox}>
            <Text style={styles.alertText}>⚠️ Car slots are full!</Text>
          </View>
        )}
      </View>

      {/* Update Slots Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Update Daily Slots</Text>
        <Text style={styles.cardDescription}>
          Set the total number of vehicles per type that can be received per day.
          {'\n'}Set to 0 to temporarily close slots for that vehicle type.
          {'\n'}Note: This will reset available slots to the new limit.
        </Text>

        {!isEditing ? (
          <TouchableOpacity
            style={styles.editButton}
            onPress={startEditing}
            disabled={updating}
          >
            <Text style={styles.editButtonText}>Change Daily Slots</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>🏍️ Two-Wheeler Slots</Text>
              <TextInput
                style={styles.input}
                value={dailySlotsTwoWheeler}
                onChangeText={setDailySlotsTwoWheeler}
                keyboardType="number-pad"
                placeholder="Enter two-wheeler slots"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>🚗 Car Slots</Text>
              <TextInput
                style={styles.input}
                value={dailySlotsCar}
                onChangeText={setDailySlotsCar}
                keyboardType="number-pad"
                placeholder="Enter car slots"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={cancelEditing}
                disabled={updating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveSlots}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Info Box */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ How Slot Management Works</Text>
        <Text style={styles.infoText}>
          • Two-wheeler and car slots are managed separately
          {'\n'}• Slots decrease when staff receives a vehicle (marks as RECEIVED)
          {'\n'}• Slots increase when vehicle is delivered (picked up by customer)
          {'\n'}• Customer can register vehicles anytime (doesn't use slots)
          {'\n'}• When slots are full for a type, staff cannot receive that vehicle type
          {'\n'}• Update daily slots anytime to increase/decrease capacity
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  alertBox: {
    backgroundColor: '#FEF2F2',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  alertText: {
    fontSize: 14,
    color: '#991B1B',
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editContainer: {
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 22,
  },
});
