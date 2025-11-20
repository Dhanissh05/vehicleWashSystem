import React from 'react';
import { useQuery } from '@apollo/client';
import { DASHBOARD_METRICS } from '../apollo/queries';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Car, Bike, DollarSign, Users, AlertCircle, TrendingUp } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function Dashboard() {
  const { data, loading } = useQuery(DASHBOARD_METRICS, {
    pollInterval: 30000,
  });

  const metrics = data?.dashboardMetrics;
  const stats = data?.vehicleStats;

  const statsCards = [
    {
      title: 'Total Washes Today',
      value: metrics?.totalWashesToday || 0,
      icon: Car,
      color: 'from-blue-500 to-blue-600',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Revenue Collected',
      value: `₹${metrics?.totalPaymentsReceived || 0}`,
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      iconColor: 'text-green-500',
    },
    {
      title: 'Active Workers',
      value: metrics?.activeWorkers || 0,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      iconColor: 'text-purple-500',
    },
    {
      title: 'Pending Payments',
      value: metrics?.pendingManualPayments || 0,
      icon: AlertCircle,
      color: 'from-orange-500 to-orange-600',
      iconColor: 'text-orange-500',
    },
  ];

  const vehicleTypeData = [
    { name: 'Cars', value: metrics?.carWashesCount || 0 },
    { name: 'Two Wheelers', value: metrics?.twoWheelerWashesCount || 0 },
  ];

  const statusData = [
    { name: 'Received', value: stats?.received || 0, color: '#3B82F6' },
    { name: 'Washing', value: stats?.washing || 0, color: '#F59E0B' },
    { name: 'Ready', value: stats?.readyForPickup || 0, color: '#10B981' },
    { name: 'Delivered', value: stats?.delivered || 0, color: '#6B7280' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700"
        >
          <TrendingUp className="inline mr-2" size={18} />
          View Analytics
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">{stat.title}</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-full bg-gradient-to-br ${stat.color} bg-opacity-10`}>
                <stat.icon className={stat.iconColor} size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Type Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Type Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={vehicleTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {vehicleTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Status Overview */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Wash Status Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6">
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Recent Vehicles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Vehicles</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics?.recentVehicles?.slice(0, 5).map((vehicle: any) => (
                <tr key={vehicle.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">
                        {vehicle.vehicleType === 'CAR' ? '🚗' : '🏍️'}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {vehicle.vehicleNumber}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {vehicle.customer?.name || vehicle.customer?.mobile}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        vehicle.status === 'DELIVERED'
                          ? 'bg-gray-100 text-gray-800'
                          : vehicle.status === 'READY_FOR_PICKUP'
                          ? 'bg-green-100 text-green-800'
                          : vehicle.status === 'WASHING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {vehicle.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {vehicle.payment ? (
                      <span className="text-sm font-medium text-gray-900">
                        ₹{vehicle.payment.amount}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(vehicle.receivedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
