# =============================================================================
# MundoCerca Backend - Dockerfile for Railway Deployment
# =============================================================================
# Architecture: Frontend (Vercel) → Backend API (Railway) → Supabase (Postgres)
# =============================================================================

FROM node:18-alpine

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files first (for better layer caching)
COPY backend/package.json backend/package-lock.json* ./

# Install ALL dependencies (need devDeps for native module compilation)
RUN npm ci

# Rebuild native modules for Alpine Linux
RUN npm rebuild better-sqlite3

# Copy application source code
COPY backend/server.js ./
COPY backend/stripe.js ./
COPY backend/data/ ./data/
COPY backend/supabase/ ./supabase/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/ping || exit 1

# Start the server
CMD ["node", "server.js"]
