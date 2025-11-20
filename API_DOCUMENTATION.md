# API Documentation

Complete API documentation for the Vehicle Wash Management System GraphQL API.

## Base URL

```
Development: http://localhost:4000/graphql
Production: https://api.yourdomain.com/graphql
```

## Authentication

All authenticated requests must include a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## GraphQL Schema

### Types

#### User
```graphql
type User {
  id: ID!
  mobile: String!
  name: String
  email: String
  role: UserRole!
  isActive: Boolean!
  latitude: Float
  longitude: Float
  createdAt: DateTime!
  vehicles: [Vehicle!]
  assignedVehicles: [Vehicle!]
}
```

#### Vehicle
```graphql
type Vehicle {
  id: ID!
  vehicleNumber: String!
  vehicleType: VehicleType!
  carCategory: CarCategory
  model: String
  brand: String
  color: String
  status: VehicleStatus!
  receivedAt: DateTime!
  washingAt: DateTime
  readyAt: DateTime
  deliveredAt: DateTime
  notes: String
  customer: User!
  worker: User
  payment: Payment
  createdAt: DateTime!
  updatedAt: DateTime!
}
```

#### Payment
```graphql
type Payment {
  id: ID!
  amount: Float!
  method: PaymentMethod!
  status: PaymentStatus!
  transactionId: String
  upiId: String
  screenshotUrl: String
  verifiedBy: String
  verifiedAt: DateTime
  notes: String
  vehicle: Vehicle!
  customer: User!
  createdAt: DateTime!
}
```

### Enums

```graphql
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

enum VehicleStatus {
  RECEIVED
  WASHING
  READY_FOR_PICKUP
  DELIVERED
}

enum PaymentMethod {
  RAZORPAY
  INSTAMOJO
  MANUAL_UPI
  MANUAL_GPAY
  CASH
}

enum PaymentStatus {
  PENDING
  PAID
  MANUAL_PENDING
  REJECTED
  REFUNDED
}
```

## Queries

### Get Current User
```graphql
query Me {
  me {
    id
    mobile
    name
    email
    role
  }
}
```

**Authorization**: Required  
**Returns**: Current authenticated user

---

### Get All Vehicles
```graphql
query Vehicles($status: VehicleStatus, $vehicleType: VehicleType, $limit: Int, $offset: Int) {
  vehicles(status: $status, vehicleType: $vehicleType, limit: $limit, offset: $offset) {
    id
    vehicleNumber
    vehicleType
    status
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
```

**Authorization**: Required (Admin/Worker)  
**Parameters**:
- `status` (optional): Filter by vehicle status
- `vehicleType` (optional): Filter by vehicle type
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

---

### Get Vehicle by ID
```graphql
query VehicleById($id: ID!) {
  vehicleById(id: $id) {
    id
    vehicleNumber
    vehicleType
    carCategory
    status
    customer {
      name
      mobile
    }
    worker {
      name
    }
    payment {
      amount
      status
      method
    }
  }
}
```

**Authorization**: Required  
**Parameters**:
- `id`: Vehicle ID

---

### Get My Vehicles (Customer)
```graphql
query MyVehicles {
  myVehicles {
    id
    vehicleNumber
    status
    receivedAt
    payment {
      amount
      status
    }
  }
}
```

**Authorization**: Required (Customer)  
**Returns**: All vehicles belonging to the authenticated customer

---

### Get Dashboard Metrics
```graphql
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
      status
      customer {
        name
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
```

**Authorization**: Required (Admin/Worker)  
**Parameters**:
- `startDate` (optional): Start date for metrics
- `endDate` (optional): End date for metrics

---

### Get Pricing
```graphql
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
```

**Authorization**: Not required  
**Returns**: All active pricing

---

### Get Workers
```graphql
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
```

**Authorization**: Required (Admin)  
**Returns**: All workers

---

### Get Customers
```graphql
query Customers($limit: Int, $offset: Int) {
  customers(limit: $limit, offset: $offset) {
    id
    name
    mobile
    email
    createdAt
  }
}
```

