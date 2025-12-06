FROM node:18-alpine
WORKDIR /app

# install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --production

# copy rest
COPY . .

# build frontend
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node","server.js"]
