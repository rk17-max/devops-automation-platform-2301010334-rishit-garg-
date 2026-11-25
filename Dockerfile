# ==========================================
# Multi-Stage Secure Production Dockerfile
# ==========================================

# Stage 1: Build & Dependencies
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

# Stage 2: Minimal Distroless / Hardened Alpine Runtime
FROM node:20-alpine AS runner

# Create dedicated non-root application user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /usr/src/app

# Copy production node_modules and code from builder
COPY --from=builder --chown=appuser:appgroup /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /usr/src/app/src ./src
COPY --from=builder --chown=appuser:appgroup /usr/src/app/package*.json ./

# Security: drop root privileges
USER appuser

# Environment variables
ENV NODE_ENV=production \
    PORT=8080 \
    APP_VERSION=1.0.0 \
    RELEASE_TRACK=stable

# Expose standard application port
EXPOSE 8080

# Built-in container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/healthz || exit 1

# Start application via dumb-init or standard node
CMD ["node", "src/server.js"]
