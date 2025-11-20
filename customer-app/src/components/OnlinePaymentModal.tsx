import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useMutation } from '@apollo/client';
import { CONFIRM_ONLINE_PAYMENT } from '../apollo/queries';

interface OnlinePaymentModalProps {
  visible: boolean;
  onClose: () => void;
  paymentId: string;
  amount: number;
  vehicleNumber: string;
  onPaymentSuccess: () => void;
}

export function OnlinePaymentModal({
  visible,
  onClose,
  paymentId,
  amount,
  vehicleNumber,
  onPaymentSuccess,
}: OnlinePaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [confirmPayment] = useMutation(CONFIRM_ONLINE_PAYMENT);

  const handleOnlinePayment = async () => {
    try {
      setLoading(true);

      // TODO: Integrate with Razorpay SDK
      // For now, simulate payment success
      // In production, use:
      // import { RazorpayCheckout } from 'react-native-razorpay';
      // const options = {
      //   description: `Payment for ${vehicleNumber}`,
      //   image: 'https://your-logo-url.png',
      //   currency: 'INR',
      //   key: 'YOUR_RAZORPAY_KEY',
      //   amount: amount * 100,
      //   name: 'Vehicle Wash',
      //   prefill: {
      //     email: 'customer@example.com',
      //     contact: 'customer mobile',
      //     name: 'customer name'
      //   }
      // };
      // const data = await RazorpayCheckout.open(options);

      // Simulate successful payment
      Alert.alert(
        'Payment Gateway',
        'This is a demo. In production, this would open Razorpay payment gateway.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setLoading(false),
          },
          {
            text: 'Simulate Success',
            onPress: async () => {
              try {
                // Simulate payment ID and signature
                const mockPaymentId = `pay_mock_${Date.now()}`;
                const mockSignature = `sig_mock_${Date.now()}`;

                await confirmPayment({
                  variables: {
                    paymentId,
                    razorpayPaymentId: mockPaymentId,
                    razorpaySignature: mockSignature,
                  },
                });

                Alert.alert('Success', 'Payment completed successfully!', [
                  {
                    text: 'OK',
                    onPress: () => {
                      onPaymentSuccess();
                      onClose();
                    },
                  },
                ]);
              } catch (error: any) {
                console.error('Payment confirmation error:', error);
                Alert.alert('Error', error.message || 'Payment verification failed');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Error', error.message || 'Payment failed');
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
          <Text style={styles.title}>Online Payment</Text>
          <Text style={styles.vehicleNumber}>{vehicleNumber}</Text>
          <Text style={styles.amount}>₹{amount}</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              💳 Pay securely using Debit/Credit Card, UPI, Net Banking, or Wallets
            </Text>
          </View>

          <TouchableOpacity
            style={styles.payButton}
            onPress={handleOnlinePayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payButtonText}>Proceed to Pay</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
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
    marginBottom: 16,
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: '#EDE9FE',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#5B21B6',
    textAlign: 'center',
    lineHeight: 20,
  },
  payButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  payButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  cancelButton: {
    paddingVertical: 12,
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
});
