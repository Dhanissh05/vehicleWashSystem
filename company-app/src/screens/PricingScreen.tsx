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
  Modal,
} from 'react-native';
import { useQuery, useMutation, gql } from '@apollo/client';

const PRICING = gql`
  query Pricing {
    pricing {
      id
      vehicleType
      categoryName
      carCategory
      price
      description
    }
  }
`;

const CREATE_PRICING = gql`
  mutation CreatePricing($input: CreatePricingInput!) {
    createPricing(input: $input) {
      id
      vehicleType
      categoryName
      price
      description
    }
  }
`;

const UPDATE_PRICING = gql`
  mutation UpdatePricing($input: UpdatePricingInput!) {
    updatePricing(input: $input) {
      id
      categoryName
      price
      description
    }
  }
`;

const DELETE_PRICING = gql`
  mutation DeletePricing($id: ID!) {
    deletePricing(id: $id)
  }
`;

interface PricingItem {
  id: string;
  vehicleType: string;
  categoryName: string;
  carCategory: string | null;
  price: number;
  description?: string;
}

export default function PricingScreen() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [editingCategoryName, setEditingCategoryName] = useState<string>('');
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVehicleType, setNewVehicleType] = useState<'CAR' | 'TWO_WHEELER' | 'BODY_REPAIR' | 'PAINTING'>('CAR');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { data, loading, refetch } = useQuery(PRICING, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  });

  const [createPricing, { loading: creating }] = useMutation(CREATE_PRICING, {
    onCompleted: () => {
      Alert.alert('Success', 'Category created successfully');
      setShowAddModal(false);
      resetNewForm();
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const [updatePricing, { loading: updating }] = useMutation(UPDATE_PRICING, {
    onCompleted: () => {
      Alert.alert('Success', 'Category updated successfully');
      setEditingId(null);
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const [deletePricing] = useMutation(DELETE_PRICING, {
    onCompleted: () => {
      Alert.alert('Success', 'Category deleted successfully');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const resetNewForm = () => {
    setNewCategoryName('');
    setNewPrice('');
    setNewDescription('');
    setNewVehicleType('CAR');
  };

  const getVehicleIcon = (type: string) => {
    if (type === 'CAR') return '🚗';
    if (type === 'TWO_WHEELER') return '🏍️';
    if (type === 'BODY_REPAIR') return '🔧';
    if (type === 'PAINTING') return '🎨';
    return '🚗';
  };

  const getVehicleTypeLabel = (type: string) => {
    if (type === 'CAR') return 'Cars';
    if (type === 'TWO_WHEELER') return 'Two Wheelers';
    if (type === 'BODY_REPAIR') return 'Body Repair';
    if (type === 'PAINTING') return 'Painting';
    return type;
  };

  const startEditing = (item: PricingItem) => {
    setEditingId(item.id);
    setEditingPrice(item.price.toString());
    setEditingCategoryName(item.categoryName);
    setEditingDescription(item.description || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingPrice('');
    setEditingCategoryName('');
    setEditingDescription('');
  };

  const saveCategory = (item: PricingItem) => {
    const newPrice = parseFloat(editingPrice);

    if (!editingCategoryName.trim()) {
      Alert.alert('Validation Error', 'Please enter a category name');
      return;
    }

    if (isNaN(newPrice) || newPrice <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price greater than 0');
      return;
    }

    if (newPrice > 50000) {
      Alert.alert('Validation Error', 'Price cannot exceed ₹50,000');
      return;
    }

    updatePricing({
      variables: {
        input: {
          id: item.id,
          categoryName: editingCategoryName.trim(),
          price: newPrice,
          description: editingDescription.trim() || null,
        },
      },
    });
  };

  const handleAddCategory = () => {
    const price = parseFloat(newPrice);

    if (!newCategoryName.trim()) {
      Alert.alert('Validation Error', 'Please enter a category name');
      return;
    }

    if (isNaN(price) || price <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price greater than 0');
      return;
    }

    if (price > 50000) {
      Alert.alert('Validation Error', 'Price cannot exceed ₹50,000');
      return;
    }

    createPricing({
      variables: {
        input: {
          vehicleType: newVehicleType,
          categoryName: newCategoryName.trim(),
          price,
          description: newDescription.trim() || null,
        },
      },
    });
  };

  const handleDeleteCategory = (item: PricingItem) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${item.categoryName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePricing({ variables: { id: item.id } });
          },
        },
      ]
    );
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
            <View style={styles.categoryInfo}>
              {isEditing ? (
                <TextInput
                  style={styles.categoryNameInput}
                  value={editingCategoryName}
                  onChangeText={setEditingCategoryName}
                  placeholder="Category Name"
                />
              ) : (
                <Text style={styles.vehicleName}>{item.categoryName}</Text>
              )}
              {isEditing ? (
                <TextInput
                  style={styles.descriptionInput}
                  value={editingDescription}
                  onChangeText={setEditingDescription}
                  placeholder="Description (optional)"
                  multiline
                />
              ) : (
                item.description && (
                  <Text style={styles.vehicleType}>{item.description}</Text>
                )
              )}
            </View>
          </View>
          {!isEditing && (
            <TouchableOpacity
              style={styles.deleteIconButton}
              onPress={() => handleDeleteCategory(item)}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          )}
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
                  onPress={() => saveCategory(item)}
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

  const groupedPricing = data?.pricing?.reduce((acc: any, item: PricingItem) => {
    if (!acc[item.vehicleType]) {
      acc[item.vehicleType] = [];
    }
    acc[item.vehicleType].push(item);
    return acc;
  }, {}) || {};

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Pricing Management</Text>
              <Text style={styles.subtitle}>
                Manage pricing for different categories
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addButtonText}>+ Add Category</Text>
            </TouchableOpacity>
          </View>

          {loading && !data ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading pricing...</Text>
            </View>
          ) : (
            <>
              {Object.keys(groupedPricing).map((vehicleType) => (
                <View key={vehicleType} style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {getVehicleIcon(vehicleType)} {getVehicleTypeLabel(vehicleType)}
                  </Text>
                  {groupedPricing[vehicleType].map((item: PricingItem) =>
                    renderPricingItem(item)
                  )}
                </View>
              ))}

              {Object.keys(groupedPricing).length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyText}>No pricing categories yet</Text>
                  <Text style={styles.emptySubtext}>
                    Add your first category to get started
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Add Category Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Category</Text>

            <Text style={styles.label}>Vehicle Type</Text>
            <View style={styles.vehicleTypeSelector}>
              {['CAR', 'TWO_WHEELER', 'BODY_REPAIR', 'PAINTING'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.vehicleTypeButton,
                    newVehicleType === type && styles.vehicleTypeButtonActive,
                  ]}
                  onPress={() => setNewVehicleType(type as any)}
                >
                  <Text
                    style={[
                      styles.vehicleTypeButtonText,
                      newVehicleType === type && styles.vehicleTypeButtonTextActive,
                    ]}
                  >
                    {getVehicleIcon(type)} {getVehicleTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Category Name</Text>
            <TextInput
              style={styles.input}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="e.g., Sedan, Bike Above 150cc, Full Body Paint"
            />

            <Text style={styles.label}>Price (₹)</Text>
            <TextInput
              style={styles.input}
              value={newPrice}
              onChangeText={setNewPrice}
              keyboardType="decimal-pad"
              placeholder="Enter price"
            />

            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newDescription}
              onChangeText={setNewDescription}
              placeholder="Additional details about this category"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddModal(false);
                  resetNewForm();
                }}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleAddCategory}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveButtonText}>Create Category</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  addButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  vehicleIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  vehicleType: {
    fontSize: 12,
    color: '#6B7280',
  },
  categoryNameInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  descriptionInput: {
    fontSize: 12,
    color: '#6B7280',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 6,
    minHeight: 40,
  },
  deleteIconButton: {
    padding: 4,
  },
  deleteIcon: {
    fontSize: 20,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  vehicleTypeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vehicleTypeButton: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
  vehicleTypeButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  vehicleTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  vehicleTypeButtonTextActive: {
    color: '#3B82F6',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
