# Multi-stage Dockerfile for Vehicle Wash Backend
# Optimized for production deployment

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma Client and Build TypeScript
RUN npm run build

# Remove devDependencies after build to reduce size
RUN npm prune --production

# Stage 2: Production
FROM node:20-alpine

# Install dumb-init and OpenSSL 1.1 compatibility for Prisma
RUN apk add --no-cache dumb-init openssl1.1-compat

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built files and dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Create uploads directory
RUN mkdir -p uploads/logo uploads/payment && \
    chown -R nodejs:nodejs uploads

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
