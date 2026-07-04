FROM node:18-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY worker/package*.json ./worker/
COPY worker/tsconfig.json ./worker/
COPY backend/prisma ./backend/prisma/
RUN npm ci --workspace=worker
COPY worker/src ./worker/src/
RUN npm run build --workspace=worker

FROM node:18-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY worker/package*.json ./worker/
COPY backend/prisma ./backend/prisma/
RUN npm ci --omit=dev --workspace=worker
COPY --from=builder /app/worker/dist ./worker/dist
ENV NODE_ENV=production
CMD ["node", "worker/dist/index.js"]
