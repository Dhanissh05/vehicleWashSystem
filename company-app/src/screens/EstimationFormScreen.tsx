import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client';
import { gql } from '@apollo/client';

const ESTIMATION = gql`
  query Estimation($id: ID!) {
    estimation(id: $id) {
      id
      estimationNumber
      customerName
      customerMobile
      vehicleNumber
      vehicleType
      preparedByName
      preparedByRole
      termsAndConditions
      notes
      status
      totalAmount
      validUntil
      createdAt
      updatedAt
      items {
        id
        serviceName
        description
        quantity
        unitPrice
        totalPrice
      }
      center {
        name
        address
        mobile
        email
        logoUrl
      }
    }
  }
`;

const CREATE_ESTIMATION = gql`
  mutation CreateEstimation($input: CreateEstimationInput!) {
    createEstimation(input: $input) {
      id
      estimationNumber
      customerName
      customerMobile
      vehicleNumber
      vehicleType
      status
      totalAmount
      createdAt
    }
  }
`;

const UPDATE_ESTIMATION = gql`
  mutation UpdateEstimation($id: ID!, $input: UpdateEstimationInput!) {
    updateEstimation(id: $id, input: $input) {
      id
      estimationNumber
      customerName
      customerMobile
      vehicleNumber
      vehicleType
      termsAndConditions
      notes
      status
      totalAmount
      validUntil
      updatedAt
    }
  }
`;

const ADD_ESTIMATION_ITEM = gql`
  mutation AddEstimationItem($input: AddEstimationItemInput!) {
    addEstimationItem(input: $input) {
      id
      serviceName
      description
      quantity
      unitPrice
      totalPrice
    }
  }
`;

const UPDATE_ESTIMATION_ITEM = gql`
  mutation UpdateEstimationItem($id: ID!, $input: UpdateEstimationItemInput!) {
    updateEstimationItem(id: $id, input: $input) {
      id
      serviceName
      description
      quantity
      unitPrice
      totalPrice
    }
  }
`;

const DELETE_ESTIMATION_ITEM = gql`
  mutation DeleteEstimationItem($id: ID!) {
    deleteEstimationItem(id: $id)
  }
`;

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/graphql', '') || 'http://localhost:4000';

