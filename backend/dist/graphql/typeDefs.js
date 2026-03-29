"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
exports.typeDefs = (0, graphql_tag_1.gql) `
  scalar DateTime

  enum UserRole {
    ADMIN
    WORKER
    CUSTOMER
  }

  enum VehicleType {
    CAR
    TWO_WHEELER
    BODY_REPAIR
    PAINTING
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
    pricing: Pricing
    customer: User!
    worker: User
    payment: Payment
    center: Center
    slotBooking: SlotBooking
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
    categoryName: String!
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

  input UpdateVehiclePricingInput {
    vehicleId: ID!
    pricingId: ID!
  }

  input UpdateServicePricingInput {
    serviceId: ID!
    pricingId: ID
    customPrice: Float
    customPricingName: String
  }

  input CreatePricingInput {
    vehicleType: VehicleType!
    categoryName: String!
    price: Float!
    description: String
  }

  input UpdatePricingInput {
    id: ID!
    categoryName: String
    price: Float
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
    expectedAmount: Float
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
    pricing: Pricing
    customPrice: Float
    customPricingName: String
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
    
    # Estimations
    estimations(status: EstimationStatus, limit: Int, offset: Int): [Estimation!]!
    estimation(id: ID!): Estimation
    estimationByNumber(estimationNumber: String!): Estimation
    
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
    updateVehiclePricing(input: UpdateVehiclePricingInput!): Vehicle!
    updateServicePricing(input: UpdateServicePricingInput!): SlotService!
    assignVehicleToWorker(vehicleId: ID!, workerId: ID!): Vehicle!

    # Pricing
    createPricing(input: CreatePricingInput!): Pricing!
    updatePricing(input: UpdatePricingInput!): Pricing!
    deletePricing(id: ID!): Boolean!

    # Payment
    createPayment(input: CreatePaymentInput!): Payment!
    confirmOnlinePayment(paymentId: ID!, razorpayPaymentId: String!, razorpaySignature: String!): Payment!
    confirmManualPayment(input: ConfirmManualPaymentInput!): Payment!
    markPayment(input: MarkPaymentInput!): Payment!
    verifyManualPayment(input: VerifyManualPaymentInput!): Payment!
    createRazorpayOrder(vehicleId: ID!, amount: Float!): String!
    deletePayment(vehicleId: ID!): Boolean!
    adjustPayment(vehicleId: ID!): Payment!

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
    confirmBill(vehicleId: ID!): Vehicle!
    cancelService(serviceId: ID!): SlotService!

    # System Config (Admin only)
    updateSystemConfig(key: String!, value: String!): SystemConfig!

    # Push Notifications (Admin only)
    sendBroadcastNotification(title: String!, message: String!): BroadcastNotificationResult!
    
    # Estimation Management
    createEstimation(input: CreateEstimationInput!): Estimation!
    updateEstimation(id: ID!, input: UpdateEstimationInput!): Estimation!
    deleteEstimation(id: ID!): Boolean!
    addEstimationItem(input: AddEstimationItemInput!): EstimationItem!
    updateEstimationItem(id: ID!, input: UpdateEstimationItemInput!): EstimationItem!
    deleteEstimationItem(id: ID!): Boolean!
  }

  type BroadcastNotificationResult {
    success: Boolean!
    sentCount: Int!
    failedCount: Int!
  }
  
  enum EstimationStatus {
    DRAFT
    SENT
    ACCEPTED
    REJECTED
  }
  
  type Estimation {
    id: ID!
    estimationNumber: String!
    customerName: String!
    customerMobile: String!
    vehicleNumber: String
    vehicleType: String
    center: Center
    preparedBy: String!
    preparedByName: String!
    preparedByRole: String!
    termsAndConditions: String
    notes: String
    status: EstimationStatus!
    totalAmount: Float!
    validUntil: DateTime
    items: [EstimationItem!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }
  
  type EstimationItem {
    id: ID!
    estimationId: String!
    serviceName: String!
    description: String
    quantity: Int!
    unitPrice: Float!
    totalPrice: Float!
    createdAt: DateTime!
  }
  
  input CreateEstimationInput {
    customerName: String!
    customerMobile: String!
    vehicleNumber: String
    vehicleType: String
    centerId: String
    termsAndConditions: String
    notes: String
    validUntil: DateTime
  }
  
  input UpdateEstimationInput {
    customerName: String
    customerMobile: String
    vehicleNumber: String
    vehicleType: String
    termsAndConditions: String
    notes: String
    status: EstimationStatus
    validUntil: DateTime
  }
  
  input AddEstimationItemInput {
    estimationId: ID!
    serviceName: String!
    description: String
    quantity: Int!
    unitPrice: Float!
  }
  
  input UpdateEstimationItemInput {
    serviceName: String
    description: String
    quantity: Int
    unitPrice: Float
  }

  extend enum UserRole {
    SUPER_ADMIN
    EMPLOYEE
    VIEWER
  }

  enum CompanyStatus {
    PENDING_APPROVAL
    APPROVED
    REJECTED
    ACTIVE
    LOCKED
    REMOVED
  }

  enum BillingCycle {
    MONTHLY
    YEARLY
    LIFETIME
  }

  enum SubscriptionStatus {
    ACTIVE
    OVERDUE
    EXPIRED
    LOCKED
  }

  enum InvoiceStatus {
    PENDING
    PAID
    OVERDUE
    CANCELLED
  }

  enum ReminderType {
    BEFORE_DUE
    ON_DUE
    AFTER_DUE
    AFTER_EXPIRY
  }

  type SubscriptionPlan {
    id: ID!
    planName: String!
    price: Float!
    billingCycle: BillingCycle!
    validityDays: Int
    gracePeriodDays: Int!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type CompanySubscription {
    id: ID!
    centerId: ID!
    center: Center!
    planId: ID!
    plan: SubscriptionPlan!
    planType: String!
    billingCycle: BillingCycle!
    amount: Float!
    startDate: DateTime!
    nextDueDate: DateTime
    dueDate: DateTime
    gracePeriodDays: Int!
    status: SubscriptionStatus!
    lockedByAdmin: Boolean!
    previousPlanId: ID
    previousStatus: String
    invoices: [Invoice!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Invoice {
    id: ID!
    centerId: ID!
    center: Center!
    subscriptionId: ID!
    subscription: CompanySubscription!
    invoiceNumber: String
    planName: String
    amount: Float!
    billingPeriodStart: DateTime!
    billingPeriodEnd: DateTime!
    dueDate: DateTime!
    issuedAt: DateTime!
    paidAt: DateTime
    status: InvoiceStatus!
    pdfUrl: String
    paymentMethod: String
    paymentNotes: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ReminderLog {
    id: ID!
    centerId: ID!
    center: Center!
    type: ReminderType!
    channel: String!
    recipient: String!
    subject: String
    message: String!
    success: Boolean!
    errorMsg: String
    sentAt: DateTime!
  }

  type AuditLog {
    id: ID!
    centerId: ID
    performedBy: String!
    performerName: String!
    performerRole: String!
    action: String!
    details: String
    createdAt: DateTime!
  }

  type MonthlyRevenuePoint {
    month: String!
    revenue: Float!
  }

  type PlatformMetrics {
    totalCompanies: Int!
    activeCompanies: Int!
    lockedCompanies: Int!
    pendingApprovals: Int!
    totalRevenueAllTime: Float!
    overduePayments: Int!
    revenueThisMonth: Float!
    revenueLastMonth: Float!
    monthlyRevenue: [MonthlyRevenuePoint!]!
    recentOverdueCompanies: [Center!]!
  }

  type SubscriptionStatusResult {
    status: SubscriptionStatus!
    currentPlan: SubscriptionPlan
    planType: String
    billingCycle: BillingCycle
    startDate: DateTime
    dueDate: DateTime
    nextDueDate: DateTime
    gracePeriodDays: Int
    amount: Float
    subscriptionId: ID
    invoices: [Invoice!]!
  }

  extend type User {
    centerId: String
  }

  extend type Center {
    slug: String
    status: CompanyStatus!
    rejectionReason: String
    lockedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    subscriptions: [CompanySubscription!]!
    invoices: [Invoice!]!
    reminderLogs: [ReminderLog!]!
    subscriptionStatus: SubscriptionStatus!
  }

  input CreateCompanyInput {
    name: String!
    address: String!
    latitude: Float!
    longitude: Float!
    mobile: String!
    email: String
    adminMobile: String!
    adminName: String!
    adminEmail: String
  }

  input CreateSubscriptionPlanInput {
    planName: String!
    price: Float!
    billingCycle: BillingCycle!
    validityDays: Int
    gracePeriodDays: Int!
    isActive: Boolean!
  }

  input UpdateSubscriptionPlanInput {
    planName: String
    price: Float
    validityDays: Int
    gracePeriodDays: Int
    isActive: Boolean
  }

  extend type Query {
    subscriptionPlans(includeInactive: Boolean): [SubscriptionPlan!]!
    companySubscriptions(centerId: ID, status: SubscriptionStatus, limit: Int, offset: Int): [CompanySubscription!]!
    companyInvoices(centerId: ID, status: InvoiceStatus, limit: Int, offset: Int): [Invoice!]!
    mySubscriptionStatus: SubscriptionStatusResult!
    reminderLogs(centerId: ID!): [ReminderLog!]!
    auditLogs(centerId: ID, limit: Int, offset: Int): [AuditLog!]!
    allCompanies(status: CompanyStatus, search: String, limit: Int, offset: Int): [Center!]!
    companyById(id: ID!): Center
    platformUsers: [User!]!
    platformMetrics: PlatformMetrics!
  }

  extend type Mutation {
    platformLogin(mobile: String!, password: String!): AuthPayload!
    createPlatformUser(mobile: String!, name: String!, password: String!, role: UserRole!): User!
    createCompany(input: CreateCompanyInput!): Center!
    updateCompanyStatus(centerId: ID!, status: CompanyStatus!, reason: String): Center!
    createSubscriptionPlan(input: CreateSubscriptionPlanInput!): SubscriptionPlan!
    updateSubscriptionPlan(id: ID!, input: UpdateSubscriptionPlanInput!): SubscriptionPlan!
    createSubscription(centerId: ID!, planId: ID, planType: String, amount: Float, startDate: DateTime, dueDate: DateTime, gracePeriodDays: Int): CompanySubscription!
    assignPlanToCompany(centerId: ID!, planId: ID!): CompanySubscription!
    changeCompanyPlan(centerId: ID!, planId: ID!): CompanySubscription!
    updateSubscriptionStatus(subscriptionId: ID!, status: SubscriptionStatus!): CompanySubscription!
    updateGracePeriod(subscriptionId: ID!, gracePeriodDays: Int!): CompanySubscription!
    recordInvoicePayment(invoiceId: ID!): Invoice!
    payMySubscription(invoiceId: ID!): Invoice!
    triggerReminder(centerId: ID!, type: ReminderType!, message: String): Boolean!
    generateInvoicePdf(invoiceId: ID!): String
  }
`;
//# sourceMappingURL=typeDefs.js.map