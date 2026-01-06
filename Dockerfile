# Build stage - compile frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy frontend package files and install deps
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Copy frontend source and build
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy root package files and install production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server code
COPY server/ ./server/

# Copy built frontend from builder stage
COPY --from=builder /app/frontend/dist ./frontend/dist

# Set production environment
ENV NODE_ENV=production
ENV PORT=11001

EXPOSE 11001

CMD ["node", "server/index.js"]
