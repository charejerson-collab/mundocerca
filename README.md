# MundoCerca

A rental and professional services marketplace for migrants in Mexico.

## Project Structure

```
mundocerca/
├── frontend/          # Vite + React (Deploy to Vercel)
│   ├── src/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/           # Express + Node.js (Deploy to Railway)
│   ├── server.js
│   ├── stripe.js
│   ├── package.json
│   └── supabase/      # Database schema
│
└── README.md
```

## Architecture

```
Frontend (Vercel) → Backend API (Railway) → Supabase (PostgreSQL)
   Vite + React      Node.js + Express       Database + Auth
```

## Deployment

### Frontend (Vercel)
1. Import repo to Vercel
2. Set **Root Directory** to `frontend`
3. Framework: Vite
4. Add env var: `VITE_API_URL=https://your-backend.up.railway.app`

### Backend (Railway)
1. Import repo to Railway
2. Set **Root Directory** to `backend`
3. Railway will auto-detect Node.js and run `npm start`
4. Add env vars (see `backend/.env.example`)

### Database (Supabase)
Run `backend/supabase/schema.sql` in Supabase SQL Editor.

## Local Development

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
npm install
npm run dev
```
