# Multi-stage Dockerfile for Vehicle Wash Backend
# Optimized for production deployment

# Stage 1: Build
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