**Authorization**: Required (Admin)  
**Parameters**:
- `limit` (optional): Number of results (default: 50)
- `offset` (optional): Pagination offset (default: 0)

---

### Get Manual Pending Payments
```graphql
query ManualPendingPayments {
  manualPendingPayments {
    id
    amount
    method
    transactionId
    upiId
    screenshotUrl
    vehicle {
      vehicleNumber
    }
    customer {
      name
      mobile
    }
    createdAt
  }
}
```

**Authorization**: Required (Admin/Worker)  
**Returns**: All payments pending manual verification

---

## Mutations

### Send OTP
```graphql
mutation SendOtp($mobile: String!) {
  sendOtp(mobile: $mobile)
}
```

**Authorization**: Not required  
**Parameters**:
- `mobile`: 10-digit mobile number

**Returns**: `true` if OTP sent successfully

---

### Verify OTP
```graphql
mutation VerifyOtp($mobile: String!, $code: String!) {
  verifyOtp(mobile: $mobile, code: $code) {
    token
    user {
      id
      name
      mobile
      role
    }
  }
}
```

**Authorization**: Not required  
**Parameters**:
- `mobile`: 10-digit mobile number
- `code`: 6-digit OTP

**Returns**: JWT token and user details

---

### Login with Password
```graphql
mutation Login($mobile: String!, $password: String!) {
  login(mobile: $mobile, password: $password) {
    token
    user {
      id
      name
      mobile
      role
    }
  }
}
```

**Authorization**: Not required  
**Parameters**:
- `mobile`: User's mobile number
- `password`: User's password

**Returns**: JWT token and user details

---

### Add Vehicle
```graphql
mutation AddVehicle($input: AddVehicleInput!) {
  addVehicle(input: $input) {
    id
    vehicleNumber
    status
    customer {
      name
      mobile
    }
  }
}
```

**Authorization**: Required (Admin/Worker)  
**Input**:
```graphql
input AddVehicleInput {
  vehicleNumber: String!
  vehicleType: VehicleType!
  carCategory: CarCategory
  model: String
  brand: String
  color: String
  customerMobile: String!
  customerName: String
  notes: String
  centerId: String!
}
```

**Example**:
```graphql
mutation {
  addVehicle(input: {
    vehicleNumber: "MH12AB1234"
    vehicleType: CAR
    carCategory: SEDAN
    brand: "Honda"
    model: "City"
    color: "White"
    customerMobile: "9876543210"
    customerName: "John Doe"
    centerId: "center-id"
  }) {
    id
    vehicleNumber
  }
}
```

---

### Update Vehicle Status
```graphql
mutation UpdateVehicleStatus($input: UpdateVehicleStatusInput!) {
  updateVehicleStatus(input: $input) {
    id
    status
    washingAt
    readyAt
    deliveredAt
  }
}
```

**Authorization**: Required (Admin/Worker)  
**Input**:
```graphql
input UpdateVehicleStatusInput {
  vehicleId: ID!
  status: VehicleStatus!
  notes: String
}
```

**Example**:
```graphql
mutation {
  updateVehicleStatus(input: {
    vehicleId: "vehicle-id"
    status: WASHING
    notes: "Started washing"
  }) {
    id
    status
  }
}
```

---

### Mark Payment
```graphql
mutation MarkPayment($input: MarkPaymentInput!) {
  markPayment(input: $input) {
    id
    amount
    status
    method
  }
}
```

**Authorization**: Required (Admin/Worker)  
**Input**:
```graphql
input MarkPaymentInput {
  vehicleId: ID!
  amount: Float!
  method: PaymentMethod!
  transactionId: String
  upiId: String
  screenshotUrl: String
  notes: String
}
```

**Example**:
```graphql
mutation {
  markPayment(input: {
    vehicleId: "vehicle-id"
    amount: 400
    method: CASH
  }) {
    id
    amount
    status
  }
}
```

---

### Verify Manual Payment
```graphql
mutation VerifyManualPayment($input: VerifyManualPaymentInput!) {
  verifyManualPayment(input: $input) {
    id
    status
    verifiedBy
    verifiedAt
  }
}
```

