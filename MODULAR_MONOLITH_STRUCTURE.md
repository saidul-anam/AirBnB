# Modular Monolith Structure Guide

This file explains the current backend shape of the project after the migration away from the old multi-container microservice deployment.

## 1. Current Runtime Architecture

Today the system runs like this:

```text
Browser
  -> Vercel frontend (React)
  -> Render backend (one Spring Boot monolith)
  -> MongoDB Atlas databases + Supabase storage
```

There is now only one deployed backend process:

- `backend/monolith`

The frontend is still a separate app because it is a static React client deployed on Vercel, but the backend is no longer split into many separately deployed services.

## 2. What "Modular Monolith" Means Here

The backend is monolithic at runtime, but modular in code structure.

That means:

- one Spring Boot application starts from `com.airbnb.MonolithApplication`
- one Docker image is built from `backend/monolith/Dockerfile`
- one backend container runs in `docker-compose.yml`
- one Render web service is deployed from `render.yaml`

But inside that single app, the code is still grouped by domain:

- `com.airbnb.user`
- `com.airbnb.booking`
- `com.airbnb.availability`
- `com.airbnb.review`
- `com.airbnb.notification`
- `com.airbnb.admin`

This is why it is a modular monolith instead of a "flat" monolith.

## 3. Why It Still Looks a Bit Like Microservices

The project still has a microservice touch on purpose. That was the lowest-risk way to consolidate the system without breaking the frontend or the data model.

The main microservice-style traits that were intentionally kept are:

- domain-based package separation
- service-specific API prefixes like `/api/users`, `/api/bookings`, `/api/reviews`
- separate MongoDB URIs for legacy databases
- separate `MongoTemplate` beans per domain database
- some old log messages/comments that still say `user-service` or similar
- some old docs in `docs/` that describe the earlier architecture

These are now structural or naming leftovers, not separate deployed services.

## 4. What Was Actually Consolidated

The old setup had many backend runtime pieces such as:

- API gateway
- multiple Spring Boot services
- reverse proxy
- separate local containers per backend service

The current setup removes that operational split.

### Before

```text
Frontend
  -> API gateway / reverse proxy
  -> user-service
  -> booking-service
  -> availability-service
  -> review-service
  -> notification-service
  -> admin-service
  -> other service-specific runtime pieces
```

### Now

```text
Frontend
  -> one backend URL
  -> one Spring Boot process
  -> internal module/service calls inside the same JVM
```

## 5. How 6-7 Services Were Folded Into One App With Minimum Changes

The migration strategy was compatibility-first, not redesign-first.

### 5.1 Kept the frontend API surface stable

The frontend still calls the same endpoint families:

- `/api/users/**`
- `/api/messages/**`
- `/api/bookings/**`
- `/api/availability/**`
- `/api/reviews/**`
- `/api/notifications/**`
- `/api/admin/**`

Because these route prefixes were preserved, the frontend did not need a major rewrite.

### 5.2 Kept the domain boundaries in code

Instead of merging everything into a single package, each old service boundary became an internal module/package.

That preserved:

- DTOs
- controllers
- repositories
- service classes
- business rules

So most code could be moved with limited logic changes.

### 5.3 Kept the databases as they were

No major MongoDB schema rewrite was forced just to make the deployment monolithic.

The monolith still reads existing databases through these environment variables:

- `MONGO_URI_USER`
- `MONGO_URI_BOOKING`
- `MONGO_URI_REVIEWS`
- `MONGO_URI_NOTIFICATION`
- `MONGO_URI_AVAILABILITY`

Inside the monolith, `MultipleMongoConfig` creates separate `MongoTemplate` beans, and each domain repository package is wired to the correct database through `@EnableMongoRepositories`.

That is the main reason the migration could be done with minimum risk to existing data.

### 5.4 Replaced cross-service HTTP hops with in-process service calls

In the old architecture, one service would often talk to another over HTTP.

In the monolith, those interactions are now regular Spring bean calls inside the same process.

Examples:

