# Multi-stage Dockerfile for Vehicle Wash Backend
# Optimized for production deployment

# Stage 0: Build Admin Panel
FROM node:20-alpine AS admin-builder

WORKDIR /admin
COPY admin-company-panel/package*.json ./
RUN npm ci
COPY admin-company-panel/ ./
# Inline env so Vite bakes the production API URL at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Stage 1: Build Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Safety: make default Prisma schema PostgreSQL inside container.
# This prevents runtime commands that omit --schema from loading local sqlite schema.
RUN cp ./prisma/schema.prod.prisma ./prisma/schema.prisma

# Generate Prisma Client (using production PostgreSQL schema) and Build TypeScript
RUN npx prisma generate --schema=./prisma/schema.prod.prisma && npx tsc

# Remove devDependencies after build to reduce size
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine

# Install dumb-init and required libraries for Prisma
RUN apk add --no-cache dumb-init openssl libc6-compat libssl3

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built files and dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
# Copy built admin panel
COPY --from=admin-builder --chown=nodejs:nodejs /admin/dist ./admin-panel-dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/cleanup-duplicates.sql ./
COPY --from=builder --chown=nodejs:nodejs /app/pre-migrate-slug.sql ./
COPY --from=builder --chown=nodejs:nodejs /app/quick-migrate.js ./
COPY --from=builder --chown=nodejs:nodejs /app/start.sh ./

# Generate Prisma Client in production stage (PostgreSQL)
RUN npx prisma generate --schema=./prisma/schema.prod.prisma

# Make start script executable
RUN chmod +x start.sh

# Create uploads directory
RUN mkdir -p uploads/logo uploads/payment && \
    chown -R nodejs:nodejs uploads

# Switch to non-root user
USER nodejs

# Expose port (Railway will set PORT env var dynamically)
EXPOSE 4000

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "start.sh"]