**Authorization**: Required (Admin)  
**Input**:
```graphql
input VerifyManualPaymentInput {
  paymentId: ID!
  approved: Boolean!
  notes: String
}
```

**Example**:
```graphql
mutation {
  verifyManualPayment(input: {
    paymentId: "payment-id"
    approved: true
    notes: "Verified transaction screenshot"
  }) {
    id
    status
  }
}
```

---

### Update Pricing
```graphql
mutation UpdatePricing($input: UpdatePricingInput!) {
  updatePricing(input: $input) {
    id
    vehicleType
    carCategory
    price
    description
  }
}
```

**Authorization**: Required (Admin)  
**Input**:
```graphql
input UpdatePricingInput {
  vehicleType: VehicleType!
  carCategory: CarCategory
  price: Float!
  description: String
}
```

**Example**:
```graphql
mutation {
  updatePricing(input: {
    vehicleType: CAR
    carCategory: SEDAN
    price: 450
    description: "Sedan wash with wax"
  }) {
    id
    price
  }
}
```

---

### Create Worker
```graphql
mutation CreateWorker($input: CreateWorkerInput!) {
  createWorker(input: $input) {
    id
    name
    mobile
    role
  }
}
```

**Authorization**: Required (Admin)  
**Input**:
```graphql
input CreateWorkerInput {
  mobile: String!
  name: String!
  email: String
  password: String!
}
```

**Example**:
```graphql
mutation {
  createWorker(input: {
    mobile: "9876543210"
    name: "John Worker"
    email: "john@example.com"
    password: "worker123"
  }) {
    id
    name
    mobile
  }
}
```

---

## REST Endpoints

### Send OTP (REST)
```
POST /api/send-otp
Content-Type: application/json

{
  "mobile": "9876543210"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

---

### Verify OTP (REST)
```
POST /api/verify-otp
Content-Type: application/json

{
  "mobile": "9876543210",
  "code": "123456"
}
```

**Response**:
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

---

### Razorpay Webhook
```
POST /webhook/razorpay
X-Razorpay-Signature: <signature>

{
  "event": "payment.captured",
  "payload": {
    ...
  }
}
```

---

### Instamojo Webhook
```
POST /webhook/instamojo
Content-Type: application/json

{
  "payment_id": "...",
  "status": "Credit",
  ...
}
```

---

## Error Handling

All errors follow this format:

```json
{
  "errors": [
    {
      "message": "Error message",
      "extensions": {
        "code": "ERROR_CODE"
      }
    }
  ]
}
```

### Common Error Codes:
- `UNAUTHENTICATED`: No valid token provided
- `FORBIDDEN`: User doesn't have permission
- `BAD_USER_INPUT`: Invalid input data
- `INTERNAL_SERVER_ERROR`: Server error

---

## Rate Limiting

- **REST Endpoints**: 100 requests per 15 minutes per IP
- **GraphQL**: No rate limiting (implement as needed)

---

## Testing with cURL

### Send OTP
```bash
curl -X POST http://localhost:4000/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9876543210"}'
```

### GraphQL Query
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query":"{ me { id name role } }"}'
```

---

## WebSocket Subscriptions

Not implemented yet, but can be added for:
- Real-time vehicle status updates
- Live dashboard metrics
- Push notifications

---

## Pagination

Most list queries support pagination:

```graphql
query {
  vehicles(limit: 10, offset: 0) {
    # ...
  }
}
```

- `limit`: Number of items per page (default: 50, max: 100)
- `offset`: Number of items to skip

---

## Best Practices

1. **Always use HTTPS** in production
2. **Store JWT tokens securely** (HttpOnly cookies or secure storage)
3. **Refresh tokens** before expiry
4. **Handle errors gracefully**
5. **Use fragments** for repeated fields
6. **Batch queries** when possible
7. **Implement caching** on client side

---

For more details, visit the GraphQL Playground at `http://localhost:4000/graphql`
