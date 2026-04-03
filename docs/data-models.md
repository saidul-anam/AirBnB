# 📊 Data Models — ISD Airbnb

MongoDB collections for all microservices. Each service owns its own database.

---

## 📦 Service → Database Mapping

| Service              | Database           |
|----------------------|--------------------|
| user-service         | `userdb`           |
| booking-service      | `bookingdb`        |
| payment-service      | `paymentdb`        |
| listing-service      | `listingdb`        |
| availability-service | `availabilitydb`   |
| search-service       | `searchdb`         |
| notification-service | `notificationdb`   |
| admin-service        | `admindb`          |

---

## 👤 User Service — `userdb`

### Collection: `users`

```json
{
  "_id":         "ObjectId",
  "userId":      "string (UUID)",
  "email":       "string (unique, indexed)",
  "password":    "string (bcrypt hashed)",
  "role":        "enum [ GUEST | HOST | ADMIN ]",
  "status":      "enum [ ACTIVE | SUSPENDED | DELETED ]",
  "profile": {
    "firstName":     "string",
    "lastName":      "string",
    "phoneNumber":   "string",
    "profileImage":  "string (URL)",
    "dateOfBirth":   "date",
    "bio":           "string",
    "address": {
      "street":   "string",
      "city":     "string",
      "country":  "string",
      "zipCode":  "string"
    }
  },
  "hostInfo": {
    "isSuperhost":        "boolean",
    "totalListings":      "integer",
    "averageRating":      "double",
    "responseRate":       "double",
    "verificationStatus": "enum [ UNVERIFIED | PENDING | VERIFIED ]"
  },
  "createdAt":   "datetime",
  "updatedAt":   "datetime"
}
```

**Indexes:**
- `email` — unique
- `userId` — unique
- `role` — for admin queries

---

### Collection: `refresh_tokens`

```json
{
  "_id":       "ObjectId",
  "userId":    "string",
  "token":     "string (hashed)",
  "expiresAt": "datetime",
  "createdAt": "datetime",
  "revoked":   "boolean"
}
```

**Indexes:**
- `userId`
- `token` — unique
- `expiresAt` — TTL index (auto-delete)

---

## 🏠 Listing Service — `listingdb`

### Collection: `listings`

```json
{
  "_id":         "ObjectId",
  "listingId":   "string (UUID)",
  "hostId":      "string (ref → users.userId)",
  "title":       "string",
  "description": "string",
  "status":      "enum [ DRAFT | ACTIVE | INACTIVE | DELETED ]",

  "propertyType": "enum [ APARTMENT | HOUSE | VILLA | CABIN | STUDIO | LOFT | OTHER ]",
  "roomType":     "enum [ ENTIRE_PLACE | PRIVATE_ROOM | SHARED_ROOM ]",

  "location": {
    "address":    "string",
    "city":       "string",
    "state":      "string",
    "country":    "string",
    "zipCode":    "string",
    "latitude":   "double",
    "longitude":  "double"
  },

  "pricing": {
    "pricePerNight":   "double",
    "cleaningFee":     "double",
    "serviceFee":      "double",
    "weeklyDiscount":  "double (percentage)",
    "monthlyDiscount": "double (percentage)",
    "currency":        "string (default: BDT)"
  },

  "capacity": {
    "maxGuests":  "integer",
    "bedrooms":   "integer",
    "beds":       "integer",
    "bathrooms":  "double"
  },

  "amenities": ["string"],

  "images": [
    {
      "imageId":   "string",
      "url":       "string",
      "caption":   "string",
      "isPrimary": "boolean",
      "order":     "integer"
    }
  ],

  "rules": {
    "allowsPets":     "boolean",
    "allowsSmoking":  "boolean",
    "allowsParties":  "boolean",
    "checkInTime":    "string (e.g. 14:00)",
    "checkOutTime":   "string (e.g. 11:00)",
    "minNights":      "integer",
    "maxNights":      "integer"
  },

  "ratings": {
    "averageRating":  "double",
    "totalReviews":   "integer",
    "cleanliness":    "double",
    "accuracy":       "double",
    "communication":  "double",
    "location":       "double",
    "checkIn":        "double",
    "value":          "double"
  },

  "instantBook":  "boolean",
  "createdAt":    "datetime",
  "updatedAt":    "datetime"
}
```

**Indexes:**
- `listingId` — unique
- `hostId`
- `location.city`, `location.country` — for search
- `status`
- Compound: `location.latitude`, `location.longitude` — geospatial (2dsphere)

---

## 📅 Availability Service — `availabilitydb`

### Collection: `availability`

Represents a listing's calendar — which dates are blocked or available.

