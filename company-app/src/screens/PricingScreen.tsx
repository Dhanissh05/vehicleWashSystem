import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, gql } from '@apollo/client';

const PRICING = gql`
  query Pricing {
    pricing {
      id
      vehicleType
      carCategory
      price
      description
    }
  }
`;

const UPDATE_PRICING = gql`
  mutation UpdatePricing($input: UpdatePricingInput!) {
    updatePricing(input: $input) {
      id
      vehicleType
      carCategory
      price
      description
    }
  }
`;

interface PricingItem {
  id: string;
  vehicleType: string;
  carCategory: string | null;
  price: number;
  description?: string;
}

export default function PricingScreen() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');

  const { data, loading, refetch } = useQuery(PRICING);
  const [updatePricing, { loading: updating }] = useMutation(UPDATE_PRICING, {
    onCompleted: () => {
      Alert.alert('Success', 'Price updated successfully');
      setEditingId(null);
      setEditingPrice('');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const getVehicleIcon = (type: string) => {
    return type === 'CAR' ? '🚗' : '🏍️';
  };

  const getDisplayName = (item: PricingItem) => {
    if (item.vehicleType === 'TWO_WHEELER') {
      return 'Two Wheeler';
    }
    if (item.carCategory) {
      return item.carCategory.charAt(0) + item.carCategory.slice(1).toLowerCase();
    }
    return 'Car';
  };

  const startEditing = (item: PricingItem) => {
    setEditingId(item.id);
    setEditingPrice(item.price.toString());
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingPrice('');
  };

  const savePrice = (item: PricingItem) => {
    const newPrice = parseFloat(editingPrice);

    if (isNaN(newPrice) || newPrice <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price greater than 0');
      return;
    }

    if (newPrice > 10000) {
      Alert.alert('Validation Error', 'Price cannot exceed ₹10,000');
      return;
    }

    updatePricing({
      variables: {
        input: {
          vehicleType: item.vehicleType,
          carCategory: item.carCategory,
          price: newPrice,
          description: item.description,
        },
      },
    });
  };

  const renderPricingItem = (item: PricingItem) => {
    const isEditing = editingId === item.id;

    return (
      <View key={item.id} style={styles.pricingCard}>
        <View style={styles.pricingHeader}>
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehicleIcon}>
              {getVehicleIcon(item.vehicleType)}
            </Text>
            <View>
              <Text style={styles.vehicleName}>{getDisplayName(item)}</Text>
              <Text style={styles.vehicleType}>
                {item.vehicleType === 'TWO_WHEELER' ? 'Bike/Scooter' : 'Car Wash'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.pricingBody}>
          {isEditing ? (
            <View style={styles.editingContainer}>
              <View style={styles.priceInputContainer}>
                <Text style={styles.rupeeSymbol}>₹</Text>
                <TextInput
                  style={styles.priceInput}
                  value={editingPrice}
                  onChangeText={setEditingPrice}
                  keyboardType="decimal-pad"
                  placeholder="Enter price"
                  autoFocus
                />
              </View>
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelEditing}
                  disabled={updating}
                >
                  <Text style={styles.cancelButtonText}>✕</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => savePrice(item)}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.displayContainer}>
              <Text style={styles.priceDisplay}>₹{item.price}</Text>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => startEditing(item)}
              >
                <Text style={styles.editButtonText}>✏️ Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} />
      }
    >
      <View style={styles.content}>
        <Text style={styles.title}>Pricing Management</Text>
        <Text style={styles.subtitle}>
          Set wash prices for different vehicle types
        </Text>

        {loading && !data ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading pricing...</Text>
          </View>
        ) : (
          <>
            {/* Two Wheeler Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Two Wheelers</Text>
              {data?.pricing
                ?.filter((item: PricingItem) => item.vehicleType === 'TWO_WHEELER')
                .map((item: PricingItem) => renderPricingItem(item))}
            </View>

            {/* Cars Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cars</Text>
              {data?.pricing
                ?.filter((item: PricingItem) => item.vehicleType === 'CAR')
                .map((item: PricingItem) => renderPricingItem(item))}
            </View>
          </>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Pricing Tips</Text>
          <Text style={styles.infoText}>
            • Prices are shown to customers when adding vehicles{'\n'}
            • Consider market rates in your area{'\n'}
            • Different car categories (Sedan, SUV, etc.) can have different prices{'\n'}
            • Changes take effect immediately{'\n'}
            • Minimum price: ₹1, Maximum: ₹10,000
          </Text>
        </View>

        {data?.pricing && (
          <View style={styles.statsBox}>
            <Text style={styles.statsTitle}>Current Pricing Summary</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Average Price</Text>
                <Text style={styles.statValue}>
                  ₹
                  {Math.round(
                    data.pricing.reduce((sum: number, item: PricingItem) => sum + item.price, 0) /
                      data.pricing.length
                  )}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Lowest Price</Text>
                <Text style={styles.statValue}>
                  ₹{Math.min(...data.pricing.map((item: PricingItem) => item.price))}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Highest Price</Text>
                <Text style={styles.statValue}>
                  ₹{Math.max(...data.pricing.map((item: PricingItem) => item.price))}
                </Text>
              </View>
            </View>
          </View>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pricingHeader: {
    marginBottom: 12,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  vehicleType: {
    fontSize: 12,
    color: '#6B7280',
  },
  pricingBody: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  displayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceDisplay: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
  },
  editButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
  },
  rupeeSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    paddingVertical: 8,
  },
  editActions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 20,
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#10B981',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 20,
    color: '#fff',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
  statsBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10B981',
  },
});
