import React, { useState } from 'react';
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

const ESTIMATIONS = gql`
  query Estimations($status: EstimationStatus, $limit: Int, $offset: Int) {
    estimations(status: $status, limit: $limit, offset: $offset) {
      id
      estimationNumber
      customerName
      customerMobile
      vehicleNumber
      vehicleType
      preparedByName
      preparedByRole
      status
      totalAmount
      validUntil
      createdAt
      updatedAt
    }
  }
`;

const DELETE_ESTIMATION = gql`
  mutation DeleteEstimation($id: ID!) {
    deleteEstimation(id: $id)
  }
`;

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/graphql', '') || 'http://localhost:4000';

export default function EstimationsScreen({ navigation }: any) {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, loading, refetch } = useQuery(ESTIMATIONS, {
    variables: {
      status: statusFilter || null,
      limit: 50,
      offset: 0,
    },
    pollInterval: 30000,
  });

  const [deleteEstimation] = useMutation(DELETE_ESTIMATION);

  const handleDelete = (id: string, estimationNumber: string) => {
    Alert.alert(
      'Delete Estimation',
      `Are you sure you want to delete ${estimationNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEstimation({ variables: { id } });
              Alert.alert('Success', 'Estimation deleted successfully');
              refetch();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete estimation');
            }
          },
        },
      ]
    );
  };

  const handleExportPDF = (id: string) => {
    const url = `${API_URL}/api/estimations/${id}/export/pdf`;
    Linking.openURL(url);
  };

  const handlePreview = (id: string) => {
    const url = `${API_URL}/api/estimations/${id}/preview`;
    Linking.openURL(url);
  };

  const handleShare = async (id: string, estimationNumber: string) => {
    try {
      const url = `${API_URL}/api/estimations/${id}/preview`;
      await Share.share({
        message: `View Estimation ${estimationNumber}: ${url}`,
        url: url,
        title: `Estimation ${estimationNumber}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const estimations = data?.estimations || [];
  const filteredEstimations = estimations.filter((est: any) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      est.estimationNumber.toLowerCase().includes(search) ||
      est.customerName.toLowerCase().includes(search) ||
      est.customerMobile.includes(search) ||
      (est.vehicleNumber && est.vehicleNumber.toLowerCase().includes(search))
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return '#6B7280';
      case 'SENT':
        return '#3B82F6';
      case 'ACCEPTED':
        return '#10B981';
      case 'REJECTED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  if (loading && !data) {
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
        <Text style={styles.headerTitle}>Estimations</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('EstimationForm')}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by number, customer, mobile..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <View style={styles.statusFilterContainer}>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === '' && styles.filterChipActive]}
            onPress={() => setStatusFilter('')}
          >
            <Text style={[styles.filterChipText, statusFilter === '' && styles.filterChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'DRAFT' && styles.filterChipActive]}
            onPress={() => setStatusFilter('DRAFT')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'DRAFT' && styles.filterChipTextActive]}>
              Draft
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'SENT' && styles.filterChipActive]}
            onPress={() => setStatusFilter('SENT')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'SENT' && styles.filterChipTextActive]}>
              Sent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, statusFilter === 'ACCEPTED' && styles.filterChipActive]}
            onPress={() => setStatusFilter('ACCEPTED')}
          >
            <Text style={[styles.filterChipText, statusFilter === 'ACCEPTED' && styles.filterChipTextActive]}>
              Accepted
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Estimations List */}
      <ScrollView style={styles.list}>
        {filteredEstimations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyText}>No estimations found</Text>
            <TouchableOpacity
              style={styles.createFirstButton}
              onPress={() => navigation.navigate('EstimationForm')}
            >
              <Text style={styles.createFirstButtonText}>Create First Estimation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredEstimations.map((estimation: any) => (
            <View key={estimation.id} style={styles.estimationCard}>
              <View style={styles.estimationHeader}>
                <View>
                  <Text style={styles.estimationNumber}>
                    📄 {estimation.estimationNumber}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(estimation.status) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(estimation.status) },
                      ]}
                    >
                      {estimation.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.estimationAmount}>
                  ₹{estimation.totalAmount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.estimationDetails}>
                <Text style={styles.customerName}>{estimation.customerName}</Text>
                <Text style={styles.customerMobile}>{estimation.customerMobile}</Text>
                {estimation.vehicleNumber && (
                  <Text style={styles.vehicleInfo}>
                    🚗 {estimation.vehicleNumber} ({estimation.vehicleType})
                  </Text>
                )}
                <Text style={styles.dateText}>
                  Created: {new Date(estimation.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.estimationActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    navigation.navigate('EstimationForm', { id: estimation.id })
                  }
                >
                  <Text style={styles.actionButtonText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handlePreview(estimation.id)}
                >
                  <Text style={styles.actionButtonText}>👁️ View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleExportPDF(estimation.id)}
                >
                  <Text style={styles.actionButtonText}>📥 PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleShare(estimation.id, estimation.estimationNumber)}
                >
                  <Text style={styles.actionButtonText}>📤 Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() =>
                    handleDelete(estimation.id, estimation.estimationNumber)
                  }
                >
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                    🗑️
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  statusFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterChipText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 16,
  },
  createFirstButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  estimationCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  estimationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  estimationNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  estimationAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  estimationDetails: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerMobile: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  estimationActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    color: '#DC2626',
  },
});
