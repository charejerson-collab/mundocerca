# Deploy notes for Mundocerca

- Edit `deploy/deploy.sh` at the top: set `DOMAIN`, `GITHUB_REPO`, and `EMAIL`.
- If you're using Supabase, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` as well.
- Default script deploys the current code (which uses SQLite). Migrating to Supabase/Postgres requires code changes (see notes below).

Basic steps to run (from your local machine):

1. Copy `deploy/deploy.sh` to the VPS:
```powershell
scp "deploy/deploy.sh" root@74.208.45.24:/root/
```

2. SSH into your VPS and run the script as root (it must be run as root):
```powershell
ssh root@74.208.45.24
bash /root/deploy.sh
```

What the script does:
- Installs Node 20, nginx, certbot, pm2, and required packages.
- Optionally creates a 2GB swapfile for low-memory servers.
- Clones the repo, installs npm dependencies, builds the frontend, and starts the server with PM2.
- Writes an nginx site file and attempts to obtain TLS from Let's Encrypt.

Notes about Supabase migration:
- The current server code (`server.js`) uses a local SQLite database (`data/app.db`). To use Supabase (Postgres) you will need to:
  - Create a Supabase project and database.
  - Either rewrite server DB logic to use Postgres (pg) OR replace server endpoints with direct Supabase usage from the frontend.
  - Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env` and to the frontend build process if the frontend will talk directly to Supabase.

If you want, I can: migrate the server to use Supabase/Postgres (update code + provide migration steps), or keep SQLite and use Supabase for other features (storage/auth). Tell me which.