interface EstimationItem {
  id?: string;
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export default function EstimationFormScreen({ route, navigation }: any) {
  const { id } = route.params || {};
  const isEdit = !!id;

  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState(
    '1. This estimation is valid for 30 days from the date of issue.\n2. Prices are subject to change based on actual work required.\n3. Payment terms: 50% advance, 50% on completion.\n4. Additional charges may apply for extra services.'
  );
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [items, setItems] = useState<EstimationItem[]>([]);

  const { data, loading } = useQuery(ESTIMATION, {
    variables: { id },
    skip: !isEdit,
    onCompleted: (data) => {
      if (data.estimation) {
        const est = data.estimation;
        setCustomerName(est.customerName);
        setCustomerMobile(est.customerMobile);
        setVehicleNumber(est.vehicleNumber || '');
        setVehicleType(est.vehicleType || '');
        setTermsAndConditions(est.termsAndConditions || '');
        setNotes(est.notes || '');
        setStatus(est.status);
        setValidUntil(
          est.validUntil
            ? new Date(est.validUntil).toISOString().split('T')[0]
            : ''
        );
        setItems(est.items || []);
      }
    },
  });

  const [createEstimation, { loading: creating }] = useMutation(CREATE_ESTIMATION);
  const [updateEstimation, { loading: updating }] = useMutation(UPDATE_ESTIMATION);
  const [addEstimationItem] = useMutation(ADD_ESTIMATION_ITEM);
  const [updateEstimationItem] = useMutation(UPDATE_ESTIMATION_ITEM);
  const [deleteEstimationItem] = useMutation(DELETE_ESTIMATION_ITEM);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        serviceName: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
      },
    ]);
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].totalPrice =
        newItems[index].quantity * newItems[index].unitPrice;
    }

    setItems(newItems);
  };

  const handleRemoveItem = async (index: number) => {
    const item = items[index];

    if (item.id) {
      try {
        await deleteEstimationItem({ variables: { id: item.id } });
        Alert.alert('Success', 'Item removed');
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to remove item');
        return;
      }
    }

    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleSave = async () => {
    if (!customerName || !customerMobile) {
      Alert.alert('Error', 'Please fill in customer details');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    try {
      if (isEdit) {
        // Update estimation
        await updateEstimation({
          variables: {
            id,
            input: {
              customerName,
              customerMobile,
              vehicleNumber: vehicleNumber || null,
              vehicleType: vehicleType || null,
              termsAndConditions,
              notes,
              status,
              validUntil: validUntil ? new Date(validUntil).toISOString() : null,
            },
          },
        });

        // Update items
        for (const item of items) {
          if (item.id) {
            // Update existing item
            await updateEstimationItem({
              variables: {
                id: item.id,
                input: {
                  serviceName: item.serviceName,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                },
              },
            });
          } else {
            // Add new item
            await addEstimationItem({
              variables: {
                input: {
                  estimationId: id,
                  serviceName: item.serviceName,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                },
              },
            });
          }
        }

        Alert.alert('Success', 'Estimation updated successfully');
        navigation.goBack();
      } else {
        // Create estimation
        const result = await createEstimation({
          variables: {
            input: {
              customerName,
              customerMobile,
              vehicleNumber: vehicleNumber || null,
              vehicleType: vehicleType || null,
              termsAndConditions,
              notes,
              validUntil: validUntil ? new Date(validUntil).toISOString() : null,
            },
          },
        });

        const estimationId = result.data.createEstimation.id;

        // Add items
        for (const item of items) {
          await addEstimationItem({
            variables: {
              input: {
                estimationId,
                serviceName: item.serviceName,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              },
            },
          });
        }

        Alert.alert('Success', 'Estimation created successfully');
        navigation.replace('EstimationForm', { id: estimationId });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save estimation');
    }
  };

  const handleExport = () => {
    if (isEdit) {
      const url = `${API_URL}/api/estimations/${id}/export/pdf`;
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Please save the estimation first');
    }
  };

  const handlePreview = () => {
    if (isEdit) {
      const url = `${API_URL}/api/estimations/${id}/preview`;
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Please save the estimation first');
    }
  };

  const handleShare = async () => {
    if (!isEdit) {
      Alert.alert('Error', 'Please save the estimation first');
      return;
    }

    try {
      const url = `${API_URL}/api/estimations/${id}/preview`;
      await Share.share({
        message: `View Estimation ${data?.estimation?.estimationNumber}: ${url}`,
        url: url,
        title: `Estimation ${data?.estimation?.estimationNumber}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Estimation' : 'New Estimation'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Action Buttons */}
        {isEdit && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handlePreview}
            >
              <Text style={styles.actionBtnText}>👁️ Preview</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleExport}
            >
              <Text style={styles.actionBtnText}>📥 PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleShare}
            >
              <Text style={styles.actionBtnText}>📤 Share</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Customer Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Details</Text>
          <TextInput
            style={styles.input}
            placeholder="Customer Name *"
            value={customerName}
            onChangeText={setCustomerName}
          />
          <TextInput
            style={styles.input}
            placeholder="Mobile Number *"
            value={customerMobile}
            onChangeText={setCustomerMobile}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Vehicle Number (Optional)"
            value={vehicleNumber}
            onChangeText={(text) => setVehicleNumber(text.toUpperCase())}
            autoCapitalize="characters"
          />
          <View style={styles.input}>
            <Text style={styles.inputLabel}>Vehicle Type</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() => setVehicleType('CAR')}
              >
                <View
                  style={[
                    styles.radioCircle,
                    vehicleType === 'CAR' && styles.radioCircleSelected,
                  ]}
                />
                <Text style={styles.radioLabel}>Car</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() => setVehicleType('TWO_WHEELER')}
              >
                <View
                  style={[
                    styles.radioCircle,
                    vehicleType === 'TWO_WHEELER' && styles.radioCircleSelected,
                  ]}
                />
                <Text style={styles.radioLabel}>Two Wheeler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioButton}
                onPress={() => setVehicleType('OTHER')}
              >
                <View
                  style={[
                    styles.radioCircle,
                    vehicleType === 'OTHER' && styles.radioCircleSelected,
                  ]}
                />
                <Text style={styles.radioLabel}>Other</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Services / Items</Text>
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={handleAddItem}
            >
              <Text style={styles.addItemButtonText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <TextInput
                style={styles.input}
                placeholder="Service Name *"
                value={item.serviceName}
                onChangeText={(text) =>
                  handleUpdateItem(index, 'serviceName', text)
                }
              />
              <TextInput
                style={styles.input}
                placeholder="Description (Optional)"
                value={item.description}
                onChangeText={(text) =>
                  handleUpdateItem(index, 'description', text)
                }
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.smallInput]}
                  placeholder="Qty *"
                  value={item.quantity.toString()}
                  onChangeText={(text) =>
                    handleUpdateItem(index, 'quantity', parseInt(text) || 1)
                  }
                  keyboardType="number-pad"
                />
                <TextInput
                  style={[styles.input, styles.smallInput]}
                  placeholder="Unit Price *"
                  value={item.unitPrice.toString()}
                  onChangeText={(text) =>
                    handleUpdateItem(index, 'unitPrice', parseFloat(text) || 0)
                  }
                  keyboardType="decimal-pad"
                />
                <View style={[styles.input, styles.smallInput, styles.totalBox]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>
                    ₹{item.totalPrice.toFixed(2)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveItem(index)}
              >
                <Text style={styles.removeButtonText}>🗑️ Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          {items.length === 0 && (
            <View style={styles.emptyItems}>
              <Text style={styles.emptyItemsText}>
                No items added yet. Tap "Add Item" to get started.
              </Text>
            </View>
          )}

          {items.length > 0 && (
            <View style={styles.totalSection}>
              <Text style={styles.totalSectionLabel}>Total Amount</Text>
              <Text style={styles.totalSectionValue}>
                ₹{calculateTotal().toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Terms & Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter terms and conditions"
            value={termsAndConditions}
            onChangeText={setTermsAndConditions}
            multiline
            numberOfLines={6}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional notes or instructions"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, (creating || updating) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={creating || updating}
        >
          <Text style={styles.saveButtonText}>
            {creating || updating ? 'Saving...' : 'Save Estimation'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  radioCircleSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  radioLabel: {
    fontSize: 14,
    color: '#374151',
  },
  addItemButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addItemButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  itemCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  smallInput: {
    flex: 1,
  },
  totalBox: {
    backgroundColor: '#EFF6FF',
  },
  totalLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  removeButton: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#DC2626',
    fontWeight: '600',
  },
  emptyItems: {
    padding: 20,
    alignItems: 'center',
  },
  emptyItemsText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
  },
  totalSection: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  totalSectionLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  totalSectionValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    margin: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
