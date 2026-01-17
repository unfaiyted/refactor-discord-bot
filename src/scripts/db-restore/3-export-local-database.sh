#!/bin/bash

# Local Database Export Script
# This script exports the local database to a SQL dump file

set -e  # Exit on any error

echo "=========================================="
echo "Local Database Export Script"
echo "=========================================="
echo ""

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_FILE="local_refactor_bot_export_${TIMESTAMP}.sql"

# Database connection details from .env
DB_HOST="localhost"
DB_PORT="15432"
DB_NAME="refactor_bot"
DB_USER="username"  # Update this if your .env has actual credentials

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "📦 Exporting local database..."
echo "Export file: $BACKUP_DIR/$EXPORT_FILE"
echo ""
echo "Database details:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo ""

# Check if local database is accessible
echo "🔍 Checking local database connection..."

# Using Docker Compose to export from the local database
if [ -f "docker-compose.yml" ]; then
    echo "📦 Using Docker Compose to export database..."
    docker compose exec -T postgres pg_dump -U refactor "$DB_NAME" > "$BACKUP_DIR/$EXPORT_FILE"
else
    echo "📦 Using direct pg_dump (assuming PostgreSQL is running)..."
    # Prompt for password if needed
    PGPASSWORD="${DB_PASSWORD:-changeme}" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U refactor "$DB_NAME" > "$BACKUP_DIR/$EXPORT_FILE"
fi

# Check if export was successful
if [ -s "$BACKUP_DIR/$EXPORT_FILE" ]; then
    echo ""
    echo "✅ Local database export completed successfully!"
    echo "📁 Export location: $BACKUP_DIR/$EXPORT_FILE"

    # Get file size
    SIZE=$(du -h "$BACKUP_DIR/$EXPORT_FILE" | cut -f1)
    echo "📊 Export size: $SIZE"

    # Count number of lines
    LINES=$(wc -l < "$BACKUP_DIR/$EXPORT_FILE")
    echo "📄 Lines in export: $LINES"

    # Count INSERT statements (rough indicator of data rows)
    INSERTS=$(grep -c "^INSERT INTO" "$BACKUP_DIR/$EXPORT_FILE" || echo "0")
    echo "📊 INSERT statements: $INSERTS"

    # Create a latest symlink for easy reference
    ln -sf "$EXPORT_FILE" "$BACKUP_DIR/local_latest.sql"
    echo "🔗 Symlink created: $BACKUP_DIR/local_latest.sql"
else
    echo ""
    echo "❌ ERROR: Export file is empty or was not created!"
    exit 1
fi

echo ""
echo "=========================================="
echo "Export Complete!"
echo "=========================================="
echo ""
echo "Next step: Transfer this file to VPS"
echo "Example: scp $BACKUP_DIR/$EXPORT_FILE vps:~/discord-bot/backups/"
