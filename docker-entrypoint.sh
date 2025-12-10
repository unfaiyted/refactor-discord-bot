#!/bin/bash
set -e

echo "🚀 Starting Refactor Discord Bot..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
max_attempts=30
attempt=0

until bunx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ $attempt -gt $max_attempts ]; then
    echo "❌ PostgreSQL is not available after $max_attempts attempts"
    exit 1
  fi
  echo "   Attempt $attempt/$max_attempts - waiting for database..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Run database migrations
echo "📦 Running Prisma migrations..."
bunx prisma db push --accept-data-loss

echo "✅ Database is ready!"

# Start the bot
echo "🤖 Starting Discord bot..."
exec bun run src/index.ts