- `AdminVerificationService` directly uses `UserService` and `NotificationService`
- `BookingService` directly uses `NotificationService` and `WebSocketService`

So the business flow stayed similar, but the network hop disappeared.

### 5.5 Removed the gateway-style runtime dependency

The frontend no longer needs an API gateway container to find backend services.

It now points directly to one backend base URL:

- local: `http://localhost:8080`
- production: Render monolith URL

### 5.6 Simplified deployment and CI/CD

The deployment shape was reduced to:

- one backend Docker build
- one Render service
- one frontend Vercel project

The GitHub Actions workflow was also rewritten around:

- monolith backend build/test
- frontend build/test
- one backend Docker image

## 6. Current Module Mapping

This is the practical mapping from the earlier service mindset to the current monolith structure.

| Earlier service idea | Current module/package | Main API prefix | Notes |
| --- | --- | --- | --- |
| user-service | `com.airbnb.user` | `/api/users` | Auth, profiles, host suggestions, messaging support |
| booking-service | `com.airbnb.booking` | `/api/bookings` | Booking lifecycle, payment state handling, status/history |
| availability-service | `com.airbnb.availability` | `/api/availability` | Availability checks and host availability queries |
| review-service | `com.airbnb.review` | `/api/reviews` | Guest and host reviews |
| notification-service | `com.airbnb.notification` | `/api/notifications` | In-app/admin notification records |
| admin-service | `com.airbnb.admin` | `/api/admin` | Verification queue and admin user operations |

Some old service concerns were absorbed instead of surviving as standalone modules:

- payment logic is now handled mostly inside the booking domain through booking/payment status transitions
- listing/search behavior is largely handled through user/host profile data and frontend filtering over existing host/property payloads
- API gateway/reverse-proxy behavior was removed from runtime entirely

## 7. How Requests Are Routed Now

### Old style

```text
Frontend -> gateway -> target service
```

### Current style

```text
Frontend -> monolith controller -> internal service -> repository/database
```

Example search/listing-related flow:

```text
Frontend
  -> GET /api/users/hosts/suggestions
  -> UserController
  -> UserService / UserPersistenceService
  -> userdb host data
```

Example booking flow:

```text
Frontend
  -> POST /api/bookings
  -> BookingController
  -> BookingService
  -> bookingdb
  -> internal NotificationService call
  -> notificationdb
```

So the modules still collaborate, but they do it inside one server process instead of across containers.

## 8. How the Servers/Apps Are Handled Now

### Frontend

- still a separate React app in `frontend`
- built separately
- deployed separately to Vercel
- calls the monolith through `REACT_APP_API_BASE_URL`

### Backend

- one Spring Boot app in `backend/monolith`
- one exposed HTTP port
- one Docker container locally
- one Render web service in production

### Databases and storage

- MongoDB Atlas databases stay separate by legacy responsibility
- Supabase stays external for storage
- credentials were kept the same
- no broad database rename or migration was required

## 9. Why This Was the Minimum-Change Approach

This migration avoided risky changes in the places most likely to break the app:

- the frontend route contract was preserved
- MongoDB collections and existing data were preserved
- Supabase integration was preserved
- domain code structure was preserved
- deployment complexity was reduced without rebuilding the whole product

This is exactly why the code still "looks" service-oriented in places even though it now deploys as one backend.

## 10. What Is Still Legacy or Historical

These are not part of the current runtime path even if they still exist in the repo or naming:

- old microservice wording in some docs and logs
- legacy env var placeholders such as payment/listing/search/admin URIs in `.env.example`
- `backend/admin-service/target`, which is just leftover build output, not the active deployed backend

The active backend for deployment is only:

- `backend/monolith`

## 11. Current Source of Truth

For the current deployed architecture, use these files as the source of truth:

- `backend/monolith`
- `docker-compose.yml`
- `render.yaml`
- `frontend/vercel.json`
- `README.md`

Older architecture notes under `docs/` are historical unless they explicitly match the monolith setup.
