#!/bin/bash

# VPS Database Restoration Script
# This script restores the local database export to the VPS

set -e  # Exit on any error

echo "=========================================="
echo "VPS Database Restoration Script"
echo "=========================================="
echo ""

# Configuration
VPS_HOST="vps"
BACKUP_DIR="./backups"
EXPORT_FILE="${1:-local_latest.sql}"  # Use provided file or latest symlink

# Validate export file exists
if [ ! -f "$BACKUP_DIR/$EXPORT_FILE" ]; then
    echo "❌ ERROR: Export file not found: $BACKUP_DIR/$EXPORT_FILE"
    echo ""
    echo "Available exports:"
    ls -lh "$BACKUP_DIR"/*.sql 2>/dev/null || echo "No SQL files found in $BACKUP_DIR"
    exit 1
fi

echo "📁 Using export file: $BACKUP_DIR/$EXPORT_FILE"
echo ""

# Get file info
SIZE=$(du -h "$BACKUP_DIR/$EXPORT_FILE" | cut -f1)
echo "📊 Export file size: $SIZE"
echo ""

# Confirmation prompt
echo "⚠️  WARNING: This will REPLACE the VPS database with the local database!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r CONFIRMATION

if [ "$CONFIRMATION" != "yes" ]; then
    echo "❌ Restoration cancelled by user"
    exit 0
fi

echo ""
echo "=========================================="
echo "Starting Restoration Process"
echo "=========================================="
echo ""

# Step 1: Copy export file to VPS
echo "📤 Step 1/5: Transferring export file to VPS..."
ssh "$VPS_HOST" "mkdir -p /opt/config/discord-bot/backups"
scp "$BACKUP_DIR/$EXPORT_FILE" "$VPS_HOST:/opt/config/discord-bot/backups/" || {
    echo "❌ ERROR: Failed to transfer file to VPS"
    exit 1
}
echo "✅ File transferred successfully"
echo ""

# Step 2: Stop the Discord bot
echo "🛑 Step 2/5: Stopping Discord bot on VPS..."
ssh "$VPS_HOST" "cd /opt/config/discord-bot && docker compose stop bot" || {
    echo "⚠️  Warning: Could not stop bot (may not be running)"
}
echo "✅ Bot stopped"
echo ""

# Step 3: Drop and recreate database
echo "🗑️  Step 3/5: Dropping and recreating VPS database..."
ssh "$VPS_HOST" << 'ENDSSH'
cd /opt/config/discord-bot
echo "Dropping existing database..."
docker compose exec -T postgres psql -U refactor -d postgres -c "DROP DATABASE IF EXISTS refactor_bot;"
echo "Creating fresh database..."
docker compose exec -T postgres psql -U refactor -d postgres -c "CREATE DATABASE refactor_bot;"
echo "Database recreated successfully"
ENDSSH
echo "✅ Database recreated"
echo ""

# Step 4: Restore database from export
echo "📥 Step 4/5: Restoring database from export..."
ssh "$VPS_HOST" "cd /opt/config/discord-bot && cat backups/$EXPORT_FILE | docker compose exec -T postgres psql -U refactor refactor_bot" || {
    echo "❌ ERROR: Database restoration failed!"
    echo ""
    echo "Attempting to restart bot anyway..."
    ssh "$VPS_HOST" "cd /opt/config/discord-bot && docker compose up -d bot"
    exit 1
}
echo "✅ Database restored successfully"
echo ""

# Step 5: Restart the Discord bot
echo "🚀 Step 5/5: Starting Discord bot..."
ssh "$VPS_HOST" "cd /opt/config/discord-bot && docker compose up -d bot" || {
    echo "❌ ERROR: Failed to start bot"
    exit 1
}
echo "✅ Bot started"
echo ""

# Step 6: Verify restoration
echo "=========================================="
echo "Verifying Restoration"
echo "=========================================="
echo ""

ssh "$VPS_HOST" << 'ENDSSH'
cd /opt/config/discord-bot
echo "📊 Database Statistics:"
echo ""

# Count recommendations
REC_COUNT=$(docker compose exec -T postgres psql -U refactor refactor_bot -t -c "SELECT COUNT(*) FROM \"Recommendation\";")
echo "Total Recommendations: $REC_COUNT"

# Count with forum threads
FORUM_COUNT=$(docker compose exec -T postgres psql -U refactor refactor_bot -t -c "SELECT COUNT(*) FROM \"Recommendation\" WHERE \"forumThreadId\" IS NOT NULL;")
echo "With Forum Threads: $FORUM_COUNT"

# Get latest recommendation
LATEST=$(docker compose exec -T postgres psql -U refactor refactor_bot -t -c "SELECT \"createdAt\" FROM \"Recommendation\" ORDER BY \"createdAt\" DESC LIMIT 1;")
echo "Latest Recommendation: $LATEST"

echo ""
ENDSSH

echo "=========================================="
echo "Restoration Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check bot logs: ssh vps 'cd /opt/config/discord-bot && docker compose logs -f bot'"
echo "2. Verify bot is responding in Discord"
echo "3. Test a recommendation to ensure everything works"
echo ""
