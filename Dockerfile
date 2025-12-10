# Dependencies stage
FROM imbios/bun-node:1.3.0-22-slim AS deps
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

# Install dependencies
RUN bun install --frozen-lockfile

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma client
RUN bunx prisma generate

# Production stage
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
COPY --from=deps /app/node_modules ./node_modules

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
