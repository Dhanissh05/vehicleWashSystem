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
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { ADD_VEHICLE, CENTERS, MY_VEHICLES } from '../apollo/queries';

const AddVehicleScreen = ({ navigation }: any) => {
  const [vehicleType, setVehicleType] = useState<'CAR' | 'TWO_WHEELER'>('CAR');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [color, setColor] = useState('');
  const [userMobile, setUserMobile] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data: centersData } = useQuery(CENTERS, {
    fetchPolicy: 'network-only',
    pollInterval: 3000,
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

  const handlePickImage = async () => {
    Alert.alert(
      'Add Vehicle Photo',
      'Choose an option',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            
            if (permissionResult.granted === false) {
              Alert.alert('Permission Required', 'Please allow access to your camera');
              return;
            }

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
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (permissionResult.granted === false) {
              Alert.alert('Permission Required', 'Please allow access to your photos');
              return;
            }

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
      ]
    );
  };

  const handleUploadPhoto = async (photoUri: string) => {
    try {
      setUploadingPhoto(true);
      
      const fileName = photoUri.split('/').pop() || 'vehicle.jpg';
      const fileType = fileName.split('.').pop() || 'jpg';

      const formData = new FormData();
      formData.append('file', {
        uri: photoUri,
        name: fileName,
        type: `image/${fileType}`,
      } as any);

      const token = await AsyncStorage.getItem('token');
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL?.replace('/graphql', '');
      
      if (!API_BASE_URL) {
        throw new Error('API URL is not configured');
      }

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const { url } = await response.json();
      setVehiclePhoto(url);
      setUploadingPhoto(false);
    } catch (error: any) {
      setUploadingPhoto(false);
      Alert.alert('Error', error.message || 'Failed to upload photo');
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
            brand: brand.trim() || null,
            model: model.trim() || null,
            color: color.trim() || null,
            customerMobile: userMobile,
            centerId: centerId,
            photoUrl: vehiclePhoto,
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

        {/* Vehicle Photo */}
        <Text style={styles.label}>Vehicle Photo (Optional)</Text>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handlePickImage}
          disabled={uploadingPhoto}
        >
          {uploadingPhoto ? (
            <ActivityIndicator color="#007AFF" />
          ) : vehiclePhoto ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: vehiclePhoto }} style={styles.photoImage} />
              <Text style={styles.photoChangeText}>Tap to change photo</Text>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoPlaceholderText}>Add Vehicle Photo</Text>
            </View>
          )}
        </TouchableOpacity>

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
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
  },
  photoButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
    padding: 20,
  },
  photoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: '#666',
  },
  photoPreview: {
    width: '100%',
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
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
  