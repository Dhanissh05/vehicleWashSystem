import { gql } from '@apollo/client';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const PLATFORM_LOGIN = gql`
  mutation PlatformLogin($mobile: String!, $password: String!) {
    platformLogin(mobile: $mobile, password: $password) {
      token
      user {
        id
        mobile
        name
        role
        isActive
      }
    }
  }
`;

// ─── Dashboard / Metrics ─────────────────────────────────────────────────────

export const PLATFORM_METRICS = gql`
  query PlatformMetrics {
    platformMetrics {
      totalCompanies
      activeCompanies
      lockedCompanies
      pendingApprovals
      totalRevenueAllTime
      overduePayments
      revenueThisMonth
      revenueLastMonth
      monthlyRevenue {
        month
        revenue
      }
      recentOverdueCompanies {
        id
        name
        status
        subscriptions {
          dueDate
          status
        }
      }
    }
  }
`;

// ─── Companies ───────────────────────────────────────────────────────────────

export const ALL_COMPANIES = gql`
  query AllCompanies($status: CompanyStatus, $search: String, $limit: Int, $offset: Int) {
    allCompanies(status: $status, search: $search, limit: $limit, offset: $offset) {
      id
      name
      address
      mobile
      email
      status
      isActive
      lockedAt
      rejectionReason
      createdAt
      updatedAt
      subscriptions {
        id
        planType
        billingCycle
        amount
        dueDate
        status
        gracePeriodDays
      }
      invoices {
        id
        amount
        status
        paidAt
        createdAt
      }
    }
  }
`;

export const COMPANY_DETAIL = gql`
  query CompanyDetail($id: ID!) {
    companyById(id: $id) {
      id
      name
      address
      mobile
      email
      slug
      logoUrl
      latitude
      longitude
      isActive
      status
      rejectionReason
      lockedAt
      createdAt
      updatedAt
      dailySlotsTwoWheeler
      availableSlotsTwoWheeler
      dailySlotsCar
      availableSlotsCar
    }
  }
`;

// ─── Subscriptions ───────────────────────────────────────────────────────────

export const COMPANY_SUBSCRIPTIONS = gql`
  query CompanySubscriptions($centerId: ID, $status: SubscriptionStatus, $limit: Int, $offset: Int) {
    companySubscriptions(centerId: $centerId, status: $status, limit: $limit, offset: $offset) {
      id
      centerId
      planId
      planType
      billingCycle
      amount
      startDate
      nextDueDate
      dueDate
      gracePeriodDays
      status
      lockedByAdmin
      createdAt
      updatedAt
      plan {
        id
        planName
        price
        billingCycle
        validityDays
        gracePeriodDays
        isActive
      }
      center {
        id
        name
        status
        mobile
        email
        address
        latitude
        longitude
        createdAt
      }
    }
  }
`;

export const SUBSCRIPTION_PLANS = gql`
  query SubscriptionPlans($includeInactive: Boolean) {
    subscriptionPlans(includeInactive: $includeInactive) {
      id
      planName
      price
      billingCycle
      validityDays
      gracePeriodDays
      isActive
      createdAt
      updatedAt
    }
  }
`;

// ─── Invoices ────────────────────────────────────────────────────────────────

export const COMPANY_INVOICES = gql`
  query CompanyInvoices($centerId: ID, $status: InvoiceStatus, $limit: Int, $offset: Int) {
    companyInvoices(centerId: $centerId, status: $status, limit: $limit, offset: $offset) {
      id
      centerId
      subscriptionId
      invoiceNumber
      amount
      dueDate
      issuedAt
      paidAt
      status
      pdfUrl
      createdAt
      center {
        id
        name
      }
      subscription {
        planType
        billingCycle
      }
    }
  }
`;

// ─── Reminders ───────────────────────────────────────────────────────────────

export const REMINDER_LOGS = gql`
  query ReminderLogs($centerId: ID!) {
    reminderLogs(centerId: $centerId) {
      id
      centerId
      type
      channel
      recipient
      message
      success
      sentAt
    }
  }
`;

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export const AUDIT_LOGS = gql`
  query AuditLogs($centerId: ID, $limit: Int, $offset: Int) {
    auditLogs(centerId: $centerId, limit: $limit, offset: $offset) {
      id
      centerId
      performedBy
      performerName
      performerRole
      action
      details
      createdAt
    }
  }
`;

// ─── Platform Users ──────────────────────────────────────────────────────────

