import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import {
  ESTIMATION,
  CREATE_ESTIMATION,
  UPDATE_ESTIMATION,
  ADD_ESTIMATION_ITEM,
  UPDATE_ESTIMATION_ITEM,
  DELETE_ESTIMATION_ITEM,
} from '../apollo/queries';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Download,
  Share2,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface EstimationItem {
  id?: string;
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export default function EstimationFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
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
        toast.success('Item removed');
      } catch (error: any) {
        toast.error(error.message || 'Failed to remove item');
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
      toast.error('Please fill in customer details');
      return;
    }

    if (items.length === 0) {
      toast.error('Please add at least one item');
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

        toast.success('Estimation updated successfully');
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

        toast.success('Estimation created successfully');
        navigate(`/estimations/${estimationId}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save estimation');
    }
  };

  const handleExportPDF = () => {
    if (isEdit) {
      const url = `${API_URL}/api/estimations/${id}/export/pdf`;
      window.open(url, '_blank');
    } else {
      toast.error('Please save the estimation first');
    }
  };

  const handleExportExcel = () => {
    if (isEdit) {
      const url = `${API_URL}/api/estimations/${id}/export/csv`;
      window.open(url, '_blank');
    } else {
      toast.error('Please save the estimation first');
    }
  };

  const handlePreview = () => {
    if (isEdit) {
      const url = `${API_URL}/api/estimations/${id}/preview`;
      window.open(url, '_blank');
    } else {
      toast.error('Please save the estimation first');
    }
  };

  const handleShare = async () => {
    if (!isEdit) {
      toast.error('Please save the estimation first');
      return;
    }

    const url = `${API_URL}/api/estimations/${id}/preview`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Estimation ${data?.estimation?.estimationNumber}`,
          text: `View estimation`,
          url: url,
        });
        toast.success('Shared successfully');
      } catch (error) {
        navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
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
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/estimations')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? 'Edit Estimation' : 'New Estimation'}
            </h1>
            {isEdit && data?.estimation && (
              <p className="text-gray-500 mt-1">
                {data.estimation.estimationNumber}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEdit && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handlePreview}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Eye size={18} />
                Preview
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExportPDF}
                className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 flex items-center gap-2"
              >
                <Download size={18} />
                PDF
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExportExcel}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-md hover:bg-emerald-700 flex items-center gap-2"
              >
                <FileSpreadsheet size={18} />
                Excel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleShare}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow-md hover:bg-purple-700 flex items-center gap-2"
              >
                <Share2 size={18} />
                Share
              </motion.button>
            </>
          )}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            disabled={creating || updating}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {creating || updating ? 'Saving...' : 'Save'}
          </motion.button>
        </div>
      </div>

      {/* Customer Details */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer Name *
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter customer name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number *
            </label>
            <input
              type="tel"
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Enter mobile number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Number
            </label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., TN01AB1234"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Type
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select vehicle type</option>
              <option value="CAR">Car</option>
              <option value="TWO_WHEELER">Two Wheeler</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Valid Until
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Services / Items</h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddItem}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg shadow-md hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus size={18} />
            Add Item
          </motion.button>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-4 p-4 border border-gray-200 rounded-lg"
            >
              <div className="col-span-12 md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={item.serviceName}
                  onChange={(e) =>
                    handleUpdateItem(index, 'serviceName', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Body Repair, Painting"
                />
              </div>
              <div className="col-span-12 md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) =>
                    handleUpdateItem(index, 'description', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Additional details"
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Qty *
                </label>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  min="1"
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price *
                </label>
                <input
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) =>
                    handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="col-span-3 md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-lg font-bold">
                  ₹{item.totalPrice.toFixed(2)}
                </div>
              </div>
              <div className="col-span-1 md:col-span-1 flex items-end">
                <button
                  onClick={() => handleRemoveItem(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}

          {items.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No items added yet</p>
              <button
                onClick={handleAddItem}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
              >
                Add your first item
              </button>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-6 flex justify-end">
            <div className="bg-primary-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Amount</div>
              <div className="text-3xl font-bold text-primary-600">
                ₹{calculateTotal().toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Terms & Conditions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Terms & Conditions
        </h2>
        <textarea
          value={termsAndConditions}
          onChange={(e) => setTermsAndConditions(e.target.value)}
          rows={6}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Enter terms and conditions"
        />
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Additional notes or instructions"
        />
      </div>
    </div>
  );
}