```json
{
  "_id":        "ObjectId",
  "listingId":  "string (ref → listings.listingId)",
  "year":       "integer",
  "month":      "integer",

  "days": [
    {
      "date":          "date (YYYY-MM-DD)",
      "status":        "enum [ AVAILABLE | BLOCKED | BOOKED ]",
      "blockedReason": "enum [ HOST_BLOCK | BOOKING | MAINTENANCE | null ]",
      "bookingId":     "string (ref → bookings.bookingId, if BOOKED)",
      "priceOverride": "double (null = use listing default)"
    }
  ],

  "updatedAt":  "datetime"
}
```

**Indexes:**
- Compound: `listingId` + `year` + `month` — unique
- `listingId`

---

### Collection: `blocked_dates`

Manual blocks set by the host.

```json
{
  "_id":        "ObjectId",
  "blockId":    "string (UUID)",
  "listingId":  "string",
  "hostId":     "string",
  "startDate":  "date",
  "endDate":    "date",
  "reason":     "string",
  "createdAt":  "datetime"
}
```

**Indexes:**
- `listingId`
- `startDate`, `endDate` — for range queries

---

## 🧾 Booking Service — `bookingdb`

### Collection: `bookings`

The heart of the system.

```json
{
  "_id":          "ObjectId",
  "bookingId":    "string (UUID)",
  "guestId":      "string (ref → users.userId)",
  "hostId":       "string (ref → users.userId)",
  "listingId":    "string (ref → listings.listingId)",

  "startDate":    "date",
  "endDate":      "date",
  "totalNights":  "integer",

  "status": "enum [ PENDING | CONFIRMED | CHECKED_IN | CHECKED_OUT | CANCELLED | FAILED | REFUNDED ]",

  "pricing": {
    "pricePerNight":  "double",
    "cleaningFee":    "double",
    "serviceFee":     "double",
    "discount":       "double",
    "totalPrice":     "double",
    "currency":       "string"
  },

  "guestCount": {
    "adults":   "integer",
    "children": "integer",
    "infants":  "integer"
  },

  "specialRequests":  "string",
  "cancellationNote": "string",

  "paymentId":    "string (ref → payments.paymentId)",

  "checkInActual":  "datetime",
  "checkOutActual": "datetime",

  "cancelledBy":  "enum [ GUEST | HOST | ADMIN | SYSTEM | null ]",
  "cancelledAt":  "datetime",

  "refundType":   "enum [ FULL | PARTIAL | NONE | null ]",
  "refundAmount": "double",

  "createdAt":    "datetime",
  "updatedAt":    "datetime"
}
```

**Indexes:**
- `bookingId` — unique
- `guestId`
- `hostId`
- `listingId`
- `status`
- Compound: `listingId` + `startDate` + `endDate` — critical for double-booking check
- Compound: `guestId` + `createdAt` — for booking history

---

### Collection: `booking_status_history`

Full audit trail of every status change.

```json
{
  "_id":        "ObjectId",
  "historyId":  "string (UUID)",
  "bookingId":  "string (ref → bookings.bookingId)",

  "fromStatus": "enum [ null | PENDING | CONFIRMED | CHECKED_IN | CHECKED_OUT | CANCELLED | FAILED | REFUNDED ]",
  "toStatus":   "enum [ PENDING | CONFIRMED | CHECKED_IN | CHECKED_OUT | CANCELLED | FAILED | REFUNDED ]",

  "changedBy":  "string (userId or 'SYSTEM')",
  "changedByRole": "enum [ GUEST | HOST | ADMIN | SYSTEM ]",

  "reason":     "string",
  "metadata": {
    "ipAddress":   "string",
    "userAgent":   "string",
    "triggeredBy": "string (e.g. payment-service, admin-panel)"
  },

  "timestamp":  "datetime"
}
```

**Indexes:**
- `bookingId` — for fetching full timeline
- `bookingId` + `timestamp` — compound for ordered history
- `changedBy`
- `timestamp` — for admin reporting

---

## 💳 Payment Service — `paymentdb`

### Collection: `payments`

```json
{
  "_id":         "ObjectId",
  "paymentId":   "string (UUID)",
  "bookingId":   "string (ref → bookings.bookingId)",
  "guestId":     "string",
  "hostId":      "string",

  "amount":      "double",
  "currency":    "string (default: BDT)",

  "status": "enum [ PENDING | COMPLETED | FAILED | REFUNDED | PARTIALLY_REFUNDED ]",

  "method": "enum [ CREDIT_CARD | DEBIT_CARD | BKASH | NAGAD | BANK_TRANSFER | OTHER ]",

  "gatewayResponse": {
    "gatewayName":        "string",
    "transactionId":      "string",
    "gatewayStatus":      "string",
    "gatewayMessage":     "string",
    "processedAt":        "datetime"
  },

  "createdAt":    "datetime",
  "updatedAt":    "datetime"
}
```

