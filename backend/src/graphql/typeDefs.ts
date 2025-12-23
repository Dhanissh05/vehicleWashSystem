import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime

  enum UserRole {
    ADMIN
    WORKER
    CUSTOMER
  }

  enum VehicleType {
    CAR
    TWO_WHEELER
  }

  enum CarCategory {
    SEDAN
    SUV
    HATCHBACK
    HYBRID
  }

  enum ServiceType {
    WASH
    BODY_REPAIR
  }

  enum VehicleStatus {
    REGISTERED
    RECEIVED
    WASHING
    READY_FOR_PICKUP
    DELIVERED
    BODY_REPAIR_ASSESSMENT
    BODY_REPAIR_IN_PROGRESS
    BODY_REPAIR_PAINTING
    BODY_REPAIR_COMPLETE
  }

  enum PaymentMethod {
    ONLINE
    CASH
    GPAY
    UPI
  }

  enum PaymentMode {
    GATEWAY
    MANUAL
  }

  enum PaymentStatus {
    PENDING
    PAID
    MANUAL_PENDING
    REJECTED
    REFUNDED
  }

  enum SlotBookingStatus {
    PENDING
    VERIFIED
    CANCELLED
    REJECTED
  }

  enum SlotServiceStatus {
    BOOKED
    STARTED
    IN_PROGRESS
    COMPLETED
    CANCELLED
  }

  enum SlotServiceType {
    CAR_WASH
    TWO_WHEELER_WASH
    BODY_REPAIR
  }

  type User {
    id: ID!
    mobile: String!
    name: String
    email: String
    dateOfBirth: String
    address: String
    city: String
    pinCode: String
    role: UserRole!
    isActive: Boolean!
    latitude: Float
    longitude: Float
    workerCode: String
    photoUrl: String
    biometricEnabled: Boolean!
    createdAt: DateTime!
    vehicles: [Vehicle!]
    assignedVehicles: [Vehicle!]
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Vehicle {
    id: ID!
    vehicleNumber: String!
    vehicleType: VehicleType!
    carCategory: CarCategory
    model: String
    brand: String
    color: String
    photoUrl: String
    serviceType: ServiceType!
    status: VehicleStatus!
    receivedAt: DateTime
    washingAt: DateTime
    readyAt: DateTime
    deliveredAt: DateTime
    bodyRepairAssessmentAt: DateTime
    bodyRepairInProgressAt: DateTime
    bodyRepairPaintingAt: DateTime
    bodyRepairCompleteAt: DateTime
    notes: String
    customer: User!
    worker: User
    payment: Payment
    washCount: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Payment {
    id: ID!
    amount: Float!
    method: PaymentMethod!
    paymentMode: PaymentMode
    status: PaymentStatus!
    transactionId: String
    razorpayOrderId: String
    razorpayPaymentId: String
    razorpaySignature: String
    upiId: String
    screenshotUrl: String
    verifiedBy: String
    verifiedAt: DateTime
    notes: String
    vehicle: Vehicle!
    customer: User!
    createdAt: DateTime!
  }

  type Pricing {
    id: ID!
    vehicleType: VehicleType!
    carCategory: CarCategory
    price: Float!
    description: String
    isActive: Boolean!
    createdAt: DateTime!
  }

  type Center {
    id: ID!
    name: String!
    address: String!
    latitude: Float!
    longitude: Float!
    mobile: String!
    email: String
    logoUrl: String
    dailySlotsTwoWheeler: Int!
    availableSlotsTwoWheeler: Int!
    dailySlotsCar: Int!
    availableSlotsCar: Int!
    isActive: Boolean!
  }

  type DashboardMetrics {
    totalWashesToday: Int!
    totalWashesInRange: Int!
    carWashesCount: Int!
    twoWheelerWashesCount: Int!
    totalPaymentsReceived: Float!
    activeWorkers: Int!
    pendingManualPayments: Int!
    recentVehicles: [Vehicle!]!
  }

  type VehicleStats {
    received: Int!
    washing: Int!
    readyForPickup: Int!
    delivered: Int!
  }

  input LocationInput {
    latitude: Float!
    longitude: Float!
  }

  input AddVehicleInput {
    vehicleNumber: String!
    vehicleType: VehicleType!
    carCategory: CarCategory
    model: String
    brand: String
    color: String
    photoUrl: String
    serviceType: ServiceType
    customerMobile: String!
    customerName: String
    notes: String
    centerId: String!
  }

  input UpdateVehicleStatusInput {
    vehicleId: ID!
    status: VehicleStatus!
    notes: String
  }

  input UpdatePricingInput {
    vehicleType: VehicleType!
    carCategory: CarCategory
    price: Float!
    description: String
  }

  input MarkPaymentInput {
    vehicleId: ID!
    amount: Float!
    method: PaymentMethod!
    paymentMode: PaymentMode!
    transactionId: String
    upiId: String
    screenshotUrl: String
    notes: String
  }

  input CreatePaymentInput {
    vehicleId: ID!
    method: PaymentMethod!
  }

  input ConfirmManualPaymentInput {
    paymentId: ID!
    amount: Float!
    notes: String
  }

  input VerifyManualPaymentInput {
    paymentId: ID!
    approved: Boolean!
    notes: String
  }

  input CreateWorkerInput {
    mobile: String!
    name: String!
    email: String
    workerCode: String
  }

  input UpdateUserInput {
    userId: ID!
    name: String
    email: String
    mobile: String
    dateOfBirth: String
    address: String
    city: String
    pinCode: String
    isActive: Boolean
  }

  input SignupInput {
    mobile: String!
    name: String!
    email: String
    password: String!
  }

  input BiometricSetupInput {
    publicKey: String!
    enabled: Boolean!
  }

  input CreateSlotBookingInput {
    customerMobile: String!
    customerName: String
    vehicleNumber: String!
    vehicleType: VehicleType!
    carCategory: CarCategory
    brand: String
    model: String
    color: String
    photoUrl: String
    carWash: Boolean
    twoWheelerWash: Boolean
    bodyRepair: Boolean
    centerId: String!
  }

  input VerifySlotBookingInput {
    bookingId: ID!
    otp: String!
  }

  type SlotBooking {
    id: ID!
    customerMobile: String!
    customerName: String
    vehicleNumber: String!
    vehicleType: String!
    carCategory: String
    brand: String
    model: String
    color: String
    photoUrl: String
    carWash: Boolean!
    twoWheelerWash: Boolean!
    bodyRepair: Boolean!
    otp: String!
    status: SlotBookingStatus!
    rejectionReason: String
    cancelledByRole: String
    cancelledByName: String
    cancelledAt: DateTime
    verifiedAt: DateTime
    verifiedBy: String
    center: Center!
    services: [SlotService!]!
    createdAt: DateTime!
  }

  type SlotService {
    id: ID!
    slotBookingId: String!
    serviceType: SlotServiceType!
    status: SlotServiceStatus!
    startedAt: DateTime
    startedBy: String
    completedAt: DateTime
    completedBy: String
    cancelledAt: DateTime
    cancelledBy: String
    cancelledByRole: String
    cancelledByName: String
    notes: String
    createdAt: DateTime!
  }

  input UpdateLogoInput {
    centerId: ID
    logoUrl: String!
  }

  input UpdateCenterInput {
    centerId: ID
    name: String
    address: String
    mobile: String
    email: String
  }

  input UpdateProfileInput {
    name: String
    email: String
    mobile: String
    emailOtp: String
    mobileOtp: String
    photoUrl: String
  }

  input ChangePasswordInput {
    currentPassword: String!
    newPassword: String!
  }

  type OtpSendResponse {
    success: Boolean!
    message: String!
  }

  type WorkerCredentials {
    user: User!
    plainPassword: String!
    workerCode: String!
  }

  type SystemConfig {
    key: String!
    value: String!
  }

  type AppVersion {
    companyApp: String!
    customerApp: String!
    companyAppDownloadUrl: String
    customerAppDownloadUrl: String
    forceUpdate: Boolean!
    updateMessage: String
    releaseNotes: String
  }

  type Query {
    # Authentication
    me: User!
    checkUserExists(mobile: String!): Boolean!

    # Vehicles
    vehicles(status: VehicleStatus, vehicleType: VehicleType, limit: Int, offset: Int): [Vehicle!]!
    vehicleById(id: ID!): Vehicle
    vehicleByNumber(vehicleNumber: String!): Vehicle
    myVehicles: [Vehicle!]!
    assignedVehicles: [Vehicle!]!
    vehicleStats: VehicleStats!

    # Dashboard
    dashboardMetrics(startDate: DateTime, endDate: DateTime): DashboardMetrics!

    # Pricing
    pricing: [Pricing!]!
    pricingByType(vehicleType: VehicleType!, carCategory: CarCategory): Pricing

    # Users
    workers: [User!]!
    customers(limit: Int, offset: Int): [User!]!
    userById(id: ID!): User

    # Payments
    payments(status: PaymentStatus, limit: Int, offset: Int): [Payment!]!
    manualPendingPayments: [Payment!]!
    myPayments: [Payment!]!

    # Centers
    centers: [Center!]!

    # Slot Bookings
    slotBookings(status: SlotBookingStatus): [SlotBooking!]!
    mySlotBookings: [SlotBooking!]!
    slotBookingById(id: ID!): SlotBooking

    # System Config
    systemConfig(key: String!): SystemConfig
    
    # App Version
    appVersion: AppVersion!
  }

  type Mutation {
    # Authentication & Signup
    sendOtp(mobile: String!): Boolean!
    verifyOtp(mobile: String!, code: String!): AuthPayload!
    signup(input: SignupInput!): AuthPayload!
    login(mobile: String!, password: String!): AuthPayload!
    updatePassword(mobile: String!, password: String!): User!
    changePassword(input: ChangePasswordInput!): User!
    updateLocation(location: LocationInput!): User!
    updateFcmToken(token: String!): User!
    setupBiometric(input: BiometricSetupInput!): User!

    # Profile Management
    updateProfile(input: UpdateProfileInput!): User!
    sendProfileOtp(type: String!, value: String!): OtpSendResponse!
    verifyProfileOtp(type: String!, value: String!, code: String!): Boolean!

    # Vehicle Management
    addVehicle(input: AddVehicleInput!): Vehicle!
    updateVehicleStatus(input: UpdateVehicleStatusInput!): Vehicle!
    assignVehicleToWorker(vehicleId: ID!, workerId: ID!): Vehicle!

    # Pricing
    updatePricing(input: UpdatePricingInput!): Pricing!
    deletePricing(id: ID!): Boolean!

    # Payment
    createPayment(input: CreatePaymentInput!): Payment!
    confirmOnlinePayment(paymentId: ID!, razorpayPaymentId: String!, razorpaySignature: String!): Payment!
    confirmManualPayment(input: ConfirmManualPaymentInput!): Payment!
    markPayment(input: MarkPaymentInput!): Payment!
    verifyManualPayment(input: VerifyManualPaymentInput!): Payment!
    createRazorpayOrder(vehicleId: ID!, amount: Float!): String!

    # User Management (Admin only)
    createWorker(input: CreateWorkerInput!): WorkerCredentials!
    sendWorkerCredentialsSms(mobile: String!, workerCode: String!, password: String!): Boolean!
    updateUser(input: UpdateUserInput!): User!
    toggleWorkerStatus(userId: ID!): User!
    deleteUser(userId: ID!): Boolean!
    
    # Company Management (Admin only)
    updateCompanyLogo(input: UpdateLogoInput!): Center!
    updateCenter(input: UpdateCenterInput!): Center!
    updateCenterSlots(dailySlotsTwoWheeler: Int!, dailySlotsCar: Int!): Center!

    # Slot Booking
    createSlotBooking(input: CreateSlotBookingInput!): SlotBooking!
    verifySlotBooking(input: VerifySlotBookingInput!): Vehicle!
    cancelSlotBooking(bookingId: ID!): SlotBooking!
    cancelSlotByStaff(bookingId: ID!): SlotBooking!
    
    # Slot Service Management
    startService(serviceId: ID!): SlotService!
    updateServiceStatus(serviceId: ID!, status: SlotServiceStatus!, notes: String): SlotService!
    cancelService(serviceId: ID!): SlotService!

    # System Config (Admin only)
    updateSystemConfig(key: String!, value: String!): SystemConfig!

    # Push Notifications (Admin only)
    sendBroadcastNotification(title: String!, message: String!): BroadcastNotificationResult!
  }

  type BroadcastNotificationResult {
    success: Boolean!
    sentCount: Int!
    failedCount: Int!
  }
`;
