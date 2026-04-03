# Quick Start Guide - Monolith Deployment

## 1. Prepare Environment Variables

Copy the root example file and keep the existing credentials:

```bash
copy .env.example .env
```

Required runtime values:

- `MONGO_URI_USER`
- `MONGO_URI_BOOKING`
- `MONGO_URI_AVAILABILITY`
- `MONGO_URI_NOTIFICATION`
- `MONGO_URI_REVIEWS`
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `FRONTEND_BASE_URL`

## 2. Run the Backend

### Docker

```bash
docker compose up --build
```

### PowerShell + Maven

```powershell
$envLines = Get-Content .env | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' }
foreach ($line in $envLines) {
  $name, $value = $line -split '=', 2
  [System.Environment]::SetEnvironmentVariable($name, $value, 'Process')
}
cd backend\monolith
mvn spring-boot:run
```

Backend URL: `http://localhost:8080`

## 3. Run the Frontend

```bash
cd frontend
npm install
npm start
```

Frontend URL: `http://localhost:3000`

## 4. Deploy

### Render

- Backend blueprint: [`render.yaml`](./render.yaml)
- Docker context: `backend/monolith`
- Health check: `/actuator/health`

### Vercel

- Deploy the `frontend` directory
- Set `REACT_APP_API_BASE_URL` to the Render backend URL

## 5. Verify

```bash
cd backend/monolith
mvn test
```

```bash
cd frontend
npm test -- --watch=false
npm run build
```

Notes:

- No MongoDB migration is required.
- Existing Supabase storage stays unchanged.
- Frontend API paths remain on `/api/...`.
