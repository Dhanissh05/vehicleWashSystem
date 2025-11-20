import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMutation, gql } from '@apollo/client';

const CONFIRM_MANUAL_PAYMENT = gql`
  mutation ConfirmManualPayment($input: ConfirmManualPaymentInput!) {
    confirmManualPayment(input: $input) {
      id
      status
      amount
    }
  }
`;

interface ManualPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  payment: {
    id: string;
    amount: number;
    method: string;
  };
  vehicleNumber: string;
  onPaymentConfirmed: () => void;
}

export function ManualPaymentModal({
  visible,
  onClose,
  payment,
  vehicleNumber,
  onPaymentConfirmed,
}: ManualPaymentModalProps) {
  const [amount, setAmount] = useState(payment.amount.toString());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmPayment] = useMutation(CONFIRM_MANUAL_PAYMENT);

  const handleConfirmPayment = async () => {
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);

      await confirmPayment({
        variables: {
          input: {
            paymentId: payment.id,
            amount: amountNum,
            notes,
          },
        },
      });

      Alert.alert('Success', 'Payment confirmed successfully!', [
        {
          text: 'OK',
          onPress: () => {
            onPaymentConfirmed();
            onClose();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Payment confirmation error:', error);
      Alert.alert('Error', error.message || 'Failed to confirm payment');
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
          <Text style={styles.title}>Confirm Payment</Text>
          <Text style={styles.vehicleNumber}>{vehicleNumber}</Text>

          <View style={styles.paymentInfo}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.method}>{payment.method}</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Amount Received (₹)</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="Enter amount"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes..."
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmPayment}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Payment</Text>
              )}
            </TouchableOpacity>
          </View>
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
  vehicleNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  paymentInfo: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  method: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