**Indexes:**
- `paymentId` — unique
- `bookingId` — unique (one payment per booking)
- `guestId`
- `status`

---

### Collection: `refunds`

```json
{
  "_id":        "ObjectId",
  "refundId":   "string (UUID)",
  "paymentId":  "string (ref → payments.paymentId)",
  "bookingId":  "string",
  "guestId":    "string",

  "refundType": "enum [ FULL | PARTIAL ]",
  "amount":     "double",
  "reason":     "string",

  "status": "enum [ PENDING | PROCESSED | FAILED ]",

  "initiatedBy": "enum [ GUEST | HOST | ADMIN | SYSTEM ]",
  "initiatedAt": "datetime",
  "processedAt": "datetime",

  "createdAt":  "datetime",
  "updatedAt":  "datetime"
}
```

**Indexes:**
- `refundId` — unique
- `paymentId`
- `bookingId`
- `guestId`

---

### Collection: `payouts`

Payouts to the host after guest checkout.

```json
{
  "_id":        "ObjectId",
  "payoutId":   "string (UUID)",
  "paymentId":  "string (ref → payments.paymentId)",
  "bookingId":  "string",
  "hostId":     "string",

  "grossAmount":    "double",
  "platformFee":    "double",
  "netAmount":      "double",
  "currency":       "string",

  "status": "enum [ SCHEDULED | PROCESSING | COMPLETED | FAILED | CANCELLED ]",

  "scheduledAt":  "datetime",
  "processedAt":  "datetime",
  "createdAt":    "datetime"
}
```

**Indexes:**
- `payoutId` — unique
- `hostId`
- `bookingId`
- `status`

---

## 🔍 Search Service — `searchdb`

### Collection: `search_index`

Denormalized snapshot of listing data for fast search/filter.

```json
{
  "_id":          "ObjectId",
  "listingId":    "string",
  "hostId":       "string",
  "title":        "string",
  "description":  "string",
  "propertyType": "string",
  "roomType":     "string",
  "status":       "string",

  "location": {
    "city":       "string",
    "country":    "string",
    "latitude":   "double",
    "longitude":  "double",
    "geoPoint": {
      "type":        "Point",
      "coordinates": ["longitude", "latitude"]
    }
  },

  "pricing": {
    "pricePerNight": "double",
    "currency":      "string"
  },

  "capacity": {
    "maxGuests": "integer",
    "bedrooms":  "integer",
    "beds":      "integer"
  },

  "amenities":       ["string"],
  "averageRating":   "double",
  "totalReviews":    "integer",
  "instantBook":     "boolean",
  "primaryImageUrl": "string",

  "indexedAt":  "datetime",
  "updatedAt":  "datetime"
}
```

**Indexes:**
- `listingId` — unique
- Text index: `title`, `description`, `location.city`
- `location.geoPoint` — 2dsphere (geospatial)
- `pricing.pricePerNight`
- `averageRating`
- `status`
- Compound: `location.city` + `status` + `pricing.pricePerNight`

---

## 🔔 Notification Service — `notificationdb`

### Collection: `notifications`

```json
{
  "_id":              "ObjectId",
  "notificationId":   "string (UUID)",
  "recipientId":      "string (ref → users.userId)",
  "recipientEmail":   "string",
  "recipientRole":    "enum [ GUEST | HOST | ADMIN ]",

  "type": "enum [ BOOKING_CREATED | BOOKING_CONFIRMED | BOOKING_CANCELLED | BOOKING_CHECKED_IN | BOOKING_CHECKED_OUT | PAYMENT_RECEIVED | REFUND_ISSUED | PAYOUT_SENT | ACCOUNT_CREATED | PASSWORD_RESET | GENERAL ]",

  "channel": "enum [ EMAIL | SMS | PUSH ]",

  "subject":  "string",
  "body":     "string (plain text)",
  "htmlBody": "string (HTML template rendered)",

  "status": "enum [ PENDING | SENT | FAILED | RETRYING ]",

  "retryCount":   "integer (default: 0)",
  "maxRetries":   "integer (default: 3)",
  "lastAttemptAt": "datetime",
  "sentAt":       "datetime",

  "metadata": {
    "bookingId":   "string",
    "paymentId":   "string",
    "templateId":  "string",
    "variables":   "object (key-value used in template)"
  },

  "createdAt":  "datetime",
  "updatedAt":  "datetime"
}
```

