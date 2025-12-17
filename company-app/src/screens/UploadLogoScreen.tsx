import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, gql } from '@apollo/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPANY_LOGO = gql`
  query CompanyLogo {
    me {
      company {
        id
        name
        logoUrl
      }
    }
  }
`;

const UPDATE_COMPANY_LOGO = gql`
  mutation UpdateCompanyLogo($logoUrl: String!) {
    updateCompanyLogo(input: { logoUrl: $logoUrl }) {
      id
      logoUrl
    }
  }
`;

export default function UploadLogoScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data, loading, refetch } = useQuery(COMPANY_LOGO);
  const currentLogoUrl = data?.me?.company?.logoUrl;

  const [updateLogo] = useMutation(UPDATE_COMPANY_LOGO, {
    onCompleted: () => {
      Alert.alert('Success', 'Company logo updated successfully');
      refetch();
      setSelectedImage(null);
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload images.'
        );
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setUploading(true);

    try {
      // Get auth token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found');
        setUploading(false);
        return;
      }

      // Create form data
      const formData = new FormData();
      const filename = selectedImage.split('/').pop() || 'logo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('logo', {
        uri: selectedImage,
        name: filename,
        type,
      } as any);

      // Upload to backend
      const response = await fetch('http://192.168.0.9:4000/api/upload/logo', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      // Update company logo URL in database
      await updateLogo({
        variables: {
          logoUrl: result.url,
        },
      });
    } catch (error: any) {
      Alert.alert('Upload Error', error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = () => {
    Alert.alert(
      'Remove Logo',
      'Are you sure you want to remove the company logo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateLogo({
                variables: {
                  logoUrl: '',
                },
              });
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Company Logo</Text>
        <Text style={styles.subtitle}>
          Upload your company logo to display in customer app
        </Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <>
            {/* Current Logo */}
            {currentLogoUrl && !selectedImage && (
              <View style={styles.currentLogoContainer}>
                <Text style={styles.sectionTitle}>Current Logo</Text>
                <View style={styles.logoPreview}>
                  <Image
                    source={{ uri: `http://192.168.0.9:4000${currentLogoUrl}` }}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={removeLogo}
                >
                  <Text style={styles.removeButtonText}>🗑️ Remove Logo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Selected Image Preview */}
            {selectedImage && (
              <View style={styles.previewContainer}>
                <Text style={styles.sectionTitle}>Preview</Text>
                <View style={styles.logoPreview}>
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.pickButton}
                onPress={pickImage}
                disabled={uploading}
              >
                <Text style={styles.pickButtonText}>
                  📁 {selectedImage ? 'Change Image' : 'Select Image'}
                </Text>
              </TouchableOpacity>

              {selectedImage && (
                <TouchableOpacity
                  style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                  onPress={uploadImage}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.uploadButtonText}>☁️ Upload Logo</Text>
                  )}
                </TouchableOpacity>
              )}

              {selectedImage && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setSelectedImage(null)}
                  disabled={uploading}
                >
                  <Text style={styles.cancelButtonText}>✕ Cancel</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>ℹ️ Logo Guidelines</Text>
              <Text style={styles.infoText}>
                • Use a square image (1:1 aspect ratio){'\n'}
                • Recommended size: 512x512 pixels{'\n'}
                • Maximum file size: 5 MB{'\n'}
                • Supported formats: JPEG, PNG, WebP{'\n'}
                • Logo will appear in customer mobile app{'\n'}
                • Use high-quality images for best results
              </Text>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  currentLogoContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  logoPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  logoImage: {
    width: '90%',
    height: '90%',
  },
  removeButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtons: {
    marginBottom: 24,
  },
  pickButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  pickButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 22,
  },
});
