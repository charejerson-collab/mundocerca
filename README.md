# Mundo Cerca — Rental Marketplace MVP

This repository contains a minimal MVP for a rental marketplace: a Vite + React frontend and an Express backend with SQLite for lightweight persistence.

Quick start (development):

1. Install dependencies:

```powershell
cd "c:\Users\work from home\Pictures\mundocerca_app"
npm install
```

2. Start backend (dev) and frontend dev server (two terminals):

Terminal 1 (backend):
```powershell
npm run start:dev
```

Terminal 2 (frontend):
```powershell
npm run dev
```

Open http://localhost:5173 to view the frontend during development. API runs on port 3000.

Production build and run:

```powershell
npm run build
npm start
```

Or build and run via Docker:

```powershell
docker build -t mundocerca-mvp .
docker run -p 3000:3000 mundocerca-mvp
```

API endpoints:
- `GET /api/listings` — list of listings
- `GET /api/pros` — list of professionals
- `POST /api/auth/register` — register (body: name,email,password)
- `POST /api/auth/login` — login (body: email,password)

Notes & next steps:
- Replace `JWT_SECRET` with a secure value via `.env` in production.
- Add file upload handling (multer) for verification documents.
- Integrate payments (Stripe) if you want paid verification or featured listings.
- Add CI, tests, and automated database migrations for production readiness.
