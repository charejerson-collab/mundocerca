FROM node:18-alpine
WORKDIR /app

# install ALL dependencies (including dev deps needed for build)
COPY package.json package-lock.json* ./
RUN npm ci

# copy rest of source code
COPY . .

# build frontend (requires vite, tailwindcss, etc.)
RUN npm run build

# Remove dev dependencies after build to reduce image size
RUN npm prune --production

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node","server.js"]
