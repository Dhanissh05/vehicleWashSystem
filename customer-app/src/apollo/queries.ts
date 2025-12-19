import { gql } from '@apollo/client';

export const CHECK_USER_EXISTS = gql`
  query CheckUserExists($mobile: String!) {
    checkUserExists(mobile: $mobile)
  }
`;

export const SEND_OTP = gql`
  mutation SendOtp($mobile: String!) {
    sendOtp(mobile: $mobile)
  }
`;

export const VERIFY_OTP = gql`
  mutation VerifyOtp($mobile: String!, $code: String!) {
    verifyOtp(mobile: $mobile, code: $code) {
      token
      user {
        id
        mobile
        name
        email
        role
      }
    }
  }
`;

export const UPDATE_PASSWORD = gql`
  mutation UpdatePassword($mobile: String!, $password: String!) {
    updatePassword(mobile: $mobile, password: $password) {
      id
      mobile
      name
      email
    }
  }
`;

export const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      mobile
      name
      email
    }
  }
`;

export const UPDATE_LOCATION = gql`
  mutation UpdateLocation($location: LocationInput!) {
    updateLocation(location: $location) {
      id
      latitude
      longitude
    }
  }
`;

export const UPDATE_FCM_TOKEN = gql`
  mutation UpdateFcmToken($token: String!) {
    updateFcmToken(token: $token) {
      id
    }
  }
`;

export const SIGNUP = gql`
  mutation Signup($input: SignupInput!) {
    signup(input: $input) {
      token
      user {
        id
        mobile
        name
        email
        role
      }
    }
  }
`;

export const SETUP_BIOMETRIC = gql`
  mutation SetupBiometric($input: BiometricSetupInput!) {
    setupBiometric(input: $input) {
      id
      biometricEnabled
    }
  }
`;

export const ADD_VEHICLE = gql`
  mutation AddVehicle($input: AddVehicleInput!) {
    addVehicle(input: $input) {
      id
      vehicleNumber
      vehicleType
      carCategory
      brand
      model
      color
      status
      customer {
        name
        mobile
      }
    }
  }
`;

export const MY_VEHICLES = gql`
  query MyVehicles {
    myVehicles {
      id
      vehicleNumber
      vehicleType
      carCategory
      model
      brand
      color
      serviceType
      status
      createdAt
      receivedAt
      washingAt
      readyAt
      deliveredAt
      bodyRepairAssessmentAt
      bodyRepairInProgressAt
      bodyRepairPaintingAt
      bodyRepairCompleteAt
      notes
      worker {
        id
        name
        mobile
      }
      payment {
        id
        amount
        status
        method
        paymentMode
        transactionId
        createdAt
      }
    }
  }
`;

export const ME = gql`
  query Me {
    me {
      id
      mobile
      name
      email
      role
      latitude
      longitude
    }
  }
`;

export const CENTERS = gql`
  query Centers {
    centers {
      id
      name
      address
      latitude
      longitude
      mobile
      email
      logoUrl
      dailySlotsTwoWheeler
      availableSlotsTwoWheeler
      dailySlotsCar
      availableSlotsCar
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
    }
  }
`;

export const VEHICLE_BY_ID = gql`
  query VehicleById($id: ID!) {
    vehicleById(id: $id) {
      id
      vehicleNumber
      vehicleType
      carCategory
      model
      brand
      color
      status
      receivedAt
      washingAt
      readyAt
      deliveredAt
      notes
      customer {
        id
        name
        mobile
      }
      worker {
        id
        name
        mobile
      }
      center {
        id
        name
        address
        logoUrl
      }
      payment {
        id
        amount
        status
        method
        paymentMode
        transactionId
        createdAt
      }
    }
  }
`;

export const CREATE_PAYMENT = gql`
  mutation CreatePayment($input: CreatePaymentInput!) {
    createPayment(input: $input) {
      id
      amount
      method
      paymentMode
      status
      createdAt
      vehicle {
        id
        vehicleNumber
      }
    }
  }
`;

export const CONFIRM_ONLINE_PAYMENT = gql`
  mutation ConfirmOnlinePayment(
    $paymentId: ID!
    $razorpayPaymentId: String!
    $razorpaySignature: String!
  ) {
    confirmOnlinePayment(
      paymentId: $paymentId
      razorpayPaymentId: $razorpayPaymentId
      razorpaySignature: $razorpaySignature
    ) {
      id
      status
    }
  }
`;

export const MY_PAYMENTS = gql`
  query MyPayments {
    myPayments {
      id
      amount
      method
      status
      createdAt
      vehicle {
        id
        vehicleNumber
        vehicleType
        brand
        model
      }
    }
  }
`;

export const CREATE_SLOT_BOOKING = gql`
  mutation CreateSlotBooking($input: CreateSlotBookingInput!) {
    createSlotBooking(input: $input) {
      id
      customerMobile
      customerName
      vehicleNumber
      vehicleType
      carCategory
      brand
      model
      color
      photoUrl
      carWash
      twoWheelerWash
      bodyRepair
      otp
      status
      createdAt
      center {
        id
        name
      }
    }
  }
`;

export const MY_SLOT_BOOKINGS = gql`
  query MySlotBookings {
    mySlotBookings {
      id
      customerMobile
      customerName
      vehicleNumber
      vehicleType
      carWash
      twoWheelerWash
      bodyRepair
      otp
      status
      rejectionReason
      createdAt
      center {
        name
        address
      }
    }
  }
`;

export const CANCEL_SLOT_BOOKING = gql`
  mutation CancelSlotBooking($bookingId: ID!) {
    cancelSlotBooking(bookingId: $bookingId) {
      id
      status
    }
  }
`;

export const SYSTEM_CONFIG = gql`
  query SystemConfig($key: String!) {
    systemConfig(key: $key) {
      key
      value
    }
  }
`;
