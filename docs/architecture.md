# 🏗️ ISD Airbnb — System Architecture & Design

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Microservice Architecture](#microservice-architecture)
3. [Booking Status State Machine](#booking-status-state-machine)
4. [Data Models](#data-models)
5. [Inter-Service Communication](#inter-service-communication)
6. [API Gateway Routing](#api-gateway-routing)
7. [Security Architecture](#security-architecture)
8. [Database Design Strategy](#database-design-strategy)
9. [Deployment Architecture](#deployment-architecture)

---

## 1. System Overview

ISD Airbnb is a **cloud-native microservice platform** that replicates the core rental marketplace experience. Each business domain is encapsulated in its own independently deployable Spring Boot service, backed by a dedicated MongoDB database on Atlas.

```
Client (React SPA)
        │
        ▼
  [ API Gateway :8080 ]
        │
  ┌─────┴──────────────────────────────────────┐
  │                                            │
  ▼         ▼         ▼         ▼         ▼   ▼
User     Booking  Payment  Listing  Avail. Search
:8081    :8082    :8083    :8084    :8085  :8086
  │         │
  ▼         ▼
Notif.   Admin
:8087    :8088
  │
  └──── All services connect to ────►  MongoDB Atlas
                                        (per-service DB)
```

---

## 2. Microservice Architecture

### Service Responsibilities

| Service | Port | Core Responsibility | Key Collections |
|---|---|---|---|
| **api-gateway** | 8080 | Route, CORS, auth header forwarding | — |
| **user-service** | 8081 | Registration, login, JWT issue, profiles | `users`, `refresh_tokens` |
| **booking-service** | 8082 | Booking lifecycle, status FSM, history | `bookings`, `booking_status_history` |
| **payment-service** | 8083 | Charge, refund, payout processing | `payments`, `refunds`, `payouts` |
| **listing-service** | 8084 | Property CRUD, pricing, images | `listings`, `listing_images` |
| **availability-service** | 8085 | Calendar, blocked dates, overlap guard | `availability_calendars`, `blocked_dates` |
| **search-service** | 8086 | Full-text search, filter, sort, paginate | `search_index` |
| **notification-service** | 8087 | Email/SMS/push to guest and host | `notifications`, `notification_logs` |
| **admin-service** | 8088 | Dashboard, force ops, reports | `admin_actions`, `audit_logs` |

---

## 3. Booking Status State Machine

### Valid States

| Status | Description |
|---|---|
| `PENDING` | Booking created, awaiting payment confirmation |
| `CONFIRMED` | Payment successful, booking is active |
| `CHECKED_IN` | Guest has checked in on or after start_date |
| `CHECKED_OUT` | Guest has checked out on or after end_date |
| `CANCELLED` | Cancelled by guest, host, or admin |
| `FAILED` | Payment or system error prevented confirmation |
| `REFUNDED` | Refund issued — either FULL or PARTIAL |

---

### State Transition Diagram

```
                          ┌──────────────────┐
         Create Booking   │                  │
         ──────────────►  │     PENDING      │
                          │                  │
                          └────────┬─────────┘
                                   │
                 ┌─────────────────┼──────────────────┐
                 │                 │                  │
          Payment OK         Payment Fail       Guest/Host/Admin
                 │                 │             Cancels Early
                 ▼                 ▼                  │
          ┌──────────┐       ┌──────────┐             │
          │CONFIRMED │       │  FAILED  │             │
          └────┬─────┘       └──────────┘             │
               │                                      │
       ┌───────┼───────────┐                          │
       │                   │                          │
  Guest checks in    Guest/Host/Admin                 │
       │            Cancels (before check-in)         │
       ▼                   │                          │
  ┌──────────┐             │                          │
  │CHECKED_IN│             │                          │
  └────┬─────┘             │                          │
       │                   │                          │
  Guest checks out         │                          │
       │                   ▼                          │
       ▼           ┌─────────────┐◄────────────────────┘
  ┌───────────┐    │  CANCELLED  │
  │CHECKED_OUT│    └──────┬──────┘
  └───────────┘           │
   (Terminal)             │   Refund processed
                          ▼
                  ┌──────────────────────────────┐
                  │           REFUNDED           │
                  │  (FULL if cancelled 7+ days  │
                  │   before start_date,         │
                  │   PARTIAL if cancelled       │
                  │   less than 7 days before)   │
                  └──────────────────────────────┘
                   (Terminal)
```

---

### Allowed Transitions Matrix

| From \ To | PENDING | CONFIRMED | CHECKED_IN | CHECKED_OUT | CANCELLED | FAILED | REFUNDED |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **PENDING** | — | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **CONFIRMED** | ❌ | — | ✅ | ❌ | ✅ | ❌ | ❌ |
| **CHECKED_IN** | ❌ | ❌ | — | ✅ | ❌ | ❌ | ❌ |
| **CHECKED_OUT** | ❌ | ❌ | ❌ | — | ❌ | ❌ | ❌ |
| **CANCELLED** | ❌ | ❌ | ❌ | ❌ | — | ❌ | ✅ |
| **FAILED** | ❌ | ❌ | ❌ | ❌ | ❌ | — | ❌ |
| **REFUNDED** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — |

> **Terminal states:** `CHECKED_OUT`, `FAILED`, `REFUNDED` — no further transitions allowed.

---

### Refund Policy

| Cancellation Timing | Refund Type | Customer Gets | Host Gets |
|---|---|---|---|
| 7+ days before `start_date` | **FULL** | 100% of paid amount | 0% |
| < 7 days before `start_date` | **PARTIAL** | 50% of paid amount | 50% |
| After `CHECKED_IN` | **NONE** | 0% | 100% |
| Host cancels (any time) | **FULL** | 100% of paid amount | 0% + penalty |

---

## 4. Data Models

### 4.1 Booking Document (`bookings` collection)

```json
{
  "_id":         "ObjectId",
  "bookingId":   "string (UUID)",
  "userId":      "string (guest user ID)",
  "hostId":      "string (host user ID)",
  "listingId":   "string (listing ID)",
  "startDate":   "ISODate",
  "endDate":     "ISODate",
  "numNights":   "integer",
  "numGuests":   "integer",
  "status":      "PENDING | CONFIRMED | CHECKED_IN | CHECKED_OUT | CANCELLED | FAILED | REFUNDED",
  "totalPrice":  "decimal",
  "currency":    "string (default: BDT)",
  "paymentId":   "string (reference to payment-service)",
  "specialRequests": "string",
  "cancellationReason": "string | null",
  "cancelledBy": "GUEST | HOST | ADMIN | null",
  "refundType":  "FULL | PARTIAL | NONE | null",
  "refundAmount": "decimal | null",
  "createdAt":   "ISODate",
  "updatedAt":   "ISODate"
}
```

---

### 4.2 Booking Status History Document (`booking_status_history` collection)

```json
{
  "_id":        "ObjectId",
  "historyId":  "string (UUID)",
  "bookingId":  "string (ref → bookings)",
  "fromStatus": "string | null (null for initial PENDING)",
  "toStatus":   "string",
  "changedBy":  "string (userId or 'SYSTEM' or 'ADMIN')",
  "changedByRole": "GUEST | HOST | ADMIN | SYSTEM",
  "reason":     "string | null",
  "metadata": {
    "ipAddress":   "string | null",
    "userAgent":   "string | null",
    "triggeredBy": "string (API call | Payment webhook | Scheduled job)"
  },
  "timestamp":  "ISODate"
}
```

> **Design note:** Every single status change appends a new history document. This gives a full immutable audit trail. Never update or delete history records.

---

### 4.3 User Document (`users` collection)

```json
{
  "_id":        "ObjectId",
  "userId":     "string (UUID)",
  "email":      "string (unique, indexed)",
  "password":   "string (bcrypt hashed)",
  "firstName":  "string",
  "lastName":   "string",
  "phone":      "string | null",
  "profilePicture": "string (URL) | null",
  "role":       "GUEST | HOST | ADMIN",
  "isVerified": "boolean",
  "isActive":   "boolean",
  "address": {
    "street":   "string",
    "city":     "string",
    "country":  "string",
    "zipCode":  "string"
  },
  "hostDetails": {
    "superhost":    "boolean",
    "joinedDate":   "ISODate",
    "responseRate": "decimal",
    "totalListings":"integer"
  },
  "createdAt":  "ISODate",
  "updatedAt":  "ISODate"
}
```

---

### 4.4 Listing Document (`listings` collection)

```json
{
  "_id":          "ObjectId",
  "listingId":    "string (UUID)",
  "hostId":       "string (ref → users)",
  "title":        "string",
  "description":  "string",
  "type":         "APARTMENT | HOUSE | VILLA | ROOM | STUDIO",
  "status":       "ACTIVE | INACTIVE | SUSPENDED",
  "location": {
    "address":    "string",
    "city":       "string",
    "country":    "string",
    "zipCode":    "string",
    "coordinates": {
      "lat":  "double",
      "lng":  "double"
    }
  },
  "pricing": {
    "basePrice":     "decimal",
    "cleaningFee":   "decimal",
    "serviceFee":    "decimal",
    "currency":      "string"
  },
  "capacity": {
    "maxGuests":  "integer",
    "bedrooms":   "integer",
    "bathrooms":  "integer",
    "beds":       "integer"
  },
  "amenities":   ["string"],
  "images":      ["string (URLs)"],
  "rating":      "decimal",
  "reviewCount": "integer",
  "minNights":   "integer",
  "maxNights":   "integer",
  "createdAt":   "ISODate",
  "updatedAt":   "ISODate"
}
```

---

### 4.5 Availability Calendar Document (`availability_calendars` collection)

```json
{
  "_id":         "ObjectId",
  "listingId":   "string (unique, indexed)",
  "blockedDates": [
    {
      "date":      "ISODate",
      "reason":    "BOOKED | HOST_BLOCKED | MAINTENANCE",
      "bookingId": "string | null"
    }
  ],
  "minNights":   "integer",
  "maxNights":   "integer",
  "updatedAt":   "ISODate"
}
```

> **Double-booking prevention:** Before creating a booking, `booking-service` calls `availability-service` to atomically check and lock dates using a MongoDB transaction.

---

### 4.6 Payment Document (`payments` collection)

```json
{
  "_id":          "ObjectId",
  "paymentId":    "string (UUID)",
  "bookingId":    "string (ref → bookings)",
  "userId":       "string (payer)",
  "amount":       "decimal",
  "currency":     "string",
  "status":       "PENDING | COMPLETED | FAILED | REFUNDED | PARTIALLY_REFUNDED",
  "method":       "CARD | BANK_TRANSFER | MOBILE_BANKING",
  "transactionRef": "string",
  "refunds": [
    {
      "refundId":  "string (UUID)",
      "amount":    "decimal",
      "type":      "FULL | PARTIAL",
      "reason":    "string",
      "processedAt": "ISODate"
    }
  ],
  "hostPayoutId": "string | null",
  "createdAt":    "ISODate",
  "updatedAt":    "ISODate"
}
```

---

### 4.7 Notification Document (`notifications` collection)

```json
{
  "_id":          "ObjectId",
  "notificationId": "string (UUID)",
  "recipientId":  "string (userId)",
  "recipientType":"GUEST | HOST | ADMIN",
  "bookingId":    "string | null",
  "type":         "BOOKING_CONFIRMED | BOOKING_CANCELLED | PAYMENT_RECEIVED | CHECK_IN_REMINDER | REFUND_ISSUED | ...",
  "channel":      "EMAIL | SMS | PUSH",
  "subject":      "string",
  "body":         "string",
  "status":       "PENDING | SENT | FAILED | RETRYING",
  "retryCount":   "integer",
  "sentAt":       "ISODate | null",
  "createdAt":    "ISODate"
}
```

---

## 5. Inter-Service Communication

All services communicate synchronously over **HTTP/REST** via Spring `WebClient`. The API Gateway handles inbound external traffic only — internal service-to-service calls go directly via Docker network DNS.

### Communication Flow for Booking Creation

```
Frontend
  │
  │  POST /api/bookings/create
  ▼
API Gateway (:8080)
  │
  │  forward to booking-service
  ▼
Booking Service (:8082)
  │
  ├──► 1. GET /api/users/{userId}          ──► User Service (:8081)
  │         (validate user exists)
  │
  ├──► 2. GET /api/listings/{listingId}    ──► Listing Service (:8084)
  │         (validate listing active, get price)
  │
  ├──► 3. POST /api/availability/check     ──► Availability Service (:8085)
  │         (check dates free, lock atomically)
  │
  ├──► 4. POST /api/payments/initiate      ──► Payment Service (:8083)
  │         (charge guest)
  │
  ├──► 5. Save Booking (status=CONFIRMED)
  │       + Save BookingStatusHistory entry
  │
  └──► 6. POST /api/notifications/send     ──► Notification Service (:8087)
            (email guest + host)
```

---

## 6. API Gateway Routing

| Incoming Path | Routed To | Notes |
|---|---|---|
| `/api/users/**` | `user-service:8081` | Auth endpoints public, rest JWT-protected |
| `/api/bookings/**` | `booking-service:8082` | JWT required |
| `/api/payments/**` | `payment-service:8083` | JWT required |
| `/api/listings/**` | `listing-service:8084` | GET public, POST/PUT/DELETE JWT required |
| `/api/availability/**` | `availability-service:8085` | GET public, POST JWT required |
| `/api/search/**` | `search-service:8086` | Public |
| `/api/notifications/**` | `notification-service:8087` | JWT required |
| `/api/admin/**` | `admin-service:8088` | ADMIN role required |

---

## 7. Security Architecture

```
Request
  │
  ▼
API Gateway
  │
  ├── CORS Filter (allow frontend origin)
  │
  ├── JWT Validation Filter
  │     ├── Extract Bearer token from Authorization header
  │     ├── Validate signature using shared JWT_SECRET
  │     ├── Check expiry
  │     └── Forward user context (userId, role) as X-User-Id, X-User-Role headers
  │
  └── Route to downstream service
            │
            ▼
       Downstream Service
            │
            └── Reads X-User-Id, X-User-Role from headers
                (trusts gateway — no re-validation needed)
```

### JWT Payload Structure

```json
{
  "sub":    "userId (UUID)",
  "email":  "user@example.com",
  "role":   "GUEST | HOST | ADMIN",
  "iat":    1700000000,
  "exp":    1700086400
}
```

---

## 8. Database Design Strategy

### One Database Per Service

Each microservice owns exactly one MongoDB database on Atlas Cluster0. No service may directly query another service's database.

| Service | Database Name |
|---|---|
| user-service | `userdb` |
| booking-service | `bookingdb` |
| payment-service | `paymentdb` |
| listing-service | `listingdb` |
| availability-service | `availabilitydb` |
| search-service | `searchdb` |
| notification-service | `notificationdb` |
| admin-service | `admindb` |

### Key MongoDB Indexes

**bookingdb.bookings**
```
{ userId: 1 }
{ listingId: 1 }
{ status: 1 }
{ startDate: 1, endDate: 1 }
{ userId: 1, status: 1 }
```

**bookingdb.booking_status_history**
```
{ bookingId: 1 }
{ bookingId: 1, timestamp: -1 }
{ changedBy: 1 }
```

**listingdb.listings**
```
{ hostId: 1 }
{ status: 1 }
{ "location.city": 1 }
{ "pricing.basePrice": 1 }
```

**availabilitydb.availability_calendars**
```
{ listingId: 1 }          // unique
{ "blockedDates.date": 1 }
```

---

## 9. Deployment Architecture

### Docker Compose (Local / Dev)

```
docker-compose up --build
                    │
        ┌───────────┼───────────────────────┐
        ▼           ▼                       ▼
  [api-gateway]  [user-service]   ...  [admin-service]
   container      container             container
        │
   airbnb-network (bridge)
        │
   All containers talk via service name DNS
   (e.g. http://booking-service:8082)
        │
   MongoDB Atlas (external, cloud)
```

### Frontend Deployment (Separate)

```
React App  ──build──►  Static Files  ──serve──►  Nginx Container
                                                    (port 80)
                                                       │
                                               Calls API Gateway
                                               (port 8080 or via
                                                reverse proxy)
```

### CI/CD Pipeline Stages

```
Push to develop/main
        │
        ▼
  [detect-changes]
   ┌────┴────┐
   │         │
backend   frontend
   │         │
   ▼         ▼
[build]   [build]
   │
   ▼
[test] (matrix: 5 core services)
   │
   ▼ (push to main only)
[docker-build] (matrix: all 9 services)
   │
   ▼
[docker-push → Docker Hub]
```

### Required GitHub Secrets

| Secret | Purpose |
|---|---|
| `MONGO_URI_TEST` | Atlas URI for CI test environment |
| `JWT_SECRET_TEST` | JWT secret for test environment |
| `REACT_APP_API_BASE_URL` | Gateway URL injected at frontend build time |
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub access token |

---

*Last updated: ISD Airbnb — BUET CSE 326*