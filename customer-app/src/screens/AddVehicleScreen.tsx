import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADD_VEHICLE, PRICING, CENTERS, MY_VEHICLES } from '../apollo/queries';

const AddVehicleScreen = ({ navigation }: any) => {
  const [vehicleType, setVehicleType] = useState<'CAR' | 'TWO_WHEELER'>('CAR');
  const [carCategory, setCarCategory] = useState('SEDAN');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [color, setColor] = useState('');
  const [userMobile, setUserMobile] = useState('');

  const { data: pricingData } = useQuery(PRICING);
  const { data: centersData } = useQuery(CENTERS, {
    fetchPolicy: 'network-only',
    pollInterval: 3000, // Poll every 3 seconds for real-time slot updates
  });
  const [addVehicle, { loading }] = useMutation(ADD_VEHICLE, {
    refetchQueries: [{ query: MY_VEHICLES }],
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUserMobile(user.mobile);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleAddVehicle = async () => {
    if (!vehicleNumber.trim()) {
      Alert.alert('Error', 'Please enter vehicle number');
      return;
    }

    if (!userMobile) {
      Alert.alert('Error', 'User information not found. Please login again.');
      return;
    }

    const centerId = centersData?.centers?.[0]?.id;
    if (!centerId) {
      Alert.alert('Error', 'Service center not found. Please try again later.');
      return;
    }

    try {
      await addVehicle({
        variables: {
          input: {
            vehicleNumber: vehicleNumber.toUpperCase(),
            vehicleType,
            carCategory: vehicleType === 'CAR' ? carCategory : null,
            brand: brand.trim() || null,
            model: model.trim() || null,
            color: color.trim() || null,
            customerMobile: userMobile,
            centerId: centerId,
          },
        },
      });

      Alert.alert('Success', 'Vehicle added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add vehicle');
    }
  };

  const currentPrice = pricingData?.pricing?.find(
    (p: any) => p.vehicleType === vehicleType && 
    (vehicleType === 'TWO_WHEELER' || p.carCategory === carCategory)
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add New Vehicle</Text>

        {/* Vehicle Type Selection */}
        <Text style={styles.label}>Vehicle Type *</Text>
        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={[styles.typeButton, vehicleType === 'TWO_WHEELER' && styles.typeButtonActive]}
            onPress={() => setVehicleType('TWO_WHEELER')}
          >
            <Text style={[styles.typeText, vehicleType === 'TWO_WHEELER' && styles.typeTextActive]}>
              🏍️ Two Wheeler
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, vehicleType === 'CAR' && styles.typeButtonActive]}
            onPress={() => setVehicleType('CAR')}
          >
            <Text style={[styles.typeText, vehicleType === 'CAR' && styles.typeTextActive]}>
              🚗 Car
            </Text>
          </TouchableOpacity>
        </View>

        {/* Car Category (only for cars) */}
        {vehicleType === 'CAR' && (
          <>
            <Text style={styles.label}>Car Category *</Text>
            <View style={styles.categoryContainer}>
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
          </>
        )}

        {/* Price Display */}
        {currentPrice && (
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Wash Price</Text>
            <Text style={styles.priceAmount}>₹{currentPrice.price}</Text>
          </View>
        )}

        {/* Vehicle Number */}
        <Text style={styles.label}>Vehicle Number *</Text>
        <TextInput
          style={styles.input}
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
          placeholder="e.g., KA01AB1234"
          autoCapitalize="characters"
          maxLength={15}
        />

        {/* Brand */}
        <Text style={styles.label}>Brand</Text>
        <TextInput
          style={styles.input}
          value={brand}
          onChangeText={setBrand}
          placeholder="e.g., Honda, Toyota"
        />

        {/* Model */}
        <Text style={styles.label}>Model</Text>
        <TextInput
          style={styles.input}
          value={model}
          onChangeText={setModel}
          placeholder="e.g., City, Activa"
        />

        {/* Color */}
        <Text style={styles.label}>Color (Optional)</Text>
        <TextInput
          style={styles.input}
          value={color}
          onChangeText={setColor}
          placeholder="e.g., White, Black"
        />

        {/* Add Button */}
        <TouchableOpacity
          style={[styles.addButton, loading && styles.addButtonDisabled]}
          onPress={handleAddVehicle}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.addButtonText}>Add Vehicle</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1A1A1A',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: '#333',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  typeText: {
    fontSize: 16,
    color: '#666',
  },
  typeTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  categoryButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  priceCard: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
  },
  priceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AddVehicleScreen;
