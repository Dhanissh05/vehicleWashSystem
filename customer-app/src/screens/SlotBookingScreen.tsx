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
  Image,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useMutation, useQuery } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { CREATE_SLOT_BOOKING, CENTERS, MY_SLOT_BOOKINGS, MY_VEHICLES } from '../apollo/queries';

const SlotBookingScreen = ({ navigation }: any) => {
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<'CAR' | 'TWO_WHEELER'>('CAR');
  const [carCategory, setCarCategory] = useState<string | null>('SEDAN');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [carWash, setCarWash] = useState(false);
  const [twoWheelerWash, setTwoWheelerWash] = useState(false);
  const [bodyRepair, setBodyRepair] = useState(false);
  const [userMobile, setUserMobile] = useState('');
  const [userName, setUserName] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [bookingOtp, setBookingOtp] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data: centersData, loading: centersLoading, error: centersError, refetch: refetchCenters } = useQuery(CENTERS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: isScreenFocused ? 10000 : 0, // Smart polling - only when screen is focused
    notifyOnNetworkStatusChange: false,
  });
  
  const { data: vehiclesData, loading: vehiclesLoading } = useQuery(MY_VEHICLES, {
    fetchPolicy: 'cache-and-network',
  });

  // Track screen focus state for smart polling
  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      refetchCenters();
      
      return () => {
        setIsScreenFocused(false);
      };
    }, [refetchCenters])
  );

  const [createBooking, { loading }] = useMutation(CREATE_SLOT_BOOKING, {
    refetchQueries: [
      { query: CENTERS },
      { query: MY_SLOT_BOOKINGS }
    ],
    awaitRefetchQueries: true,
    onError: (error) => {
      Alert.alert('Booking Error', error.message || 'Failed to create booking');
    },
    onCompleted: (data) => {
      const otp = data?.createSlotBooking?.otp;
      if (otp) {
        setBookingOtp(otp);
        setShowOtpModal(true);
      }
    },
  });

  useEffect(() => {
    console.log('SlotBookingScreen mounted');
    loadUserData();
    
    return () => {
      console.log('SlotBookingScreen unmounted');
    };
  }, []);

  // Remove duplicate vehicles by vehicle number
  const getUniqueVehicles = (vehicles: any[]) => {
    if (!vehicles) return [];
    const seen = new Set();
    return vehicles.filter((vehicle: any) => {
      if (seen.has(vehicle.vehicleNumber)) {
        return false;
      }
      seen.add(vehicle.vehicleNumber);
      return true;
    });
  };

  // Auto-fetch vehicle details when vehicle number is typed
  useEffect(() => {
    if (vehicleNumber && vehicleNumber.length >= 4 && vehiclesData?.myVehicles) {
      const uniqueVehicles = getUniqueVehicles(vehiclesData.myVehicles);
      const matchedVehicle = uniqueVehicles.find(
        (v: any) => v.vehicleNumber.toUpperCase() === vehicleNumber.toUpperCase()
      );
      
      if (matchedVehicle) {
        // Auto-fill vehicle details
        setSelectedVehicleId(matchedVehicle.id);
        setVehicleType(matchedVehicle.vehicleType);
        setCarCategory(matchedVehicle.carCategory || 'SEDAN');
        setBrand(matchedVehicle.brand || '');
        setModel(matchedVehicle.model || '');
        setColor(matchedVehicle.color || '');
        setPhotoUrl(matchedVehicle.photoUrl || null);
        
        console.log(`[Auto-fetch] Vehicle details loaded for ${vehicleNumber}`);
      }
    }
  }, [vehicleNumber, vehiclesData]);

  const loadUserData = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const user = JSON.parse(userJson);
        setUserMobile(user.mobile);
        setUserName(user.name || '');
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleSelectVehicle = (vehicle: any) => {
    setSelectedVehicleId(vehicle.id);
    setVehicleNumber(vehicle.vehicleNumber);
    setVehicleType(vehicle.vehicleType);
    setCarCategory(vehicle.carCategory || null);
    setBrand(vehicle.brand || '');
    setModel(vehicle.model || '');
    setColor(vehicle.color || '');
    setPhotoUrl(vehicle.photoUrl || null);
    
    // Reset services when vehicle changes
    setCarWash(false);
    setTwoWheelerWash(false);
    setBodyRepair(false);
  };

  const handleNewVehicle = () => {
    setSelectedVehicleId(null);
    setVehicleNumber('');
    setVehicleType('CAR');
    setCarCategory('SEDAN');
    setBrand('');
    setModel('');
    setColor('');
    setPhotoUrl(null);
    setCarWash(false);
    setTwoWheelerWash(false);
    setBodyRepair(false);
  };

  const handlePickImage = async () => {
    Alert.alert('Add Vehicle Photo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
          });
          if (!result.canceled) {
            await handleUploadPhoto(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
          });
          if (!result.canceled) {
            await handleUploadPhoto(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleUploadPhoto = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      
      const token = await AsyncStorage.getItem('token');
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL?.replace('/graphql', '');
      
      if (!API_BASE_URL) {
        throw new Error('API URL not configured');
      }

      const fileName = uri.split('/').pop() || `vehicle_${Date.now()}.jpg`;
      
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: 'image/jpeg',
      } as any);
      formData.append('type', 'general');

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.url) {
        setPhotoUrl(result.url);
        Alert.alert('Success', 'Photo uploaded successfully');
      } else {
        throw new Error('No URL returned from server');
      }
      
      setUploadingPhoto(false);
    } catch (error: any) {
      console.error('Upload error:', error.message);
      setUploadingPhoto(false);
      
      // Make photo upload failure non-blocking
      Alert.alert(
        'Photo Upload Issue', 
        'Could not upload photo. You can continue booking without a photo.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleBookSlot = async () => {
    // Dismiss keyboard first
    Keyboard.dismiss();

    if (!vehicleNumber.trim()) {
      Alert.alert('Error', 'Please enter vehicle number');
      return;
    }

    if (!carWash && !twoWheelerWash && !bodyRepair) {
      Alert.alert('Error', 'Please select at least one service');
      return;
    }

    const center = centersData?.centers?.[0];
    if (!center) {
      Alert.alert('Error', 'Service center not found');
      return;
    }

    // Check slot availability
    const isTwoWheeler = vehicleType === 'TWO_WHEELER';
    const availableSlots = isTwoWheeler 
      ? center.availableSlotsTwoWheeler 
      : center.availableSlotsCar;
    
    if (availableSlots <= 0) {
      Alert.alert(
        'No Slots Available',
        `Sorry, there are no available slots for ${isTwoWheeler ? 'two wheelers' : 'cars'} at the moment. Please try again later.`,
        [{ text: 'OK' }]
      );
      return;
    }

    console.log('Submitting booking...');

    await createBooking({
      variables: {
        input: {
          customerMobile: userMobile,
          customerName: userName,
          vehicleNumber: vehicleNumber.toUpperCase(),
          vehicleType,
          carCategory: vehicleType === 'CAR' ? carCategory : null,
          brand: brand.trim() || null,
          model: model.trim() || null,
          color: color.trim() || null,
          photoUrl,
          carWash,
          twoWheelerWash,
          bodyRepair,
          centerId: center.id,
        },
      },
    });
  };

  const handleCloseOtpModal = () => {
    setShowOtpModal(false);
  };

  if (centersLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  if (centersError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontSize: 18, color: '#EF4444', marginBottom: 16 }}>❌ Error</Text>
        <Text style={{ color: '#666', textAlign: 'center' }}>{centersError.message}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Book a Slot</Text>

          {/* Important Notice */}
          <View style={styles.warningContainer}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Important Notice</Text>
              <Text style={styles.warningText}>
                Please drop your vehicle at the center within <Text style={styles.warningTextBold}>2 hours</Text> of booking. Bookings will be automatically cancelled if the vehicle is not received within this timeframe.
              </Text>
            </View>
          </View>

          {/* Slot Availability Display */}
          {centersData?.centers?.[0] && (
            <View style={styles.availabilityContainer}>
              <Text style={styles.availabilityTitle}>Available Slots Today</Text>
              <View style={styles.availabilityRow}>
                <View style={styles.availabilityItem}>
                  <Text style={styles.availabilityIcon}>🏍️</Text>
                  <Text style={styles.availabilityLabel}>Two Wheeler</Text>
                  <Text style={[
                    styles.availabilityCount,
                    centersData.centers[0].availableSlotsTwoWheeler === 0 && styles.availabilityCountZero
                  ]}>
                    {centersData.centers[0].availableSlotsTwoWheeler} / {centersData.centers[0].dailySlotsTwoWheeler}
                  </Text>
                </View>
                <View style={styles.availabilityItem}>
                  <Text style={styles.availabilityIcon}>🚗</Text>
                  <Text style={styles.availabilityLabel}>Car</Text>
                  <Text style={[
                    styles.availabilityCount,
                    centersData.centers[0].availableSlotsCar === 0 && styles.availabilityCountZero
                  ]}>
                    {centersData.centers[0].availableSlotsCar} / {centersData.centers[0].dailySlotsCar}
                  </Text>
                </View>
              </View>
            </View>
          )}

        <Text style={styles.label}>Vehicle Number *</Text>
        {!vehiclesLoading && vehiclesData?.myVehicles && vehiclesData.myVehicles.length > 0 && selectedVehicleId ? (
          <>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={vehicleNumber}
                onValueChange={(value) => {
                  if (value === 'NEW') {
                    // New vehicle - clear form and show text input
                    setSelectedVehicleId(null);
                    setVehicleNumber('');
                    setVehicleType('CAR');
                    setCarCategory('SEDAN');
                    setBrand('');
                    setModel('');
                    setColor('');
                    setPhotoUrl(null);
                  } else {
                    // Find and select existing vehicle
                    const uniqueVehicles = getUniqueVehicles(vehiclesData.myVehicles);
                    const vehicle = uniqueVehicles.find((v: any) => v.vehicleNumber === value);
                    if (vehicle) {
                      handleSelectVehicle(vehicle);
                    }
                  }
                }}
                style={styles.picker}
              >
                {getUniqueVehicles(vehiclesData.myVehicles).map((vehicle: any) => (
                  <Picker.Item 
                    key={vehicle.id}
                    label={`${vehicle.vehicleNumber} - ${vehicle.brand || 'Vehicle'} ${vehicle.model || ''}`}
                    value={vehicle.vehicleNumber}
                  />
                ))}
                <Picker.Item label="+ Enter new vehicle" value="NEW" />
              </Picker>
            </View>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              value={vehicleNumber}
              onChangeText={(text) => setVehicleNumber(text.toUpperCase())}
              placeholder="e.g., KA01AB1234"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              maxLength={15}
            />
            {!vehiclesLoading && vehiclesData?.myVehicles && vehiclesData.myVehicles.length > 0 && (
              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => {
                  // Switch back to picker with first vehicle
                  const uniqueVehicles = getUniqueVehicles(vehiclesData.myVehicles);
                  const firstVehicle = uniqueVehicles[0];
                  handleSelectVehicle(firstVehicle);
                }}
              >
                <Text style={styles.switchButtonText}>📋 Choose from my vehicles</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <Text style={styles.label}>Vehicle Type *</Text>
        <View style={styles.typeContainer}>
          <TouchableOpacity
            style={[
              styles.typeButton, 
              vehicleType === 'TWO_WHEELER' && styles.typeButtonActive,
              selectedVehicleId && styles.typeButtonDisabled
            ]}
            onPress={() => {
              if (!selectedVehicleId) {
                setVehicleType('TWO_WHEELER');
                setCarWash(false);
                setCarCategory(null);
              }
            }}
            disabled={!!selectedVehicleId}
          >
            <Text style={[styles.typeText, vehicleType === 'TWO_WHEELER' && styles.typeTextActive]}>
              🏍️ Two Wheeler
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton, 
              vehicleType === 'CAR' && styles.typeButtonActive,
              selectedVehicleId && styles.typeButtonDisabled
            ]}
            onPress={() => {
              if (!selectedVehicleId) {
                setVehicleType('CAR');
                setTwoWheelerWash(false);
                if (!carCategory) setCarCategory('SEDAN');
              }
            }}
            disabled={!!selectedVehicleId}
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
              <TouchableOpacity
                style={[
                  styles.categoryButton, 
                  carCategory === 'HATCHBACK' && styles.categoryButtonActive,
                  selectedVehicleId && styles.categoryButtonDisabled
                ]}
                onPress={() => !selectedVehicleId && setCarCategory('HATCHBACK')}
                disabled={!!selectedVehicleId}
              >
                <Text style={[styles.categoryText, carCategory === 'HATCHBACK' && styles.categoryTextActive]}>
                  Hatchback
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryButton, 
                  carCategory === 'SEDAN' && styles.categoryButtonActive,
                  selectedVehicleId && styles.categoryButtonDisabled
                ]}
                onPress={() => !selectedVehicleId && setCarCategory('SEDAN')}
                disabled={!!selectedVehicleId}
              >
                <Text style={[styles.categoryText, carCategory === 'SEDAN' && styles.categoryTextActive]}>
                  Sedan
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryButton, 
                  carCategory === 'SUV' && styles.categoryButtonActive,
                  selectedVehicleId && styles.categoryButtonDisabled
                ]}
                onPress={() => !selectedVehicleId && setCarCategory('SUV')}
                disabled={!!selectedVehicleId}
              >
                <Text style={[styles.categoryText, carCategory === 'SUV' && styles.categoryTextActive]}>
                  SUV
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.categoryButton, 
                  carCategory === 'HYBRID' && styles.categoryButtonActive,
                  selectedVehicleId && styles.categoryButtonDisabled
                ]}
                onPress={() => !selectedVehicleId && setCarCategory('HYBRID')}
                disabled={!!selectedVehicleId}
              >
                <Text style={[styles.categoryText, carCategory === 'HYBRID' && styles.categoryTextActive]}>
                  Hybrid
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={styles.label}>Services *</Text>
        <View style={styles.servicesContainer}>
          {vehicleType === 'CAR' && (
            <TouchableOpacity
              style={[styles.serviceButton, carWash && styles.serviceButtonActive]}
              onPress={() => setCarWash(!carWash)}
            >
              <Text style={[styles.serviceText, carWash && styles.serviceTextActive]}>
                🚗 Car Wash
              </Text>
            </TouchableOpacity>
          )}
          {vehicleType === 'TWO_WHEELER' && (
            <TouchableOpacity
              style={[styles.serviceButton, twoWheelerWash && styles.serviceButtonActive]}
              onPress={() => setTwoWheelerWash(!twoWheelerWash)}
            >
              <Text style={[styles.serviceText, twoWheelerWash && styles.serviceTextActive]}>
                🏍️ Two Wheeler Wash
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.serviceButton, bodyRepair && styles.serviceButtonActive]}
            onPress={() => setBodyRepair(!bodyRepair)}
          >
            <Text style={[styles.serviceText, bodyRepair && styles.serviceTextActive]}>
              🔧 Body Repair
            </Text>
          </TouchableOpacity>
        </View>



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

        <Text style={styles.label}>Vehicle Photo (Optional)</Text>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handlePickImage}
          disabled={uploadingPhoto}
        >
          {uploadingPhoto ? (
            <ActivityIndicator color="#007AFF" />
          ) : photoUrl ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photoUrl }} style={styles.photoImage} />
              <Text style={styles.photoChangeText}>Tap to change</Text>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoPlaceholderText}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {bookingOtp && (
          <View style={styles.otpDisplayContainer}>
            <Text style={styles.otpDisplayTitle}>🎉 Booking Confirmed!</Text>
            <View style={styles.otpDisplayBox}>
              <Text style={styles.otpDisplayLabel}>Your Booking OTP</Text>
              <Text style={styles.otpDisplayCode}>{bookingOtp}</Text>
            </View>
            <Text style={styles.otpDisplayNote}>
              Show this OTP to the staff when you arrive at the center.
            </Text>
            <TouchableOpacity 
              style={styles.newBookingButton}
              onPress={() => {
                setBookingOtp('');
                setVehicleNumber('');
                setSelectedVehicleId(null);
                setBrand('');
                setModel('');
                setColor('');
                setPhotoUrl(null);
                setCarWash(false);
                setTwoWheelerWash(false);
                setBodyRepair(false);
              }}
            >
              <Text style={styles.newBookingButtonText}>+ Book Another Slot</Text>
            </TouchableOpacity>
          </View>
        )}

        {!bookingOtp && (
          <TouchableOpacity
            style={[styles.bookButton, loading && styles.bookButtonDisabled]}
            onPress={handleBookSlot}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.bookButtonText}>Book Slot</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

        <Modal visible={showOtpModal} transparent animationType="none">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🎉 Booking Confirmed!</Text>
              <Text style={styles.modalText}>
                Your slot has been booked successfully.
              </Text>
              <View style={styles.otpBox}>
                <Text style={styles.otpLabel}>Your Booking OTP</Text>
                <Text style={styles.otpText}>{bookingOtp}</Text>
              </View>
              <Text style={styles.modalNote}>
                Show this OTP to the staff when you arrive at the center.
              </Text>
              <TouchableOpacity style={styles.modalButton} onPress={handleCloseOtpModal}>
                <Text style={styles.modalButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#1A1A1A' },
  warningContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#F57C00',
    lineHeight: 18,
  },
  warningTextBold: {
    fontWeight: '700',
    color: '#E65100',
  },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16, color: '#333' },
  typeContainer: { flexDirection: 'row', gap: 12 },
  typeButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  typeButtonActive: { borderColor: '#007AFF', backgroundColor: '#F0F8FF' },
  typeButtonDisabled: { opacity: 0.5, backgroundColor: '#F5F5F5' },
  typeText: { fontSize: 16, color: '#666' },
  typeTextActive: { color: '#007AFF', fontWeight: '600' },
  categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  categoryButtonActive: { borderColor: '#007AFF', backgroundColor: '#007AFF' },
  categoryButtonDisabled: { opacity: 0.5, backgroundColor: '#F5F5F5' },
  categoryText: { fontSize: 14, color: '#666' },
  categoryTextActive: { color: '#FFF', fontWeight: '600' },
  servicesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFF',
  },
  serviceButtonActive: { borderColor: '#007AFF', backgroundColor: '#007AFF' },
  serviceText: { fontSize: 14, color: '#666' },
  serviceTextActive: { color: '#FFF', fontWeight: '600' },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#1F2937',
  },
  photoButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholder: { alignItems: 'center', padding: 20 },
  photoIcon: { fontSize: 48, marginBottom: 8 },
  photoPlaceholderText: { fontSize: 14, color: '#666' },
  photoPreview: { width: '100%', alignItems: 'center' },
  photoImage: { width: '100%', height: 150, resizeMode: 'cover' },
  photoChangeText: {
    position: 'absolute',
    bottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    fontSize: 12,
  },
  bookButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  bookButtonDisabled: { opacity: 0.6 },
  bookButtonText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  modalText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  otpBox: {
    backgroundColor: '#F0F8FF',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  otpLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  otpText: { fontSize: 36, fontWeight: 'bold', color: '#007AFF', letterSpacing: 4 },
  modalNote: { fontSize: 12, color: '#999', textAlign: 'center', marginBottom: 20 },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  pickerContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: '#1F2937',
  },
  switchButton: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  otpDisplayContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  otpDisplayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
  },
  otpDisplayBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  otpDisplayLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  otpDisplayCode: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 8,
  },
  otpDisplayNote: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  newBookingButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  newBookingButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  availabilityContainer: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  availabilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 12,
    textAlign: 'center',
  },
  availabilityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  availabilityItem: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  availabilityIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  availabilityLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  availabilityCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
  availabilityCountZero: {
    color: '#EF4444',
  },
});

export default SlotBookingScreen;
