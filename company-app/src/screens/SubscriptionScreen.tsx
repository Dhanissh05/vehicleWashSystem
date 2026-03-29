import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { gql, useMutation, useQuery } from '@apollo/client';
import { MY_SUBSCRIPTION_STATUS } from '../components/SubscriptionGuard';

const PAY_MY_SUBSCRIPTION = gql`
  mutation PayMySubscription($invoiceId: ID!) {
    payMySubscription(invoiceId: $invoiceId) {
      id
      status
      paidAt
      amount
      dueDate
      invoiceNumber
    }
  }
`;

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

export default function SubscriptionScreen() {
  const { data, loading, error, refetch } = useQuery(MY_SUBSCRIPTION_STATUS, {
    fetchPolicy: 'network-only',
    pollInterval: 30000,
  });

  const [payMySubscription, { loading: paying }] = useMutation(PAY_MY_SUBSCRIPTION, {
    onCompleted: () => {
      Alert.alert('Payment Success', 'Subscription payment completed successfully. Access restored.');
      refetch();
    },
    onError: (err) => {
      Alert.alert('Payment Failed', err.message || 'Failed to complete subscription payment');
    },
  });

  const payload = data?.mySubscriptionStatus;
  const invoices: any[] = payload?.invoices || [];
  const pendingInvoice = invoices.find((inv) => inv.status === 'PENDING' || inv.status === 'OVERDUE');
  const paidInvoices = invoices.filter((inv) => inv.status === 'PAID');

  if (loading && !payload) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Unable to load subscription</Text>
        <Text style={styles.errorText}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Subscription</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Current Plan</Text>
        <View style={styles.row}><Text style={styles.label}>Plan</Text><Text style={styles.value}>{payload?.currentPlan?.planName || payload?.planType || '-'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Billing Cycle</Text><Text style={styles.value}>{payload?.billingCycle || payload?.currentPlan?.billingCycle || '-'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Status</Text><Text style={[styles.value, styles.status]}>{payload?.status || '-'}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Start Date</Text><Text style={styles.value}>{formatDate(payload?.startDate)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Next Due Date</Text><Text style={styles.value}>{payload?.billingCycle === 'LIFETIME' ? 'No renewal' : formatDate(payload?.nextDueDate || payload?.dueDate)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Grace Period</Text><Text style={styles.value}>{payload?.gracePeriodDays ?? '-'} days</Text></View>
        <View style={styles.row}><Text style={styles.label}>Amount</Text><Text style={styles.value}>Rs. {payload?.amount ?? '-'}</Text></View>
        {payload?.billingCycle === 'LIFETIME' && (
          <Text style={styles.lifetimeNote}>Lifetime plans stay active with no renewal and no automatic downgrade.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment History</Text>
        {paidInvoices.length === 0 ? (
          <Text style={styles.muted}>No completed payments yet.</Text>
        ) : (
          paidInvoices.map((inv) => (
            <View key={inv.id} style={styles.invoiceRow}>
              <Text style={styles.invoiceNum}>{inv.invoiceNumber || inv.id.slice(0, 8)}</Text>
              <Text style={styles.invoiceMeta}>Paid • Rs. {inv.amount} • {formatDate(inv.paidAt)}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Invoice List</Text>
        {invoices.length === 0 ? (
          <Text style={styles.muted}>No invoices available.</Text>
        ) : (
          invoices.map((inv) => (
            <View key={inv.id} style={styles.invoiceRow}>
              <Text style={styles.invoiceNum}>{inv.invoiceNumber || inv.id.slice(0, 8)}</Text>
              <Text style={styles.invoiceMeta}>
                {inv.status} • Rs. {inv.amount} • Due {formatDate(inv.dueDate)}
              </Text>
            </View>
          ))
        )}
      </View>

      <TouchableOpacity
        style={[styles.ctaButton, (!pendingInvoice || paying) && styles.ctaDisabled]}
        disabled={!pendingInvoice || paying}
        onPress={() => {
          if (!pendingInvoice) {
            Alert.alert('No Pending Invoice', 'There is no pending invoice to pay.');
            return;
          }
          payMySubscription({ variables: { invoiceId: pendingInvoice.id } });
        }}
      >
        {paying ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.ctaText}>Make Payment</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 24 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginBottom: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#64748B', fontSize: 13 },
  value: { color: '#0F172A', fontWeight: '600', fontSize: 13 },
  status: { textTransform: 'uppercase' },
  muted: { color: '#94A3B8', fontSize: 13 },
  lifetimeNote: { color: '#166534', fontSize: 12, marginTop: 8, lineHeight: 18 },
  invoiceRow: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  invoiceNum: { fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  invoiceMeta: { color: '#475569', fontSize: 12 },
  ctaButton: {
    marginTop: 8,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  errorTitle: { fontWeight: '700', fontSize: 18, color: '#0F172A', marginBottom: 6 },
  errorText: { color: '#64748B', textAlign: 'center', marginBottom: 12 },
  retryButton: { borderWidth: 1, borderColor: '#2563EB', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  retryText: { color: '#2563EB', fontWeight: '700' },
});
