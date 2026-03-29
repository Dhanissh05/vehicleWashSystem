import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { gql, useQuery } from '@apollo/client';

export const MY_SUBSCRIPTION_STATUS = gql`
  query MySubscriptionStatus {
    mySubscriptionStatus {
      status
      startDate
      dueDate
      nextDueDate
      gracePeriodDays
      planType
      billingCycle
      amount
      subscriptionId
      currentPlan {
        id
        planName
        billingCycle
        price
      }
      invoices {
        id
        invoiceNumber
        amount
        status
        dueDate
        issuedAt
        paidAt
        createdAt
        pdfUrl
      }
    }
  }
`;

interface GuardProps {
  children: React.ReactNode;
  navigation: any;
  allowRestricted?: boolean;
  showOverdueBanner?: boolean;
}

export function SubscriptionGuard({
  children,
  navigation,
  allowRestricted = false,
  showOverdueBanner = true,
}: GuardProps) {
  const { data, loading, error, refetch } = useQuery(MY_SUBSCRIPTION_STATUS, {
    fetchPolicy: 'network-only',
    pollInterval: 30000,
    notifyOnNetworkStatusChange: true,
  });

  const status: string | undefined = data?.mySubscriptionStatus?.status;
  const isRestricted = status === 'EXPIRED' || status === 'LOCKED';
  const isOverdue = status === 'OVERDUE';

  // If query fails (e.g., intermittent network), avoid blocking navigation hard.
  if (error) {
    return <>{children}</>;
  }

  if (loading && !data) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Checking subscription status...</Text>
      </View>
    );
  }

  if (isRestricted && !allowRestricted) {
    return (
      <View style={styles.blockWrap}>
        <Text style={styles.blockTitle}>Access Restricted</Text>
        <Text style={styles.blockMessage}>
          Your plan has expired. Please make a payment to continue using services.
        </Text>
        <TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate('Subscription')}>
          <Text style={styles.ctaButtonText}>Make Payment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => refetch()}>
          <Text style={styles.secondaryButtonText}>Refresh Status</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isOverdue && showOverdueBanner && (
        <View style={styles.overdueBanner}>
          <Text style={styles.overdueTitle}>Subscription Overdue</Text>
          <Text style={styles.overdueText}>
            Your subscription is overdue. Please make payment immediately to avoid service suspension.
          </Text>
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function withSubscriptionGuard(
  Component: React.ComponentType<any>,
  options?: { allowRestricted?: boolean; showOverdueBanner?: boolean }
) {
  return function GuardedScreen(props: any) {
    return (
      <SubscriptionGuard
        navigation={props.navigation}
        allowRestricted={options?.allowRestricted}
        showOverdueBanner={options?.showOverdueBanner}
      >
        <Component {...props} />
      </SubscriptionGuard>
    );
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
  },
  overdueBanner: {
    backgroundColor: '#FFEDD5',
    borderBottomWidth: 1,
    borderBottomColor: '#FDBA74',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  overdueTitle: {
    color: '#9A3412',
    fontWeight: '700',
    fontSize: 13,
  },
  overdueText: {
    color: '#9A3412',
    fontSize: 12,
    marginTop: 2,
  },
  blockWrap: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  blockTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  blockMessage: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 22,
  },
  ctaButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 10,
    minWidth: 180,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#94A3B8',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  secondaryButtonText: {
    color: '#334155',
    fontWeight: '600',
  },
});
