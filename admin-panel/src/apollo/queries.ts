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

// Estimation Queries
export const ESTIMATIONS = gql`
  query Estimations($status: EstimationStatus, $limit: Int, $offset: Int) {
    estimations(status: $status, limit: $limit, offset: $offset) {
      id
      estimationNumber
      customerName
      customerMobile
      vehicleNumber
      vehicleType
      preparedByName
      preparedByRole
      status
      totalAmount
      validUntil
      createdAt
      updatedAt
      items {
        id
        serviceName
        description
        quantity
        unitPrice
        totalPrice
      }
      center {
        name
        address
        mobile
        email
        logoUrl
      }
    }
  }
`;

export const ESTIMATION = gql`
  query Estimation($id: ID!) {
    estimation(id: $id) {
      id
      estimationNumber
      customerName
      customerMobile
      vehicleNumber
      vehicleType
      preparedByName
      preparedByRole
      termsAndConditions
      notes
      status
      totalAmount
      validUntil
      createdAt
      updatedAt
      items {
        id
        serviceName
        description
        quantity
        unitPrice
        totalPrice
      }
      center {
        name
        address
        mobile
        email
        logoUrl
      }
    }
  }
`;

export const CREATE_ESTIMATION = gql`
  mutation CreateEstimation($input: CreateEstimationInput!) {
    createEstimation(input: $input) {
      id
      estimationNumber
      customerName
      customerMobile
      vehicleNumber
      vehicleType
      status
      totalAmount
      createdAt
    }
  }
`;

export const UPDATE_ESTIMATION = gql`
  mutation UpdateEstimation($id: ID!, $input: UpdateEstimationInput!) {
    updateEstimation(id: $id, input: $input) {
      id
      estimationNumber
      customerName
      customerMobile
      vehicleNumber
      vehicleType
      termsAndConditions
      notes
      status
      totalAmount
      validUntil
      updatedAt
    }
  }
`;

export const DELETE_ESTIMATION = gql`
  mutation DeleteEstimation($id: ID!) {
    deleteEstimation(id: $id)
  }
`;

export const ADD_ESTIMATION_ITEM = gql`
  mutation AddEstimationItem($input: AddEstimationItemInput!) {
    addEstimationItem(input: $input) {
      id
      serviceName
      description
      quantity
      unitPrice
      totalPrice
    }
  }
`;

export const UPDATE_ESTIMATION_ITEM = gql`
  mutation UpdateEstimationItem($id: ID!, $input: UpdateEstimationItemInput!) {
    updateEstimationItem(id: $id, input: $input) {
      id
      serviceName
      description
      quantity
      unitPrice
      totalPrice
    }
  }
`;

export const DELETE_ESTIMATION_ITEM = gql`
  mutation DeleteEstimationItem($id: ID!) {
    deleteEstimationItem(id: $id)
  }
`;

export const GET_SYSTEM_CONFIG = gql`
  query GetSystemConfig($key: String!) {
    systemConfig(key: $key) {
      id
      key
      value
      description
      updatedAt
    }
  }
`;

export const UPDATE_SYSTEM_CONFIG = gql`
  mutation UpdateSystemConfig($key: String!, $value: String!) {
    updateSystemConfig(key: $key, value: $value) {
      id
      key
      value
      description
      updatedAt
    }
  }
`;
