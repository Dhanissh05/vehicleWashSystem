import { gql } from '@apollo/client';

export const LOGIN = gql`
  mutation Login($mobile: String!, $password: String!) {
    login(mobile: $mobile, password: $password) {
      token
      user {
        id
        mobile
        name
        role
      }
    }
  }
`;

export const DASHBOARD_METRICS = gql`
  query DashboardMetrics($startDate: DateTime, $endDate: DateTime) {
    dashboardMetrics(startDate: $startDate, endDate: $endDate) {
      totalWashesToday
      totalWashesInRange
      carWashesCount
      twoWheelerWashesCount
      totalPaymentsReceived
      activeWorkers
      pendingManualPayments
      recentVehicles {
        id
        vehicleNumber
        vehicleType
        status
        receivedAt
        customer {
          name
          mobile
        }
        payment {
          amount
          status
        }
      }
    }
    vehicleStats {
      received
      washing
      readyForPickup
      delivered
    }
  }
`;

export const VEHICLES = gql`
  query Vehicles($status: VehicleStatus, $limit: Int, $offset: Int) {
    vehicles(status: $status, limit: $limit, offset: $offset) {
      id
      vehicleNumber
      vehicleType
      carCategory
      model
      brand
      color
      status
      receivedAt
      customer {
        id
        name
        mobile
      }
      worker {
        id
        name
      }
      payment {
        id
        amount
        status
        method
      }
    }
  }
`;

export const UPDATE_VEHICLE_STATUS = gql`
  mutation UpdateVehicleStatus($input: UpdateVehicleStatusInput!) {
    updateVehicleStatus(input: $input) {
      id
      status
      washingAt
      readyAt
      deliveredAt
    }
  }
`;

export const WORKERS = gql`
  query Workers {
    workers {
      id
      name
      mobile
      email
      isActive
      createdAt
    }
  }
`;

export const CREATE_WORKER = gql`
  mutation CreateWorker($input: CreateWorkerInput!) {
    createWorker(input: $input) {
      id
      name
      mobile
      role
    }
  }
`;

export const PRICING = gql`
  query Pricing {
    pricing {
      id
      vehicleType
      carCategory
      price
      description
      isActive
    }
  }
`;

export const UPDATE_PRICING = gql`
  mutation UpdatePricing($input: UpdatePricingInput!) {
    updatePricing(input: $input) {
      id
      vehicleType
      carCategory
      price
      description
    }
  }
`;

export const MANUAL_PENDING_PAYMENTS = gql`
  query ManualPendingPayments {
    manualPendingPayments {
      id
      amount
      method
      status
      transactionId
      upiId
      screenshotUrl
      notes
      createdAt
      vehicle {
        id
        vehicleNumber
      }
      customer {
        id
        name
        mobile
      }
    }
  }
`;

export const VERIFY_MANUAL_PAYMENT = gql`
  mutation VerifyManualPayment($input: VerifyManualPaymentInput!) {
    verifyManualPayment(input: $input) {
      id
      status
      verifiedBy
      verifiedAt
    }
  }
`;

export const CUSTOMERS = gql`
  query Customers($limit: Int, $offset: Int) {
    customers(limit: $limit, offset: $offset) {
      id
      name
      mobile
      email
      isActive
      createdAt
    }
  }
`;
