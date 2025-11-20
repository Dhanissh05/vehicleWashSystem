import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { MY_VEHICLES } from '../apollo/queries';
import { gql } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADD_VEHICLE = gql`
  mutation AddVehicle($input: VehicleInput!) {
    addVehicle(input: $input) {
      id
      vehicleNumber
      vehicleType
      carCategory
      model
      brand
      color
      status
    }
  }
`;

export default function HomeScreen({ navigation }: any) {
  const [modalVisible, setModalVisible] = useState(false);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('CAR');
  const [carCategory, setCarCategory] = useState('SEDAN');
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');

  const { data, loading, refetch } = useQuery(MY_VEHICLES);
  const [addVehicle, { loading: adding }] = useMutation(ADD_VEHICLE, {
    refetchQueries: [{ query: MY_VEHICLES }],
  });

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace('Login');
  };

  const handleAddVehicle = async () => {
    if (!vehicleNumber || !brand || !model) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await addVehicle({
        variables: {
          input: {
            vehicleNumber: vehicleNumber.toUpperCase(),
            vehicleType,
            carCategory: vehicleType === 'CAR' ? carCategory : null,
            model,
            brand,
            color: color || null,
            centerId: 'default-center',
          },
        },
      });
      
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Vehicle added successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add vehicle');
    }
  };

  const resetForm = () => {
    setVehicleNumber('');
    setModel('');
    setBrand('');
    setColor('');
    setVehicleType('CAR');
    setCarCategory('SEDAN');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED': return '#3B82F6';
      case 'WASHING': return '#F59E0B';
      case 'READY_FOR_PICKUP': return '#10B981';
      case 'DELIVERED': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RECEIVED': return '📋';
      case 'WASHING': return '💧';
      case 'READY_FOR_PICKUP': return '✅';
      case 'DELIVERED': return '🎉';
      default: return '📄';
    }
  };

  const renderVehicle = ({ item }: any) => (
    <TouchableOpacity style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleNumber}>{item.vehicleNumber}</Text>
          <Text style={styles.vehicleDetails}>
            {item.brand} {item.model} • {item.vehicleType}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={styles.statusIcon}>{getStatusIcon(item.status)}</Text>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {item.payment && (
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentLabel}>Amount:</Text>
          <Text style={styles.paymentAmount}>₹{item.payment.amount}</Text>
          <Text style={[styles.paymentStatus, 
            { color: item.payment.status === 'PAID' ? '#10B981' : '#F59E0B' }
          ]}>
            {item.payment.status}
          </Text>
        </View>
      )}

      {item.worker && (
        <View style={styles.workerInfo}>
          <Text style={styles.workerLabel}>Worker:</Text>
          <Text style={styles.workerName}>{item.worker.name}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Vehicles</Text>
          <Text style={styles.headerSubtitle}>
            {data?.myVehicles?.length || 0} vehicle(s)
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
        </TouchableOpacity>
      </View>

      {/* Vehicle List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading vehicles...</Text>
        </View>
      ) : data?.myVehicles?.length > 0 ? (
        <FlatList
          data={data.myVehicles}
          renderItem={renderVehicle}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyTitle}>No Vehicles Yet</Text>
          <Text style={styles.emptyText}>
            Add your first vehicle to get started with our wash services
          </Text>
        </View>
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonIcon}>+</Text>
      </TouchableOpacity>

      {/* Add Vehicle Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Add New Vehicle</Text>
              <Text style={styles.modalSubtitle}>Enter your vehicle details</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Vehicle Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., KA01AB1234"
                  value={vehicleNumber}
                  onChangeText={setVehicleNumber}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Vehicle Type *</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[styles.radioButton, vehicleType === 'CAR' && styles.radioButtonActive]}
                    onPress={() => setVehicleType('CAR')}
                  >
                    <Text style={[styles.radioText, vehicleType === 'CAR' && styles.radioTextActive]}>
                      🚗 Car
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.radioButton, vehicleType === 'TWO_WHEELER' && styles.radioButtonActive]}
                    onPress={() => setVehicleType('TWO_WHEELER')}
                  >
                    <Text style={[styles.radioText, vehicleType === 'TWO_WHEELER' && styles.radioTextActive]}>
                      🏍️ Two Wheeler
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {vehicleType === 'CAR' && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Car Category *</Text>
                  <View style={styles.categoryGrid}>
                    {['SEDAN', 'SUV', 'HATCHBACK', 'HYBRID'].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.categoryButton, carCategory === cat && styles.categoryButtonActive]}
                        onPress={() => setCarCategory(cat)}
                      >
                        <Text style={[styles.categoryText, carCategory === cat && styles.categoryTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.label}>Brand *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Honda, Hero"
                  value={brand}
                  onChangeText={setBrand}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Model *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., City, Activa"
                  value={model}
                  onChangeText={setModel}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Color (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., White, Black"
                  value={color}
                  onChangeText={setColor}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleAddVehicle}
                  disabled={adding}
                >
                  {adding ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Add Vehicle</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIcon: {
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  vehicleDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 12,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  workerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  workerLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  workerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
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
    lineHeight: 20,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  radioButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#667eea20',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  radioTextActive: {
    color: '#667eea',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    width: '48%',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  categoryButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#667eea20',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  categoryTextActive: {
    color: '#667eea',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
