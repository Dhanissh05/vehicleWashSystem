import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  ESTIMATIONS,
  CREATE_ESTIMATION,
  DELETE_ESTIMATION,
} from '../apollo/queries';
import toast from 'react-hot-toast';
import {
  Plus,
  FileText,
  Trash2,
  Eye,
  Download,
  Share2,
  Filter,
  Search,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function EstimationsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data, loading, refetch } = useQuery(ESTIMATIONS, {
    variables: { status: statusFilter, limit: 50, offset: 0 },
  });

  const [deleteEstimation] = useMutation(DELETE_ESTIMATION);

  const handleDelete = async (id: string, estimationNumber: string) => {
    if (!confirm(`Are you sure you want to delete estimation ${estimationNumber}?`)) {
      return;
    }

    try {
      await deleteEstimation({ variables: { id } });
      toast.success('Estimation deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete estimation');
    }
  };

  const handleExportPDF = (id: string, estimationNumber: string) => {
    const url = `${API_URL}/api/estimations/${id}/export/pdf`;
    window.open(url, '_blank');
  };

  const handleExportExcel = (id: string, estimationNumber: string) => {
    const url = `${API_URL}/api/estimations/${id}/export/csv`;
    window.open(url, '_blank');
  };

  const handlePreview = (id: string) => {
    const url = `${API_URL}/api/estimations/${id}/preview`;
    window.open(url, '_blank');
  };

  const handleShare = async (id: string, estimationNumber: string) => {
    const url = `${API_URL}/api/estimations/${id}/preview`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Estimation ${estimationNumber}`,
          text: `View estimation ${estimationNumber}`,
          url: url,
        });
        toast.success('Shared successfully');
      } catch (error) {
        // User cancelled or error occurred
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
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
        return 'bg-gray-100 text-gray-800';
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Estimations</h1>
          <p className="text-gray-500 mt-1">
            Manage service estimates and quotations
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/estimations/new')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus size={20} />
          New Estimation
        </motion.button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by number, customer name, mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={statusFilter || ''}
              onChange={(e) =>
                setStatusFilter(e.target.value || null)
              }
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estimations List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Est. Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEstimations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <FileText
                      className="mx-auto text-gray-400 mb-2"
                      size={48}
                    />
                    <p className="text-gray-500">No estimations found</p>
                    <button
                      onClick={() => navigate('/estimations/new')}
                      className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Create your first estimation
                    </button>
                  </td>
                </tr>
              ) : (
                filteredEstimations.map((estimation: any) => (
                  <tr
                    key={estimation.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="text-primary-600 mr-2" size={16} />
                        <span className="font-medium text-gray-900">
                          {estimation.estimationNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {estimation.customerName}
                        </div>
                        <div className="text-gray-500">
                          {estimation.customerMobile}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {estimation.vehicleNumber ? (
                          <>
                            <div className="font-medium text-gray-900">
                              {estimation.vehicleNumber}
                            </div>
                            <div className="text-gray-500">
                              {estimation.vehicleType}
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-bold text-gray-900">
                        ₹{estimation.totalAmount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                          estimation.status
                        )}`}
                      >
                        {estimation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(estimation.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/estimations/${estimation.id}`)}
                          className="text-primary-600 hover:text-primary-900"
                          title="View/Edit"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handlePreview(estimation.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Preview"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() =>
                            handleExportPDF(estimation.id, estimation.estimationNumber)
                          }
                          className="text-green-600 hover:text-green-900"
                          title="Export PDF"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() =>
                            handleShare(estimation.id, estimation.estimationNumber)
                          }
                          className="text-purple-600 hover:text-purple-900"
                          title="Share"
                        >
                          <Share2 size={18} />
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(estimation.id, estimation.estimationNumber)
                          }
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
