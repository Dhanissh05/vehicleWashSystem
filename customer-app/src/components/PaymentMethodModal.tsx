import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMutation } from '@apollo/client';
import { CREATE_PAYMENT } from '../apollo/queries';

interface PaymentMethodModalProps {
  visible: boolean;
  onClose: () => void;
  vehicleId: string;
  amount: number;
  onPaymentInitiated: (paymentId: string, method: string) => void;
}

export function PaymentMethodModal({
  visible,
  onClose,
  vehicleId,
  amount,
  onPaymentInitiated,
}: PaymentMethodModalProps) {
  const [loading, setLoading] = useState(false);
  const [createPayment] = useMutation(CREATE_PAYMENT);

  const handlePaymentMethod = async (method: 'ONLINE' | 'CASH' | 'GPAY') => {
    try {
      setLoading(true);

      const { data } = await createPayment({
        variables: {
          input: {
            vehicleId,
            method,
            expectedAmount: amount,
          },
        },
      });

      if (data?.createPayment) {
        onPaymentInitiated(data.createPayment.id, method);
        onClose();
      }
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      Alert.alert('Error', error.message || 'Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Vehicle Ready for Pickup! 🎉</Text>
          <Text style={styles.subtitle}>
            Please choose your payment method
          </Text>
          <Text style={styles.amount}>₹{amount}</Text>

          <View style={styles.methodsContainer}>
            <TouchableOpacity
              style={styles.methodButton}
              onPress={() => handlePaymentMethod('ONLINE')}
              disabled={loading}
            >
              <View style={styles.methodIcon}>
                <Text style={styles.methodIconText}>💳</Text>
              </View>
              <Text style={styles.methodTitle}>Online Payment</Text>
              <Text style={styles.methodSubtitle}>
                Debit/Credit Card, UPI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.methodButton}
              onPress={() => handlePaymentMethod('GPAY')}
              disabled={loading}
            >
              <View style={styles.methodIcon}>
                <Text style={styles.methodIconText}>📱</Text>
              </View>
              <Text style={styles.methodTitle}>GPay / PhonePe</Text>
              <Text style={styles.methodSubtitle}>
                Pay via UPI apps
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.methodButton}
              onPress={() => handlePaymentMethod('CASH')}
              disabled={loading}
            >
              <View style={styles.methodIcon}>
                <Text style={styles.methodIconText}>💵</Text>
              </View>
              <Text style={styles.methodTitle}>Cash</Text>
              <Text style={styles.methodSubtitle}>
                Pay at the counter
              </Text>
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 24,
  },
  methodsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  methodButton: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  methodIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  methodIconText: {
    fontSize: 32,
  },
  methodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  methodSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 16,
  },
});
