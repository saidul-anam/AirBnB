# ISD Airbnb - Modular Monolith

This project now runs as a single Spring Boot backend in [`backend/monolith`](./backend/monolith) with the existing React frontend in [`frontend`](./frontend). The goal of the migration was to keep the frontend behavior unchanged while removing the operational overhead of the old 10-service setup.

The current deployment shape is:

- Frontend: Vercel static deployment
- Backend: Render web service built from [`backend/monolith/Dockerfile`](./backend/monolith/Dockerfile)
- Data: existing MongoDB Atlas databases and existing Supabase storage

No database migration is required. Existing MongoDB and Supabase credentials remain in use.

## What Changed

- The backend services were consolidated into one Spring Boot runtime.
- Existing MongoDB databases were preserved through separate `MongoTemplate` beans.
- Frontend API routes stayed on the same `/api/...` paths.
- Local Docker startup was simplified to one backend container in [`docker-compose.yml`](./docker-compose.yml).
- Render deployment is now described in [`render.yaml`](./render.yaml).
- The monolith migration and current module layout are explained in [`MODULAR_MONOLITH_STRUCTURE.md`](./MODULAR_MONOLITH_STRUCTURE.md).

## Repository Layout

```text
backend/
  monolith/        Spring Boot backend
frontend/          React app for Vercel/local dev
.github/workflows/ CI pipeline
docker-compose.yml Local monolith container
render.yaml        Render backend blueprint
LastUpdate.md      Timestamped change log
```

## Required Environment Variables

Backend/runtime variables used by the monolith:

- `MONGO_URI_USER`
- `MONGO_URI_BOOKING`
- `MONGO_URI_AVAILABILITY`
- `MONGO_URI_NOTIFICATION`
- `MONGO_URI_REVIEWS`
- `JWT_SECRET`
- `JWT_EXPIRY`
- `JWT_REFRESH_EXPIRY`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `FRONTEND_BASE_URL`

Frontend build variable:

- `REACT_APP_API_BASE_URL`

See [`.env.example`](./.env.example) and [`frontend/.env.example`](./frontend/.env.example) for the expected names.

## Local Run

### Backend with Docker

```bash
docker compose up --build
```

The monolith listens on `http://localhost:8080`.

### Backend with Maven on Windows PowerShell

Load variables from the root `.env` into the current shell first:

```powershell
$envLines = Get-Content .env | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' }
foreach ($line in $envLines) {
  $name, $value = $line -split '=', 2
  [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
}
cd backend\monolith
mvn spring-boot:run
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Deployment

### Render backend

- Use [`render.yaml`](./render.yaml) or create a Render web service from `backend/monolith`.
- Render will assign `PORT`; the application already honors it.
- Add the MongoDB, JWT, Supabase, and `FRONTEND_BASE_URL` variables in Render.
- For a beginner-friendly walkthrough, use [`RENDER_BACKEND_DEPLOY_GUIDE.md`](./RENDER_BACKEND_DEPLOY_GUIDE.md).

### Vercel frontend

- Deploy the `frontend` directory.
- Set `REACT_APP_API_BASE_URL` to the Render backend URL.
- [`frontend/vercel.json`](./frontend/vercel.json) already rewrites SPA routes to `index.html`.
- For a beginner-friendly walkthrough, use [`VERCEL_FRONTEND_DEPLOY_GUIDE.md`](./VERCEL_FRONTEND_DEPLOY_GUIDE.md).

## Verification Commands

```bash
cd backend/monolith
mvn test
```

```bash
cd frontend
npm test -- --watch=false
npm run build
```

At the time of the latest update, the backend Maven build passed, the monolith booted successfully against Atlas in a local smoke check, the frontend test suite passed, and the frontend production build passed.
