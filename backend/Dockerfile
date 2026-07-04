FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY backend/package*.json ./backend/
COPY backend/tsconfig.json ./backend/
COPY backend/prisma ./backend/prisma/
RUN npm ci --workspace=backend
COPY backend/src ./backend/src/
RUN npm run build --workspace=backend

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY backend/prisma ./backend/prisma/
RUN npm ci --omit=dev --workspace=backend
COPY --from=builder /app/backend/dist ./backend/dist
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "backend/dist/index.js"]
