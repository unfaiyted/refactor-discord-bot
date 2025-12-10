#!/bin/bash
set -e

echo "🚀 Starting Refactor Discord Bot..."

# Wait for PostgreSQL to be ready
# Docker healthcheck already ensures postgres is ready, but add small delay
echo "⏳ Waiting for PostgreSQL..."
sleep 2
echo "✅ PostgreSQL is ready!"

# Run database migrations
echo "📦 Running Prisma migrations..."
bunx prisma db push --accept-data-loss

echo "✅ Database is ready!"

# Start the bot
echo "🤖 Starting Discord bot..."

# Use watch mode for development, normal mode for production
if [ "$NODE_ENV" = "development" ]; then
  echo "   Running in DEVELOPMENT mode with hot reload..."
  exec bun --watch src/index.ts
else
  echo "   Running in PRODUCTION mode..."
  exec bun run src/index.ts
fi
