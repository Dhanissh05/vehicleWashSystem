import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const ADD_VEHICLE = gql`
  mutation AddVehicle($input: AddVehicleInput!) {
    addVehicle(input: $input) {
      id
      vehicleNumber
      status
      serviceType
    }
  }
`;

const SEARCH_VEHICLE = gql`
  query SearchVehicle($vehicleNumber: String!) {
    vehicleByNumber(vehicleNumber: $vehicleNumber) {
      id
      vehicleNumber
      vehicleType
      carCategory
      brand
      model
      color
      status
      customer {
        name
        mobile
      }
      washCount
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

export default function AddVehicleScreen({ navigation }: any) {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('CAR');
  const [carCategory, setCarCategory] = useState('SEDAN');
  const [serviceType, setServiceType] = useState('WASH');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [foundVehicle, setFoundVehicle] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const { data: centersData } = useQuery(CENTERS);
  const [addVehicle, { loading }] = useMutation(ADD_VEHICLE);
  const [searchVehicle] = useLazyQuery(SEARCH_VEHICLE, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      setIsSearching(false);
      if (data?.vehicleByNumber) {
        const vehicle = data.vehicleByNumber;
        setFoundVehicle(vehicle);
        // Auto-fill fields
        setVehicleType(vehicle.vehicleType);
        if (vehicle.carCategory) setCarCategory(vehicle.carCategory);
        if (vehicle.brand) setBrand(vehicle.brand);
        if (vehicle.model) setModel(vehicle.model);
        if (vehicle.color) setColor(vehicle.color);
        if (vehicle.customer?.mobile) setCustomerMobile(vehicle.customer.mobile);
        if (vehicle.customer?.name) setCustomerName(vehicle.customer.name);
      } else {
        setFoundVehicle(null);
      }
    },
    onError: () => {
      setIsSearching(false);
      setFoundVehicle(null);
    },
  });

  // Debounced search when vehicle number changes
  useEffect(() => {
    const trimmed = vehicleNumber.trim();
    if (trimmed.length >= 6) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        searchVehicle({ variables: { vehicleNumber: trimmed } });
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setFoundVehicle(null);
    }
  }, [vehicleNumber]);

  const handleSubmit = async () => {
    if (!vehicleNumber || !customerMobile || !centersData?.centers?.[0]?.id) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    try {
      await addVehicle({
        variables: {
          input: {
            vehicleNumber: vehicleNumber.toUpperCase(),
            vehicleType,
            carCategory: vehicleType === 'CAR' ? carCategory : null,
            serviceType,
            brand,
            model,
            color,
            customerMobile,
            customerName,
            notes,
            centerId: centersData.centers[0].id,
          },
        },
      });

      Alert.alert('Success', 'Vehicle added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add vehicle');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Entry Vehicle</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>

        <Text style={styles.label}>Service Type *</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[styles.radioButton, serviceType === 'WASH' && styles.radioActive]}
            onPress={() => setServiceType('WASH')}
          >
            <Text style={[styles.radioText, serviceType === 'WASH' && styles.radioTextActive]}>
              💧 Wash
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, serviceType === 'BODY_REPAIR' && styles.radioActive]}
            onPress={() => setServiceType('BODY_REPAIR')}
          >
            <Text style={[styles.radioText, serviceType === 'BODY_REPAIR' && styles.radioTextActive]}>
              🔧 Body Repair & Painting
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Vehicle Number *</Text>
        <View>
          <TextInput
            style={styles.input}
            placeholder="e.g., MH12AB1234"
            value={vehicleNumber}
            onChangeText={(text) => setVehicleNumber(text.toUpperCase())}
            autoCapitalize="characters"
          />
          {isSearching && (
            <View style={styles.searchIndicator}>
              <ActivityIndicator size="small" color="#8B5CF6" />
              <Text style={styles.searchText}>Searching...</Text>
            </View>
          )}
          {foundVehicle && (
            <View style={styles.foundVehicleBox}>
              <Text style={styles.foundVehicleTitle}>✓ Vehicle Found in System</Text>
              <Text style={styles.foundVehicleText}>
                Customer: {foundVehicle.customer?.name || 'N/A'}
              </Text>
              <Text style={styles.foundVehicleText}>
                Mobile: {foundVehicle.customer?.mobile}
              </Text>
              <Text style={styles.foundVehicleText}>
                Previous Washes: {foundVehicle.washCount} times
              </Text>
              <Text style={styles.foundVehicleText}>
                Status: {foundVehicle.status}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.label}>Vehicle Type *</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[styles.radioButton, vehicleType === 'CAR' && styles.radioActive]}
            onPress={() => setVehicleType('CAR')}
          >
            <Text style={[styles.radioText, vehicleType === 'CAR' && styles.radioTextActive]}>
              🚗 Car
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioButton, vehicleType === 'TWO_WHEELER' && styles.radioActive]}
            onPress={() => setVehicleType('TWO_WHEELER')}
          >
            <Text style={[styles.radioText, vehicleType === 'TWO_WHEELER' && styles.radioTextActive]}>
              🏍️ Two Wheeler
            </Text>
          </TouchableOpacity>
        </View>

        {vehicleType === 'CAR' && (
          <>
            <Text style={styles.label}>Car Category</Text>
            <View style={styles.categoryGrid}>
              {['SEDAN', 'SUV', 'HATCHBACK', 'HYBRID'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryButton, carCategory === cat && styles.categoryActive]}
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

        <Text style={styles.label}>Brand</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Maruti, Honda"
          value={brand}
          onChangeText={setBrand}
        />

        <Text style={styles.label}>Model</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Swift, City"
          value={model}
          onChangeText={setModel}
        />

        <Text style={styles.label}>Color</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., White, Black"
          value={color}
          onChangeText={setColor}
        />

        <Text style={styles.sectionTitle}>Customer Information</Text>

        <Text style={styles.label}>Customer Mobile *</Text>
        <TextInput
          style={styles.input}
          placeholder="10-digit mobile number"
          keyboardType="phone-pad"
          maxLength={10}
          value={customerMobile}
          onChangeText={setCustomerMobile}
        />

        <Text style={styles.label}>Customer Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Customer's name"
          value={customerName}
          onChangeText={setCustomerName}
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any special instructions..."
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Entry Vehicle</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#8B5CF6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  form: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    color: '#1F2937',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  radioGroup: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  radioButton: {
    flex: 1,
    padding: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  radioActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3E8FF',
  },
  radioText: {
    fontSize: 16,
    color: '#6B7280',
  },
  radioTextActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryActive: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3E8FF',
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryTextActive: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  searchText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#8B5CF6',
  },
  foundVehicleBox: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  foundVehicleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 8,
  },
  foundVehicleText: {
    fontSize: 13,
    color: '#047857',
    marginBottom: 4,
  },
});
