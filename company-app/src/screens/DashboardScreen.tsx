import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import MenuModal from '../components/MenuModal';
import VehicleListModal from '../components/VehicleListModal';
import CalendarIcon from '../components/CalendarIcon';

const DASHBOARD_METRICS = gql`
  query DashboardMetrics {
    dashboardMetrics {
      totalWashesToday
      totalWashesInRange
      carWashesCount
      twoWheelerWashesCount
      totalPaymentsReceived
      activeWorkers
      pendingManualPayments
    }
    vehicleStats {
      received
      washing
      readyForPickup
      delivered
    }
  }
`;

export default function DashboardScreen({ navigation }: any) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [vehicleListFilter, setVehicleListFilter] = useState<{
    status?: string;
    vehicleType?: string;
    title: string;
  } | null>(null);

  const { data, loading, refetch, error } = useQuery(DASHBOARD_METRICS, {
    pollInterval: error ? 0 : 60000, // Stop polling if there's an error
    errorPolicy: 'ignore',
    fetchPolicy: 'cache-and-network',
  });

  const metrics = data?.dashboardMetrics;
  const stats = data?.vehicleStats;

  const StatCard = ({ title, value, color, icon, onPress }: any) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={styles.statIcon}>{icon}</Text>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Menu Modal */}
      <MenuModal 
        visible={menuVisible} 
        onClose={() => setMenuVisible(false)} 
        navigation={navigation}
      />

      {/* Vehicle List Modal */}
      <VehicleListModal
        visible={!!vehicleListFilter}
        onClose={() => setVehicleListFilter(null)}
        filter={vehicleListFilter}
      />

      {/* Header with Menu Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.menuButton} />
      </View>

      <View style={styles.header}>
        <Text style={styles.subtitle}>Overview of today's operations</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Today's Metrics</Text>
        
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Washes"
            value={metrics?.totalWashesToday || 0}
            color="#3B82F6"
            icon="🚗"
            onPress={() => setVehicleListFilter({ title: 'All Vehicles Today' })}
          />
          <StatCard
            title="Cars"
            value={metrics?.carWashesCount || 0}
            color="#10B981"
            icon="🚙"
            onPress={() => setVehicleListFilter({ vehicleType: 'CAR', title: 'Car Washes' })}
          />
          <StatCard
            title="Two Wheelers"
            value={metrics?.twoWheelerWashesCount || 0}
            color="#F59E0B"
            icon="🏍️"
            onPress={() => setVehicleListFilter({ vehicleType: 'TWO_WHEELER', title: 'Two-Wheeler Washes' })}
          />
          <StatCard
            title="Revenue"
            value={`₹${metrics?.totalPaymentsReceived || 0}`}
            color="#8B5CF6"
            icon="💰"
          />
        </View>

        <Text style={styles.sectionTitle}>Status Overview</Text>
        
        <View style={styles.statsGrid}>
          <StatCard
            title="Received"
            value={stats?.received || 0}
            color="#3B82F6"
            icon="📥"
            onPress={() => setVehicleListFilter({ status: 'RECEIVED', title: 'Received Vehicles' })}
          />
          <StatCard
            title="Washing"
            value={stats?.washing || 0}
            color="#F59E0B"
            icon="🧼"
            onPress={() => setVehicleListFilter({ status: 'WASHING', title: 'Washing Vehicles' })}
          />
          <StatCard
            title="Ready"
            value={stats?.readyForPickup || 0}
            color="#10B981"
            icon="✅"
            onPress={() => setVehicleListFilter({ status: 'READY_FOR_PICKUP', title: 'Ready for Pickup' })}
          />
          <StatCard
            title="Delivered"
            value={stats?.delivered || 0}
            color="#6B7280"
            icon="🎉"
            onPress={() => setVehicleListFilter({ status: 'DELIVERED', title: 'Delivered Vehicles' })}
          />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('AddVehicle')}
        >
          <Text style={styles.actionIcon}>🚗</Text>
          <Text style={styles.actionText}>Entry Vehicle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('WashCycle')}
        >
          <Text style={styles.actionIcon}>🔄</Text>
          <Text style={styles.actionText}>Wash Cycle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('BodyRepairCycle')}
        >
          <Text style={styles.actionIcon}>🔧</Text>
          <Text style={styles.actionText}>Body Repair & Painting</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('SlotBookings')}
        >
          <View style={styles.actionIcon}>
            <CalendarIcon size={32} />
          </View>
          <Text style={styles.actionText}>Slot Bookings</Text>
        </TouchableOpacity>

        {/* Removed other actions until screens are created */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#8B5CF6',
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  header: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#8B5CF6',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#E9D5FF',
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
});
