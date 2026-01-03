import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { useQuery, gql } from '@apollo/client';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const GET_CUSTOMERS = gql`
  query GetCustomers {
    customers {
      id
      mobile
      name
      email
      dateOfBirth
      address
      city
      pinCode
      latitude
      longitude
      createdAt
      vehicles {
        id
        vehicleNumber
        vehicleType
        carCategory
        brand
        model
        color
      }
    }
  }
`;

export default function ManageUsersScreen() {
  const { data, loading, refetch } = useQuery(GET_CUSTOMERS, {
    fetchPolicy: 'network-only',
  });
  const { width } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatLocation = (lat: number | null, lng: number | null) => {
    if (!lat || !lng) return 'Not provided';
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  // Remove duplicate vehicles by vehicle number
  const getUniqueVehicles = (vehicles: any[]) => {
    const seen = new Set();
    return vehicles.filter((vehicle: any) => {
      if (seen.has(vehicle.vehicleNumber)) {
        return false;
      }
      seen.add(vehicle.vehicleNumber);
      return true;
    });
  };

  const generatePdfHtml = () => {
    const customers = data?.customers || [];
    
    const tableRows = customers
      .map((customer: any, index: number) => {
        const uniqueVehicles = getUniqueVehicles(customer.vehicles);
        const vehicles = uniqueVehicles
          .map((v: any) => `${v.vehicleNumber} (${v.vehicleType})`)
          .join(', ') || 'None';
        
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${customer.name || 'N/A'}</td>
            <td>${customer.mobile}</td>
            <td>${customer.email || 'N/A'}</td>
            <td>${customer.dateOfBirth || 'N/A'}</td>
            <td>${customer.address || 'N/A'}</td>
            <td>${customer.city || 'N/A'}</td>
            <td>${customer.pinCode || 'N/A'}</td>
            <td>${formatDate(customer.createdAt)}</td>
            <td>${vehicles}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            h1 {
              text-align: center;
              color: #4F46E5;
              margin-bottom: 10px;
            }
            .subtitle {
              text-align: center;
              color: #666;
              margin-bottom: 20px;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
              font-size: 12px;
            }
            th {
              background-color: #4F46E5;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <h1>Customer Management Report</h1>
          <div class="subtitle">
            Generated on ${new Date().toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div class="subtitle">Total Customers: ${customers.length}</div>
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>DOB</th>
                <th>Address</th>
                <th>City</th>
                <th>Pin Code</th>
                <th>Registered On</th>
                <th>Vehicles</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <div class="footer">
            <p>R.D CLEAN & SHINE CARWASH - Customer Management System</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPdf = async () => {
    try {
      setExporting(true);
      const html = generatePdfHtml();
      
      const { uri } = await Print.printToFileAsync({ html });
      
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Customer Report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Success', `PDF saved to: ${uri}`);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to export PDF: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
  }

  const customers = data?.customers || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Manage Users</Text>
          <Text style={styles.headerSubtitle}>
            Total Customers: {customers.length}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            <Text style={styles.refreshButtonText}>
              {refreshing ? '↻' : '⟳'} Refresh
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={handleExportPdf}
            disabled={exporting || customers.length === 0}
          >
            <Text style={styles.exportButtonText}>
              {exporting ? 'Exporting...' : '📄 Export PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={true}
        style={styles.scrollContainer}
      >
        <ScrollView 
          showsVerticalScrollIndicator={true}
          style={styles.verticalScroll}
        >
          <View style={[styles.table, { minWidth: Math.max(width, 1400) }]}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.headerCell, styles.idColumn]}>S.No</Text>
              <Text style={[styles.headerCell, styles.nameColumn]}>Name</Text>
              <Text style={[styles.headerCell, styles.phoneColumn]}>Phone</Text>
              <Text style={[styles.headerCell, styles.emailColumn]}>Email</Text>
              <Text style={[styles.headerCell, styles.dobColumn]}>DOB</Text>
              <Text style={[styles.headerCell, styles.addressColumn]}>Address</Text>
              <Text style={[styles.headerCell, styles.cityColumn]}>City</Text>
              <Text style={[styles.headerCell, styles.pinColumn]}>Pin Code</Text>
              <Text style={[styles.headerCell, styles.dateColumn]}>Registered</Text>
              <Text style={[styles.headerCell, styles.vehiclesColumn]}>Vehicles</Text>
            </View>

            {/* Table Body */}
            {customers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No customers found</Text>
              </View>
            ) : (
              customers.map((customer: any, index: number) => (
                <View key={customer.id} style={styles.tableRow}>
                  <Text style={[styles.cell, styles.idColumn]}>{index + 1}</Text>
                  <Text style={[styles.cell, styles.nameColumn]}>
                    {customer.name || 'N/A'}
                  </Text>
                  <Text style={[styles.cell, styles.phoneColumn]}>
                    {customer.mobile}
                  </Text>
                  <Text style={[styles.cell, styles.emailColumn]}>
                    {customer.email || 'N/A'}
                  </Text>
                  <Text style={[styles.cell, styles.dobColumn]}>
                    {customer.dateOfBirth || 'N/A'}
                  </Text>
                  <Text style={[styles.cell, styles.addressColumn]}>
                    {customer.address || 'N/A'}
                  </Text>
                  <Text style={[styles.cell, styles.cityColumn]}>
                    {customer.city || 'N/A'}
                  </Text>
                  <Text style={[styles.cell, styles.pinColumn]}>
                    {customer.pinCode || 'N/A'}
                  </Text>
                  <Text style={[styles.cell, styles.dateColumn]}>
                    {formatDate(customer.createdAt)}
                  </Text>
                  <View style={[styles.cell, styles.vehiclesColumn]}>
                    {customer.vehicles.length === 0 ? (
                      <Text style={styles.noVehiclesText}>No vehicles</Text>
                    ) : (
                      getUniqueVehicles(customer.vehicles).map((vehicle: any) => (
                        <View key={vehicle.id} style={styles.vehicleItem}>
                          <Text style={styles.vehicleNumber}>
                            {vehicle.vehicleNumber}
                          </Text>
                          <Text style={styles.vehicleDetails}>
                            {vehicle.vehicleType}
                            {vehicle.carCategory ? ` - ${vehicle.carCategory}` : ''}
                            {vehicle.brand ? ` | ${vehicle.brand}` : ''}
                            {vehicle.model ? ` ${vehicle.model}` : ''}
                            {vehicle.color ? ` | ${vehicle.color}` : ''}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 12,
  },
  refreshButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
  exportButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  verticalScroll: {
    flex: 1,
  },
  table: {
    backgroundColor: '#FFF',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerCell: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#FFF',
  },
  cell: {
    fontSize: 13,
    color: '#1F2937',
    paddingHorizontal: 8,
  },
  idColumn: {
    width: 60,
  },
  nameColumn: {
    width: 150,
    fontWeight: '600',
  },
  phoneColumn: {
    width: 120,
  },
  emailColumn: {
    width: 180,
  },
  dobColumn: {
    width: 100,
  },
  addressColumn: {
    width: 200,
  },
  cityColumn: {
    width: 120,
  },
  pinColumn: {
    width: 80,
  },
  dateColumn: {
    width: 100,
  },
  vehiclesColumn: {
    flex: 1,
    minWidth: 250,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  noVehiclesText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  vehicleItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  vehicleNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 2,
  },
  vehicleDetails: {
    fontSize: 12,
    color: '#6B7280',
  },
});
