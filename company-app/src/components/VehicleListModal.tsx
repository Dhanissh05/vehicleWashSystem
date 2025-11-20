import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useQuery, gql } from '@apollo/client';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const GET_VEHICLES_BY_FILTER = gql`
  query GetVehiclesByFilter($status: VehicleStatus, $vehicleType: VehicleType, $limit: Int) {
    vehicles(status: $status, vehicleType: $vehicleType, limit: $limit) {
      id
      vehicleNumber
      vehicleType
      status
      customer {
        name
        mobile
      }
      payment {
        id
        amount
        method
        status
      }
      washCount
      receivedAt
      washingAt
      readyAt
      deliveredAt
    }
  }
`;

interface VehicleListModalProps {
  visible: boolean;
  onClose: () => void;
  filter: {
    status?: string;
    vehicleType?: string;
    title: string;
  } | null;
}

export default function VehicleListModal({ visible, onClose, filter }: VehicleListModalProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const { data, loading, error } = useQuery(GET_VEHICLES_BY_FILTER, {
    variables: {
      status: filter?.status,
      vehicleType: filter?.vehicleType,
      limit: 500,
    },
    skip: !visible || !filter,
    fetchPolicy: 'network-only',
  });

  const vehicles = data?.vehicles || [];

  // Debug logging
  React.useEffect(() => {
    if (visible && filter) {
      console.log('=== VehicleListModal Debug ===');
      console.log('Filter:', JSON.stringify(filter, null, 2));
      console.log('Variables:', JSON.stringify({
        status: filter?.status,
        vehicleType: filter?.vehicleType,
        limit: 500,
      }, null, 2));
      console.log('Loading:', loading);
      console.log('Error:', error?.message || 'No error');
      console.log('Data:', JSON.stringify(data, null, 2));
      console.log('Vehicles count:', vehicles.length);
      if (vehicles.length > 0) {
        console.log('First vehicle:', JSON.stringify(vehicles[0], null, 2));
      }
      console.log('=============================');
    }
  }, [visible, filter, loading, error, data, vehicles.length]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'RECEIVED': return 'Received';
      case 'WASHING': return 'Washing';
      case 'READY_FOR_PICKUP': return 'Ready';
      case 'DELIVERED': return 'Delivered';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RECEIVED': return '#3B82F6';
      case 'WASHING': return '#F59E0B';
      case 'READY_FOR_PICKUP': return '#10B981';
      case 'DELIVERED': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              font-size: 12px;
            }
            h1 {
              color: #8B5CF6;
              font-size: 24px;
              margin-bottom: 10px;
            }
            .subtitle {
              color: #6B7280;
              margin-bottom: 20px;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #8B5CF6;
              color: white;
              padding: 12px 8px;
              text-align: left;
              font-weight: bold;
              font-size: 11px;
            }
            td {
              padding: 10px 8px;
              border-bottom: 1px solid #E5E7EB;
              font-size: 11px;
            }
            tr:hover {
              background-color: #F9FAFB;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: bold;
            }
            .status-received { background-color: #DBEAFE; color: #1E40AF; }
            .status-washing { background-color: #FEF3C7; color: #92400E; }
            .status-ready { background-color: #D1FAE5; color: #065F46; }
            .status-delivered { background-color: #F3F4F6; color: #374151; }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #9CA3AF;
              font-size: 10px;
            }
            .total {
              margin-top: 15px;
              font-weight: bold;
              font-size: 14px;
              color: #1F2937;
            }
          </style>
        </head>
        <body>
          <h1>Vehicle Report - ${filter?.title || 'All Vehicles'}</h1>
          <p class="subtitle">Generated on ${new Date().toLocaleString('en-IN')}</p>
          <p class="total">Total Vehicles: ${vehicles.length}</p>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Vehicle Number</th>
                <th>Type</th>
                <th>Customer Name</th>
                <th>Mobile</th>
                <th>Times Washed</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Received At</th>
              </tr>
            </thead>
            <tbody>
              ${vehicles.map((vehicle: any, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${vehicle.vehicleNumber}</strong></td>
                  <td>${vehicle.vehicleType === 'TWO_WHEELER' ? '🏍️ Two-Wheeler' : '🚗 Car'}</td>
                  <td>${vehicle.customer?.name || 'N/A'}</td>
                  <td>${vehicle.customer?.mobile || 'N/A'}</td>
                  <td style="text-align: center;"><strong>${vehicle.washCount || 0}</strong></td>
                  <td style="text-align: center;">${vehicle.payment?.method || '-'}</td>
                  <td style="text-align: center;">₹${vehicle.payment?.amount || '-'}</td>
                  <td>
                    <span class="status-badge status-${vehicle.status.toLowerCase()}">
                      ${getStatusLabel(vehicle.status)}
                    </span>
                  </td>
                  <td>${formatDate(vehicle.receivedAt)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Vehicle Wash Management System</p>
            <p>This is a computer-generated report</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
      });

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Vehicle Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', 'PDF generated successfully!');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (!filter) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{filter.title}</Text>
            <Text style={styles.headerSubtitle}>
              {loading ? 'Loading...' : `${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={generatePDF}
            style={styles.pdfButton}
            disabled={isGeneratingPDF || loading || vehicles.length === 0}
          >
            {isGeneratingPDF ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.pdfButtonText}>📄 PDF</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading vehicles...</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyText}>Error loading vehicles</Text>
            <Text style={styles.errorDetail}>{error.message}</Text>
          </View>
        ) : vehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No vehicles found</Text>
            <Text style={styles.filterInfo}>
              Filter: {filter.status || 'All statuses'} / {filter.vehicleType || 'All types'}
            </Text>
          </View>
        ) : (
          <ScrollView 
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.scrollContainer}
          >
            <View>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.cellIndex]}>#</Text>
                <Text style={[styles.headerCell, styles.cellVehicleNumber]}>Vehicle Number</Text>
                <Text style={[styles.headerCell, styles.cellType]}>Type</Text>
                <Text style={[styles.headerCell, styles.cellName]}>Customer Name</Text>
                <Text style={[styles.headerCell, styles.cellMobile]}>Mobile</Text>
                <Text style={[styles.headerCell, styles.cellWashCount]}>Washed</Text>
                <Text style={[styles.headerCell, styles.cellPayment]}>Payment</Text>
                <Text style={[styles.headerCell, styles.cellAmount]}>Amount</Text>
                <Text style={[styles.headerCell, styles.cellStatus]}>Status</Text>
                <Text style={[styles.headerCell, styles.cellDate]}>Received</Text>
              </View>

              {/* Table Body */}
              <ScrollView style={styles.tableBody}>
                {vehicles.map((vehicle: any, index: number) => (
                  <View key={vehicle.id} style={styles.tableRow}>
                    <Text style={[styles.cell, styles.cellIndex]}>{index + 1}</Text>
                    <Text style={[styles.cell, styles.cellVehicleNumber, styles.boldText]}>
                      {vehicle.vehicleNumber}
                    </Text>
                    <Text style={[styles.cell, styles.cellType]}>
                      {vehicle.vehicleType === 'TWO_WHEELER' ? '🏍️ Two-Wheeler' : '🚗 Car'}
                    </Text>
                    <Text style={[styles.cell, styles.cellName]}>{vehicle.customer?.name || 'N/A'}</Text>
                    <Text style={[styles.cell, styles.cellMobile]}>{vehicle.customer?.mobile || 'N/A'}</Text>
                    <Text style={[styles.cell, styles.cellWashCount, styles.boldText]}>
                      {vehicle.washCount || 0}
                    </Text>
                    <Text style={[styles.cell, styles.cellPayment]}>
                      {vehicle.payment?.method || '-'}
                    </Text>
                    <Text style={[styles.cell, styles.cellAmount, styles.boldText]}>
                      {vehicle.payment?.amount ? `₹${vehicle.payment.amount}` : '-'}
                    </Text>
                    <View style={[styles.cell, styles.cellStatus]}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(vehicle.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[styles.statusText, { color: getStatusColor(vehicle.status) }]}
                        >
                          {getStatusLabel(vehicle.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.cell, styles.cellDate]}>
                      {formatDate(vehicle.receivedAt)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#8B5CF6',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E9D5FF',
  },
  pdfButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 8,
  },
  errorDetail: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
  },
  filterInfo: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 2,
    borderBottomColor: '#8B5CF6',
    paddingVertical: 12,
  },
  headerCell: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#1F2937',
    paddingHorizontal: 8,
  },
  tableBody: {
    backgroundColor: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
  },
  cell: {
    fontSize: 13,
    color: '#4B5563',
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  boldText: {
    fontWeight: '600',
    color: '#1F2937',
  },
  cellIndex: {
    width: 50,
  },
  cellVehicleNumber: {
    width: 130,
  },
  cellType: {
    width: 140,
  },
  cellName: {
    width: 150,
  },
  cellMobile: {
    width: 120,
  },
  cellWashCount: {
    width: 80,
    textAlign: 'center',
  },
  cellPayment: {
    width: 90,
    textAlign: 'center',
  },
  cellAmount: {
    width: 90,
    textAlign: 'center',
  },
  cellStatus: {
    width: 110,
  },
  cellDate: {
    width: 130,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
