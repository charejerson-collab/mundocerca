#!/usr/bin/env bash
set -euo pipefail

# Simple deploy script for Mundocerca app (Ubuntu 24.04)
# Usage: edit the variables below, upload to VPS and run as root:
#   scp deploy/deploy.sh root@74.208.45.24:/root/
#   ssh root@74.208.45.24 'bash /root/deploy.sh'

### Edit these values before running ###
DOMAIN="example.com"                # <-- your domain
GITHUB_REPO="https://github.com/<user>/<repo>.git"  # <-- your repo URL
APP_DIR="/var/www/mundocerca"
EMAIL="you@example.com"              # certbot email
CREATE_SWAP=true                      # true on 1GB RAM machines
# Supabase values (optional) - set if you already created a Supabase project
SUPABASE_URL=""
SUPABASE_ANON_KEY=""
# If you want to migrate from SQLite to Supabase/Postgres, set MIGRATE_TO_SUPABASE=true
MIGRATE_TO_SUPABASE=false
PORT=3000

echo "Starting deploy script"

if [ "$CREATE_SWAP" = true ]; then
  if ! swapon --show | grep -q '/swapfile' 2>/dev/null; then
    echo "Creating 2GB swapfile..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  else
    echo "Swapfile already present"
  fi
fi

echo "Updating apt and installing packages"
apt update
apt install -y curl git nginx software-properties-common build-essential ca-certificates

echo "Installing Node.js 20.x"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "Installing certbot and pm2"
apt install -y certbot python3-certbot-nginx
npm install -g pm2

echo "Preparing app directory: $APP_DIR"
mkdir -p "$APP_DIR"
chown root:root "$APP_DIR"
rm -rf "$APP_DIR"/*

echo "Cloning repository"
git clone --depth 1 "$GITHUB_REPO" "$APP_DIR"
cd "$APP_DIR"

echo "Creating .env file (will open editor so you can edit/add secrets)"
JWT_SECRET=$(openssl rand -hex 32)
cat > .env <<EOF
PORT=$PORT
JWT_SECRET=$JWT_SECRET
# Optional Supabase variables
SUPABASE_URL=$SUPABASE_URL
SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY=
EOF

# Open editor so user can modify the .env (e.g. paste SUPABASE_SERVICE_KEY or change JWT_SECRET)
: ${EDITOR:=nano}
echo "Opening ".env" in editor ($EDITOR). Save and exit to continue."
"$EDITOR" .env
echo ".env updated."

echo "Installing Node dependencies and building frontend"
npm ci --no-audit --no-fund
npm run build

echo "Starting app with pm2 (using npm start)"
# Use npm start via pm2 so the project uses the official start script
pm2 start npm --name mundocerca -- start || true
pm2 save
echo "PM2 start command executed. Saved process list."
pm2 save
pm2 startup systemd -u root --hp /root || true

NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
echo "Writing nginx config to $NGINX_CONF"
cat > "$NGINX_CONF" <<'NGCONF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;

    location / {
        proxy_pass http://127.0.0.1:PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }
}
NGCONF

sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$NGINX_CONF"
sed -i "s/PORT_PLACEHOLDER/$PORT/g" "$NGINX_CONF"

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/$DOMAIN
mkdir -p /var/www/letsencrypt
nginx -t
systemctl reload nginx

echo "Requesting TLS certificate from Let's Encrypt"
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" || {
  echo "Certbot failed — you can run: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
}

echo "Deployment completed. Check pm2 status and nginx config."
echo "pm2 status && journalctl -u nginx --no-pager -n 200"

if [ "$MIGRATE_TO_SUPABASE" = true ]; then
  echo "MIGRATE_TO_SUPABASE was requested, but this script does not perform automatic DB migration." 
  echo "Manual code changes are required to rewire the server from SQLite to Supabase/Postgres." 
fi

exit 0
