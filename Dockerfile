# ============================================================================
# Multi-Target Dockerfile for Refactor Discord Bot
# ============================================================================
# This Dockerfile supports both development and production environments
# using Docker's multi-stage build targets.
#
# Build Targets:
#   - development: Full dev environment with hot reloading
#   - production:  Optimized production build (default)
#
# Usage:
#   docker build --target development -t bot:dev .
#   docker build --target production -t bot:prod .
#   docker build -t bot:prod .  (production is default)
# ============================================================================

# ============================================================================
# DEVELOPMENT TARGET
# ============================================================================
# Full Debian environment with all development tools and dependencies
# Designed for use with volume mounts for hot reloading
# ============================================================================
FROM imbios/bun-node:latest-22-debian AS development

WORKDIR /app

# Install development dependencies and tools
RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    bash \
    git \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./
COPY bun.lock* ./

# Install ALL dependencies (including devDependencies for development)
RUN bun install

# Copy Prisma schema and generate client
# Note: In dev mode, prisma is mounted as volume but we need initial generation
COPY prisma ./prisma
RUN bunx prisma generate

# Copy entrypoint script for migrations
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create data directory for SQLite cache
RUN mkdir -p /app/data

# Source code will be mounted as volumes in docker-compose.override.yml
# This allows for hot reloading without rebuilding the container

# Expose port (useful for potential webhooks or debugging)
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run entrypoint script which handles migrations and starts bot
CMD ["./docker-entrypoint.sh"]

# ============================================================================
# PRODUCTION - DEPENDENCIES STAGE
# ============================================================================
# Builds all dependencies in an isolated stage
# Uses slim base image for smaller size
# ============================================================================
FROM imbios/bun-node:1.3.0-22-slim AS production-deps

WORKDIR /app

# Install required system dependencies
# openssl: Required for Prisma
# curl: Useful for health checks
# dumb-init: Proper signal handling for PID 1
RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./
COPY bun.lock* ./
COPY tsconfig.json ./
COPY bunfig.toml ./

# Install dependencies (all, needed for Prisma generation)
RUN bun install --frozen-lockfile

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN bunx prisma generate

# ============================================================================
# PRODUCTION TARGET (DEFAULT)
# ============================================================================
# Final optimized production image
# Copies only necessary files from deps stage
# Runs as non-root user for security
# ============================================================================
FROM imbios/bun-node:1.3.0-22-slim AS production

WORKDIR /app

# Install only runtime dependencies
RUN apt-get update && apt-get install -y \
    openssl \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./
COPY bun.lock* ./

# Copy node_modules and Prisma client from deps stage
COPY --from=production-deps /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY tsconfig.json ./
COPY bunfig.toml ./
COPY prisma ./prisma

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create cache directory and set permissions
RUN mkdir -p /app/data && chown -R node:node /app

# Switch to non-root user for security
USER node

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Run the entrypoint script
CMD ["./docker-entrypoint.sh"]
