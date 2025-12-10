# MundoCerca Deployment Guide

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Vercel      │────▶│     Railway     │────▶│    Supabase     │
│   (Frontend)    │     │    (Backend)    │     │   (Database)    │
│                 │     │                 │     │                 │
│  React + Vite   │     │  Node + Express │     │   PostgreSQL    │
│  Static Files   │     │  API Server     │     │  + Auth + RLS   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 1. Supabase Setup

### 1.1 Project Info
- **URL**: `https://jgntewuhoucquzxubrka.supabase.co`
- **Dashboard**: https://supabase.com/dashboard/project/jgntewuhoucquzxubrka

### 1.2 Run Database Schema
1. Go to SQL Editor in Supabase Dashboard
2. Create new query
3. Paste contents of `supabase/schema.sql`
4. Click "Run"

### 1.3 Get API Keys
Go to Settings > API and copy:
- **URL**: Project URL
- **anon key**: For client-side (public)
- **service_role key**: For server-side (secret!)

---

## 2. Railway Backend Setup

### 2.1 Deploy to Railway
```bash
# Option A: Railway CLI
npm install -g railway
railway login
railway init
railway up

# Option B: GitHub Integration
# 1. Connect your repo at railway.app
# 2. Railway auto-deploys on push
```

### 2.2 Set Environment Variables
In Railway Dashboard > Variables, add:

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://jgntewuhoucquzxubrka.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=<generate-a-secure-secret>
FRONTEND_URL=https://your-app.vercel.app
```

Generate JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2.3 Verify Deployment
```bash
curl https://your-railway-url.railway.app/api/ping
# Should return: {"ok":true,"mode":"supabase"}
```

---

## 3. Vercel Frontend Setup

### 3.1 Deploy to Vercel
```bash
# Option A: Vercel CLI
npm install -g vercel
vercel

# Option B: GitHub Integration
# 1. Import repo at vercel.com/new
# 2. Vercel auto-deploys on push
```

### 3.2 Set Environment Variables
In Vercel Dashboard > Settings > Environment Variables:

```env
VITE_API_URL=https://your-railway-url.railway.app
```

### 3.3 Build Settings
Vercel should auto-detect these:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

---

## 4. Post-Deployment Checklist

- [ ] Supabase schema applied
- [ ] Railway backend running
- [ ] Railway env vars set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET)
- [ ] Vercel frontend running  
- [ ] Vercel env vars set (VITE_API_URL)
- [ ] Test login/register flow
- [ ] Test property listings
- [ ] Test password reset (configure SMTP for production)

---

## 5. SMTP Configuration (Optional)

For password reset emails, add to Railway:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_xxxx_your_api_key
SMTP_FROM=noreply@yourdomain.com
```

Recommended providers:
- **Resend** (resend.com) - Free tier: 3000/month
- **SendGrid** (sendgrid.com) - Free tier: 100/day
- **Mailgun** (mailgun.com) - Free trial

---

## 6. Local Development

```bash
# Install dependencies
npm install

# Start backend (port 3000)
npm run dev:server

# Start frontend (port 5173)
npm run dev

# Or run both together
npm run dev
```

Local dev uses SQLite if Supabase is not configured.

---

## 7. Troubleshooting

### Backend won't connect to Supabase
- Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
- Verify keys in Supabase Dashboard > Settings > API

### CORS errors
- Add your Vercel URL to FRONTEND_URL env var on Railway
- Restart Railway deployment

### Auth not working
- Check JWT_SECRET is the same across all instances
- Verify token is being sent in Authorization header

### Database tables missing
- Run `supabase/schema.sql` in SQL Editor
- Check for errors in query output

---

## 8. Useful Commands

```bash
# Check Railway logs
railway logs

# Check Vercel logs
vercel logs

# Test backend health
curl https://your-api.railway.app/api/health

# Test Supabase connection
curl https://your-api.railway.app/api/ping
```