export const PLATFORM_USERS = gql`
  query PlatformUsers {
    platformUsers {
      id
      mobile
      name
      role
      isActive
      createdAt
    }
  }
`;

// ─── Mutations: Company Management ───────────────────────────────────────────

export const UPDATE_COMPANY_STATUS = gql`
  mutation UpdateCompanyStatus($id: ID!, $status: CompanyStatus!, $reason: String) {
    updateCompanyStatus(centerId: $id, status: $status, reason: $reason) {
      id
      name
      status
      isActive
      lockedAt
      rejectionReason
    }
  }
`;

export const CREATE_COMPANY = gql`
  mutation CreateCompany($input: CreateCompanyInput!) {
    createCompany(input: $input) {
      id
      name
      address
      mobile
      email
      status
      createdAt
    }
  }
`;

// ─── Mutations: Subscriptions ─────────────────────────────────────────────────

export const CREATE_SUBSCRIPTION = gql`
  mutation CreateSubscription($centerId: ID!, $planId: ID!) {
    createSubscription(centerId: $centerId, planId: $planId) {
      id
      planType
      planId
      billingCycle
      amount
      startDate
      nextDueDate
      dueDate
      status
      gracePeriodDays
      centerId
      plan {
        id
        planName
        billingCycle
        price
      }
    }
  }
`;

export const CHANGE_COMPANY_PLAN = gql`
  mutation ChangeCompanyPlan($centerId: ID!, $planId: ID!) {
    changeCompanyPlan(centerId: $centerId, planId: $planId) {
      id
      planId
      planType
      billingCycle
      amount
      startDate
      nextDueDate
      dueDate
      gracePeriodDays
      status
      centerId
      plan {
        id
        planName
        billingCycle
        price
      }
    }
  }
`;

export const UPDATE_SUBSCRIPTION_STATUS = gql`
  mutation UpdateSubscriptionStatus($subscriptionId: ID!, $status: SubscriptionStatus!) {
    updateSubscriptionStatus(subscriptionId: $subscriptionId, status: $status) {
      id
      status
      centerId
    }
  }
`;

export const UPDATE_GRACE_PERIOD = gql`
  mutation UpdateGracePeriod($subscriptionId: ID!, $gracePeriodDays: Int!) {
    updateGracePeriod(subscriptionId: $subscriptionId, gracePeriodDays: $gracePeriodDays) {
      id
      gracePeriodDays
      status
    }
  }
`;

export const CREATE_SUBSCRIPTION_PLAN = gql`
  mutation CreateSubscriptionPlan($input: CreateSubscriptionPlanInput!) {
    createSubscriptionPlan(input: $input) {
      id
      planName
      price
      billingCycle
      validityDays
      gracePeriodDays
      isActive
    }
  }
`;

export const UPDATE_SUBSCRIPTION_PLAN = gql`
  mutation UpdateSubscriptionPlan($id: ID!, $input: UpdateSubscriptionPlanInput!) {
    updateSubscriptionPlan(id: $id, input: $input) {
      id
      planName
      price
      billingCycle
      validityDays
      gracePeriodDays
      isActive
    }
  }
`;

// ─── Mutations: Invoices ─────────────────────────────────────────────────────

export const RECORD_INVOICE_PAYMENT = gql`
  mutation RecordInvoicePayment($invoiceId: ID!) {
    recordInvoicePayment(invoiceId: $invoiceId) {
      id
      status
      paidAt
      amount
      centerId
    }
  }
`;

export const GENERATE_INVOICE_PDF = gql`
  mutation GenerateInvoicePdf($invoiceId: ID!) {
    generateInvoicePdf(invoiceId: $invoiceId)
  }
`;

// ─── Mutations: Reminders ─────────────────────────────────────────────────────

export const TRIGGER_REMINDER = gql`
  mutation TriggerReminder($centerId: ID!, $type: ReminderType!, $message: String) {
    triggerReminder(centerId: $centerId, type: $type, message: $message)
  }
`;

// ─── Mutations: Platform Users ────────────────────────────────────────────────

export const CREATE_PLATFORM_USER = gql`
  mutation CreatePlatformUser($mobile: String!, $name: String!, $password: String!, $role: UserRole!) {
    createPlatformUser(mobile: $mobile, name: $name, password: $password, role: $role) {
      id
      mobile
      name
      role
      isActive
      createdAt
    }
  }
`;
