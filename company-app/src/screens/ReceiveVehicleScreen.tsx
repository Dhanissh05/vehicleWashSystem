import React, { useState } from 'react';
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
import { useMutation, useQuery, gql } from '@apollo/client';

const ADD_VEHICLE = gql`
  mutation AddVehicle($input: AddVehicleInput!) {
    addVehicle(input: $input) {
      id
      vehicleNumber
      status
      customer {
        name
        mobile
      }
    }
  }
`;

const CENTERS = gql`
  query Centers {
    centers {
      id
      name
    }
  }
`;

const ReceiveVehicleScreen = ({ navigation }: any) => {
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [vehicleType, setVehicleType] = useState<'CAR' | 'TWO_WHEELER'>('CAR');
  const [carCategory, setCarCategory] = useState('SEDAN');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');

  const { data: centersData } = useQuery(CENTERS);
  const [addVehicle, { loading }] = useMutation(ADD_VEHICLE);

  const handleReceiveVehicle = async () => {
    // Validation
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }
    if (!customerMobile.trim() || customerMobile.length !== 10) {
      Alert.alert('Error', 'Please enter valid 10-digit mobile number');
      return;
    }
    if (!vehicleNumber.trim()) {
      Alert.alert('Error', 'Please enter vehicle number');
      return;
    }

    const centerId = centersData?.centers?.[0]?.id;
    if (!centerId) {
      Alert.alert('Error', 'No center found');
      return;
    }

    try {
      const result = await addVehicle({
        variables: {
          input: {
            customerName: customerName.trim(),
            customerMobile: customerMobile.trim(),
            vehicleType,
            carCategory: vehicleType === 'CAR' ? carCategory : null,
            vehicleNumber: vehicleNumber.toUpperCase().trim(),
            brand: brand.trim() || null,
            model: model.trim() || null,
            color: color.trim() || null,
            centerId,
          },
        },
      });

      Alert.alert(
        'Success',
        `Vehicle ${result.data.addVehicle.vehicleNumber} received successfully!\\n\\nSMS notification sent to customer ${result.data.addVehicle.customer.mobile}`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setCustomerName('');
              setCustomerMobile('');
              setVehicleNumber('');
              setBrand('');
              setModel('');
              setColor('');
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to receive vehicle');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Receive Vehicle</Text>
        <Text style={styles.subtitle}>Enter customer and vehicle details</Text>

        {/* Customer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Details</Text>

          <Text style={styles.label}>Customer Name *</Text>
          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Enter customer name"
            autoCapitalize="words"
          />

          <Text style={styles.label}>Customer Mobile *</Text>
          <TextInput
            style={styles.input}
            value={customerMobile}
            onChangeText={setCustomerMobile}
            placeholder="Enter 10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        {/* Vehicle Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>

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

          <Text style={styles.label}>Vehicle Number *</Text>
          <TextInput
            style={styles.input}
            value={vehicleNumber}
            onChangeText={setVehicleNumber}
            placeholder="e.g., KA01AB1234"
            autoCapitalize="characters"
            maxLength={15}
          />

          <Text style={styles.label}>Brand</Text>
          <TextInput
            style={styles.input}
            value={brand}
            onChangeText={setBrand}
            placeholder="e.g., Honda, Toyota"
          />

          <Text style={styles.label}>Model</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder="e.g., City, Activa"
          />

          <Text style={styles.label}>Color</Text>
          <TextInput
            style={styles.input}
            value={color}
            onChangeText={setColor}
            placeholder="e.g., White, Black"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleReceiveVehicle}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>✓ Receive Vehicle</Text>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#333',
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ReceiveVehicleScreen;