**Indexes:**
- `notificationId` — unique
- `recipientId`
- `status`
- `type`
- `createdAt` — TTL index (auto-delete after 90 days)

---

## 🛠️ Admin Service — `admindb`

### Collection: `admin_actions`

Full audit log of every admin operation.

```json
{
  "_id":          "ObjectId",
  "actionId":     "string (UUID)",
  "adminId":      "string (ref → users.userId)",
  "adminEmail":   "string",

  "actionType": "enum [ FORCE_CANCEL | REFUND_OVERRIDE | SUSPEND_USER | ACTIVATE_USER | DELETE_LISTING | REVIEW_BOOKING | GENERATE_REPORT | OTHER ]",

  "targetType": "enum [ BOOKING | USER | LISTING | PAYMENT ]",
  "targetId":   "string",

  "previousState": "object (snapshot before action)",
  "newState":      "object (snapshot after action)",

  "reason":     "string",
  "notes":      "string",
  "ipAddress":  "string",

  "createdAt":  "datetime"
}
```

**Indexes:**
- `actionId` — unique
- `adminId`
- `targetType` + `targetId` — compound
- `actionType`
- `createdAt` — for reports / time-range queries

---

### Collection: `reports`

```json
{
  "_id":        "ObjectId",
  "reportId":   "string (UUID)",
  "reportType": "enum [ BOOKING_SUMMARY | REVENUE | USER_GROWTH | LISTING_PERFORMANCE | REFUND_SUMMARY ]",
  "generatedBy": "string (adminId or 'SYSTEM')",

  "parameters": {
    "startDate": "date",
    "endDate":   "date",
    "filters":   "object"
  },

  "data":        "object (report payload)",
  "format":      "enum [ JSON | CSV ]",
  "downloadUrl": "string",

  "generatedAt": "datetime",
  "expiresAt":   "datetime"
}
```

**Indexes:**
- `reportId` — unique
- `reportType`
- `generatedBy`
- `expiresAt` — TTL index

---

## 🔄 Booking Status Transition Map

```
                          ┌─────────────────────────────────────────┐
                          │              BOOKING LIFECYCLE           │
                          └─────────────────────────────────────────┘

   PENDING ──────────────────────────────────────► CONFIRMED
      │                                                 │
      │                                                 ▼
      │                                           CHECKED_IN
      │                                                 │
      │                                                 ▼
      │                                          CHECKED_OUT
      │
      ├──────────────► CANCELLED ──────────────► REFUNDED (full/partial)
      │                    ▲
      │                    │
      └──► FAILED          │
                           │
                    CONFIRMED ───────────────────► CANCELLED
```

### Allowed Transitions

| From           | To                                  | Who Can Trigger              |
|----------------|-------------------------------------|------------------------------|
| `PENDING`      | `CONFIRMED`                         | SYSTEM (after payment)       |
| `PENDING`      | `CANCELLED`                         | GUEST, HOST, SYSTEM          |
| `PENDING`      | `FAILED`                            | SYSTEM (payment failure)     |
| `CONFIRMED`    | `CHECKED_IN`                        | HOST, SYSTEM (on start_date) |
| `CONFIRMED`    | `CANCELLED`                         | GUEST, HOST, ADMIN           |
| `CHECKED_IN`   | `CHECKED_OUT`                       | HOST, SYSTEM (on end_date)   |
| `CANCELLED`    | `REFUNDED`                          | SYSTEM, ADMIN                |

### Refund Policy

| Cancellation Timing               | Refund Type | Guest Gets      | Host Gets     |
|-----------------------------------|-------------|-----------------|---------------|
| > 7 days before check-in          | `FULL`      | 100% back       | 0%            |
| <= 7 days before check-in         | `PARTIAL`   | 50% back        | 50%           |
| After check-in                    | `NONE`      | 0%              | 100%          |
| Host cancels (any time)           | `FULL`      | 100% back       | 0% + penalty  |
| Admin override                    | configurable| admin decides   | admin decides |

---

## 📝 Common Field Conventions

| Field         | Type              | Notes                                    |
|---------------|-------------------|------------------------------------------|
| `_id`         | `ObjectId`        | MongoDB auto-generated                   |
| `*Id`         | `string (UUID)`   | Application-level UUID for external use  |
| `createdAt`   | `datetime`        | Auto-set on insert (MongoAuditing)        |
| `updatedAt`   | `datetime`        | Auto-set on update (MongoAuditing)        |
| `status`      | `enum string`     | Always uppercase snake_case              |
| `currency`    | `string`          | ISO 4217 (e.g. BDT, USD)                |
| `*Id` (refs)  | `string`          | No foreign key — manually resolved       |

---

*Last updated: ISD Airbnb — BUET CSE 326*